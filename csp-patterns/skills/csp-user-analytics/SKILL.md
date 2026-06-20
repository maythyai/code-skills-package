---
name: csp-user-analytics
description: >
  Designs and implements user analytics systems including event taxonomy, platform integration, retention metrics, funnel tracking, A/B testing, and privacy-compliant data collection.
version: 0.1.0
layer: 4
category: patterns
---

# User Analytics

Patterns for building comprehensive analytics systems that track user behavior, measure product metrics, and enable data-driven decisions while respecting user privacy.

## When to Activate

- Setting up analytics for a new product or feature launch
- Designing an event taxonomy and naming conventions
- Implementing retention cohorts, funnels, or DAU/MAU metrics
- Choosing between PostHog, Mixpanel, Amplitude, or GA4
- Building A/B testing infrastructure with feature flags
- Migrating from client-side to server-side tracking

## Analytics Platform Comparison

| Feature | PostHog | Mixpanel | Amplitude | GA4 |
|---------|---------|----------|-----------|-----|
| Hosting | Self-hosted or cloud | Cloud only | Cloud only | Cloud only |
| Pricing Model | Per-event | Per-MTU | Per-MTU | Free (limited) |
| Session Replay | Built-in | Add-on | Add-on | Limited |
| Feature Flags | Built-in | Limited | Limited | None |
| A/B Testing | Built-in | Limited | Built-in | Optimize (separate) |
| Data Warehouse | ClickHouse | Proprietary | Proprietary | BigQuery export |
| SQL Access | Direct | JQL/Limited | Limited | BigQuery |
| Open Source | Yes | No | No | No |
| Best For | Full-stack, self-host | Product analytics | Product analytics | Web/marketing |

**Decision rule**: Choose PostHog for full-stack control and self-hosting. Choose Mixpanel for pure product analytics with a mature UI. Use GA4 for web/marketing analytics alongside your product tool.

## Event Taxonomy Design

### Naming Conventions

```typescript
// Event naming: <object>_<action> (snake_case)
// Property naming: <category>_<descriptor> (snake_case)

interface EventSchema {
  name: string;
  description: string;
  properties: Record<string, PropertyDefinition>;
}

interface PropertyDefinition {
  type: "string" | "number" | "boolean" | "array";
  required: boolean;
  description: string;
  enum?: string[];
}

const EVENT_TAXONOMY: Record<string, EventSchema> = {
  // Signup flow
  signup_started: {
    name: "signup_started",
    description: "User initiated the signup process",
    properties: {
      signup_method: {
        type: "string",
        required: true,
        enum: ["email", "google", "github", "apple"],
        description: "Authentication method used",
      },
      referrer_source: {
        type: "string",
        required: false,
        description: "UTM source or referrer",
      },
      landing_page: {
        type: "string",
        required: true,
        description: "Page URL where signup was initiated",
      },
    },
  },

  // Core activation
  project_created: {
    name: "project_created",
    description: "User created their first project (activation event)",
    properties: {
      project_type: {
        type: "string",
        required: true,
        enum: ["web", "mobile", "api", "library"],
        description: "Type of project created",
      },
      template_used: {
        type: "string",
        required: false,
        description: "Template ID if a template was used",
      },
      time_since_signup_seconds: {
        type: "number",
        required: true,
        description: "Seconds between signup and first project",
      },
    },
  },

  // Feature usage
  feature_used: {
    name: "feature_used",
    description: "User engaged with a tracked feature",
    properties: {
      feature_name: {
        type: "string",
        required: true,
        description: "Canonical feature identifier",
      },
      feature_category: {
        type: "string",
        required: true,
        enum: ["core", "advanced", "admin", "integration"],
        description: "Feature category for rollup reports",
      },
      session_duration_ms: {
        type: "number",
        required: false,
        description: "Time spent in the feature",
      },
    },
  },
};
```

### Taxonomy Rules

| Rule | Good Example | Bad Example |
|------|-------------|-------------|
| Object-action naming | `project_created` | `createProject` or `New Project` |
| Snake_case consistently | `invite_sent` | `inviteSent` or `Invite Sent` |
| Specific, not vague | `checkout_payment_completed` | `action_completed` |
| Properties are snake_case | `project_type` | `projectType` or `type` |
| Boolean prefix with `is_` | `is_first_time` | `firstTime` or `first_time` |

