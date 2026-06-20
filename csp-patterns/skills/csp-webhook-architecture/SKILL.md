---
name: csp-webhook-architecture
description: >
  Designs webhook sending and receiving systems with signature verification, idempotent processing, reliable delivery with retries, management UIs, and monitoring for production-grade event-driven architectures.
version: 0.1.0
layer: 4
category: patterns
---

# Webhook Architecture

Production-grade patterns for building webhook systems that reliably send and receive events, with security verification, retry logic, and operational monitoring.

## When to Activate

- Building an API that needs to notify external systems of events
- Receiving webhooks from payment providers, CI/CD, or third-party services
- Implementing signature verification for incoming webhook payloads
- Designing retry and dead-letter handling for webhook delivery
- Building a webhook management UI for user-configurable endpoints
- Monitoring webhook delivery health and diagnosing failures

## Receiving Webhooks

### Signature Verification (HMAC-SHA256)

```typescript
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

interface WebhookConfig {
  secret: string;
  headerName: string;
  algorithm: "sha256" | "sha1";
  toleranceSeconds: number; // Max age for timestamp-based signatures
}

const STRIPE_CONFIG: WebhookConfig = {
  secret: process.env.STRIPE_WEBHOOK_SECRET!,
  headerName: "stripe-signature",
  algorithm: "sha256",
  toleranceSeconds: 300, // 5 minutes
};

function verifySignature(
  payload: string,
  signature: string,
  config: WebhookConfig
): boolean {
  // Stripe format: t=timestamp,v1=signature
  const elements = signature.split(",");
  const timestamp = elements.find((e) => e.startsWith("t="))?.split("=")[1];
  const sig = elements.find((e) => e.startsWith("v1="))?.split("=")[1];

  if (!timestamp || !sig) return false;

  // Check timestamp tolerance (prevent replay attacks)
  const age = Math.abs(Date.now() / 1000 - parseInt(timestamp));
  if (age > config.toleranceSeconds) return false;

  // Compute expected signature
  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac(config.algorithm, config.secret)
    .update(signedPayload)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(sig),
    Buffer.from(expected)
  );
}

// Generic HMAC verification for simpler providers
function verifyHmac(
  payload: string,
  signature: string,
  secret: string,
  algorithm: "sha256" | "sha1" = "sha256"
): boolean {
  const expected = crypto
    .createHmac(algorithm, secret)
    .update(payload)
    .digest("hex");

  const sig = signature.replace("sha256=", "").replace("sha1=", "");

  if (sig.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
```

### Idempotent Webhook Processing

```typescript
interface WebhookEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: Date;
}

async function processWebhookEvent(
  event: WebhookEvent,
  rawBody: string,
  signature: string
): Promise<{ status: "processed" | "duplicate" | "error" }> {
  // Step 1: Verify signature
  if (!verifySignature(rawBody, signature, STRIPE_CONFIG)) {
    return { status: "error" };
  }

  // Step 2: Idempotency check
  const existing = await db.webhookEvents.findUnique({
    where: { eventId: event.id },
  });

  if (existing && existing.processedAt) {
    return { status: "duplicate" };
  }

  // Step 3: Process in a transaction
  try {
    await db.$transaction(async (tx) => {
      // Record event receipt
      await tx.webhookEvents.upsert({
        where: { eventId: event.id },
        create: {
          eventId: event.id,
          type: event.type,
          payload: event.data,
          receivedAt: new Date(),
        },
        update: { receivedAt: new Date() },
      });

      // Process the event
      await handleEvent(tx, event);

      // Mark as processed
      await tx.webhookEvents.update({
        where: { eventId: event.id },
        data: { processedAt: new Date() },
      });
    });

    return { status: "processed" };
  } catch (err) {
    console.error(`Webhook processing failed for ${event.id}:`, err);
    return { status: "error" };
  }
}

// Express webhook handler
import express from "express";

const app = express();

app.post(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const body = req.body.toString();
    const signature = req.headers["stripe-signature"] as string;

    let event: WebhookEvent;
    try {
      event = JSON.parse(body);
    } catch {
      res.status(400).json({ error: "Invalid JSON" });
      return;
    }

    const result = await processWebhookEvent(event, body, signature);

    switch (result.status) {
      case "processed":
      case "duplicate":
        res.status(200).json({ received: true });
        break;
      case "error":
        res.status(400).json({ error: "Processing failed" });
        break;
    }
  }
);
```

## Sending Webhooks

### Reliable Delivery with Retry

