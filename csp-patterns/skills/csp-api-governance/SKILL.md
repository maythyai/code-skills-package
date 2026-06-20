---
name: csp-api-governance
description: >
  Governs public and internal APIs with rate limiting algorithms, API key management, usage metering, versioning strategies, error standardization, and monitoring for reliable API operations.
version: 0.1.0
layer: 4
category: patterns
---

# API Governance

Patterns for managing API operations at scale, including rate limiting, API key lifecycle management, usage metering, versioning, error standardization, and health monitoring.

## When to Activate

- Implementing rate limiting on public or internal APIs
- Building an API key management system with generation, rotation, and revocation
- Adding usage metering and quota enforcement to API endpoints
- Choosing an API versioning strategy
- Standardizing error responses with RFC 7807 Problem Details
- Setting up API health monitoring and SLA tracking

## Rate Limiting Algorithms

### Algorithm Comparison

| Algorithm | Burst Handling | Memory | Accuracy | Complexity | Best For |
|-----------|---------------|--------|----------|------------|----------|
| Token Bucket | Allows bursts | Low | Good | Medium | General API rate limiting |
| Sliding Window Log | No bursts | High | Exact | Simple | Low-traffic, strict limits |
| Sliding Window Counter | Smoothed bursts | Low | Good | Medium | High-traffic APIs |
| Leaky Bucket | Constant rate | Low | Strict | Medium | Queue-based processing |
| Fixed Window | End-of-window bursts | Very Low | Approximate | Simple | Simple implementations |

### Token Bucket Implementation (TypeScript)

```typescript
interface TokenBucket {
  tokens: number;
  maxTokens: number;
  refillRate: number; // tokens per second
  lastRefill: number; // timestamp in ms
}

class RateLimiter {
  private buckets = new Map<string, TokenBucket>();

  constructor(
    private maxTokens: number,
    private refillRate: number // tokens per second
  ) {}

  consume(key: string, tokens: number = 1): { allowed: boolean; remaining: number; retryAfter?: number } {
    const bucket = this.getOrCreateBucket(key);
    this.refill(bucket);

    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      return { allowed: true, remaining: Math.floor(bucket.tokens) };
    }

    const retryAfter = Math.ceil((tokens - bucket.tokens) / this.refillRate);
    return {
      allowed: false,
      remaining: 0,
      retryAfter,
    };
  }

  private getOrCreateBucket(key: string): TokenBucket {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = {
        tokens: this.maxTokens,
        maxTokens: this.maxTokens,
        refillRate: this.refillRate,
        lastRefill: Date.now(),
      };
      this.buckets.set(key, bucket);
    }
    return bucket;
  }

  private refill(bucket: TokenBucket): void {
    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000;
    const newTokens = elapsed * bucket.refillRate;

    bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + newTokens);
    bucket.lastRefill = now;
  }
}

// Express middleware
function rateLimitMiddleware(
  limiter: RateLimiter,
  keyFn: (req: Request) => string
) {
  return (req: Request, res: Response, next: () => void) => {
    const key = keyFn(req);
    const result = limiter.consume(key);

    res.setHeader("X-RateLimit-Limit", limiter.maxTokens);
    res.setHeader("X-RateLimit-Remaining", result.remaining);

    if (!result.allowed) {
      res.setHeader("Retry-After", result.retryAfter ?? 60);
      res.status(429).json({
        type: "https://api.acme.com/errors/rate-limited",
        title: "Too Many Requests",
        status: 429,
        detail: `Rate limit exceeded. Retry after ${result.retryAfter} seconds.`,
        instance: req.url,
      });
      return;
    }

    next();
  };
}
```

### Redis-Based Sliding Window (Distributed)

