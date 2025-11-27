# Authentication Strategy

This document defines authentication patterns for different use cases. Our backend implements OAuth 2.0 as both a client (consuming external providers) and a server (issuing tokens to our apps and third parties).

---

## Authentication Scenarios

| Scenario | Method | Token Type | Storage |
|----------|--------|------------|---------|
| First-party web app | Session cookies | HttpOnly cookie | Server-side session |
| First-party SPA/Mobile | OAuth 2.0 PKCE | JWT (access + refresh) | Memory + secure storage |
| Third-party API (simple) | API Key | Bearer token | Client-managed |
| Third-party API (OAuth) | Client Credentials | JWT access token | Client-managed |
| MCP Server | API Key | Bearer token | Environment variable |

---

## 1. First-Party Web App (Recommended Default)

For server-rendered Next.js apps where the backend is trusted.

### Flow
```
User -> Login Form -> POST /api/auth/login -> Set HttpOnly Cookie -> Redirect
```

### Implementation
```typescript
// Backend: POST /api/auth/login
export async function loginHandler(req: Request) {
  const { email, password } = await req.json();

  // Validate credentials against DynamoDB
  const user = await userRepository.findByEmail(email);
  if (!user || !await verifyPassword(password, user.passwordHash)) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Create session
  const sessionId = crypto.randomUUID();
  await sessionRepository.create({
    id: sessionId,
    userId: user.id,
    expiresAt: Date.now() + SESSION_DURATION,
  });

  // Set HttpOnly cookie
  return new Response(JSON.stringify({ user }), {
    headers: {
      'Set-Cookie': `session=${sessionId}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_DURATION / 1000}`,
    },
  });
}
```

### Security Considerations
- **HttpOnly**: Prevents XSS attacks from reading the cookie
- **Secure**: Only sent over HTTPS
- **SameSite=Strict**: Prevents CSRF attacks
- **Session in DynamoDB**: Allows server-side revocation

---

## 2. First-Party SPA/Mobile (OAuth 2.0 PKCE)

For client-side apps that can't securely store secrets.

### Flow
```
App -> Generate PKCE (code_verifier, code_challenge)
    -> GET /oauth/authorize?response_type=code&code_challenge=...
    -> User Login -> Authorization Code
    -> POST /oauth/token (code + code_verifier)
    -> Access Token + Refresh Token
```

### Token Structure
```typescript
// Access Token (short-lived: 15 min)
interface AccessToken {
  sub: string;      // User ID
  email: string;
  roles: string[];
  iat: number;
  exp: number;      // 15 minutes
}

// Refresh Token (24 hours for Nexus app)
interface RefreshToken {
  sub: string;
  jti: string;      // Unique ID for revocation
  iat: number;
  exp: number;      // 24 hours (86400 seconds)
}
```

### Implementation
```typescript
// Backend: POST /oauth/token
export async function tokenHandler(req: Request) {
  const { grant_type, code, code_verifier, refresh_token } = await req.json();

  if (grant_type === 'authorization_code') {
    // Validate authorization code and PKCE
    const authCode = await authCodeRepository.findAndDelete(code);
    if (!authCode || !verifyPKCE(code_verifier, authCode.codeChallenge)) {
      throw new UnauthorizedError('Invalid authorization code');
    }

    return issueTokens(authCode.userId);
  }

  if (grant_type === 'refresh_token') {
    // Validate and rotate refresh token
    const payload = verifyRefreshToken(refresh_token);
    await refreshTokenRepository.revoke(payload.jti);

    return issueTokens(payload.sub);
  }

  throw new BadRequestError('Invalid grant_type');
}
```

### Client Storage
- **Access Token**: Memory only (never localStorage)
- **Refresh Token**: Secure storage (Keychain on iOS, Keystore on Android, HttpOnly cookie for web)

---

## 3. Third-Party API Access (Simple API Key)

For trusted partners or internal services with simple authentication needs.

### API Key Structure
```
pk_live_abc123...  (public key - can be exposed)
sk_live_xyz789...  (secret key - server-side only)
```

### Implementation
```typescript
// Backend: API Key validation middleware
export async function apiKeyMiddleware(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer sk_')) {
    throw new UnauthorizedError('Invalid API key');
  }

  const apiKey = authHeader.slice(7);
  const keyRecord = await apiKeyRepository.findByHash(hashApiKey(apiKey));

  if (!keyRecord || keyRecord.revokedAt) {
    throw new UnauthorizedError('Invalid or revoked API key');
  }

  // Attach client info to request context
  req.context = {
    clientId: keyRecord.clientId,
    scopes: keyRecord.scopes,
  };
}
```

### Rate Limiting
```typescript
// Per API key rate limits
const RATE_LIMITS = {
  default: { requests: 1000, window: '1h' },
  premium: { requests: 10000, window: '1h' },
};
```

---

## 4. Third-Party API Access (OAuth 2.0 Client Credentials)

For B2B integrations requiring scoped access and token rotation.

