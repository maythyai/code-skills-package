# GDPR Engineering Reference

> Ported from awesome-copilot's `gdpr-compliant` skill. Deep engineering rules for GDPR compliance beyond the main privacy-compliance skill.

## Golden Rule

**Collect less. Store less. Expose less. Retain less.**

## Core GDPR Principles

| Principle | Engineering Obligation |
|-----------|----------------------|
| Lawfulness, Fairness, Transparency | Clear privacy policy, consent before processing, no dark patterns |
| Purpose Limitation | Each data field has a documented and specific purpose; no reuse without consent |
| Data Minimization | Only collect fields you need; audit schema for unused fields quarterly |
| Accuracy | Allow users to correct their data; validate input formats |
| Storage Limitation | Every PII table MUST have `CreatedAt`, `RetentionExpiresAt` columns; auto-delete after expiry |
| Integrity & Confidentiality | Encrypt PII at rest and in transit; access control on every endpoint |
| Accountability | Maintain audit trails for all data access and processing; appoint DPO if required |

## Data Minimization

```
BEFORE adding a field, ask:
  1. Is this field REQUIRED by a specific feature? (If not → don't add)
  2. Can this be derived from existing fields? (If yes → compute, don't store)
  3. Will this become stale? (If yes → add RetentionExpiresAt)
  4. Can this be pseudonymized? (If yes → store hash, not raw value)
  5. What is the breach impact? (If high → encrypt at application layer)
```

- Separate DTOs for create/read/update — never reuse the same object
- Use UUIDs — never sequential integers for public resource IDs

## Purpose Limitation

- Each data processing purpose must have a documented lawful basis
- Data collected for purpose A cannot be used for purpose B without separate consent
- If a new feature needs existing data for a new purpose — get fresh consent
- Maintain a data inventory: what data, why collected, which lawful basis, retention period

## Encryption Standards

| Scope | Minimum Standard |
|-------|-----------------|
| Data at rest | AES-256-GCM (or cloud-managed equivalent) |
| Data in transit | TLS 1.3 (or TLS 1.2 with secure ciphers) |
| Passwords | Argon2id (preferred) or bcrypt cost ≥ 12 |
| API keys / tokens | SHA-256 hashed; plaintext never stored |
| PII fields (optional extra) | Application-layer encryption before DB insert |
| Backups | Encrypted with separate key from production |

## Password Hashing

- **Argon2id** (preferred): `memory=65536, iterations=4, parallelism=2`
- **bcrypt** (minimum): cost ≥ 12, salt rounds auto-managed
- Never use MD5, SHA-1, or single-round SHA-256 for passwords
- Re-hash on login if using older algorithm

## Secrets Management

- NO secrets in code, config files, or environment variables baked into images
- Use a secrets manager (Vault, AWS Secrets Manager, GCP Secret Manager)
- Rotate secrets on a schedule (90-day default)
- Service accounts with minimum necessary permissions
- Audit secret access — who accessed what, when

## API Design Rules

- Problem Details RFC 7807 for all error responses: `{ "type": "...", "title": "...", "status": 400, "detail": "...", "instance": "..." }`
- Pagination on all list endpoints — never return unbounded collections
- Rate limiting on all public endpoints
- No internal IDs in responses
- `GET` requests never modify data
- `DELETE` is soft-delete by default; hard-delete is an explicit separate operation

## Logging Rules

| Rule | Rationale |
|------|-----------|
| Log events, not data | "User updated profile" NOT "User changed email from a@b.com to c@d.com" |
| Never log PII | No emails, phone numbers, names, IPs (hash IPs instead) |
| Structured logs (JSON) | Machine-parseable for automated PII scanning |
| Log retention ≤ 90 days | Unless legal/regulatory requirement says otherwise |
| Access logs are audit logs | Who accessed what PII, when, and why |

## Anonymization

- IP addresses: mask last octet (IPv4) / last 80 bits (IPv6)
- Names: replace with pseudonymized token
- Email: hash with salt OR replace with `user_{id}@anonymized.invalid`
- Phone: mask all but last 4 digits
- Never store raw PII when pseudonymized data suffices

## Testing with Fake Data

- NEVER use production data in test environments
- Use deterministic fake data generators (Faker.js, Python Faker)
- Seed data must be reproducible
- No real customer PII in screenshots, logs, or error reports
- Test data must pass validation — don't use "test@test.com" which bypasses email validation

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|---|---|
| "We'll add privacy later" | Privacy by design from day one; retrofitting is 10× more expensive |
| Collecting data "just in case" | Data minimization — only collect what you need NOW |
| Using real customer data for testing | Deterministic fake data generators; reproducible seeds |
| Storing PII in logs | Structured logging with PII scanners in pipeline |
| Hard-deleting data needed for legal obligations | Soft-delete with retention period; anonymize after |
| "It's just an MVP, GDPR doesn't matter" | GDPR applies from day one of processing any EU resident's data |
| Sharing full database dumps | Always anonymize before sharing; data processing agreement required |
| No data inventory | Maintain a data map: what, where, why, retention, access |

## PR Review Checklist

| Check | Category |
|-------|----------|
| New PII fields have RetentionExpiresAt | Data model |
| API responses don't leak internal IDs or sensitive fields | API |
| No PII in log statements | Logging |
| Secrets not in code, config, or env | Secrets & CI/CD |
| Database backup encryption verified | Infrastructure |
| Data retention job covers new tables | Retention & erasure |
| Consent mechanism updated for new data use | User rights & governance |

## Recommended Retention Defaults

| Data Type | Max Retention |
|-----------|--------------|
| User account data | Active + 30 days after deletion request |
| Activity/analytics logs | 1 year from creation |
| Session tokens | 90 days from last activity |
| Consent records | 5 years from consent timestamp |
| Payment records | 7 years (tax/legal) |
| Support tickets | 3 years from resolution |
| Email logs | 90 days |
| Error/crash logs | 30 days |
| IP addresses | 30 days from collection |