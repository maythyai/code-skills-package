---
name: csp-platform-deploy
description: >
  Deploy web applications to modern PaaS platforms (Vercel, Netlify, Railway, Fly.io, Render) with optimal configuration for performance, cost, and developer experience.
version: 0.1.0
layer: 4
category: patterns
---

# Platform Deployment Patterns

Deploy web applications to managed PaaS platforms with correct build configuration, environment management, scaling rules, and cost controls.

## When to Activate

- Setting up a new project deployment on Vercel, Netlify, Railway, Fly.io, or Render
- Choosing between PaaS platforms for a solo or small-team project
- Configuring edge functions, serverless functions, or background workers
- Setting up preview deployments, custom domains, or SSL certificates
- Optimizing platform costs within free-tier or low-budget constraints
- Migrating an existing deployment from one platform to another

## Platform Comparison Matrix

| Feature            | Vercel          | Netlify         | Railway         | Fly.io          | Render          |
|--------------------|-----------------|-----------------|-----------------|-----------------|-----------------|
| Best for           | Next.js / React | Static + Jamstack | Full-stack services | Global edge apps | Containers + DBs |
| Free tier          | Generous (hobby) | Generous (100GB) | $5 credit/mo    | 3 shared VMs    | Free (24h spin-down) |
| Build system       | Zero-config     | Zero-config     | Dockerfile / Nixpacks | Dockerfile / Buildpacks | Dockerfile / Nixpacks |
| Edge functions     | Yes (Edge Runtime) | Yes (Deno-based) | No              | Yes (Fly Machines) | No              |
| Serverless functions | Yes (AWS Lambda) | Yes (AWS Lambda) | Long-running OK | Long-running OK | Yes (limited)   |
| Persistent storage | External needed | External needed | Volumes         | Volumes         | Disks           |
| Custom domains     | Free + auto SSL | Free + auto SSL | Free + auto SSL | Free + auto SSL | Free + auto SSL |
| Preview deploys    | Git PR auto     | Git PR auto     | PR environments | Machines API    | PR auto         |
| Background jobs    | Cron only       | Background functions | Any process   | Any process     | Background workers |
| Cold start         | ~100-300ms      | ~100-500ms      | None (always on) | ~1-3s (machines) | ~30s (spin-up)  |
| Min cost (prod)    | $0-20/mo        | $0-19/mo        | $5-15/mo        | $0-10/mo        | $7/mo           |

### Decision Tree

```
Is it a static site or Jamstack app?
  Yes -> Does it use Next.js? -> Vercel
        Other framework?       -> Netlify
  No -> Do you need persistent processes / databases?
        Yes -> Need global edge distribution? -> Fly.io
              Want simple Docker deploy?     -> Railway
              Need managed Postgres + workers? -> Render
        No  -> Need long-running server?     -> Railway / Fly.io
              Serverless API only?           -> Vercel / Netlify
```

## Vercel

### Edge Functions vs Serverless Functions

| Aspect          | Edge Functions              | Serverless Functions         |
|-----------------|-----------------------------|------------------------------|
| Runtime         | Edge Runtime (V8 isolates)  | Node.js (AWS Lambda)         |
| Cold start      | ~0ms (no cold start)        | ~100-300ms                   |
| Max execution   | 30s (hobby), 60s (pro)      | 10s (hobby), 60s (pro)       |
| Packages        | Edge-compatible only        | Any npm package               |
| Use case        | Auth, A/B test, geolocation | DB queries, file processing  |
| Regions         | All edge locations          | Configurable (single region) |

```typescript
// Edge Function — runs at the edge, no cold start
// app/api/geo/route.ts (Next.js App Router)
export const runtime = 'edge';

export async function GET(request: Request) {
  const country = request.headers.get('x-vercel-ip-country') || 'US';
  const city = request.headers.get('x-vercel-ip-city') || 'Unknown';

  return Response.json({ country, city });
}
```

```typescript
// Serverless Function — full Node.js, longer execution
// app/api/export/route.ts
import { db } from '@/lib/db';

export async function GET() {
  const reports = await db.reports.findMany({
    where: { published: true },
    include: { author: true },
  });
  return Response.json(reports);
}
```

### ISR (Incremental Static Regeneration)