## Key Metrics Implementation

### DAU/MAU and Stickiness

```typescript
interface DailyActiveMetrics {
  date: string;
  dau: number;
  wau: number;
  mau: number;
  stickiness: number; // DAU/MAU ratio
}

// SQL query for DAU/MAU (PostHog/ClickHouse)
const DAU_MAU_QUERY = `
  WITH daily AS (
    SELECT
      toDate(timestamp) AS day,
      count(DISTINCT distinct_id) AS dau
    FROM events
    WHERE timestamp >= now() - INTERVAL 30 DAY
      AND event NOT IN ('$pageview', '$autocapture')
    GROUP BY day
  ),
  monthly AS (
    SELECT
      count(DISTINCT distinct_id) AS mau
    FROM events
    WHERE timestamp >= now() - INTERVAL 30 DAY
      AND event NOT IN ('$pageview', '$autocapture')
  )
  SELECT
    d.day,
    d.dau,
    m.mau,
    round(d.dau / m.mau * 100, 1) AS stickiness_pct
  FROM daily d
  CROSS JOIN monthly m
  ORDER BY d.day DESC
`;
```

### Retention Cohort Analysis

```typescript
// PostHog retention query configuration
interface RetentionConfig {
  startEvent: string; // e.g., "signup_completed"
  returnEvent: string; // e.g., "project_created"
  period: "Day" | "Week" | "Month";
  totalIntervals: number;
}

function buildRetentionQuery(config: RetentionConfig) {
  return {
    target_event: { id: config.startEvent, type: "events" },
    returning_event: { id: config.returnEvent, type: "events" },
    retention_type: "retention_recurring",
    period: config.period.toLowerCase(),
    total_intervals: config.totalIntervals,
  };
}

// Calculate N-day retention from raw events (Python)
def calculate_retention(events_df, start_event, return_event, period="week"):
    """
    Calculate cohort retention from event data.
    Returns a DataFrame with cohort_size, period_index, retention_rate.
    """
    import pandas as pd

    events_df["date"] = pd.to_datetime(events_df["timestamp"])

    # Find cohort start (first occurrence of start_event per user)
    cohort_starts = (
        events_df[events_df["event"] == start_event]
        .groupby("user_id")["date"]
        .min()
        .reset_index()
        .rename(columns={"date": "cohort_start"})
    )

    # Assign each user to their cohort period
    cohort_starts["cohort_period"] = cohort_starts["cohort_start"].dt.to_period(
        period[0].upper()
    )

    # Merge with return events
    merged = events_df[events_df["event"] == return_event].merge(
        cohort_starts, on="user_id"
    )

    # Calculate periods since cohort start
    merged["return_period"] = merged["date"].dt.to_period(period[0].upper())
    merged["periods_since_start"] = (
        merged["return_period"] - merged["cohort_period"]
    ).apply(lambda x: x.n)

    # Build retention table
    retention = (
        merged.groupby(["cohort_period", "periods_since_start"])["user_id"]
        .nunique()
        .reset_index()
    )

    cohort_sizes = cohort_starts.groupby("cohort_period")["user_id"].nunique()
    retention = retention.merge(
        cohort_sizes.rename("cohort_size"),
        left_on="cohort_period",
        right_index=True,
    )
    retention["retention_rate"] = retention["user_id"] / retention["cohort_size"]

    return retention
```

### Funnel Conversion Tracking

```typescript
// Define funnel with PostHog
interface FunnelStep {
  event: string;
  properties?: Record<string, string>;
}

const ONBOARDING_FUNNEL: FunnelStep[] = [
  { event: "signup_started" },
  { event: "email_verified" },
  { event: "profile_completed" },
  { event: "project_created" },
  { event: "invite_sent", properties: { is_first_invite: "true" } },
];

// Track funnel events with proper context
function trackFunnelStep(
  step: string,
  properties: Record<string, unknown>
): void {
  analytics.capture(step, {
    ...properties,
    // Always include these context properties
    $current_url: window.location.href,
    $referrer: document.referrer,
    session_id: getSessionId(),
    user_plan: getCurrentPlan(),
  });
}
```

