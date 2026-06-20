---
name: csp-privacy-compliance
description: >
  Implement GDPR, CCPA, and privacy compliance features including consent management, data subject access requests, right to erasure, and data portability.
version: 0.1.0
layer: 4
category: patterns
---

# Privacy Compliance Implementation

Implement technical privacy compliance for GDPR, CCPA/CPRA, and similar regulations with consent management, data export, erasure pipelines, and privacy-by-design patterns.

## When to Activate

- Adding cookie consent banners or preference centers to a web application
- Implementing data subject access requests (DSAR) — export or delete user data
- Building right-to-erasure functionality with cascade deletion and anonymization
- Creating data portability exports (JSON, CSV) for user data downloads
- Designing data retention policies and classification schemes
- Auditing third-party data sharing and sub-processor relationships

## Regulatory Overview

| Requirement              | GDPR (EU)              | CCPA/CPRA (California) | Applicability           |
|--------------------------|------------------------|------------------------|-------------------------|
| Lawful basis required    | Yes (6 bases)          | No (opt-out model)     | All                     |
| Consent for cookies      | Yes (prior consent)    | No (opt-out)           | Websites with EU/CA users |
| Right to access data     | Yes (30 days)          | Yes (45 days)          | All                     |
| Right to deletion        | Yes                    | Yes                    | All                     |
| Data portability         | Yes (machine-readable) | Yes                    | All                     |
| Data sale disclosure     | N/A                    | Yes ("Do Not Sell")    | Businesses selling data  |
| Breach notification      | 72 hours              | "Most expedient time"  | All                     |
| DPO required             | Sometimes             | No                     | Large-scale processors   |
| Fines                    | Up to 4% global revenue | $2,500-$7,500 per violation | All               |

### Do These Regulations Apply to You?

```
Do you have users in the EU?
  Yes -> GDPR applies regardless of where you're based
  No  -> Do you have users in California?
         Yes -> CCPA/CPRA applies if:
                - Revenue > $25M/year, OR
                - Buy/sell data of 100K+ consumers, OR
                - 50%+ revenue from selling data
         No  -> Still consider privacy best practices
                (many states/countries adopting similar laws)
```

## Consent Management

### Cookie Categorization

| Category       | Examples                          | Consent Required | Description                    |
|----------------|-----------------------------------|------------------|--------------------------------|
| Strictly Necessary | Session cookies, CSRF tokens, auth | No            | Essential for site operation   |
| Preferences    | Language, theme, region           | Recommended      | Remember user settings         |
| Analytics      | Google Analytics, Plausible, Mixpanel | Yes           | Track usage patterns           |
| Marketing      | Facebook Pixel, Google Ads        | Yes              | Advertising and retargeting    |
| Functional     | Chat widgets, video embeds        | Yes              | Enhanced functionality         |

### Cookie Banner Implementation (TypeScript/React)