```typescript
import Redis from "ioredis";

class DistributedRateLimiter {
  constructor(private redis: Redis) {}

  async checkLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;
    const redisKey = `ratelimit:${key}`;

    const pipeline = this.redis.pipeline();

    // Remove entries outside the window
    pipeline.zremrangebyscore(redisKey, 0, windowStart);
    // Count remaining entries
    pipeline.zcard(redisKey);
    // Add current request
    pipeline.zadd(redisKey, now, `${now}:${Math.random()}`);
    // Set expiry on the key
    pipeline.expire(redisKey, windowSeconds);

    const results = await pipeline.exec();
    const currentCount = (results?.[1]?.[1] as number) ?? 0;
    const remaining = Math.max(0, maxRequests - currentCount - 1);

    return {
      allowed: currentCount < maxRequests,
      remaining,
      resetAt: now + windowSeconds * 1000,
    };
  }
}

// Usage with per-user and per-endpoint limits
const limiter = new DistributedRateLimiter(new Redis(process.env.REDIS_URL!));

const RATE_LIMITS = {
  "POST /api/v1/payments": { max: 10, window: 60 },
  "GET /api/v1/users": { max: 100, window: 60 },
  "POST /api/v1/search": { max: 30, window: 60 },
  default: { max: 200, window: 60 },
};

function getRateLimit(
  method: string,
  path: string
): { max: number; window: number } {
  const key = `${method} ${path}`;
  return RATE_LIMITS[key as keyof typeof RATE_LIMITS] ?? RATE_LIMITS.default;
}
```

## API Key Management

### Key Generation and Storage

```typescript
import crypto from "node:crypto";

interface ApiKeyRecord {
  id: string;
  keyHash: string; // SHA-256 hash of the key
  keyPrefix: string; // First 8 chars for identification
  userId: string;
  name: string;
  scopes: string[];
  rateLimit: { max: number; window: number };
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
}

async function generateApiKey(
  userId: string,
  name: string,
  scopes: string[],
  rateLimit?: { max: number; window: number }
): Promise<{ key: string; record: ApiKeyRecord }> {
  // Generate: prefix_live_randomhex
  const prefix = `acme_${scopes.includes("admin") ? "admin" : "live"}`;
  const random = crypto.randomBytes(24).toString("hex");
  const key = `${prefix}_${random}`;

  const keyHash = crypto.createHash("sha256").update(key).digest("hex");

  const record = await db.apiKeys.create({
    data: {
      keyHash,
      keyPrefix: key.substring(0, 12),
      userId,
      name,
      scopes,
      rateLimit: rateLimit ?? { max: 1000, window: 60 },
      expiresAt: null,
    },
  });

  // Return the raw key ONLY once at creation time
  return { key, record };
}

// Validate API key on each request
async function validateApiKey(
  rawKey: string
): Promise<ApiKeyRecord | null> {
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const record = await db.apiKeys.findUnique({
    where: { keyHash },
  });

  if (!record) return null;

  // Check expiration
  if (record.expiresAt && record.expiresAt < new Date()) {
    return null;
  }

  // Update last used timestamp (async, don't block response)
  db.apiKeys
    .update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return record;
}
```

### Key Rotation

```typescript
async function rotateApiKey(
  keyId: string,
  userId: string
): Promise<{ newKey: string; gracePeriodHours: number }> {
  const oldRecord = await db.apiKeys.findFirstOrThrow({
    where: { id: keyId, userId },
  });

  // Generate new key with same scopes
  const { key: newKey } = await generateApiKey(
    userId,
    oldRecord.name,
    oldRecord.scopes,
    oldRecord.rateLimit
  );

  // Set grace period on old key (24 hours)
  const gracePeriodHours = 24;
  await db.apiKeys.update({
    where: { id: keyId },
    data: {
      expiresAt: new Date(Date.now() + gracePeriodHours * 3600000),
      name: `${oldRecord.name} (rotating)`,
    },
  });

  return { newKey, gracePeriodHours };
}

// Revoke key immediately
async function revokeApiKey(keyId: string, userId: string): Promise<void> {
  await db.apiKeys.updateMany({
    where: { id: keyId, userId },
    data: { expiresAt: new Date(), scopes: [] },
  });

  // Log revocation for audit trail
  await db.auditLogs.create({
    data: {
      action: "api_key_revoked",
      userId,
      resourceId: keyId,
      timestamp: new Date(),
    },
  });
}
```