## User Identification

### Anonymous to Identified Transition

```typescript
class AnalyticsTracker {
  private posthog: PostHog;
  private identified = false;

  constructor() {
    this.posthog = new PostHog(API_KEY, { host: "/ingest" });
  }

  // Track anonymous user actions
  trackAnonymous(event: string, properties: Record<string, unknown>): void {
    this.posthog.capture(event, properties);
  }

  // Identify user on login/signup
  identify(
    userId: string,
    traits: {
      email: string;
      name: string;
      plan: string;
      createdAt: string;
    }
  ): void {
    // Associate anonymous session with identified user
    this.posthog.identify(userId, {
      email: traits.email,
      name: traits.name,
      plan: traits.plan,
      created_at: traits.createdAt,
    });

    // Group users by organization
    this.posthog.group("organization", getOrgId(), {
      name: getOrgName(),
      plan: getOrgPlan(),
      member_count: getMemberCount(),
    });

    this.identified = true;
  }

  // Reset on logout
  reset(): void {
    this.posthog.reset();
    this.identified = false;
  }
}
```

### Cross-Device Tracking

```typescript
// Server-side: stitch user identity across devices
async function stitchUserDevices(
  userId: string,
  deviceId: string,
  sessionId: string
): Promise<void> {
  // Record device association
  await db.userDevices.upsert({
    where: {
      userId_deviceId: { userId, deviceId },
    },
    create: {
      userId,
      deviceId,
      firstSeen: new Date(),
      lastSeen: new Date(),
    },
    update: {
      lastSeen: new Date(),
    },
  });

  // In PostHog, alias devices to the same user
  await posthog.alias({
    distinctId: deviceId,
    alias: userId,
  });
}
```

## Server-Side vs Client-Side Tracking

| Aspect | Client-Side | Server-Side | Hybrid |
|--------|-------------|-------------|--------|
| Accuracy | Lower (ad blockers) | Higher (no blockers) | Best of both |
| Page Performance | Adds JS payload | No client impact | Minimal impact |
| Data Richness | Browser context | Backend context | Full context |
| Privacy Control | Cookie consent needed | First-party data | Configurable |
| Implementation | Easy | Medium | Complex |
| Real-time | Yes | Near real-time | Yes |

### Server-Side Tracking Implementation

```typescript
import { PostHog } from "posthog-node";

const posthog = new PostHog(process.env.POSTHOG_API_KEY!, {
  host: "https://app.posthog.com",
});

// Track server-side events
async function trackServerEvent(
  userId: string,
  event: string,
  properties: Record<string, unknown>
): Promise<void> {
  posthog.capture({
    distinctId: userId,
    event,
    properties: {
      ...properties,
      $ip: "auto", // PostHog will resolve geo from IP
      source: "server",
    },
  });
}

// Middleware to track API usage
export async function apiTrackingMiddleware(
  req: Request,
  userId: string,
  responseTimeMs: number
): Promise<void> {
  await trackServerEvent(userId, "api_call", {
    endpoint: new URL(req.url).pathname,
    method: req.method,
    response_time_ms: responseTimeMs,
    status_code: 200,
  });
}
```

## Privacy-Compliant Analytics

```typescript
interface ConsentConfig {
  required: boolean;
  categories: {
    necessary: boolean; // Always true
    analytics: boolean;
    marketing: boolean;
    personalization: boolean;
  };
}

class PrivacyCompliantAnalytics {
  private consent: ConsentConfig;

  constructor(consent: ConsentConfig) {
    this.consent = consent;
  }

  track(event: string, properties: Record<string, unknown>): void {
    if (!this.consent.categories.analytics) {
      // Only track necessary events (e.g., page views for operational metrics)
      if (!this.isNecessaryEvent(event)) return;
    }

    // Strip PII before sending
    const sanitized = this.sanitizeProperties(properties);
    analytics.capture(event, sanitized);
  }

  private sanitizeProperties(
    props: Record<string, unknown>
  ): Record<string, unknown> {
    const piiKeys = ["email", "phone", "name", "address", "ip"];
    const sanitized = { ...props };

    for (const key of piiKeys) {
      if (key in sanitized) {
        if (key === "email") {
          // Hash email for cross-device tracking without storing PII
          sanitized[`${key}_hash`] = hashEmail(sanitized[key] as string);
        }
        delete sanitized[key];
      }
    }

    return sanitized;
  }

  private isNecessaryEvent(event: string): boolean {
    return ["page_view", "error", "performance"].includes(event);
  }
}
```