```typescript
// components/CookieBanner.tsx
import { useState, useEffect } from 'react';

type ConsentCategory = 'necessary' | 'preferences' | 'analytics' | 'marketing';

interface ConsentState {
  necessary: boolean;    // always true
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
  version: string;
}

const CONSENT_VERSION = '2024-01-15';

export function CookieBanner() {
  const [show, setShow] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<ConsentState>({
    necessary: true,
    preferences: false,
    analytics: false,
    marketing: false,
    timestamp: '',
    version: CONSENT_VERSION,
  });

  useEffect(() => {
    const stored = localStorage.getItem('consent');
    if (!stored) {
      setShow(true);
      return;
    }
    const parsed: ConsentState = JSON.parse(stored);
    if (parsed.version !== CONSENT_VERSION) {
      // Re-consent needed if policy version changed
      setShow(true);
      return;
    }
    applyConsent(parsed);
  }, []);

  function saveConsent(newConsent: ConsentState) {
    newConsent.timestamp = new Date().toISOString();
    localStorage.setItem('consent', JSON.stringify(newConsent));
    applyConsent(newConsent);
    logConsentToServer(newConsent);
    setShow(false);
  }

  function applyConsent(c: ConsentState) {
    // Load analytics scripts only if consented
    if (c.analytics) {
      loadAnalyticsScript();
    }
    // Load marketing pixels only if consented
    if (c.marketing) {
      loadMarketingScripts();
    }
  }

  function acceptAll() {
    saveConsent({ ...consent, preferences: true, analytics: true, marketing: true });
  }

  function rejectAll() {
    saveConsent({ ...consent, preferences: false, analytics: false, marketing: false });
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
      {!showDetails ? (
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <p className="text-sm text-gray-700">
            We use cookies to improve your experience. By clicking "Accept All",
            you consent to our use of cookies as described in our{' '}
            <a href="/privacy" className="underline">Privacy Policy</a>.
          </p>
          <div className="flex gap-2 ml-4">
            <button onClick={() => setShowDetails(true)} className="text-sm text-gray-500 hover:underline">
              Customize
            </button>
            <button onClick={rejectAll} className="px-4 py-2 text-sm border rounded">
              Reject All
            </button>
            <button onClick={acceptAll} className="px-4 py-2 text-sm bg-blue-600 text-white rounded">
              Accept All
            </button>
          </div>
        </div>
      ) : (
        <PreferenceCenter consent={consent} onSave={saveConsent} />
      )}
    </div>
  );
}
```

### Consent Logging to Server

```typescript
// Log consent for audit trail (required by GDPR)
async function logConsentToServer(consent: ConsentState) {
  await fetch('/api/consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      categories: {
        necessary: consent.necessary,
        preferences: consent.preferences,
        analytics: consent.analytics,
        marketing: consent.marketing,
      },
      timestamp: consent.timestamp,
      version: consent.version,
      userAgent: navigator.userAgent,
    }),
  });
}
```

```typescript
// API route — store consent record
// app/api/consent/route.ts
import { db } from '@/lib/db';

export async function POST(request: Request) {
  const body = await request.json();
  const ipHash = await hashIP(request.headers.get('x-forwarded-for') || '');

  await db.consentLog.create({
    data: {
      ipHash,           // store hash, not raw IP
      categories: body.categories,
      timestamp: new Date(body.timestamp),
      version: body.version,
      userAgent: body.userAgent,
    },
  });

  return Response.json({ recorded: true });
}
```

### Preference Center Component

```typescript
// components/PreferenceCenter.tsx
interface Props {
  consent: ConsentState;
  onSave: (consent: ConsentState) => void;
}

function PreferenceCenter({ consent, onSave }: Props) {
  const [local, setLocal] = useState(consent);

  const categories = [
    { key: 'necessary' as const, label: 'Strictly Necessary', description: 'Required for site operation', disabled: true },
    { key: 'preferences' as const, label: 'Preferences', description: 'Remember your settings and choices' },
    { key: 'analytics' as const, label: 'Analytics', description: 'Help us understand how you use the site' },
    { key: 'marketing' as const, label: 'Marketing', description: 'Show relevant ads and measure campaigns' },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <h3 className="font-semibold mb-4">Cookie Preferences</h3>
      {categories.map((cat) => (
        <label key={cat.key} className="flex items-start gap-3 mb-3">
          <input
            type="checkbox"
            checked={local[cat.key]}
            disabled={cat.disabled}
            onChange={(e) => setLocal({ ...local, [cat.key]: e.target.checked })}
          />
          <div>
            <span className="font-medium">{cat.label}</span>
            <p className="text-sm text-gray-500">{cat.description}</p>
          </div>
        </label>
      ))}
      <button onClick={() => onSave(local)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
        Save Preferences
      </button>
    </div>
  );
}
```

## Data Subject Access Requests (DSAR)

### Export Pipeline Architecture

```
User requests export -> Queue job -> Discover data sources -> Export each -> Package -> Notify user
                                              |
                          +-------------------+-------------------+
                          |                   |                   |
                     User profile         Activity logs      Third-party data
                     (PostgreSQL)         (ClickHouse)       (Stripe, etc.)
```

### DSAR Export Implementation

