---
name: csp-subscription-management
description: >
  Manages subscription lifecycle patterns including state machines, plan upgrades/downgrades, usage-based billing, dunning strategies, and feature gating for SaaS applications.
version: 0.1.0
layer: 4
category: patterns
---

# Subscription Management

End-to-end patterns for managing subscription lifecycles, from trial activation through cancellation and reactivation, with robust state machines and webhook-driven synchronization.

## When to Activate

- Building a SaaS billing system with multiple plan tiers
- Implementing trial periods with or without credit card requirements
- Adding usage-based or metered billing on top of flat-rate plans
- Designing dunning flows for failed payment recovery
- Building feature gating architecture tied to subscription tiers
- Handling plan upgrades, downgrades, and proration calculations

## Subscription State Machine

```
                    +-----------+
                    |  trial    |
                    +-----+-----+
                          |
              trial ends  |  (with payment method)
                          v
                    +-----------+
            +------>|  active   |<------+
            |       +-----+-----+       |
            |             |             |
            |   payment   |             | reactivation
            |   fails     v             |
            |       +-----------+       |
            |       | past_due  |-------+
            |       +-----+-----+
            |             |
            |   dunning   | exhausted
            |   fails     v
            |       +-----------+
            +-------| canceled  |
                    +-----------+
                          |
                    grace period
                          v
                    +-----------+
                    |  expired  |
                    +-----------+
```

### State Transition Implementation

```typescript
enum SubscriptionStatus {
  TRIAL = "trial",
  ACTIVE = "active",
  PAST_DUE = "past_due",
  CANCELED = "canceled",
  EXPIRED = "expired",
  REACTIVATED = "reactivated",
}

interface StateTransition {
  from: SubscriptionStatus;
  to: SubscriptionStatus;
  trigger: string;
  sideEffects: (() => Promise<void>)[];
}

const TRANSITIONS: StateTransition[] = [
  {
    from: SubscriptionStatus.TRIAL,
    to: SubscriptionStatus.ACTIVE,
    trigger: "trial_end_payment_success",
    sideEffects: [sendWelcomeEmail, activateFullFeatures],
  },
  {
    from: SubscriptionStatus.TRIAL,
    to: SubscriptionStatus.EXPIRED,
    trigger: "trial_end_no_payment",
    sideEffects: [sendTrialExpiredEmail, downgradeFeatures],
  },
  {
    from: SubscriptionStatus.ACTIVE,
    to: SubscriptionStatus.PAST_DUE,
    trigger: "payment_failed",
    sideEffects: [sendPaymentFailedEmail, startDunningTimer],
  },
  {
    from: SubscriptionStatus.PAST_DUE,
    to: SubscriptionStatus.ACTIVE,
    trigger: "payment_retry_success",
    sideEffects: [sendPaymentRecoveredEmail, clearDunningTimer],
  },
  {
    from: SubscriptionStatus.PAST_DUE,
    to: SubscriptionStatus.CANCELED,
    trigger: "dunning_exhausted",
    sideEffects: [sendCancellationEmail, revokeAccess],
  },
  {
    from: SubscriptionStatus.CANCELED,
    to: SubscriptionStatus.REACTIVATED,
    trigger: "resubscribe",
    sideEffects: [sendReactivationEmail, restoreAccess],
  },
];

async function transitionSubscription(
  subscriptionId: string,
  trigger: string
): Promise<SubscriptionStatus> {
  const subscription = await db.subscriptions.findUniqueOrThrow({
    where: { id: subscriptionId },
  });

  const transition = TRANSITIONS.find(
    (t) => t.from === subscription.status && t.trigger === trigger
  );

  if (!transition) {
    throw new Error(
      `Invalid transition: ${subscription.status} via ${trigger}`
    );
  }

  await db.subscriptions.update({
    where: { id: subscriptionId },
    data: {
      status: transition.to,
      updatedAt: new Date(),
      statusChangedAt: new Date(),
    },
  });

  // Execute side effects (fire-and-forget for non-critical ones)
  for (const effect of transition.sideEffects) {
    await effect().catch((err) =>
      console.error(`Side effect failed for ${trigger}:`, err)
    );
  }

  return transition.to;
}
```

