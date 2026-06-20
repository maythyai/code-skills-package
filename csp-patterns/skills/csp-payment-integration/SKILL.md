---
name: csp-payment-integration
description: >
  Implements Stripe and LemonSqueezy payment integration patterns including checkout sessions, webhook handling, error recovery, and multi-currency support for SaaS and e-commerce applications.
version: 0.1.0
layer: 4
category: patterns
---

# Payment Integration

Comprehensive patterns for integrating payment providers into web applications with secure checkout flows, reliable webhook processing, and robust error handling.

## When to Activate

- Building a checkout flow for one-time or recurring payments
- Choosing between Stripe, LemonSqueezy, or Paddle as a payment provider
- Implementing webhook handlers for payment events
- Handling declined cards, 3DS authentication, and retry logic
- Adding multi-currency support to an existing payment system
- Reducing PCI compliance scope through client-side tokenization

## Provider Comparison

| Feature | Stripe | LemonSqueezy | Paddle |
|---------|--------|--------------|--------|
| Merchant of Record | No (you are) | Yes (they are) | Yes (they are) |
| Tax Handling | Manual or Stripe Tax | Automatic | Automatic |
| PCI Scope | Tokenization reduces scope | Fully hosted | Fully hosted |
| Fee Structure | 2.9% + 30c per txn | 5% + 50c per txn | 5% + 50c per txn |
| Checkout UI | Hosted or embedded | Hosted only | Hosted only |
| Subscription Support | Full API | Full API | Full API |
| Multi-currency | 135+ currencies | 100+ currencies | 100+ currencies |
| Payout Speed | 2-7 days rolling | Weekly | Weekly |
| Best For | Custom flows, full control | Indie/SMB, tax handled | EU-heavy, tax handled |

**Decision rule**: Use Stripe when you need full API control and custom checkout UI. Use LemonSqueezy or Paddle when you want the provider to handle tax compliance and act as Merchant of Record.

## One-Time Payments

### Stripe Checkout Session (TypeScript)

```typescript
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

export async function createCheckoutSession(
  priceId: string,
  customerEmail: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: customerEmail,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      source: "web",
      campaign: "launch",
    },
    // Idempotency: pass a unique key to prevent duplicate charges
    idempotency_key: `checkout-${Date.now()}-${customerEmail}`,
  });
}
```

### Webhook Handler for Payment Completion

```typescript
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency: check if we already processed this event
  const alreadyProcessed = await db.webhookEvents.findUnique({
    where: { eventId: event.id },
  });
  if (alreadyProcessed) {
    return NextResponse.json({ received: true });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handlePaymentSuccess(session);
      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentFailure(intent);
      break;
    }
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  // Record event processing for idempotency
  await db.webhookEvents.create({
    data: { eventId: event.id, type: event.type, processedAt: new Date() },
  });

  return NextResponse.json({ received: true });
}
```

## Security: PCI Compliance Scope Reduction

### Client-Side Tokenization with Stripe Elements

```typescript
// Client-side: collect card details without touching your server
import { loadStripe } from "@stripe/stripe-js";

const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

async function collectPayment() {
  const { paymentIntent, error } = await stripe.confirmCardPayment(
    clientSecret, // obtained from your server
    {
      payment_method: {
        card: cardElement, // Stripe Elements card input
        billing_details: {
          name: customerName,
          email: customerEmail,
        },
      },
    }
  );

  if (error) {
    showPaymentError(error.message);
    return;
  }

  if (paymentIntent.status === "succeeded") {
    showSuccessConfirmation();
  }
}
```

### PCI Scope Decision Table

| Approach | PCI Scope | Complexity | UX Control |
|----------|-----------|------------|------------|
| Stripe Checkout (hosted) | Minimal (SAQ-A) | Low | Limited |
| Stripe Elements (iframe) | Reduced (SAQ-A) | Medium | Good |
| Raw card data to Stripe API | Full (SAQ-D) | High | Full |
| LemonSqueezy hosted | None (MoR) | Low | None |

**Rule**: Always prefer hosted checkout or Elements. Never collect raw card numbers on your server unless absolutely necessary.

## Error Handling

### Declined Cards and 3DS Authentication

```typescript
async function createPaymentIntent(
  amount: number,
  currency: string
): Promise<{ clientSecret: string; status: string }> {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      status: paymentIntent.status,
    };
  } catch (err) {
    if (err instanceof Stripe.errors.StripeCardError) {
      // Card was declined
      const declineCode = err.decline_code;
      return handleDecline(declineCode, err.message);
    }
    throw err;
  }
}

function handleDecline(
  declineCode: string | undefined,
  message: string
): { clientSecret: string; status: string } {
  const declineMessages: Record<string, string> = {
    insufficient_funds: "Insufficient funds. Please use a different card.",
    expired_card: "This card has expired. Please use a different card.",
    incorrect_cvc: "Incorrect security code. Please try again.",
    card_declined: "Your card was declined. Please contact your bank.",
    processing_error: "Processing error. Please try again.",
  };

  const userMessage = declineMessages[declineCode ?? ""] ?? message;
  throw new PaymentError(userMessage, declineCode);
}
```