```python
# dsar_export.py — generate a complete data export for a user
import json
import csv
import zipfile
import io
from datetime import datetime
from pathlib import Path

class DSARExporter:
    """Export all personal data for a given user across all data sources."""

    def __init__(self, user_id: str, db_session, redis_client):
        self.user_id = user_id
        self.db = db_session
        self.redis = redis_client

    def export_all(self) -> Path:
        """Generate a complete data export package."""
        export_dir = Path(f"/tmp/dsar_export_{self.user_id}_{datetime.now():%Y%m%d}")
        export_dir.mkdir(parents=True, exist_ok=True)

        # 1. Profile data
        self._export_profile(export_dir)

        # 2. Activity data
        self._export_activity(export_dir)

        # 3. Payment data (from Stripe)
        self._export_payments(export_dir)

        # 4. Communication preferences
        self._export_preferences(export_dir)

        # 5. Consent history
        self._export_consent_history(export_dir)

        # 6. Create ZIP archive
        zip_path = self._create_archive(export_dir)

        return zip_path

    def _export_profile(self, export_dir: Path):
        """Export user profile data."""
        user = self.db.execute(
            "SELECT * FROM users WHERE id = %s", (self.user_id,)
        ).fetchone()

        profile = {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "display_name": user.display_name,
            "created_at": user.created_at.isoformat(),
            "updated_at": user.updated_at.isoformat(),
            "last_login": user.last_login.isoformat() if user.last_login else None,
        }
        self._write_json(export_dir / "profile.json", profile)

    def _export_activity(self, export_dir: Path):
        """Export user activity as CSV."""
        rows = self.db.execute("""
            SELECT id, action, resource_type, resource_id, ip_address, created_at
            FROM activity_log
            WHERE user_id = %s
            ORDER BY created_at DESC
        """, (self.user_id,)).fetchall()

        self._write_csv(export_dir / "activity.csv", rows,
                        headers=["id", "action", "resource_type", "resource_id", "ip_address", "created_at"])

    def _export_payments(self, export_dir: Path):
        """Export payment data from Stripe."""
        import stripe
        customer = self.db.execute(
            "SELECT stripe_customer_id FROM users WHERE id = %s", (self.user_id,)
        ).fetchone().stripe_customer_id

        if customer:
            charges = stripe.Charge.list(customer=customer, limit=100)
            payments = [{
                "id": c.id,
                "amount": c.amount,
                "currency": c.currency,
                "status": c.status,
                "created": datetime.fromtimestamp(c.created).isoformat(),
                "description": c.description,
            } for c in charges.data]
            self._write_json(export_dir / "payments.json", payments)

    def _export_preferences(self, export_dir: Path):
        """Export user preferences."""
        prefs = self.db.execute(
            "SELECT * FROM user_preferences WHERE user_id = %s", (self.user_id,)
        ).fetchone()
        if prefs:
            self._write_json(export_dir / "preferences.json", dict(prefs))

    def _export_consent_history(self, export_dir: Path):
        """Export consent audit trail."""
        history = self.db.execute("""
            SELECT categories, timestamp, version
            FROM consent_log
            WHERE ip_hash = (SELECT ip_hash FROM users WHERE id = %s)
            ORDER BY timestamp DESC
        """, (self.user_id,)).fetchall()

        self._write_json(export_dir / "consent_history.json", [dict(h) for h in history])

    def _write_json(self, path: Path, data):
        with open(path, 'w') as f:
            json.dump(data, f, indent=2, default=str)

    def _write_csv(self, path: Path, rows, headers: list[str]):
        with open(path, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            for row in rows:
                writer.writerow(row)

    def _create_archive(self, export_dir: Path) -> Path:
        zip_path = export_dir.with_suffix('.zip')
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for file in export_dir.iterdir():
                zf.write(file, file.name)
        return zip_path
```

### DSAR API Endpoint

