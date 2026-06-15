# Data Breach Response Guide

Reference for security incidents involving sensitive data exposure. Complements the production incident workflow in `../SKILL.md` with data-specific blast radius assessment, regulatory obligations, and forensic procedures. All regulatory citations are law-sourced; blast radius scores and cost ranges are heuristic estimates for planning only. This guide does not replace legal counsel.

## Blast Radius Assessment

Quantify impact before declaring severity. Score every exposure vector:

```
Blast Radius Score = Data Tier x Exposure Likelihood x Population Scale x Data Completeness
```

**Sensitivity tiers:** T1 Catastrophic (gov IDs, biometrics, health records, passwords, financial credentials) x5; T2 Critical (name+address+DOB, PAN, SSN, passport) x4; T3 High (email+hashed pw, phone, geolocation) x3; T4 Elevated (first name only, email only, city, analytics) x2; T5 Standard (non-PII, public, anonymized) x1.

**Exposure likelihood:** confirmed exfiltration (1.0), potential exposure (0.5), theoretical (0.2). **Population scale:** use actual counts; otherwise SaaS 10K-1M, consumer 100K-10M, internal 100-10K. Multipliers for minors (x2), health data (x3), financial credentials (x5). **Data completeness:** full records (1.0), partial/encrypted (0.5), tokenized (0.2).

## Data Flow Mapping

Trace sensitive data across five stages to surface every exposure vector:

1. **Ingestion** - forms, API POST/PUT, webhooks, OAuth callbacks, imports, ETL
2. **Processing** - caches (Redis keys with PII), queues (Kafka/SQS payloads), background workers
3. **Storage** - DBs, S3/Blob/GCS, search indexes (Elasticsearch PII), analytics warehouses, backups
4. **Transmission** - outbound APIs, webhook payloads, report exports, email/SMS bodies
5. **Exposure vectors** - unauthenticated endpoints, IDOR/BOLA, over-broad responses, CORS misconfig, public buckets, PII in logs/stderr/errors, debug endpoints in prod

Inventory every sensitive field: `| Field | Source | Tier | Purpose | Encrypted? | Notes |`

## Response Workflow for Data Breaches

Data breaches follow the standard SEV1 flow from SKILL.md with these additions:

### Detection & Declaration
- Auto-classify as SEV1 if any T1/T2 data is confirmed or suspected exposed
- Engage legal counsel and privacy officer within 1 hour
- Notify security insurer within policy window (typically 24-72h)

### Containment (first hours)
- Revoke compromised credentials, rotate secrets in scope
- Isolate affected systems at network layer; do not destroy evidence
- Preserve forensic images before remediation touches disk
- Block exfiltration channels identified in data flow map
- Stand up access-controlled incident channel with need-to-know roster

### Forensic Analysis
- Build timeline from access, application, network, and cloud trail logs
- Determine entry vector, dwell time, lateral movement, exfiltration volume
- Identify exactly which records and fields were accessed
- Preserve chain of custody: hash evidence, document handlers, timestamps
- Engage external forensics for regulated data or >500 individuals affected

### Notification
- Follow the strictest triggered jurisdiction timeline (see below)
- Draft with counsel: what happened, what data, what you are doing, what affected parties should do
- Stand up dedicated support channel (webpage + hotline) before sending notices

## Compliance Requirements

**GDPR (EU/EEA/UK):** 72h to supervisory authority from awareness (Art. 33). Individual notice without undue delay when high risk (Art. 34). Max fine EUR 20M or 4% global annual turnover, whichever higher (Art. 83). Triggers: EU data subjects, EU regions, EU currencies/phone formats, `.eu` domains.

**CCPA/CPRA (California):** "Most expedient time possible" (Cal. Civ. Code s 1798.82). AG notice if >500 CA residents. Statutory damages up to $750/consumer/incident (s 1798.150); intentional violations up to $7,500 (s 1798.155). Triggers: CA resident data.

**HIPAA (US health data):** Without unreasonable delay, no later than 60 days from discovery (45 CFR s 164.404). HHS/OCR immediate for >500 individuals. Max penalty up to $1.9M/violation category/year (s 160.404). Triggers: PHI, ICD codes, FHIR resources.

**LGPD (Brazil), PDPA (Singapore/Thailand/Malaysia/Philippines):** Trigger on respective jurisdiction data subjects or local currency/ID fields. When multiple jurisdictions overlap, the most restrictive timeline governs.

## Post-Incident Review Template

Run within 5 business days of closure. Blameless: "the system allowed this failure mode."

```markdown
# Data Breach Post-Mortem: [Title]
**Date**: YYYY-MM-DD  |  **IC**:  |  **Severity**: SEV1 (data breach)
**Duration**: detection-to-containment | containment-to-closure

## Executive Summary
2-3 paragraphs: what happened, what data, who affected, current status. No jargon.

## Timeline
| Timestamp (UTC) | Event | Actor/System |

## Scope of Exposure
- Records affected: [count + confidence]
- Data tiers exposed: [T1-T4 by category]
- Jurisdictions triggered: [GDPR/CCPA/HIPAA/LGPD/PDPA]
- Exfiltration confirmed: [yes/no, volume]

## Blast Radius Assessment
- Score: [per formula above]
- Regulatory exposure: [max fine ranges per jurisdiction]
- Notification costs: [legal, comms, credit monitoring]

## Root Cause Analysis
- Entry vector:
- Contributing factors (systemic, not individual):
- Controls that failed or were missing:

## What Went Well / Poorly
## Action Items
| Owner | Action | Priority | Deadline | Status |

## Lessons Learned
Process gaps, detection gaps, controls to add to hardening roadmap.

## Evidence & Artifacts
Forensic report, log archives, notification drafts, regulatory filings.
```

## Hardening Priorities

Post-breach, re-score exposure vectors and sort by `(Impact x Severity) / Effort`. Flag quick wins (< 1 day). High-impact controls: AES-256 at rest + TLS 1.3 in transit for T1/T2; field-level tokenization for PAN/SSN/health IDs; least-privilege IAM with MFA and JIT access; data minimization (delete what is unneeded, retain only what regulation requires); immutable audit logging on every sensitive access; anonymization for analytics and test environments.

## Sources

GDPR Art. 9, 33-34, 83 - CCPA Cal. Civ. Code s 1798.82, 1798.150, 1798.155 - HIPAA 45 CFR s 160.404, 164.404 - PCI-DSS v4.0 - [IBM Cost of a Data Breach Report](https://www.ibm.com/reports/data-breach) (annual).
