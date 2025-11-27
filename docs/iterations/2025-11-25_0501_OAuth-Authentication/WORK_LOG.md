# Work Log: OAuth-Authentication

## Backend Agent

* Added dependencies to `apps/api/package.json`:
  - `jose` (^5.9.0) - JWT signing/verification (ESM compatible)
  - `@node-rs/argon2` (^2.0.0) - Password hashing

* Created auth infrastructure (`src/infrastructure/auth/`):
  - `jwt.ts` - JWT sign/verify utilities (15min access, 24hr refresh tokens)
  - `password.ts` - Argon2id password hashing per OWASP recommendations
  - `index.ts` - Re-exports

* Created DynamoDB repositories (`src/infrastructure/storage/dynamodb/repositories/`):
  - `userRepository.ts` - User CRUD with email lookup via GSI1
  - `refreshTokenRepository.ts` - Token tracking for revocation with TTL

* Implemented OAuth 2.0 handlers (`src/handlers/oauth/`):
  - `token.ts` - POST /oauth/token (password + refresh_token grants)
  - `revoke.ts` - POST /oauth/revoke (RFC 7009 compliant)
  - `userinfo.ts` - GET /oauth/userinfo (OpenID Connect)
  - `index.ts` - Re-exports

* Created auth middleware (`src/middleware/auth.ts`):
  - Bearer token validation
  - `withAuth` HOF for protecting handlers
  - Proper WWW-Authenticate headers

* Created user management script (`scripts/create-user.ts`):
  - CLI for creating test users in local DynamoDB
  - Added `user:create` npm script

* Updated `serverless.yml`:
  - Added JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE environment variables
  - Added OAuth endpoint function definitions

## Frontend Agent (N/A in backend-only projects)
* N/A - Backend-only iteration

## Coordination Notes / Shared Contract Changes

* Updated `packages/shared/src/types/index.ts`:
  - Added AccessTokenPayload, RefreshTokenPayload interfaces
  - Added TokenResponse, UserInfo interfaces

* Updated `packages/shared/src/contracts/index.ts`:
  - Added TokenRequestSchema (discriminated union for grant types)
  - Added RevokeRequestSchema
  - Added UserRegistrationSchema

---

## Recurring Events (Bonus - Completed Phase 3)

* Implemented recurring event handlers (`src/handlers/calendar/`):
  - `createRecurring.ts` - POST /users/:userId/recurring (creates MASTER entity)
  - `getSeries.ts` - GET /users/:userId/events/:masterId/series (queries GSI2)
  - `endSeries.ts` - DELETE /users/:userId/events/:masterId/future (sets rruleUntil)

* Key patterns implemented:
  - GSI2-RecurrenceLookup sparse index for adjacency list queries
  - MASTER entity with RFC 5545 RRULE support
  - Series termination via rruleUntil attribute
  - Batch delete of future instances when ending series
