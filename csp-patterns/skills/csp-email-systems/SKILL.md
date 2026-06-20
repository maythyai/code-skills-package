---
name: csp-email-systems
description: >
  Integrates transactional and marketing email systems with provider setup, template rendering, deliverability configuration, bounce handling, and queue-based sending for reliable email delivery.
version: 0.1.0
layer: 4
category: patterns
---

# Email Systems

Patterns for building reliable email infrastructure covering transactional and marketing emails, from provider selection and template rendering to deliverability optimization and compliance.

## When to Activate

- Choosing an email service provider (ESP) for transactional or marketing email
- Implementing transactional email templates with dynamic variables
- Configuring SPF, DKIM, and DMARC for deliverability
- Building bounce handling and suppression list management
- Setting up queue-based bulk email sending
- Rendering cross-client compatible HTML emails

## Provider Comparison

| Feature | Resend | Amazon SES | Postmark | SendGrid |
|---------|--------|-----------|----------|----------|
| Transactional Email | Yes | Yes | Yes (primary) | Yes |
| Marketing Email | No | No | Broadcasts | Yes |
| API Quality | Excellent | Good | Excellent | Good |
| Pricing (per 1K) | $0.80 | $0.10 | $1.25 | $1.95 |
| Free Tier | 100/day | 62K/mo (EC2) | 100/mo | 100/day |
| Template Engine | React Email | Basic | Templates | Dynamic |
| Webhook Support | Yes | SNS | Yes | Yes |
| Deliverability Rep | Excellent | Good | Excellent | Good |
| Best For | Modern stacks, DX | High volume, low cost | Critical transactional | Full-service |

**Decision rule**: Use Resend for modern stacks with great DX. Use SES for high-volume/low-cost. Use Postmark for critical transactional where delivery speed matters most. Use SendGrid when you need both transactional and marketing in one platform.

## Transactional Email with Resend

### Basic Setup and Sending

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

interface EmailParams {
  to: string | string[];
  subject: string;
  templateId: string;
  variables: Record<string, string>;
  attachments?: { filename: string; content: string; contentType: string }[];
}

async function sendTransactionalEmail(
  params: EmailParams
): Promise<{ id: string; status: string }> {
  const result = await resend.emails.send({
    from: "Acme <notifications@acme.com>",
    to: Array.isArray(params.to) ? params.to : [params.to],
    subject: params.subject,
    react: renderTemplate(params.templateId, params.variables),
    attachments: params.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
    headers: {
      // Prevent threading of unrelated emails
      "X-Entity-Ref-ID": `txn-${Date.now()}-${params.templateId}`,
    },
  });

  return { id: result.id ?? "", status: "sent" };
}
```

### React Email Templates

```tsx
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Img,
  Hr,
  Preview,
} from "@react-email/components";

interface WelcomeEmailProps {
  userName: string;
  activationUrl: string;
  companyName: string;
}