```typescript
// Revalidate a page every 60 seconds
export const revalidate = 60;

// On-demand revalidation from an API route or webhook
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST() {
  revalidatePath('/blog');           // revalidate a path
  revalidateTag('blog-posts');       // revalidate all pages with this tag
  return Response.json({ revalidated: true });
}
```

### Vercel Configuration (vercel.json)

```json
{
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "app/api/heavy/**": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "s-maxage=60, stale-while-revalidate=300" }
      ]
    }
  ],
  "redirects": [
    { "source": "/old-path", "destination": "/new-path", "permanent": true }
  ]
}
```

## Railway

### Service Configuration (railway.toml)

```toml
[build]
builder = "nixpacks"
buildCommand = "npm run build"

[deploy]
startCommand = "npm start"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 5
healthcheckPath = "/health"
healthcheckTimeout = 300

[deploy.resources]
cpu = 0.5
memory = 512
```

### Volume Persistence

```bash
# Add a volume via CLI
railway volume add --name data --mount-path /app/data

# For databases, use Railway's managed Postgres/MySQL/Redis
railway add --database postgresql
```

### Private Networking

```bash
# Services in the same project communicate via internal DNS
# No public exposure needed — use RAILWAY_PRIVATE_DOMAIN
# Example: connect app to database
DATABASE_URL=postgresql://user:pass@${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/mydb
```

### Environment Variables

```bash
# Set via CLI
railway variables set NODE_ENV=production
railway variables set API_KEY=sk-xxx --environment production

# Reference other service variables
railway variables set REDIS_URL="${{Redis.REDIS_URL}}"
```

## Fly.io

### Fly Configuration (fly.toml)

```toml
app = "my-app"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = "suspend"
  auto_start_machines = true
  min_machines_running = 1

[[vm]]
  size = "shared-cpu-1x"
  memory = "256mb"

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"
  processes = ["worker"]

[processes]
  web = "npm start"
  worker = "npm run worker"

[mounts]
  source = "data"
  destination = "/data"
```

### Regions and Scaling

```bash
# Deploy to multiple regions
fly scale count 3 --region iad,lax,fra

# Scale memory
fly scale memory 512

# View machine status
fly machines list

# Auto-scaling based on concurrency
[http_service.concurrency]
  type = "requests"
  hard_limit = 25
  soft_limit = 20
```

### Persistent Volumes

```bash
# Create a volume in a specific region
fly volumes create data --region iad --size 10

# Fork a volume for backups
fly volumes fork vol_abc123
```

## Render

### Render Blueprint (render.yaml)

```yaml
services:
  - type: web
    name: api
    runtime: node
    plan: starter
    buildCommand: npm install && npm run build
    startCommand: npm start
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: my-db
          property: connectionString

  - type: worker
    name: queue-worker
    runtime: node
    buildCommand: npm install
    startCommand: npm run worker
    envVars:
      - key: REDIS_URL
        fromService:
          name: redis
          type: pserv
          property: connectionString

  - type: cron
    name: daily-report
    runtime: node
    schedule: "0 9 * * *"
    buildCommand: npm install
    startCommand: npm run report

databases:
  - name: my-db
    plan: basic-256mb
    databaseName: myapp
    ipAllowList: []
```

## Netlify

### Edge Functions

```typescript
// netlify/edge-functions/geo.ts
export default async (request: Request) => {
  const country = request.headers.get('x-country') || 'US';
  const url = new URL(request.url);

  if (country === 'DE') {
    url.pathname = '/de' + url.pathname;
    return fetch(url.toString());
  }

  return fetch(request);
};

export const config = { path: "/*" };
```

### Redirect Rules (_redirects)

```
# _redirects file
/old-page    /new-page          301
/api/*       https://api.example.com/:splat  200
/home        /                  301
/*           /index.html        200
```

### Netlify Configuration (netlify.toml)

```toml
[build]
  command = "npm run build"
  publish = "dist"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[[headers]]
  for = "/api/*"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
    Access-Control-Allow-Origin = "*"

[[redirects]]
  from = "/api/*"
  to = "https://api.example.com/:splat"
  status = 200
  force = true
```

## Environment Variable Management

### Cross-Platform Patterns

```bash
# .env.local (never commit — add to .gitignore)
DATABASE_URL=postgresql://localhost:5432/mydb
API_SECRET=local-dev-secret

# .env.example (commit — document required vars)
DATABASE_URL=postgresql://localhost:5432/mydb
API_SECRET=
REDIS_URL=redis://localhost:6379
```