```typescript
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

interface WebhookDelivery {
  id: string;
  endpointId: string;
  url: string;
  event: string;
  payload: Record<string, unknown>;
  secret: string;
  attempt: number;
  maxAttempts: number;
}

const webhookQueue = new Queue("webhook-delivery", {
  connection: new IORedis(process.env.REDIS_URL!),
});

async function sendWebhook(
  endpointId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const endpoint = await db.webhookEndpoints.findUniqueOrThrow({
    where: { id: endpointId },
  });

  // Check if endpoint subscribes to this event
  if (!endpoint.events.includes(event) && !endpoint.events.includes("*")) {
    return;
  }

  await webhookQueue.add(
    "deliver",
    {
      id: crypto.randomUUID(),
      endpointId,
      url: endpoint.url,
      event,
      payload,
      secret: endpoint.secret,
      attempt: 1,
      maxAttempts: 5,
    },
    {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 1000, // 1s, 2s, 4s, 8s, 16s
      },
      // Add jitter to prevent thundering herd
      jitter: { type: "full", value: 1000 },
    }
  );
}
```

### Delivery Worker

```typescript
const deliveryWorker = new Worker(
  "webhook-delivery",
  async (job) => {
    const { url, event, payload, secret, attempt } = job.data as WebhookDelivery;

    const body = JSON.stringify({
      id: job.data.id,
      event,
      data: payload,
      created_at: new Date().toISOString(),
    });

    // Sign the payload
    const signature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Id": job.data.id,
        "X-Webhook-Event": event,
        "X-Webhook-Signature": `sha256=${signature}`,
        "X-Webhook-Timestamp": String(Date.now()),
      },
      body,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    // Record delivery attempt
    await db.webhookDeliveries.create({
      data: {
        deliveryId: job.data.id,
        endpointId: job.data.endpointId,
        event,
        statusCode: response.status,
        attempt,
        success: response.ok,
        responseTime: 0, // measure with performance API
        deliveredAt: new Date(),
      },
    });

    // Consider 2xx as success, anything else triggers retry
    if (!response.ok) {
      throw new Error(`Delivery failed: HTTP ${response.status}`);
    }

    // Disable endpoint after consecutive failures
    const recentFailures = await db.webhookDeliveries.count({
      where: {
        endpointId: job.data.endpointId,
        success: false,
        deliveredAt: { gte: new Date(Date.now() - 24 * 3600000) },
      },
    });

    if (recentFailures > 100) {
      await db.webhookEndpoints.update({
        where: { id: job.data.endpointId },
        data: { enabled: false, disabledReason: "Too many failures" },
      });
    }
  },
  {
    connection: new IORedis(process.env.REDIS_URL!),
    concurrency: 20,
  }
);
```

## Webhook Management UI

### Database Schema

```typescript
// Prisma schema for webhook management
// schema.prisma

model WebhookEndpoint {
  id            String   @id @default(cuid())
  userId        String
  url           String
  secret        String   @default(cuid())
  events        String[] // ["payment.completed", "subscription.*"]
  enabled       Boolean  @default(true)
  disabledReason String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  deliveries    WebhookDelivery[]
}

model WebhookDelivery {
  id            String   @id @default(cuid())
  endpointId    String
  deliveryId    String   @unique
  event         String
  statusCode    Int?
  attempt       Int
  success       Boolean
  responseTime  Float
  requestBody   String?
  responseBody  String?
  deliveredAt   DateTime @default(now())

  endpoint      WebhookEndpoint @relation(fields: [endpointId], references: [id])

  @@index([endpointId, deliveredAt])
}

model WebhookEvent {
  eventId     String    @id
  type        String
  payload     Json
  receivedAt  DateTime  @default(now())
  processedAt DateTime?

  @@index([type])
}
```

### API Endpoints for Management

```typescript
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

// Create webhook endpoint
export async function POST(request: NextRequest) {
  const { url, events, description } = await request.json();
  const userId = await getAuthenticatedUser(request);

  // Validate URL
  if (!isValidWebhookUrl(url)) {
    return NextResponse.json(
      { error: "Invalid webhook URL" },
      { status: 400 }
    );
  }

  const endpoint = await db.webhookEndpoints.create({
    data: {
      userId,
      url,
      secret: `whsec_${crypto.randomBytes(32).toString("hex")}`,
      events: events ?? ["*"],
    },
  });

  // Send test ping
  await sendTestPing(endpoint.url, endpoint.secret);

  return NextResponse.json({
    id: endpoint.id,
    url: endpoint.url,
    secret: endpoint.secret, // Only shown once
    events: endpoint.events,
  });
}

function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Must be HTTPS in production
    if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
      return false;
    }
    // Block internal/private IPs
    const hostname = parsed.hostname;
    if (
      hostname === "localhost" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.endsWith(".internal")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
```

## Security: IP Allowlisting and Rate Limiting