function WelcomeEmail({
  userName,
  activationUrl,
  companyName,
}: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to {companyName}, {userName}!</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Img
            src="https://acme.com/logo.png"
            width="120"
            height="40"
            alt={companyName}
          />
          <Section style={sectionStyle}>
            <Text style={headingStyle}>
              Welcome to {companyName}, {userName}!
            </Text>
            <Text style={textStyle}>
              We are excited to have you on board. Click the button below to
              activate your account and get started.
            </Text>
            <Button href={activationUrl} style={buttonStyle}>
              Activate Your Account
            </Button>
            <Text style={footnoteStyle}>
              If you did not create this account, please ignore this email.
            </Text>
          </Section>
          <Hr style={hrStyle} />
          <Text style={footerStyle}>
            {companyName} Inc. | 123 Main St, San Francisco, CA 94105
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = { backgroundColor: "#f6f9fc", fontFamily: "sans-serif" };
const containerStyle = { margin: "0 auto", padding: "20px", maxWidth: "580px" };
const sectionStyle = { padding: "24px", backgroundColor: "#ffffff", borderRadius: "8px" };
const headingStyle = { fontSize: "24px", fontWeight: "bold", color: "#1a1a1a" };
const textStyle = { fontSize: "16px", lineHeight: "1.6", color: "#4a4a4a" };
const buttonStyle = {
  display: "inline-block",
  padding: "12px 24px",
  backgroundColor: "#0070f3",
  color: "#ffffff",
  borderRadius: "6px",
  textDecoration: "none",
  fontWeight: "bold",
};
const footnoteStyle = { fontSize: "13px", color: "#888" };
const hrStyle = { borderColor: "#e6ebf1", margin: "20px 0" };
const footerStyle = { fontSize: "12px", color: "#8898aa", textAlign: "center" as const };

export default WelcomeEmail;
```

### Template Registry

```typescript
import WelcomeEmail from "./templates/welcome";
import PasswordResetEmail from "./templates/password-reset";
import InvoiceEmail from "./templates/invoice";
import DunningEmail from "./templates/dunning";
import type { ReactElement } from "react";

type TemplateRenderer = (vars: Record<string, string>) => ReactElement;

const TEMPLATE_REGISTRY: Record<string, TemplateRenderer> = {
  welcome: (vars) =>
    WelcomeEmail({
      userName: vars.user_name,
      activationUrl: vars.activation_url,
      companyName: vars.company_name ?? "Acme",
    }),
  password_reset: (vars) =>
    PasswordResetEmail({
      userName: vars.user_name,
      resetUrl: vars.reset_url,
      expiresIn: vars.expires_in ?? "1 hour",
    }),
  invoice: (vars) =>
    InvoiceEmail({
      userName: vars.user_name,
      invoiceNumber: vars.invoice_number,
      amount: vars.amount,
      currency: vars.currency,
      pdfUrl: vars.pdf_url,
    }),
  dunning: (vars) =>
    DunningEmail({
      userName: vars.user_name,
      attemptNumber: parseInt(vars.attempt_number ?? "1"),
      updatePaymentUrl: vars.update_payment_url,
    }),
};

function renderTemplate(
  templateId: string,
  variables: Record<string, string>
): ReactElement {
  const renderer = TEMPLATE_REGISTRY[templateId];
  if (!renderer) {
    throw new Error(`Unknown email template: ${templateId}`);
  }
  return renderer(variables);
}
```

## Email Rendering with MJML

```typescript
import mjml2html from "mjml";

function renderMjmlTemplate(
  template: string,
  variables: Record<string, string>
): string {
  // Replace template variables
  let mjmlSource = template;
  for (const [key, value] of Object.entries(variables)) {
    mjmlSource = mjmlSource.replaceAll(`{{${key}}}`, value);
  }

  const { html, errors } = mjml2html(mjmlSource, {
    validationLevel: "strict",
  });

  if (errors.length > 0) {
    console.error("MJML compilation errors:", errors);
  }

  return html;
}

// MJML template example (stored as string or file)
const MJML_WELCOME_TEMPLATE = `
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
      <mj-text font-size="14px" color="#333" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f4f4f4">
    <mj-section background-color="#ffffff" padding="20px">
      <mj-column>
        <mj-image src="https://acme.com/logo.png" width="120px" />
        <mj-text font-size="24px" font-weight="bold" align="center">
          Welcome, {{user_name}}!
        </mj-text>
        <mj-text>
          Your account is ready. Click below to get started.
        </mj-text>
        <mj-button background-color="#0070f3" href="{{activation_url}}">
          Activate Account
        </mj-button>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`;
```

## Deliverability Configuration

### SPF, DKIM, and DMARC Setup

```
; DNS Records for acme.com

; SPF: Authorize Resend and SES to send on your behalf
@ TXT "v=spf1 include:resend._spf.resend.com include:amazonses.com ~all"

; DKIM: Resend provides this after domain verification
resend._domainkey CNAME resend._domainkey.resend.com

; DMARC: Policy for unauthenticated email
_dmarc TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@acme.com; ruf=mailto:dmarc-forensics@acme.com; pct=100; adkim=s; aspf=s"
```

### Deliverability Checklist

| Record | Purpose | Configuration |
|--------|---------|---------------|
| SPF | Authorizes sending IPs | Include all ESPs, end with `~all` (soft fail) |
| DKIM | Cryptographic signing | One per sending service, rotate annually |
| DMARC | Policy enforcement | Start with `p=none`, move to `quarantine`, then `reject` |
| rDNS/PTR | Reverse DNS | Required for dedicated IPs |
| BIMI | Brand logo in inbox | Optional, requires DMARC at `quarantine` or `reject` |

### DMARC Rollout Strategy

```
Week 1-2:  v=DMARC1; p=none; rua=mailto:dmarc@acme.com
Week 3-4:  Review aggregate reports, fix SPF/DKIM failures
Week 5-8:  v=DMARC1; p=quarantine; pct=25; rua=mailto:dmarc@acme.com
Week 9-12: v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@acme.com
Week 13+:  v=DMARC1; p=reject; pct=100; rua=mailto:dmarc@acme.com
```

## Bounce Handling and Suppression

```typescript
interface BounceEvent {
  email: string;
  type: "hard" | "soft";
  reason: string;
  timestamp: Date;
  provider: string;
}

async function handleBounce(event: BounceEvent): Promise<void> {
  if (event.type === "hard") {
    // Hard bounce: permanently undeliverable
    await db.suppressionList.create({
      data: {
        email: event.email.toLowerCase(),
        reason: event.reason,
        type: "hard_bounce",
        suppressedAt: event.timestamp,
        expiresAt: null, // Permanent suppression
      },
    });

    // Update user record
    await db.users.updateMany({
      where: { email: event.email.toLowerCase() },
      data: { emailDeliveryStatus: "bounced" },
    });

    // Remove from all marketing lists
    await removeFromMarketingLists(event.email);
  } else {
    // Soft bounce: temporary issue, retry up to 3 times
    const bounceCount = await db.bounceEvents.count({
      where: {
        email: event.email.toLowerCase(),
        type: "soft",
        timestamp: { gte: new Date(Date.now() - 7 * 86400000) },
      },
    });

    await db.bounceEvents.create({ data: event });

    if (bounceCount >= 3) {
      // Promote to hard bounce after 3 soft bounces in 7 days
      await handleBounce({ ...event, type: "hard", reason: "Repeated soft bounces" });
    }
  }
}

// Pre-send suppression check
async function canSendEmail(email: string): Promise<boolean> {
  const suppressed = await db.suppressionList.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!suppressed) return true;

  // Check if suppression has expired
  if (suppressed.expiresAt && suppressed.expiresAt < new Date()) {
    await db.suppressionList.delete({ where: { email: email.toLowerCase() } });
    return true;
  }

  return false;
}
```

## Marketing Email and Compliance

```typescript
interface MarketingEmailConfig {
  listId: string;
  templateId: string;
  subject: string;
  variables: Record<string, string>;
  segment?: { field: string; operator: string; value: string };
}

