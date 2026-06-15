# Secret Scanning Patterns Reference

## Provider-Specific Patterns (High Confidence)

### Cloud Providers

| Provider | Regex |
|----------|-------|
| AWS Access Key | `AKIA[0-9A-Z]{16}` |
| AWS Secret Key | `(?i)aws_?secret_?access_?key\s*[=:]\s*[A-Za-z0-9/+=]{40}` |
| GCP Service Account | `"type"\s*:\s*"service_account".*"private_key"\s*:\s*"-----BEGIN` |
| Azure Storage Key | `AccountKey=[A-Za-z0-9+/=]{88}` |
| Azure Connection String | `DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=` |

### Payment & SaaS

| Provider | Regex |
|----------|-------|
| Stripe Secret Key | `sk_live_[0-9a-zA-Z]{24,}` |
| Stripe Restricted | `rk_live_[0-9a-zA-Z]{24,}` |
| Twilio Auth Token | `(?i)twilio.*auth.?token\s*[=:]\s*[0-9a-f]{32}` |
| SendGrid API Key | `SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}` |
| Mailgun API Key | `key-[0-9a-zA-Z]{32}` |
| GitHub PAT | `gh[pousr]_[A-Za-z0-9_]{36}` |
| GitHub Fine-Grained PAT | `github_pat_[A-Za-z0-9_]{22}_[A-Za-z0-9_]{59}` |
| GitLab PAT | `glpat-[A-Za-z0-9_-]{20}` |
| Slack Bot Token | `xoxb-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}` |
| Slack Webhook | `https://hooks\.slack\.com/services/T[A-Z0-9]+/B[A-Z0-9]+/[a-zA-Z0-9]+` |
| NPM Token | `//registry\.npmjs\.org/:_authToken=[a-f0-9-]{36}` |

### Database Connection Strings

| Database | Regex |
|----------|-------|
| PostgreSQL | `postgres(ql)?://[^:\s]+:[^@\s]+@[^\s]+` |
| MySQL | `mysql://[^:\s]+:[^@\s]+@[^\s]+` |
| MongoDB | `mongodb(\+srv)?://[^:\s]+:[^@\s]+@[^\s]+` |
| Redis | `redis(s)?://:[^@]+@[^\s]+` |
| JDBC | `jdbc:[a-z]+://[^;]*password=[^;&]+` |

## Generic Detection Patterns

### Variable Assignment Heuristics

```regex
(?i)(password|passwd|secret|api_?key|access_?key|private_?key|auth_?token|bearer_?token|client_?secret)\s*[=:]\s*['"][^'"]{8,}['"]
```

### Private Keys

```regex
-----BEGIN (RSA |EC |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY( BLOCK)?-----
```

### Shannon Entropy Heuristic

Use entropy as supplementary signal for base64/encoded strings:

```python
import math
from collections import Counter

def shannon_entropy(s):
    if not s: return 0
    counts = Counter(s)
    length = len(s)
    return -sum((c/length) * math.log2(c/length) for c in counts.values())

# >= 4.5 bits/char + len >= 20: likely secret
# 3.5-4.5: possibly encoded data
# < 3.5: likely regular text
```

## File-Specific Scan Targets

| File Type | What to Scan |
|-----------|-------------|
| `.env`, `.env.*` | All KEY=VALUE where key matches secret patterns |
| `Dockerfile` | `ENV` with secret values |
| `docker-compose.yml` | `environment:` blocks, build `args:` |
| `kubernetes/*.yaml` | `Secret` resources with base64 data |
| `terraform/*.tf` | Hardcoded defaults for `sensitive = true` variables |
| `.github/workflows/*.yml` | Hardcoded tokens in `env:` blocks |
| `.npmrc` | `_authToken` values |
| `.gitlab-ci.yml` | `variables:` block with inline credentials |

## GitHub Secret Scanning Configuration

### Setup Steps