## Plan and Tier Management

### Upgrade and Downgrade with Proration

```typescript
interface PlanChange {
  subscriptionId: string;
  newPriceId: string;
  direction: "upgrade" | "downgrade";
  prorationBehavior: "create_prorations" | "none";
}

async function changePlan(change: PlanChange): Promise<void> {
  const subscription = await stripe.subscriptions.retrieve(
    change.subscriptionId
  );
  const currentItem = subscription.items.data[0];

  // For upgrades: prorate immediately, charge the difference
  // For downgrades: apply credit at next billing cycle
  const prorationDate = Math.floor(Date.now() / 1000);

  await stripe.subscriptions.update(change.subscriptionId, {
    items: [
      {
        id: currentItem.id,
        price: change.newPriceId,
      },
    ],
    proration_behavior: change.prorationBehavior,
    proration_date: prorationDate,
    // Downgrades take effect at period end
    ...(change.direction === "downgrade" && {
      cancel_at_period_end: false,
      items: [
        {
          id: currentItem.id,
          price: change.newPriceId,
        },
      ],
    }),
  });

  // Update local database
  await db.subscriptions.update({
    where: { stripeSubscriptionId: change.subscriptionId },
    data: {
      planId: change.newPriceId,
      changedAt: new Date(),
      changeDirection: change.direction,
    },
  });
}
```

### Proration Calculation

| Scenario | Behavior | Customer Impact |
|----------|----------|-----------------|
| Upgrade mid-cycle | Immediate proration charge | Pays difference for remaining days |
| Downgrade mid-cycle | Credit applied to next invoice | Continues current plan until period end |
| Upgrade at renewal | New price on next invoice | Clean transition at boundary |
| Downgrade at renewal | New price on next invoice | Clean transition at boundary |

## Trial Period Implementation

```typescript
interface TrialConfig {
  durationDays: number;
  requiresPaymentMethod: boolean;
  onTrialEnd: "auto_convert" | "notify_only" | "expire";
}

async function startTrial(
  customerId: string,
  planId: string,
  config: TrialConfig
): Promise<string> {
  const trialEnd = Math.floor(
    (Date.now() + config.durationDays * 86400000) / 1000
  );

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: planId }],
    trial_end: trialEnd,
    // If no payment method, subscription will be incomplete at trial end
    payment_behavior: config.requiresPaymentMethod
      ? "default_incomplete"
      : "default_incomplete",
    payment_settings: {
      save_default_payment_method: "on_subscription",
    },
    metadata: {
      trial_started: new Date().toISOString(),
      trial_config: JSON.stringify(config),
    },
  });

  // Schedule trial end reminder emails
  await scheduleEmail("trial_ending_soon", customerId, {
    sendAt: new Date(trialEnd * 1000 - 3 * 86400000), // 3 days before
  });
  await scheduleEmail("trial_ending_tomorrow", customerId, {
    sendAt: new Date(trialEnd * 1000 - 86400000), // 1 day before
  });

  return subscription.id;
}
```

## Usage-Based Billing

### Metered Usage Tracking