### Data Retention Policy

```typescript
// Configure data retention per analytics provider
const RETENTION_CONFIG = {
  posthog: {
    rawDataRetention: "12 months", // Auto-delete raw events after 12 months
    aggregatedRetention: "unlimited", // Aggregated metrics kept forever
  },
  actions: {
    onRetentionExpiry: "anonymize", // anonymize or delete
    excludeEvents: ["$pageview"], // Keep pageview data longer
  },
};
```

## A/B Testing Infrastructure

```typescript
interface Experiment {
  id: string;
  name: string;
  variants: { id: string; weight: number }[];
  targetMetric: string;
  minimumSampleSize: number;
  startDate: Date;
  endDate?: Date;
}

class FeatureFlagService {
  private posthog: PostHog;

  async getVariant(
    experimentId: string,
    userId: string
  ): Promise<string> {
    // Consistent assignment: same user always gets same variant
    const variant = this.posthog.getFeatureFlag(experimentId, userId);
    return variant ?? "control";
  }

  async trackExperimentResult(
    experimentId: string,
    userId: string,
    metricName: string,
    value: number
  ): Promise<void> {
    const variant = await this.getVariant(experimentId, userId);

    this.posthog.capture("$feature_flag_called", {
      $feature_flag: experimentId,
      $feature_flag_response: variant,
    });

    this.posthog.capture(metricName, {
      value,
      experiment_id: experimentId,
      variant,
    });
  }
}

// Statistical significance calculator
function calculateSignificance(
  controlConversions: number,
  controlTotal: number,
  variantConversions: number,
  variantTotal: number
): { significant: boolean; confidence: number; lift: number } {
  const controlRate = controlConversions / controlTotal;
  const variantRate = variantConversions / variantTotal;
  const lift = (variantRate - controlRate) / controlRate;

  // Two-proportion z-test
  const pooledRate =
    (controlConversions + variantConversions) / (controlTotal + variantTotal);
  const standardError = Math.sqrt(
    pooledRate *
      (1 - pooledRate) *
      (1 / controlTotal + 1 / variantTotal)
  );
  const zScore = (variantRate - controlRate) / standardError;

  // Approximate p-value from z-score
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));
  const confidence = 1 - pValue;

  return {
    significant: confidence >= 0.95,
    confidence: Math.round(confidence * 1000) / 10,
    lift: Math.round(lift * 1000) / 10,
  };
}
```

## Anti-Patterns

- **Tracking everything without a taxonomy** -- unstructured events create noise that makes analysis harder. Define a schema-first approach with documented events and properties.
- **Using client-side tracking exclusively for critical business events** -- ad blockers and network issues can lose 10-30% of client-side events. Use server-side tracking for payment, signup, and activation events.
- **Identifying users before consent** -- calling `identify()` before the user accepts analytics cookies violates GDPR. Gate identification behind consent.
- **Running A/B tests without minimum sample size calculation** -- peeking at results early and stopping tests prematurely leads to false positives. Pre-calculate required sample sizes.
- **Storing raw PII in analytics events** -- email addresses and names in event properties create compliance risk. Hash identifiers or use server-side enrichment.
- **Not tracking the anonymous-to-identified transition** -- without proper aliasing, pre-signup behavior gets orphaned and funnel analysis breaks at the signup step.

## Related Skills

- [[csp-seo-engineering]] -- Tracking organic traffic and SEO metrics
- [[csp-subscription-management]] -- Subscription conversion and churn analytics
- [[csp-webhook-architecture]] -- Event delivery for analytics pipeline
- [[csp-privacy-compliance]] -- GDPR/CCPA compliance for data collection