async function sendMarketingCampaign(
  config: MarketingEmailConfig
): Promise<{ queued: number; skipped: number }> {
  // Get subscribers with proper consent
  const subscribers = await db.subscribers.findMany({
    where: {
      listId: config.listId,
      status: "active",
      consentedAt: { not: null },
      // Exclude suppressed emails
      email: { notIn: await getSuppressedEmails() },
      // Apply segment filter
      ...(config.segment && {
        [config.segment.field]: {
          [config.segment.operator]: config.segment.value,
        },
      }),
    },
  });

  let queued = 0;
  let skipped = 0;

  // Queue-based sending to respect rate limits
  for (const subscriber of subscribers) {
    const job = {
      to: subscriber.email,
      templateId: config.templateId,
      variables: { ...config.variables, unsubscribe_url: buildUnsubscribeUrl(subscriber) },
    };

    await emailQueue.add("marketing", job, {
      attempts: 2,
      backoff: { type: "exponential", delay: 5000 },
      // Throttle: max 50 emails/second to avoid ESP rate limits
      rateLimit: { max: 50, duration: 1000 },
    });

    queued++;
  }

  return { queued, skipped };
}

// One-click unsubscribe endpoint (RFC 8058 compliant)
async function handleUnsubscribe(
  request: Request
): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response("Missing unsubscribe token", { status: 400 });
  }

  const payload = verifyUnsubscribeToken(token);
  if (!payload) {
    return new Response("Invalid token", { status: 400 });
  }

  await db.subscribers.updateMany({
    where: { email: payload.email, listId: payload.listId },
    data: { status: "unsubscribed", unsubscribedAt: new Date() },
  });

  // Return 200 for one-click unsubscribe (List-Unsubscribe-Post)
  return new Response("Unsubscribed successfully", { status: 200 });
}
```

## Queue-Based Sending with BullMQ

```typescript
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