1. Repository **Settings** → **Advanced Security** → Enable "Secret Protection"
2. Enable "Push protection" to block secrets pre-push
3. Optional: enable "Non-provider patterns", "AI detection", "Validity checks"

### Exclusion Config (`.github/secret_scanning.yml`)

```yaml
paths-ignore:
  - "docs/**"
  - "test/fixtures/**"
  - "**/*.example"
```

Limits: max 1,000 entries, file <1 MB.

### Custom Pattern Definition

```yaml
name: Internal Service Token
regex: 'svc_[a-z]{4}_[A-Za-z0-9]{32}'
test-strings:
  - svc_auth_AbCdEfGhIjKlMnOpQrStUvWxYz012345  # match
  - svc_AbCdEf  # no match
```

## Push Protection Resolution

### Remove the Secret

```bash
# Latest commit
git commit --amend --all   # edit file first
git push

# Earlier commit
git rebase -i <COMMIT>~1   # mark as 'edit', remove secret
git add . && git commit --amend && git rebase --continue && git push
```

### Bypass (with documented reason)

1. Visit URL from push error
2. Select: "used in tests" / "false positive" / "fix later"
3. Re-push within 3 hours

| Reason | Alert Status |
|--------|-------------|
| Used in tests | Created + auto-closed |
| False positive | Created + auto-closed |
| Fix later | Created (open, must remediate) |

## Alert Triage

### Priority Order

1. **Rotate** the credential immediately at the provider
2. Review context: location, author, commit date
3. Check validity: `active` (urgent), `inactive` (lower priority), `unknown` (verify manually)
4. Remove from Git history only if required (time-intensive, usually unnecessary after rotation)

### Alert Types

| Type | Description | Visibility |
|------|-------------|-----------|
| User alert | Secret in repo content | Security tab |
| Push protection alert | Secret pushed via bypass | Security tab (`bypassed: true`) |
| Partner alert | Reported to provider | Not in repo |
| Generic alert | AI/non-provider detected | Security tab (max 5,000/repo) |

### Dismissal Reasons

| Reason | When |
|--------|------|
| False positive | Not a real secret (example value) |
| Revoked | Already rotated |
| Used in tests | Test fixtures only |

## Git History Scanning

```bash
# Search all history for specific patterns
git log --all -p -S "AKIA" -- '*.py' '*.js' '*.ts'
git log --all -p -S "BEGIN RSA PRIVATE KEY"
git log --all -p -S "password =" -- '*.yml' '*.json'
```

### Gitleaks

```bash
brew install gitleaks
gitleaks detect --source=. --verbose        # full history
gitleaks protect --staged --verbose         # pre-commit
```

**`.gitleaks.toml` config:**
```toml
[allowlist]
  paths = ['''test/fixtures/''', '''docs/''', '''.*\.example$''']

[[rules]]
  id = "internal-api-key"
  regex = '''svc_[a-z]{4}_[A-Za-z0-9]{32}'''
  tags = ["api", "internal"]
```

## Pre-Commit Integration

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: detect-private-key
```

## Severity for Secret Findings

| Severity | Criteria | Examples |
|----------|----------|---------|
| **CRITICAL** | Active, broad access | AWS root key, Stripe live key, prod DB password |
| **HIGH** | Active, scoped access | GitHub PAT, Slack bot token |
| **MEDIUM** | Potentially active | Expired JWT key, test env credentials |
| **LOW** | Inactive or test-only | `.env.example`, marked test fixtures |

## Remediation Checklist

- [ ] **Rotate** credential at provider immediately
- [ ] **Replace** with env var reference in code
- [ ] **Assess** exposure via provider access logs
- [ ] **Remove from Git history** if public repo (`git filter-repo`)
- [ ] **Add** pattern to `.gitleaks.toml` or custom scanning rules
- [ ] **Enable** push protection if not active
- [ ] **Document** incident in security log
