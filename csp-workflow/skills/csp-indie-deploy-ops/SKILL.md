---
name: csp-indie-deploy-ops
description: >
  End-to-end deployment workflow for independent developers covering pre-deploy
  checks, zero-downtime deployment, rollback, and post-deploy verification.
  Use when deploying a web application, API, or service to production.
version: 0.1.0
layer: 2
category: workflow
---

# Indie Deploy Ops

A deployment workflow for solo developers who need production deployments to be boring and predictable.

## When to Use

- Deploying a new version of your app to production
- Setting up a deployment pipeline for the first time
- Recovering from a failed deployment
- Evaluating whether a deployment strategy is safe for your setup

## When NOT to Use

- You have a CI/CD pipeline that already handles this (trust the pipeline)
- You're deploying to a staging/dev environment (just push)
- The change is a content/copy update with no code changes

## Pre-Deploy Checklist

Before any production deployment, verify:

- [ ] All tests pass locally (`npm test`, `pytest`, `cargo test`, etc.)
- [ ] CI pipeline is green on the deployment branch
- [ ] No uncommitted changes in the working directory
- [ ] Database migrations (if any) are tested against a staging copy
- [ ] Environment variables and secrets are up to date in production
- [ ] Rollback plan is clear (what was the last known-good version?)
- [ ] You have time to monitor for 30 minutes post-deploy

## Deployment Strategies by Platform

### Platform-as-a-Service (Vercel, Railway, Render, Fly.io)

```bash
# Most PaaS platforms use git-push deployment
git push origin main

# Or CLI-based deployment
vercel --prod                    # Vercel
railway up                       # Railway
fly deploy                       # Fly.io
render deploy --service <name>   # Render
```

Post-deploy:
1. Check deployment logs for errors
2. Hit health check endpoint: `curl https://yourapp.com/api/health`
3. Run a smoke test on the critical user flow
4. Monitor error rates for 15-30 minutes

### VPS (DigitalOcean, Linode, Hetzner)

```bash
# Blue-green deployment pattern
# 1. Deploy to new directory
ssh deploy@server
cd /opt/app && git pull origin main

# 2. Install deps and build
pnpm install --frozen-lockfile
pnpm build

# 3. Run migrations
pnpm migrate:prod

# 4. Swap (zero-downtime with process manager)
pm2 reload app --update-env    # PM2
# or
systemctl restart app          # systemd

# 5. Verify
curl -s https://yourapp.com/api/health | jq .
```

### Docker-based Deployment

```bash
# Build and push
docker build -t registry/app:v1.2.3 .
docker push registry/app:v1.2.3

# Deploy with rolling update
docker service update --image registry/app:v1.2.3 app_service

# Or with docker-compose
docker-compose pull
docker-compose up -d --no-deps --build app
```

## Rollback Procedures

### Quick Rollback (PaaS)

```bash
# Most platforms support instant rollback
vercel rollback <deployment-url>
fly deploy --image registry/app:<previous-tag>
railway rollback
```

### Quick Rollback (VPS)

```bash
# Roll back to previous version
cd /opt/app
git checkout <previous-tag>
pnpm install --frozen-lockfile
pnpm build
systemctl restart app
```

### Database Rollback

If a migration caused issues:

```bash
# Run the down migration (if safe)
pnpm migrate:down

# If data was corrupted, restore from backup
pg_restore -d dbname backup_file.dump
```

**Rule**: Never roll back a migration that has already modified production data without a backup.

## Post-Deploy Verification

1. **Health check**: Confirm the app responds on its health endpoint
2. **Smoke test**: Walk through the critical user flow manually
3. **Error monitoring**: Check Sentry/Datadog for new errors in the first 15 minutes
4. **Performance**: Compare response times with pre-deploy baseline
5. **Logs**: Scan for unexpected warnings or errors

## Key Principles

- **Deploy small, deploy often** — smaller deploys are easier to roll back and easier to debug
- **Never deploy on Friday afternoon** — give yourself a full workday to respond to issues
- **Automate the boring parts** — if you deploy more than once a week, invest in CI/CD
- **Test migrations before running them in production** — use a staging database clone
- **Document every rollback** — if you rolled back, write down why so it doesn't happen again

## Anti-Patterns

- **Deploying and walking away** — stay available for at least 30 minutes after deploy
- **Fixing forward instead of rolling back** — rolling back is faster and safer under pressure
- **Skipping the pre-deploy checklist** — "it worked on my machine" is not a deployment strategy
- **Manual deployments without documentation** — if you can't repeat it, you can't fix it at 3 AM

## Related Skills

- [[csp-cicd-pipelines]] — for automating the deployment pipeline
- [[csp-solo-oncall]] — for handling incidents that arise post-deploy
- [[csp-platform-deploy]] — for platform-specific deployment best practices
- [[csp-monitoring-alerting]] — for post-deploy observability