```typescript
// app/api/dsar/export/route.ts
import { db } from '@/lib/db';
import { queue } from '@/lib/queue';

export async function POST(request: Request) {
  const session = await getSession(request);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Queue the export job (may take minutes to hours)
  const job = await queue.add('dsar-export', {
    userId: session.userId,
    requestedAt: new Date().toISOString(),
  });

  // Record the request for audit
  await db.dsarRequests.create({
    data: {
      userId: session.userId,
      type: 'export',
      status: 'pending',
      jobId: job.id,
      requestedAt: new Date(),
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days (GDPR)
    },
  });

  return Response.json({
    message: 'Your data export has been queued. You will receive an email when ready.',
    jobId: job.id,
  });
}
```

## Right to Erasure

### Cascade Deletion Strategy

```sql
-- Approach 1: Database-level CASCADE (simple but risky)
-- Foreign keys with ON DELETE CASCADE handle cleanup automatically
ALTER TABLE orders
  ADD CONSTRAINT fk_orders_user
  FOREIGN KEY (user_id) REFERENCES users(id)
  ON DELETE CASCADE;

-- Approach 2: Application-level cascade (recommended — auditable)
-- Handle deletion in application code with explicit steps
```

```python
# erasure.py — right to erasure implementation
from datetime import datetime

class UserErasure:
    """Handle right-to-erasure requests with audit trail."""

    def __init__(self, user_id: str, db_session):
        self.user_id = user_id
        self.db = db_session
        self.erasure_log = []

    def execute_erasure(self, mode: str = "delete") -> dict:
        """
        Execute erasure. mode: 'delete' (hard delete) or 'anonymize' (keep records, strip PII).
        """
        self._log(f"Starting erasure (mode: {mode})")

        if mode == "delete":
            self._delete_user_data()
        else:
            self._anonymize_user_data()

        self._log("Erasure complete")
        return {"user_id": self.user_id, "actions": self.erasure_log}

    def _delete_user_data(self):
        """Hard delete all personal data."""
        # Order matters due to foreign key constraints
        tables_to_delete = [
            "consent_log",
            "user_preferences",
            "activity_log",
            "sessions",
            "notifications",
            "orders",           # if not needed for tax/legal
            "user_addresses",
            "users",
        ]

        for table in tables_to_delete:
            count = self.db.execute(
                f"DELETE FROM {table} WHERE user_id = %s RETURNING id",
                (self.user_id,)
            ).rowcount
            self._log(f"Deleted {count} rows from {table}")

        self.db.commit()

    def _anonymize_user_data(self):
        """Anonymize PII while preserving referential integrity."""
        anon_id = f"anonymized_{self.user_id}"

        self.db.execute("""
            UPDATE users SET
              email = %(anon_id)s || '@anonymized.invalid',
              name = 'Anonymized User',
              display_name = 'Anonymous',
              ip_address = NULL,
              phone = NULL,
              avatar_url = NULL,
              anonymized_at = NOW()
            WHERE id = %(user_id)s
        """, {"user_id": self.user_id, "anon_id": anon_id})
        self._log("Anonymized user profile")

        # Anonymize activity logs
        self.db.execute("""
            UPDATE activity_log SET
              ip_address = NULL,
              user_agent = NULL
            WHERE user_id = %s
        """, (self.user_id,))
        self._log("Anonymized activity logs")

        # Delete optional data entirely
        for table in ["user_preferences", "consent_log", "notifications"]:
            count = self.db.execute(
                f"DELETE FROM {table} WHERE user_id = %s", (self.user_id,)
            ).rowcount
            self._log(f"Deleted {count} rows from {table}")

        self.db.commit()

    def _log(self, message: str):
        self.erasure_log.append({
            "timestamp": datetime.utcnow().isoformat(),
            "message": message,
        })
```

### Soft Delete with TTL

```typescript
// Soft delete with automatic hard delete after retention period
async function requestAccountDeletion(userId: string) {
  // 1. Mark account for deletion
  await db.users.update({
    where: { id: userId },
    data: {
      status: 'pending_deletion',
      deletionRequestedAt: new Date(),
      // Remove from active systems immediately
      emailVerified: false,
      sessions: { deleteMany: {} },
    },
  });

  // 2. Schedule hard delete after grace period (30 days)
  await queue.add('hard-delete-user', {
    userId,
  }, {
    delay: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  // 3. Notify user via email (to their backup email)
  await sendDeletionConfirmationEmail(userId);
}

// Worker that executes hard delete
queue.process('hard-delete-user', async (job) => {
  const { userId } = job.data;

  // Verify deletion was still requested (user may have cancelled)
  const user = await db.users.findUnique({ where: { id: userId } });
  if (user?.status !== 'pending_deletion') return;

  const erasure = new UserErasure(userId, db);
  await erasure.executeErasure('anonymize');
});
```

