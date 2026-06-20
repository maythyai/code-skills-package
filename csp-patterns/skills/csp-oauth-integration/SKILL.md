---
name: csp-oauth-integration
description: >
  Implements OAuth 2.0 and OpenID Connect authentication flows including Authorization Code with PKCE, multi-provider identity, token management, session handling, and social login provider integration.
version: 0.1.0
layer: 4
category: patterns
---

# OAuth Integration

Production-ready patterns for OAuth 2.0 and OpenID Connect authentication, covering all major flows, multi-provider support, token lifecycle management, and secure session handling.

## When to Activate

- Implementing social login (Google, GitHub, Apple, Microsoft)
- Building OAuth 2.0 Authorization Code flow with PKCE for SPAs or mobile
- Setting up service-to-service authentication with Client Credentials
- Managing access token refresh, rotation, and revocation
- Linking multiple OAuth provider accounts to a single user
- Choosing between JWT and opaque session tokens

## OAuth 2.0 Flow Comparison

| Flow | Use Case | Client Type | Security | PKCE Required |
|------|----------|-------------|----------|---------------|
| Authorization Code + PKCE | SPAs, mobile apps, desktop | Public | High | Yes |
| Authorization Code | Server-rendered apps | Confidential | High | Recommended |
| Client Credentials | Service-to-service | Confidential | High | No |
| Device Code | CLI tools, IoT devices | Public | Medium | No |
| Implicit | Deprecated, do not use | Public | Low | No |

**Decision rule**: Use Authorization Code + PKCE for all client-side applications. Use standard Authorization Code for server-rendered apps. Use Client Credentials only for machine-to-machine communication.

## Authorization Code Flow with PKCE

### PKCE Challenge Generation

```typescript
import crypto from "node:crypto";

function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  // Generate a cryptographically random code verifier (43-128 chars)
  const codeVerifier = crypto.randomBytes(32).toString("base64url");

  // Create code challenge: SHA-256 hash of the verifier, base64url-encoded
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  return { codeVerifier, codeChallenge };
}

// Store the verifier in a secure, httpOnly cookie or server-side session
function storePKCEState(
  codeVerifier: string,
  state: string
): void {
  // Server-side: store in Redis with short TTL
  const key = `oauth:state:${state}`;
  redis.set(key, JSON.stringify({ codeVerifier }), "EX", 600); // 10 min TTL
}

async function retrievePKCEState(
  state: string
): Promise<{ codeVerifier: string } | null> {
  const key = `oauth:state:${state}`;
  const data = await redis.get(key);
  if (!data) return null;
  await redis.del(key); // One-time use
  return JSON.parse(data);
}
```

### Complete OAuth Flow (Next.js App Router)

```typescript
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

// Step 1: Redirect user to OAuth provider
export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get("provider");
  const providerConfig = getProviderConfig(provider);

  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString("hex");

  await storePKCEState(codeVerifier, state);

  const authUrl = new URL(providerConfig.authorizationEndpoint);
  authUrl.searchParams.set("client_id", providerConfig.clientId);
  authUrl.searchParams.set("redirect_uri", providerConfig.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", providerConfig.scopes.join(" "));
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  // Provider-specific parameters
  if (provider === "google") {
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
  }

  return NextResponse.redirect(authUrl.toString());
}

// Step 2: Handle OAuth callback
export async function handleCallback(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`/login?error=${error}`);
  }

  if (!code || !state) {
    return NextResponse.redirect("/login?error=missing_params");
  }

  // Verify state (CSRF protection)
  const pkceState = await retrievePKCEState(state);
  if (!pkceState) {
    return NextResponse.redirect("/login?error=invalid_state");
  }

  const provider = getProviderFromState(state);
  const config = getProviderConfig(provider);

  // Exchange code for tokens
  const tokenResponse = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code_verifier: pkceState.codeVerifier,
    }),
  });

  const tokens = await tokenResponse.json();

  if (!tokenResponse.ok) {
    console.error("Token exchange failed:", tokens);
    return NextResponse.redirect("/login?error=token_exchange_failed");
  }

  // Fetch user profile
  const userInfo = await fetchUserInfo(config.userInfoEndpoint, tokens.access_token);

  // Find or create user
  const user = await findOrCreateUser(provider, userInfo, tokens);

  // Create session
  const sessionToken = await createSession(user.id);

  const response = NextResponse.redirect("/dashboard");
  response.cookies.set("session", sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return response;
}
```

## Multi-Provider Account Linking