```typescript
// Type-safe environment variables (Zod + envalid pattern)
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  DATABASE_URL: z.string().url(),
  API_SECRET: z.string().min(32),
  REDIS_URL: z.string().url().optional(),
  PORT: z.coerce.number().default(3000),
});

export const env = envSchema.parse(process.env);
```

### Secrets Rotation Pattern

```bash
# 1. Add new secret alongside old one
railway variables set API_SECRET_V2=new-secret-value

# 2. Deploy code that reads both, prefers V2
# 3. Remove old secret
railway variables unset API_SECRET_V1
```

## Custom Domain and SSL/TLS

### Universal Setup Steps

```bash
# 1. Add domain in platform dashboard or CLI
vercel domains add example.com
fly certs create example.com
netlify domains:add example.com

# 2. Configure DNS records
# CNAME: www.example.com -> cname.vercel-dns.com
# A:     example.com     -> 76.76.21.21 (Vercel)
# AAAA:  example.com     -> 2606:4700:4700::1111 (Fly.io)

# 3. Verify ownership (TXT record if needed)
# 4. SSL certificate is provisioned automatically (Let's Encrypt)
```

### DNS Configuration Reference

| Platform  | A Record         | CNAME Target              | AAAA                        |
|-----------|------------------|---------------------------|-----------------------------|
| Vercel    | 76.76.21.21      | cname.vercel-dns.com      | (not required)              |
| Netlify   | 75.2.60.5        | (netlify subdomain)       | (not required)              |
| Fly.io    | 66.241.109.2     | (fly subdomain)           | 2a09:8280:1::a:1234         |
| Railway   | (use CNAME only) | (railway subdomain)       | (not required)              |
| Render    | 216.24.57.252    | (render subdomain)        | (not required)              |

## Cost Optimization

### Free Tier Limits

| Platform  | Free Bandwidth | Free Build Min | Free Compute     | Free Storage |
|-----------|---------------|----------------|------------------|-------------|
| Vercel    | 100 GB/mo     | 6,000 min/mo   | 100 GB-hours     | N/A         |
| Netlify   | 100 GB/mo     | 300 min/mo     | 125K invocations | N/A         |
| Railway   | N/A           | 500 hours      | $5 credit        | 1 GB volume |
| Fly.io    | 100 GB out    | N/A            | 3 shared-cpu-1x  | 3 GB volume |
| Render    | 100 GB/mo     | 500 hours/mo   | 750 hours        | 1 GB disk   |

### Cost Reduction Checklist

- **Vercel**: Use ISR instead of SSR where possible; set `regions` to single region; cache aggressively at CDN
- **Netlify**: Use `cache` headers to reduce origin requests; use Edge Functions over serverless for simple logic
- **Railway**: Right-size CPU/memory; use `sleep` for dev services; set `restartPolicyMaxRetries` to avoid runaway costs
- **Fly.io**: Set `auto_stop_machines = "suspend"` for dev; use shared CPUs; limit `min_machines_running` to 1
- **Render**: Use starter plan; set `auto_deploy: false` for staging; use spin-down for dev environments

```bash
# Monitor spending across platforms
vercel billing ls
railway usage
fly status
# Set budget alerts in each platform's dashboard
```

## Anti-Patterns

- **Storing secrets in client-side environment variables**: Vercel/Netlify expose `NEXT_PUBLIC_*` and `VITE_*` vars to the browser. Never put API keys, database credentials, or tokens in public-prefixed variables.
- **Using serverless functions for long-running tasks**: Serverless functions have execution time limits (10-60s depending on platform). Use background workers (Railway, Fly.io, Render) for jobs that exceed these limits.
- **Skipping health checks in production**: Always configure a `/health` endpoint. Platforms use health checks to route traffic, auto-restart failed instances, and manage rolling deployments.
- **Deploying without preview environments**: Preview deployments per PR catch issues before they reach production. All five platforms support this out of the box — enable it.
- **Ignoring cold starts in serverless architectures**: Cold starts add 100ms-30s latency. For latency-sensitive endpoints, use edge functions (no cold start) or keep a minimum number of warm instances.
- **Not setting resource limits**: Without CPU/memory caps, a single runaway process can exhaust your budget. Always configure resource limits and set spending alerts.

## Related Skills

- [[csp-vps-deploy]]
- [[csp-monitoring-alerting]]
- [[csp-db-backup]]