## Data Portability

### Export Formats

```python
# portability.py — generate portable data exports
import json
import csv
from datetime import datetime

def export_user_data_portable(user_id: str, format: str = "json") -> bytes:
    """
    Export user data in a portable, machine-readable format.
    GDPR Article 20 requires "structured, commonly used, machine-readable" format.
    """
    data = gather_user_data(user_id)

    if format == "json":
        return json.dumps(data, indent=2, default=str).encode('utf-8')

    elif format == "csv":
        output = io.StringIO()
        # Flatten nested data into multiple CSV files
        with zipfile.ZipFile(io.BytesIO(), 'w') as zf:
            # Profile
            profile_csv = io.StringIO()
            writer = csv.DictWriter(profile_csv, fieldnames=data['profile'].keys())
            writer.writeheader()
            writer.writerow(data['profile'])
            zf.writestr('profile.csv', profile_csv.getvalue())

            # Activity
            if data.get('activity'):
                activity_csv = io.StringIO()
                writer = csv.DictWriter(activity_csv, fieldnames=data['activity'][0].keys())
                writer.writeheader()
                writer.writerows(data['activity'])
                zf.writestr('activity.csv', activity_csv.getvalue())

        return zf.getvalue()

    else:
        raise ValueError(f"Unsupported format: {format}")
```

## Privacy by Design

### Data Classification

| Classification | Examples                       | Encryption  | Retention | Access Control     |
|----------------|-------------------------------|-------------|-----------|--------------------|
| Public         | Display name, avatar          | In transit  | Until changed | Anyone          |
| Internal       | Email, usage stats            | In transit + at rest | Per policy | Authenticated users |
| Confidential   | Payment info, ID documents    | In transit + at rest | Minimize  | Need-to-know only  |
| Restricted     | Passwords, API keys, tokens   | Hashed/encrypted at rest | Rotate regularly | System only |

### Data Retention Policy Configuration

```yaml
# retention-policy.yml
policies:
  - name: user_account
    data: [users table]
    retention: "active + 30 days after deletion request"
    action: anonymize

  - name: activity_logs
    data: [activity_log table]
    retention: "1 year from creation"
    action: delete

  - name: session_data
    data: [sessions table]
    retention: "90 days from last activity"
    action: delete

  - name: analytics_events
    data: [analytics table]
    retention: "26 months (anonymized after 14 months)"
    action: anonymize

  - name: consent_logs
    data: [consent_log table]
    retention: "5 years from consent timestamp (legal requirement)"
    action: delete

  - name: payment_records
    data: [payments table]
    retention: "7 years (tax/legal requirement)"
    action: archive

  - name: support_tickets
    data: [tickets table]
    retention: "3 years from resolution"
    action: anonymize
```

### Retention Enforcement Job

```python
# retention_enforcer.py — runs daily to enforce retention policies
import yaml
from datetime import datetime, timedelta

def enforce_retention():
    """Enforce data retention policies across all tables."""
    with open('retention-policy.yml') as f:
        config = yaml.safe_load(f)

    for policy in config['policies']:
        print(f"Enforcing: {policy['name']}")

        if policy['action'] == 'delete':
            result = db.execute(f"""
                DELETE FROM {policy['data'][0]}
                WHERE created_at < NOW() - INTERVAL '{policy['retention']}'
            """)
            print(f"  Deleted {result.rowcount} rows")

        elif policy['action'] == 'anonymize':
            result = db.execute(f"""
                UPDATE {policy['data'][0]}
                SET email = 'anonymized_' || id || '@deleted.invalid',
                    name = 'Anonymized',
                    ip_address = NULL
                WHERE created_at < NOW() - INTERVAL '{policy['retention']}'
                  AND email NOT LIKE 'anonymized_%'
            """)
            print(f"  Anonymized {result.rowcount} rows")
```