```typescript
interface WebhookSecurityConfig {
  allowedIPs?: string[]; // IP allowlist
  rateLimit: { max: number; windowMs: number };
  requireHTTPS: boolean;
  payloadSizeLimit: number; // bytes
}

function createWebhookSecurityMiddleware(config: WebhookSecurityConfig) {
  return (req: Request, res: Response, next: () => void) => {
    // IP allowlisting
    if (config.allowedIPs?.length) {
      const clientIP = req.headers["x-forwarded-for"]?.split(",")[0]?.trim();
      if (!config.allowedIPs.includes(clientIP ?? "")) {
        res.status(403).json({ error: "IP not allowed" });
        return;
      }
    }

    // Payload size limit
    const contentLength = parseInt(req.headers["content-length"] ?? "0");
    if (contentLength > config.payloadSizeLimit) {
      res.status(413).json({ error: "Payload too large" });
      return;
    }

    next();
  };
}
```

## Testing Webhooks

### Local Development with Webhook Relay

```typescript
// Development: use ngrok or similar for local webhook testing
// ngrok http 3000 -> https://abc123.ngrok.io/webhooks/stripe

// Replay testing: save webhook payloads for replay
async function saveWebhookForReplay(
  eventId: string,
  payload: string
): Promise<void> {
  await fs.writeFile(
    `./test/fixtures/webhooks/${eventId}.json`,
    payload
  );
}

// Replay a saved webhook
async function replayWebhook(eventId: string): Promise<void> {
  const payload = await fs.readFile(
    `./test/fixtures/webhooks/${eventId}.json`,
    "utf-8"
  );

  await fetch("http://localhost:3000/webhooks/stripe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": generateTestSignature(payload),
    },
    body: payload,
  });
}

function generateTestSignature(payload: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const sig = crypto
    .createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET!)
    .update(signedPayload)
    .digest("hex");

  return `t=${timestamp},v1=${sig}`;
}
```

## Monitoring: Delivery Health

```typescript
interface WebhookMetrics {
  endpointId: string;
  period: string;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  avgResponseTimeMs: number;
  p99ResponseTimeMs: number;
  successRate: number;
}

async function getWebhookMetrics(
  endpointId: string,
  periodHours: number = 24
): Promise<WebhookMetrics> {
  const since = new Date(Date.now() - periodHours * 3600000);

  const deliveries = await db.webhookDeliveries.findMany({
    where: {
      endpointId,
      deliveredAt: { gte: since },
    },
    select: {
      success: true,
      responseTime: true,
    },
  });

  const successful = deliveries.filter((d) => d.success);
  const times = deliveries.map((d) => d.responseTime).sort((a, b) => a - b);

  return {
    endpointId,
    period: `${periodHours}h`,
    totalDeliveries: deliveries.length,
    successfulDeliveries: successful.length,
    failedDeliveries: deliveries.length - successful.length,
    avgResponseTimeMs:
      times.reduce((sum, t) => sum + t, 0) / times.length || 0,
    p99ResponseTimeMs: times[Math.floor(times.length * 0.99)] ?? 0,
    successRate:
      deliveries.length > 0
        ? Math.round((successful.length / deliveries.length) * 1000) / 10
        : 0,
  };
}

// Alert on delivery degradation
async function checkWebhookHealth(): Promise<void> {
  const endpoints = await db.webhookEndpoints.findMany({
    where: { enabled: true },
  });

  for (const endpoint of endpoints) {
    const metrics = await getWebhookMetrics(endpoint.id, 1); // Last hour

    if (metrics.successRate < 90 && metrics.totalDeliveries > 10) {
      await sendAlert({
        level: "warning",
        message: `Webhook delivery degraded for ${endpoint.url}: ${metrics.successRate}% success rate`,
        endpointId: endpoint.id,
      });
    }

    if (metrics.successRate < 50 && metrics.totalDeliveries > 5) {
      await sendAlert({
        level: "critical",
        message: `Webhook delivery critical for ${endpoint.url}: ${metrics.successRate}% success rate`,
        endpointId: endpoint.id,
      });
    }
  }
}
```

## Anti-Patterns

- **Processing webhooks synchronously in the HTTP handler** -- acknowledge receipt immediately (200) and process asynchronously via a job queue. Slow processing causes timeouts and duplicate deliveries.
- **Skipping signature verification in production** -- without verification, anyone can send fake webhook events to your endpoint. Always verify signatures using constant-time comparison.
- **Not implementing idempotency on webhook processing** -- providers will retry deliveries, and your handler must be safe to call multiple times for the same event ID.
- **Hardcoding retry logic instead of using a proper job queue** -- exponential backoff with jitter requires persistence and scheduling. Use BullMQ, Bull, or a cloud-native queue service.
- **Returning 500 for expected error conditions** -- if the webhook payload is valid but your business logic rejects it (e.g., already processed), return 200. Reserve 5xx for actual server errors.
- **Not monitoring webhook delivery success rates** -- silent failures accumulate. Set up alerts for success rate drops below 90% and auto-disable endpoints after sustained failures.

## Related Skills

- [[csp-payment-integration]] -- Stripe and payment webhook processing
- [[csp-subscription-management]] -- Subscription state sync via webhooks
- [[csp-api-governance]] -- Rate limiting and API security patterns
- [[csp-email-systems]] -- Email delivery webhook processing (bounces, opens)