### Flow
```
Client -> POST /oauth/token
          grant_type=client_credentials
          client_id=...
          client_secret=...
          scope=read:users write:orders
       -> Access Token (scoped)
```

### Implementation
```typescript
// Backend: Client Credentials grant
export async function clientCredentialsHandler(req: Request) {
  const { client_id, client_secret, scope } = await req.json();

  // Validate client credentials
  const client = await clientRepository.findById(client_id);
  if (!client || !await verifySecret(client_secret, client.secretHash)) {
    throw new UnauthorizedError('Invalid client credentials');
  }

  // Validate requested scopes
  const requestedScopes = scope.split(' ');
  const allowedScopes = requestedScopes.filter(s => client.allowedScopes.includes(s));

  // Issue access token (no refresh token for client credentials)
  const accessToken = signJWT({
    sub: client_id,
    type: 'client',
    scopes: allowedScopes,
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  });

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    scope: allowedScopes.join(' '),
  };
}
```

---

## 5. MCP Server Authentication

For Model Context Protocol servers that need simple, secure authentication.

### Recommended: Bearer Token
```typescript
// MCP Server: Simple bearer token validation
const MCP_API_TOKEN = process.env.MCP_API_TOKEN;

export async function mcpAuthMiddleware(req: Request) {
  const authHeader = req.headers.get('Authorization');

  if (authHeader !== `Bearer ${MCP_API_TOKEN}`) {
    throw new UnauthorizedError('Invalid MCP token');
  }
}
```

### Environment Setup
```bash
# .env (never commit)
MCP_API_TOKEN=mcp_live_<random-32-chars>
```

---

## OAuth 2.0 Provider Endpoints

Our backend implements these standard OAuth 2.0 endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/oauth/authorize` | GET | Authorization page (PKCE flow) |
| `/oauth/token` | POST | Token issuance/refresh |
| `/oauth/revoke` | POST | Token revocation |
| `/oauth/userinfo` | GET | User profile (OpenID Connect) |
| `/.well-known/openid-configuration` | GET | Discovery document |
| `/.well-known/jwks.json` | GET | Public keys for JWT verification |

---

## External Provider Integration

For "Login with Google/GitHub/etc." we act as an OAuth 2.0 client.

### Supported Providers
| Provider | OAuth Flow | Scopes |
|----------|-----------|--------|
| Google | PKCE | `openid email profile` |
| GitHub | Authorization Code | `user:email` |
| Microsoft | PKCE | `openid email profile` |

### Implementation Pattern
```typescript
// Backend: OAuth callback handler
export async function oauthCallbackHandler(req: Request) {
  const { code, state } = req.query;

  // Validate state to prevent CSRF
  const savedState = await stateRepository.findAndDelete(state);
  if (!savedState) {
    throw new BadRequestError('Invalid state');
  }

  // Exchange code for tokens with provider
  const tokens = await provider.exchangeCode(code);
  const profile = await provider.getUserProfile(tokens.access_token);

  // Find or create user
  const user = await userRepository.findOrCreateByProvider({
    provider: 'google',
    providerId: profile.id,
    email: profile.email,
    name: profile.name,
  });

  // Issue our own session/tokens
  return issueTokens(user.id);
}
```

---

## Security Best Practices

### Token Security
1. **Never log tokens** - Use masked logging
2. **Short-lived access tokens** - 15 minutes max
3. **Rotate refresh tokens** - One-time use, issue new on refresh
4. **Store hashes only** - Never store raw API keys or refresh tokens

### Password Security
```typescript
// Use Argon2id for password hashing
import { hash, verify } from '@node-rs/argon2';

const ARGON2_OPTIONS = {
  memoryCost: 65536,  // 64 MB
  timeCost: 3,
  parallelism: 4,
};

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return verify(hash, password);
}
```

### Rate Limiting
```typescript
// Aggressive rate limiting on auth endpoints
const AUTH_RATE_LIMITS = {
  '/api/auth/login': { max: 5, window: '15m' },
  '/oauth/token': { max: 10, window: '1m' },
  '/api/auth/forgot-password': { max: 3, window: '1h' },
};
```

---

## DynamoDB Schema for Auth

```typescript
// Single-Table Design patterns for auth entities

// User
PK: USER#<userId>
SK: PROFILE
GSI1PK: EMAIL#<email>
GSI1SK: USER

// Session
PK: SESSION#<sessionId>
SK: SESSION
GSI1PK: USER#<userId>
GSI1SK: SESSION#<createdAt>
TTL: expiresAt

// API Key
PK: APIKEY#<hashedKey>
SK: APIKEY
GSI1PK: CLIENT#<clientId>
GSI1SK: APIKEY#<createdAt>

// OAuth Client
PK: CLIENT#<clientId>
SK: CLIENT
GSI1PK: CLIENT#<clientId>
GSI1SK: CLIENT

// Refresh Token (for revocation tracking)
PK: REFRESH#<jti>
SK: REFRESH
GSI1PK: USER#<userId>
GSI1SK: REFRESH#<createdAt>
TTL: expiresAt
```