## Third-Party Data Sharing Audit

### Data Processing Agreement (DPA) Checklist

```yaml
# third-party-audit.yml
processors:
  - name: Stripe
    data_shared: [payment info, billing email]
    dpasigned: true
    location: US
    sub_processors: [AWS, Cloudflare]
    purpose: Payment processing

  - name: SendGrid
    data_shared: [email address, name]
    dpasigned: true
    location: US
    sub_processors: [AWS]
    purpose: Transactional email

  - name: Google Analytics
    data_shared: [anonymized usage data, IP (anonymized)]
    dpasigned: true
    location: US
    sub_processors: [Google Cloud]
    purpose: Analytics (requires user consent)

  - name: Intercom
    data_shared: [email, name, company, usage data]
    dpasigned: true
    location: US
    sub_processors: [AWS, Segment]
    purpose: Customer support
```

### Sub-Processor Tracking Script

```python
# sub_processor_audit.py
def audit_sub_processors():
    """Verify all sub-processors have valid DPAs."""
    with open('third-party-audit.yml') as f:
        config = yaml.safe_load(f)

    issues = []
    for processor in config['processors']:
        if not processor['dpasigned']:
            issues.append(f"CRITICAL: {processor['name']} — DPA not signed")

        for sub in processor.get('sub_processors', []):
            print(f"  {processor['name']} -> {sub}")

    if issues:
        print("\n=== ISSUES FOUND ===")
        for issue in issues:
            print(f"  {issue}")
    else:
        print("\nAll processors have signed DPAs.")
```

## Cookie Compliance Details

### First-Party vs Third-Party Cookies

| Type        | Set By           | Consent Required | Examples                         |
|-------------|------------------|------------------|----------------------------------|
| First-party | Your domain      | If non-essential | Session, preferences, CSRF       |
| Third-party | External domains | Always           | Google Analytics, Facebook Pixel |

### Cookie Declaration (Auto-Generated)

```typescript
// Generate a cookie declaration from your consent configuration
const cookieDeclaration = [
  {
    name: 'session_id',
    provider: 'example.com',
    purpose: 'Maintains user session',
    category: 'necessary',
    duration: 'Session',
    type: 'first-party',
  },
  {
    name: '_ga',
    provider: 'Google',
    purpose: 'Distinguishes users for analytics',
    category: 'analytics',
    duration: '2 years',
    type: 'third-party',
  },
  {
    name: '_fbp',
    provider: 'Facebook',
    purpose: 'Tracks visits across websites for advertising',
    category: 'marketing',
    duration: '3 months',
    type: 'third-party',
  },
];
```

## Anti-Patterns

- **Pre-checked consent boxes**: GDPR requires freely given, specific, informed, and unambiguous consent. Pre-checked boxes or "by using this site you agree" banners are not valid consent. Always default to opt-out (unchecked).
- **Blocking site access behind a cookie wall**: Denying access to users who reject non-essential cookies violates GDPR's "freely given" requirement. The site must function fully with only strictly necessary cookies.
- **Storing consent only client-side**: If a user clears their browser, you lose the consent record. Always log consent server-side with timestamp, version, and IP hash for audit purposes.
- **Hard-deleting data needed for legal obligations**: Tax records, payment records, and certain transaction data must be retained for legal periods (typically 7 years). Use anonymization instead of deletion for these records, and document the legal basis for retention.
- **Ignoring sub-processors in your privacy policy**: GDPR requires disclosing all sub-processors. If your payment provider (Stripe) uses AWS to host data, AWS is a sub-processor. Maintain an up-to-date sub-processor list and notify users of changes.
- **Collecting data "just in case"**: Data minimization (GDPR Article 5) means collecting only what you need for a specific purpose. Audit your database schema periodically and remove fields that are not actively used.

## Related Skills

- [[csp-db-backup]]
- [[csp-monitoring-alerting]]
- [[csp-platform-deploy]]