```typescript
interface OAuthProvider {
  id: string; // "google", "github", "apple"
  name: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

const PROVIDERS: Record<string, OAuthProvider> = {
  google: {
    id: "google",
    name: "Google",
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
    userInfoEndpoint: "https://www.googleapis.com/oauth2/v2/userinfo",
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: `${process.env.APP_URL}/api/auth/callback/google`,
    scopes: ["openid", "email", "profile"],
  },
  github: {
    id: "github",
    name: "GitHub",
    authorizationEndpoint: "https://github.com/login/oauth/authorize",
    tokenEndpoint: "https://github.com/login/oauth/access_token",
    userInfoEndpoint: "https://api.github.com/user",
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    redirectUri: `${process.env.APP_URL}/api/auth/callback/github`,
    scopes: ["user:email", "read:user"],
  },
  apple: {
    id: "apple",
    name: "Apple",
    authorizationEndpoint: "https://appleid.apple.com/auth/authorize",
    tokenEndpoint: "https://appleid.apple.com/auth/token",
    userInfoEndpoint: "", // Apple sends user info in the initial response
    clientId: process.env.APPLE_CLIENT_ID!,
    clientSecret: "", // Generated dynamically using JWT
    redirectUri: `${process.env.APP_URL}/api/auth/callback/apple`,
    scopes: ["name", "email"],
  },
};

async function findOrCreateUser(
  provider: string,
  profile: UserProfile,
  tokens: TokenResponse
): Promise<User> {
  // Check if this provider identity already exists
  const existingIdentity = await db.oauthIdentities.findUnique({
    where: {
      provider_providerId: {
        provider,
        providerId: profile.id,
      },
    },
    include: { user: true },
  });

  if (existingIdentity) {
    // Update tokens and return existing user
    await db.oauthIdentities.update({
      where: { id: existingIdentity.id },
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });
    return existingIdentity.user;
  }

  // Check if user with same email exists (account linking)
  const existingUser = profile.email
    ? await db.users.findUnique({ where: { email: profile.email } })
    : null;

  if (existingUser) {
    // Link new provider to existing account
    await db.oauthIdentities.create({
      data: {
        userId: existingUser.id,
        provider,
        providerId: profile.id,
        email: profile.email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });
    return existingUser;
  }

  // Create new user with linked identity
  const user = await db.users.create({
    data: {
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      oauthIdentities: {
        create: {
          provider,
          providerId: profile.id,
          email: profile.email,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      },
    },
  });

  return user;
}
```

## Token Management

### Access Token Refresh

```typescript
async function refreshAccessToken(
  identityId: string
): Promise<{ accessToken: string; expiresAt: Date }> {
  const identity = await db.oauthIdentities.findUniqueOrThrow({
    where: { id: identityId },
  });

  if (!identity.refreshToken) {
    throw new Error("No refresh token available");
  }

  const config = PROVIDERS[identity.provider];

  const response = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: identity.refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });

  const tokens = await response.json();

  if (!response.ok) {
    // Refresh token revoked - force re-authentication
    await db.oauthIdentities.update({
      where: { id: identityId },
      data: { accessToken: null, refreshToken: null },
    });
    throw new Error("Refresh token revoked, re-authentication required");
  }

  // Update stored tokens (some providers rotate refresh tokens)
  const newRefreshToken = tokens.refresh_token ?? identity.refreshToken;
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await db.oauthIdentities.update({
    where: { id: identityId },
    data: {
      accessToken: tokens.access_token,
      refreshToken: newRefreshToken,
      tokenExpiresAt: expiresAt,
    },
  });

  return { accessToken: tokens.access_token, expiresAt };
}

// Middleware to auto-refresh expired tokens
async function getValidAccessToken(
  identityId: string
): Promise<string> {
  const identity = await db.oauthIdentities.findUniqueOrThrow({
    where: { id: identityId },
  });

  // Refresh if token expires within 5 minutes
  const bufferMs = 5 * 60 * 1000;
  if (
    identity.tokenExpiresAt &&
    identity.tokenExpiresAt.getTime() - Date.now() < bufferMs
  ) {
    const refreshed = await refreshAccessToken(identityId);
    return refreshed.accessToken;
  }

  if (!identity.accessToken) {
    throw new Error("No access token available");
  }

  return identity.accessToken;
}
```

## Session Management

### JWT vs Opaque Session Decision

| Aspect | JWT Sessions | Opaque Sessions |
|--------|-------------|-----------------|
| Storage | Self-contained (client) | Server-side (Redis/DB) |
| Revocation | Difficult (need blocklist) | Easy (delete from store) |
| Size | Larger (contains claims) | Small (random token) |
| Validation | Local (no DB call) | Requires DB/Redis lookup |
| Refresh Strategy | Short-lived + refresh token | Extend on activity |
| Best For | Microservices, stateless APIs | Web apps, sensitive data |

### Opaque Session Implementation

```typescript
import crypto from "node:crypto";

async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  await db.sessions.create({
    data: {
      token: hashedToken,
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600000), // 7 days
      createdAt: new Date(),
      lastActiveAt: new Date(),
    },
  });

  return token;
}

async function validateSession(
  token: string
): Promise<{ userId: string; expiresAt: Date } | null> {
  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const session = await db.sessions.findUnique({
    where: { token: hashedToken },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await db.sessions.delete({ where: { token: hashedToken } });
    }
    return null;
  }

  // Extend session on activity (sliding window)
  const newExpiry = new Date(Date.now() + 7 * 24 * 3600000);
  await db.sessions.update({
    where: { token: hashedToken },
    data: { lastActiveAt: new Date(), expiresAt: newExpiry },
  });

  return { userId: session.userId, expiresAt: session.expiresAt };
}

// Revoke session on logout
async function revokeSession(token: string): Promise<void> {
  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  await db.sessions.delete({ where: { token: hashedToken } });
}
```

