# Plan: OAuth-Authentication
**Date:** Tue Nov 25 05:01:11 UTC 2025
**Directory:** docs/iterations/2025-11-25_0501_OAuth-Authentication
**Reference:** `docs/core/AUTH_STRATEGY.md`

## 1. Objective
Implement OAuth 2.0 token endpoints with JWT-based authentication for first-party SPA/mobile apps.

## 2. Proposed Changes

### Backend (apps/api/)
- [ ] Create JWT utilities (sign, verify, refresh)
- [ ] Create password hashing utilities (Argon2id)
- [ ] Implement `POST /oauth/token` (authorization_code + refresh_token grants)
- [ ] Implement `POST /oauth/revoke` (token revocation)
- [ ] Implement `GET /oauth/userinfo` (OpenID Connect profile)
- [ ] Create auth middleware for protected endpoints
- [ ] Add user entity support to DynamoDB
- [ ] Add refresh token tracking to DynamoDB (for revocation)

### Shared Types (packages/shared/)
- [ ] Add auth types (User, Session, Token interfaces)
- [ ] Add API request/response schemas

### Frontend
- N/A (backend only - frontend will consume these endpoints later)

## 3. Token Configuration
| Token Type | Duration | Storage |
|------------|----------|---------|
| Access Token | 15 minutes | Memory only |
| Refresh Token | 24 hours | Secure storage |

## 4. DynamoDB Patterns
```
USER:        PK=USER#<id>        SK=PROFILE       GSI1PK=EMAIL#<email> GSI1SK=USER
REFRESH:     PK=REFRESH#<jti>    SK=REFRESH       GSI1PK=USER#<id>     TTL=expiresAt
```

## 5. Verification Plan
- [ ] **Automated:** Token issuance returns valid JWT
- [ ] **Automated:** Expired tokens rejected with 401
- [ ] **Automated:** Revoked refresh tokens rejected
- [ ] **Manual:** Password hashing produces unique hashes