const emailQueue = new Queue("email-sending", { connection });

// Worker processes email jobs
const emailWorker = new Worker(
  "email-sending",
  async (job) => {
    const { to, subject, templateId, variables, attachments } = job.data;

    // Check suppression before sending
    if (!(await canSendEmail(to))) {
      return { skipped: true, reason: "suppressed" };
    }

    const result = await resend.emails.send({
      from: "Acme <notifications@acme.com>",
      to,
      subject,
      react: renderTemplate(templateId, variables),
      attachments,
    });

    // Record delivery attempt
    await db.emailLogs.create({
      data: {
        messageId: result.id ?? "",
        to,
        templateId,
        status: "sent",
        sentAt: new Date(),
        jobId: job.id,
      },
    });

    return { messageId: result.id };
  },
  {
    connection,
    concurrency: 10, // Process 10 emails simultaneously
    limiter: { max: 80, duration: 1000 }, // Max 80/second (below ESP limits)
  }
);

// Handle delivery webhooks
emailWorker.on("failed", async (job, err) => {
  console.error(`Email job ${job?.id} failed:`, err.message);
  await db.emailLogs.create({
    data: {
      to: job?.data.to,
      templateId: job?.data.templateId,
      status: "failed",
      error: err.message,
      sentAt: new Date(),
      jobId: job?.id,
    },
  });
});
```

## Email Testing in Development

```typescript
// Use Mailhog for local email testing
import nodemailer from "nodemailer";

function createDevTransport() {
  if (process.env.NODE_ENV === "development") {
    return nodemailer.createTransport({
      host: "localhost",
      port: 1025, // Mailhog SMTP port
      secure: false,
    });
  }
  // Production: use Resend
  return null;
}

// Preview templates in browser
import { render } from "@react-email/render";

async function previewTemplate(templateId: string) {
  const mockVars = {
    user_name: "Jane Doe",
    activation_url: "https://acme.com/activate?token=abc123",
    company_name: "Acme",
    invoice_number: "INV-2024-001",
    amount: "$99.00",
    currency: "USD",
  };

  const element = renderTemplate(templateId, mockVars);
  const html = await render(element);
  return html; // Serve this in a dev route for visual inspection
}

// Integration test for email delivery
async function testEmailDelivery() {
  const result = await sendTransactionalEmail({
    to: "test+delivery@acme.com",
    subject: "Delivery Test",
    templateId: "welcome",
    variables: {
      user_name: "Test User",
      activation_url: "https://acme.com/activate?token=test",
      company_name: "Acme",
    },
  });

  // Verify delivery via provider webhook
  const delivery = await waitForDeliveryWebhook(result.id, 10000);
  expect(delivery.status).toBe("delivered");
}
```

## Anti-Patterns

- **Sending marketing emails without checking suppression lists** -- always verify against hard bounces and unsubscribes before queuing. Sending to suppressed addresses damages sender reputation.
- **Using a single sending domain for all email types** -- separate transactional (notifications@acme.com) and marketing (news@acme.com) to different subdomains so marketing issues don't affect transactional deliverability.
- **Not implementing List-Unsubscribe headers** -- Gmail and other providers require these for bulk senders. Include both `mailto:` and HTTP unsubscribe URLs.
- **Sending emails synchronously in API request handlers** -- always use a job queue. Synchronous sending blocks the response and can timeout during bulk operations.
- **Skipping DMARC monitoring after initial setup** -- review aggregate DMARC reports weekly. New integrations or misconfigured forwarding can break SPF/DKIM alignment.
- **Using plain HTML tables for email layouts without testing** -- email clients have wildly different rendering engines. Use React Email or MJML which produce tested, cross-client compatible HTML.

## Related Skills

- [[csp-webhook-architecture]] -- Processing delivery webhooks (bounces, opens, clicks)
- [[csp-subscription-management]] -- Dunning emails and subscription notifications
- [[csp-user-analytics]] -- Tracking email engagement metrics
- [[csp-privacy-compliance]] -- GDPR/CAN-SPAM compliance for marketing emails