## Usage Metering

### Per-Endpoint Tracking

```typescript
interface UsageRecord {
  apiKeyId: string;
  endpoint: string;
  timestamp: Date;
  responseStatus: number;
  requestSize: number;
  responseSize: number;
  latencyMs: number;
}

async function recordApiUsage(record: UsageRecord): Promise<void> {
  // Write to time-series storage (ClickHouse, TimescaleDB)
  await db.apiUsage.create({ data: record });

  // Check quota asynchronously
  await checkQuota(record.apiKeyId);
}

interface QuotaConfig {
  period: "daily" | "monthly";
  maxRequests: number;
  maxBandwidthMB: number;
  overageAction: "throttle" | "block" | "bill";
  overagePricePer1K?: number; // for billing
}

async function checkQuota(apiKeyId: string): Promise<void> {
  const quota = await getQuotaConfig(apiKeyId);
  if (!quota) return;

  const usage = await getUsageForPeriod(apiKeyId, quota.period);

  if (usage.requests >= quota.maxRequests) {
    switch (quota.overageAction) {
      case "throttle":
        await setThrottleRate(apiKeyId, 10); // 10 req/min
        break;
      case "block":
        await blockApiKey(apiKeyId, "Quota exceeded");
        break;
      case "bill":
        // Record overage for billing
        const overage = usage.requests - quota.maxRequests;
        await recordOverageCharge(apiKeyId, overage, quota.overagePricePer1K);
        break;
    }
  }
}
```

### Usage Dashboard Query

```typescript
async function getUsageSummary(
  apiKeyId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalRequests: number;
  successRate: number;
  avgLatencyMs: number;
  topEndpoints: { endpoint: string; count: number }[];
  dailyBreakdown: { date: string; requests: number; errors: number }[];
}> {
  const usage = await db.apiUsage.findMany({
    where: {
      apiKeyId,
      timestamp: { gte: startDate, lte: endDate },
    },
    select: {
      endpoint: true,
      responseStatus: true,
      latencyMs: true,
      timestamp: true,
    },
  });

  const total = usage.length;
  const successes = usage.filter((u) => u.responseStatus < 400).length;

  const endpointCounts = usage.reduce(
    (acc, u) => {
      acc[u.endpoint] = (acc[u.endpoint] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const topEndpoints = Object.entries(endpointCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([endpoint, count]) => ({ endpoint, count }));

  return {
    totalRequests: total,
    successRate: total > 0 ? Math.round((successes / total) * 1000) / 10 : 0,
    avgLatencyMs:
      total > 0
        ? Math.round(
            usage.reduce((sum, u) => sum + u.latencyMs, 0) / total
          )
        : 0,
    topEndpoints,
    dailyBreakdown: buildDailyBreakdown(usage),
  };
}
```

## API Versioning Strategies

| Strategy | Example | Pros | Cons |
|----------|---------|------|------|
| URL Path | `/api/v1/users` | Simple, clear, cacheable | New URL per version |
| Header | `Accept: application/vnd.api.v2+json` | Clean URLs | Less discoverable |
| Query Param | `/api/users?version=2` | Easy to test | Pollutes query string |
| Content Negotiation | `Accept: application/json;v=2` | RESTful | Complex to implement |

**Recommendation**: Use URL path versioning (`/api/v1/`) for public APIs. It is the most transparent and easiest to document, cache, and route.

### Version Routing in Next.js

```typescript
// app/api/v1/[...path]/route.ts
export { GET, POST, PUT, DELETE } from "./handler-v1";

// app/api/v2/[...path]/route.ts
export { GET, POST, PUT, DELETE } from "./handler-v2";

// Shared version detection middleware
function getApiVersion(request: Request): string {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const versionPart = pathParts.find((p) => /^v\d+$/.test(p));
  return versionPart ?? "v1";
}

// Version deprecation headers
function addVersionHeaders(response: Response, version: string): void {
  const DEPRECATED_VERSIONS = ["v1"];
  const SUNSET_DATE = "2025-06-01";

  if (DEPRECATED_VERSIONS.includes(version)) {
    response.headers.set(
      "Deprecation",
      `@${new Date("2024-12-01").getTime() / 1000}`
    );
    response.headers.set("Sunset", SUNSET_DATE);
    response.headers.set(
      "Link",
      '<https://docs.acme.com/api/v2-migration>; rel="successor-version"'
    );
  }
}
```