```typescript
interface UsageEvent {
  subscriptionId: string;
  metricId: string; // e.g., "api_calls", "storage_gb", "emails_sent"
  quantity: number;
  timestamp: Date;
  idempotencyKey: string;
}

async function recordUsage(event: UsageEvent): Promise<void> {
  // Idempotency check
  const existing = await db.usageEvents.findUnique({
    where: { idempotencyKey: event.idempotencyKey },
  });
  if (existing) return;

  // Record in Stripe
  await stripe.subscriptionItems.createUsageRecord(
    event.metricId,
    {
      quantity: event.quantity,
      timestamp: Math.floor(event.timestamp.getTime() / 1000),
      action: "increment", // "set" for absolute values
    },
    { idempotencyKey: event.idempotencyKey }
  );

  // Record locally for analytics
  await db.usageEvents.create({
    data: {
      idempotencyKey: event.idempotencyKey,
      subscriptionId: event.subscriptionId,
      metricId: event.metricId,
      quantity: event.quantity,
      recordedAt: event.timestamp,
    },
  });
}
```

### Usage Aggregation and Billing

```typescript
interface TieredPricing {
  metricId: string;
  tiers: { upTo: number | "inf"; unitPrice: number; flatFee: number }[];
}

function calculateTieredBill(
  totalUsage: number,
  pricing: TieredPricing
): number {
  let remaining = totalUsage;
  let totalCost = 0;
  let previousUpTo = 0;

  for (const tier of pricing.tiers) {
    const tierLimit =
      tier.upTo === "inf" ? remaining : tier.upTo - previousUpTo;
    const usageInTier = Math.min(remaining, tierLimit);

    totalCost += usageInTier * tier.unitPrice + tier.flatFee;
    remaining -= usageInTier;
    previousUpTo = tier.upTo === "inf" ? totalUsage : tier.upTo;

    if (remaining <= 0) break;
  }

  return totalCost;
}

// Example: API calls pricing
const apiCallPricing: TieredPricing = {
  metricId: "api_calls",
  tiers: [
    { upTo: 10000, unitPrice: 0, flatFee: 0 }, // First 10K free
    { upTo: 100000, unitPrice: 0.001, flatFee: 0 }, // $0.001/call
    { upTo: 1000000, unitPrice: 0.0005, flatFee: 0 }, // $0.0005/call
    { upTo: "inf", unitPrice: 0.0002, flatFee: 0 }, // $0.0002/call
  ],
};
```

## Dunning: Failed Payment Recovery

```typescript
interface DunningConfig {
  maxRetries: number;
  retrySchedule: number[]; // days between retries
  gracePeriodDays: number;
  actions: {
    onFirstFailure: string[]; // ["email_customer", "retry_smart"]
    onFinalFailure: string[]; // ["cancel_subscription", "downgrade_to_free"]
  };
}

const DEFAULT_DUNNING: DunningConfig = {
  maxRetries: 4,
  retrySchedule: [1, 3, 7, 14], // Day 1, Day 4, Day 11, Day 25
  gracePeriodDays: 3,
  actions: {
    onFirstFailure: ["email_customer", "retry_smart"],
    onFinalFailure: ["cancel_subscription", "send_final_notice"],
  },
};

async function handlePaymentFailure(
  subscriptionId: string,
  failureCount: number,
  config: DunningConfig = DEFAULT_DUNNING
): Promise<void> {
  if (failureCount <= config.maxRetries) {
    // Send dunning email
    await sendDunningEmail(subscriptionId, failureCount);

    // Smart retry: Stripe's Smart Retries automatically optimize timing
    await stripe.subscriptions.update(subscriptionId, {
      collection_method: "charge_automatically",
    });

    // Schedule manual retry as backup
    const nextRetryDays = config.retrySchedule[failureCount - 1] ?? 7;
    await scheduleRetry(subscriptionId, nextRetryDays);
  } else {
    // Dunning exhausted
    for (const action of config.actions.onFinalFailure) {
      await executeDunningAction(action, subscriptionId);
    }
  }
}
```

## Webhook-Driven State Sync