### Retry Logic for Transient Failures

```typescript
async function retryPayment(
  paymentIntentId: string,
  maxRetries = 3
): Promise<Stripe.PaymentIntent> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (intent.status === "succeeded") return intent;
      if (intent.status === "requires_payment_method") {
        throw new PaymentError("Payment method failed, please try again.");
      }

      // Exponential backoff: 1s, 2s, 4s
      await sleep(Math.pow(2, attempt) * 1000);
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
  throw new PaymentError("Payment failed after maximum retries.");
}
```

## Receipt and Invoice Generation

```typescript
async function generateInvoice(
  paymentIntentId: string,
  customerDetails: { name: string; email: string; address: string }
): Promise<string> {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["charges.data.balance_transaction"],
  });

  // Use Stripe's built-in receipt or generate custom PDF
  if (paymentIntent.charges.data[0]?.receipt_url) {
    return paymentIntent.charges.data[0].receipt_url;
  }

  // Custom invoice generation
  const invoiceData = {
    number: `INV-${Date.now()}`,
    date: new Date().toISOString(),
    customer: customerDetails,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency.toUpperCase(),
    items: paymentIntent.metadata.items
      ? JSON.parse(paymentIntent.metadata.items)
      : [],
  };

  return await renderInvoicePdf(invoiceData);
}
```

## Multi-Currency Support

```typescript
interface PriceConfig {
  currency: string;
  amount: number; // in smallest unit (cents, pence, etc.)
  displayPrice: string;
}

const PRICE_TABLE: Record<string, PriceConfig[]> = {
  "plan-pro": [
    { currency: "usd", amount: 2900, displayPrice: "$29.00" },
    { currency: "eur", amount: 2700, displayPrice: "27.00 EUR" },
    { currency: "gbp", amount: 2400, displayPrice: "24.00 GBP" },
    { currency: "jpy", amount: 4300, displayPrice: "4,300 JPY" }, // no subunits
  ],
};

async function createLocalizedCheckout(
  planId: string,
  userLocale: string,
  successUrl: string
): Promise<Stripe.Checkout.Session> {
  const currency = getCurrencyForLocale(userLocale);
  const price = PRICE_TABLE[planId]?.find((p) => p.currency === currency);

  if (!price) {
    throw new Error(`No price configured for ${planId} in ${currency}`);
  }

  return stripe.checkout.sessions.create({
    mode: "payment",
    currency: price.currency,
    line_items: [{ price_data: buildPriceData(price), quantity: 1 }],
    success_url: successUrl,
    cancel_url: `${process.env.APP_URL}/pricing`,
  });
}

function getCurrencyForLocale(locale: string): string {
  const localeCurrencyMap: Record<string, string> = {
    "en-US": "usd",
    "en-GB": "gbp",
    "de-DE": "eur",
    "fr-FR": "eur",
    "ja-JP": "jpy",
  };
  return localeCurrencyMap[locale] ?? "usd";
}
```

## LemonSqueezy Integration

```typescript
interface LemonSqueezyConfig {
  apiKey: string;
  storeId: string;
}

async function createLemonSqueezyCheckout(
  variantId: string,
  customerEmail: string,
  customData: Record<string, string>
): Promise<string> {
  const response = await fetch(
    `https://api.lemonsqueezy.com/v1/checkouts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/vnd.api+json",
        Accept: "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: customerEmail,
              custom: customData,
            },
          },
          relationships: {
            store: { data: { type: "stores", id: config.storeId } },
            variant: { data: { type: "variants", id: variantId } },
          },
        },
      }),
    }
  );

  const result = await response.json();
  return result.data.attributes.url;
}
```

## Anti-Patterns

- **Storing raw card data on your server** -- this puts you in full PCI scope (SAQ-D). Use Stripe Elements or hosted checkout instead.
- **Processing webhook events without idempotency checks** -- webhooks can be delivered multiple times. Always check if an event ID was already processed before taking action.
- **Returning HTTP 200 for all webhook events regardless of processing success** -- return appropriate status codes so the provider knows to retry failed deliveries.
- **Hardcoding prices in frontend code** -- always fetch prices from your backend or the provider API to prevent client-side price manipulation.
- **Ignoring webhook signature verification** -- always verify the webhook signature to prevent spoofed events from triggering payment actions.
- **Not setting idempotency keys on payment creation calls** -- network retries can create duplicate charges without idempotency keys.

## Related Skills

- [[csp-subscription-management]] -- Subscription lifecycle and recurring billing
- [[csp-webhook-architecture]] -- General webhook sending and receiving patterns
- [[csp-api-governance]] -- Rate limiting and API key management for payment endpoints
- [[csp-security-review]] -- Security review patterns for payment-critical code