## Error Response Standardization

### RFC 7807 Problem Details

```typescript
interface ProblemDetails {
  type: string; // URI reference identifying the problem type
  title: string; // Short, human-readable summary
  status: number; // HTTP status code
  detail: string; // Human-readable explanation
  instance: string; // URI identifying this specific occurrence
  extensions?: Record<string, unknown>; // Additional fields
}

class ApiError extends Error {
  constructor(
    public problem: ProblemDetails
  ) {
    super(problem.title);
  }

  toResponse(): Response {
    return new Response(JSON.stringify(this.problem), {
      status: this.problem.status,
      headers: {
        "Content-Type": "application/problem+json",
      },
    });
  }
}

// Standard error types
const ErrorTypes = {
  VALIDATION: {
    type: "https://api.acme.com/errors/validation",
    title: "Validation Error",
    status: 422,
  },
  NOT_FOUND: {
    type: "https://api.acme.com/errors/not-found",
    title: "Resource Not Found",
    status: 404,
  },
  RATE_LIMITED: {
    type: "https://api.acme.com/errors/rate-limited",
    title: "Too Many Requests",
    status: 429,
  },
  UNAUTHORIZED: {
    type: "https://api.acme.com/errors/unauthorized",
    title: "Authentication Required",
    status: 401,
  },
  FORBIDDEN: {
    type: "https://api.acme.com/errors/forbidden",
    title: "Insufficient Permissions",
    status: 403,
  },
  INTERNAL: {
    type: "https://api.acme.com/errors/internal",
    title: "Internal Server Error",
    status: 500,
  },
} as const;

// Validation error with field details
function validationError(
  errors: { field: string; message: string; code: string }[]
): ApiError {
  return new ApiError({
    ...ErrorTypes.VALIDATION,
    detail: `${errors.length} validation error(s) found.`,
    instance: "",
    extensions: { errors },
  });
}
```

### Global Error Handler

```typescript
function errorHandler(error: unknown): Response {
  if (error instanceof ApiError) {
    return error.toResponse();
  }

  if (error instanceof z.ZodError) {
    return validationError(
      error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        code: "INVALID_" + issue.code.toUpperCase(),
      }))
    ).toResponse();
  }

  // Unexpected error: log details, return generic message
  console.error("Unhandled API error:", error);

  return new ApiError({
    ...ErrorTypes.INTERNAL,
    detail: "An unexpected error occurred. Please try again.",
    instance: crypto.randomUUID(),
  }).toResponse();
}
```

## Request Validation

```typescript
import { z } from "zod";

const CreateUserSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email().max(255),
  role: z.enum(["user", "admin"]).default("user"),
  metadata: z
    .record(z.string(), z.unknown())
    .optional()
    .refine(
      (data) => !data || JSON.stringify(data).length < 10000,
      "Metadata too large (max 10KB)"
    ),
});

type CreateUserInput = z.infer<typeof CreateUserSchema>;

function validateRequest<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): { success: true; data: T } | { success: false; error: ApiError } {
  const result = schema.safeParse(body);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    error: validationError(
      result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      }))
    ),
  };
}

// Input sanitization middleware
function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "") // Strip angle brackets
    .replace(/\0/g, "") // Strip null bytes
    .trim();
}
```

## API Documentation: OpenAPI Spec