```typescript
async function handleSubscriptionWebhook(
  event: Stripe.Event
): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;

  const statusMap: Record<string, SubscriptionStatus> = {
    active: SubscriptionStatus.ACTIVE,
    past_due: SubscriptionStatus.PAST_DUE,
    canceled: SubscriptionStatus.CANCELED,
    trialing: SubscriptionStatus.TRIAL,
    incomplete_expired: SubscriptionStatus.EXPIRED,
    unpaid: SubscriptionStatus.PAST_DUE,
  };

  const newStatus = statusMap[subscription.status];
  if (!newStatus) {
    console.warn(`Unknown subscription status: ${subscription.status}`);
    return;
  }

  await db.$transaction(async (tx) => {
    // Update subscription record
    await tx.subscriptions.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: newStatus,
        currentPeriodStart: new Date(
          subscription.current_period_start * 1000
        ),
        currentPeriodEnd: new Date(
          subscription.current_period_end * 1000
        ),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : null,
      },
    });

    // Update feature flags cache
    await tx.featureFlags.upsert({
      where: { subscriptionId: subscription.id },
      create: buildFeatureFlags(subscription),
      update: buildFeatureFlags(subscription),
    });
  });
}
```

## Feature Gating Architecture

```typescript
interface FeatureGate {
  featureId: string;
  planRequired: string;
  limitPerPeriod?: number;
  meteredId?: string;
}

const FEATURE_GATES: FeatureGate[] = [
  { featureId: "api_access", planRequired: "starter" },
  { featureId: "custom_domains", planRequired: "pro" },
  { featureId: "sso", planRequired: "enterprise" },
  {
    featureId: "api_calls",
    planRequired: "starter",
    limitPerPeriod: 10000,
    meteredId: "api_calls",
  },
  {
    featureId: "team_members",
    planRequired: "pro",
    limitPerPeriod: 10,
  },
];

async function checkFeatureAccess(
  userId: string,
  featureId: string
): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  const subscription = await getUserSubscription(userId);
  if (!subscription || subscription.status === SubscriptionStatus.CANCELED) {
    return { allowed: false, reason: "No active subscription" };
  }

  const gate = FEATURE_GATES.find((g) => g.featureId === featureId);
  if (!gate) return { allowed: true }; // Ungated feature

  // Check plan level
  const planHierarchy = ["free", "starter", "pro", "enterprise"];
  const userPlanIndex = planHierarchy.indexOf(subscription.planId);
  const requiredPlanIndex = planHierarchy.indexOf(gate.planRequired);

  if (userPlanIndex < requiredPlanIndex) {
    return {
      allowed: false,
      reason: `Requires ${gate.planRequired} plan or higher`,
    };
  }

  // Check usage limits
  if (gate.limitPerPeriod) {
    const usage = await getCurrentUsage(userId, featureId);
    const remaining = gate.limitPerPeriod - usage;
    return {
      allowed: remaining > 0,
      reason: remaining <= 0 ? "Usage limit exceeded" : undefined,
      remaining: Math.max(0, remaining),
    };
  }

  return { allowed: true };
}
```

## Anti-Patterns

- **Polling the payment provider for subscription status instead of using webhooks** -- webhooks provide real-time state changes. Polling introduces delays and wastes API quota.
- **Storing subscription state only in the payment provider** -- always maintain a local mirror for fast feature gate checks and offline resilience.
- **Not handling the `past_due` state distinctly from `canceled`** -- users in `past_due` should retain access during the grace period to encourage payment recovery.
- **Charging prorations for downgrades immediately** -- downgrades should take effect at period end to avoid refund complexity and user confusion.
- **Missing idempotency on usage recording** -- duplicate usage events inflate bills. Always use idempotency keys and deduplication checks.
- **Feature gates that hit the database on every request** -- cache feature flags in Redis or memory with a TTL, refreshed on webhook events.

## Related Skills

- [[csp-payment-integration]] -- Payment provider setup and checkout flows
- [[csp-webhook-architecture]] -- Reliable webhook delivery and processing
- [[csp-email-systems]] -- Dunning emails and subscription notifications
- [[csp-user-analytics]] -- Tracking subscription conversion and churn metrics