## Client Credentials Flow (Service-to-Service)

```typescript
interface ServiceToken {
  accessToken: string;
  expiresAt: Date;
}

const tokenCache = new Map<string, ServiceToken>();

async function getServiceToken(
  audience: string
): Promise<string> {
  const cached = tokenCache.get(audience);
  if (cached && cached.expiresAt.getTime() - Date.now() > 60000) {
    return cached.accessToken;
  }

  const response = await fetch(process.env.AUTH0_TOKEN_ENDPOINT!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: process.env.SERVICE_CLIENT_ID,
      client_secret: process.env.SERVICE_CLIENT_SECRET,
      audience,
    }),
  });

  const data = await response.json();

  const token: ServiceToken = {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };

  tokenCache.set(audience, token);
  return token.accessToken;
}

// Use in API calls between services
async function callBillingService(
  endpoint: string,
  body: unknown
): Promise<unknown> {
  const token = await getServiceToken("https://billing.internal.acme.com");

  const response = await fetch(
    `https://billing.internal.acme.com${endpoint}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  return response.json();
}
```

## Security: CSRF Protection and Secure Storage

```typescript
// CSRF protection via state parameter (already in PKCE flow)
// Additional: double-submit cookie pattern
function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function setCSRFCookie(response: NextResponse, token: string): void {
  response.cookies.set("oauth_csrf", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
}

function validateCSRF(state: string, cookieToken: string | undefined): boolean {
  if (!cookieToken) return false;
  return crypto.timingSafeEqual(
    Buffer.from(state),
    Buffer.from(cookieToken)
  );
}

// Token storage: never store tokens in localStorage
// Use httpOnly cookies or server-side session store
const TOKEN_STORAGE_RULES = {
  accessToken: "Server-side only (Redis/DB), never sent to client",
  refreshToken: "Server-side only, encrypted at rest",
  idToken: "Can be sent to client as httpOnly cookie for user info",
  sessionToken: "httpOnly cookie, secure, sameSite=lax",
};
```

## Social Login Provider Specifics

| Provider | Key Differences | Gotcha |
|----------|----------------|--------|
| Google | Returns `id_token` (JWT), supports `access_type=offline` | Must request `prompt=consent` to get refresh token |
| GitHub | No OIDC, use `/user` and `/user/emails` endpoints | Primary email may be private; fetch emails separately |
| Apple | Client secret is a signed JWT (ES256), sends user info only once | Name/email only in first auth response; store immediately |
| Microsoft | Supports OIDC, multi-tenant (`common`, `consumers`, `organizations`) | Tenant selection affects token validation endpoint |

### Apple Client Secret Generation

```typescript
import jwt from "jsonwebtoken";

function generateAppleClientSecret(): string {
  const now = Math.floor(Date.now() / 1000);

  return jwt.sign(
    {
      iss: process.env.APPLE_TEAM_ID,
      iat: now,
      exp: now + 15777000, // 6 months
      aud: "https://appleid.apple.com",
      sub: process.env.APPLE_CLIENT_ID,
    },
    process.env.APPLE_PRIVATE_KEY!, // .p8 file contents
    {
      algorithm: "ES256",
      header: {
        alg: "ES256",
        kid: process.env.APPLE_KEY_ID,
      },
    }
  );
}
```

## Anti-Patterns

- **Using the Implicit flow for new applications** -- it is deprecated and insecure. Always use Authorization Code + PKCE even for public clients like SPAs.
- **Storing OAuth tokens in localStorage or sessionStorage** -- these are accessible to XSS attacks. Store tokens server-side and use httpOnly cookies for session management.
- **Not validating the state parameter on callback** -- without state validation, attackers can forge OAuth callbacks (CSRF). Always generate and verify a cryptographically random state.
- **Hardcoding provider-specific URLs in your code** -- use OpenID Connect discovery (`.well-known/openid-configuration`) or a provider config registry to avoid brittle hardcoded endpoints.
- **Trusting the access token without verification** -- when validating tokens server-side, always verify the signature, issuer, audience, and expiration. Use the provider's JWKS endpoint.
- **Not handling refresh token rotation** -- some providers (like Google) rotate refresh tokens on each use. If you don't save the new refresh token, subsequent refreshes will fail.

## Related Skills

- [[csp-webhook-architecture]] -- Processing OAuth-related webhooks (token revocation events)
- [[csp-api-governance]] -- API key and scope management patterns
- [[csp-security-review]] -- Security review for authentication implementations
- [[csp-subscription-management]] -- Feature gating tied to OAuth-identified users