```yaml
# openapi.yaml
openapi: 3.1.0
info:
  title: Acme API
  version: 2.0.0
  description: API for managing Acme resources.
  contact:
    email: api@acme.com
servers:
  - url: https://api.acme.com/v2
    description: Production
  - url: https://sandbox.api.acme.com/v2
    description: Sandbox

paths:
  /users:
    get:
      summary: List users
      operationId: listUsers
      parameters:
        - name: page
          in: query
          schema: { type: integer, minimum: 1, default: 1 }
        - name: limit
          in: query
          schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
      responses:
        "200":
          description: User list
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items: { $ref: "#/components/schemas/User" }
                  meta:
                    $ref: "#/components/schemas/PaginationMeta"
        "429":
          $ref: "#/components/responses/RateLimited"

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key

  schemas:
    User:
      type: object
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        email: { type: string, format: email }
        role: { type: string, enum: [user, admin] }
        createdAt: { type: string, format: date-time }

    PaginationMeta:
      type: object
      properties:
        page: { type: integer }
        limit: { type: integer }
        total: { type: integer }
        totalPages: { type: integer }

  responses:
    RateLimited:
      description: Rate limit exceeded
      headers:
        Retry-After: { schema: { type: integer } }
      content:
        application/problem+json:
          schema:
            $ref: "#/components/schemas/ProblemDetails"

    ProblemDetails:
      type: object
      properties:
        type: { type: string, format: uri }
        title: { type: string }
        status: { type: integer }
        detail: { type: string }
        instance: { type: string }
```

## Monitoring: API Health and SLA Tracking

```typescript
interface ApiHealthMetrics {
  endpoint: string;
  period: string;
  requestCount: number;
  errorRate: number; // percentage
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  availability: number; // percentage
  slaBreaches: number;
}

// SLA configuration
const SLA_CONFIG = {
  availability: { target: 99.9, windowMinutes: 5 },
  latency: { p95TargetMs: 200, p99TargetMs: 500, windowMinutes: 5 },
  errorRate: { maxPercent: 1.0, windowMinutes: 5 },
};

async function checkSLACompliance(
  endpoint: string
): Promise<{ compliant: boolean; breaches: string[] }> {
  const metrics = await getMetricsForWindow(
    endpoint,
    SLA_CONFIG.availability.windowMinutes
  );
  const breaches: string[] = [];

  if (metrics.availability < SLA_CONFIG.availability.target) {
    breaches.push(
      `Availability ${metrics.availability}% < ${SLA_CONFIG.availability.target}%`
    );
  }

  if (metrics.p95LatencyMs > SLA_CONFIG.latency.p95TargetMs) {
    breaches.push(
      `P95 latency ${metrics.p95LatencyMs}ms > ${SLA_CONFIG.latency.p95TargetMs}ms`
    );
  }

  if (metrics.errorRate > SLA_CONFIG.errorRate.maxPercent) {
    breaches.push(
      `Error rate ${metrics.errorRate}% > ${SLA_CONFIG.errorRate.maxPercent}%`
    );
  }

  if (breaches.length > 0) {
    await sendSLAAlert(endpoint, breaches);
  }

  return { compliant: breaches.length === 0, breaches };
}
```

## Anti-Patterns

- **Using in-memory rate limiting in distributed deployments** -- use Redis or a shared store. In-memory limits only apply per-instance, so total allowed requests multiply by the number of servers.
- **Returning raw API keys in responses or logs** -- never log the full API key. Store only the hash and show the prefix (first 8 chars) for identification.
- **Skipping request validation on internal APIs** -- internal APIs still need validation. A compromised internal service should not be able to send malformed requests to other services.
- **Versioning APIs without a deprecation policy** -- set sunset dates for old versions, send `Deprecation` and `Sunset` headers, and provide migration documentation.
- **Returning HTML error pages from API endpoints** -- always return structured JSON errors using RFC 7807 Problem Details format. API clients cannot parse HTML error pages.
- **Not monitoring per-endpoint latency percentiles** -- averages hide tail latency problems. Track p50, p95, and p99 latency and alert when p99 exceeds your SLA target.

## Related Skills

- [[csp-webhook-architecture]] -- Webhook delivery and retry patterns
- [[csp-oauth-integration]] -- OAuth scope and permission design
- [[csp-payment-integration]] -- Payment API security patterns
- [[csp-monitoring-alerting]] -- Comprehensive monitoring and alerting strategies
