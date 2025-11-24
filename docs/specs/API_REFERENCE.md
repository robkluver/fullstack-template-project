# API Reference

**Base URL:** `/api/v1`
**Auth:** Bearer Token (JWT) required for all endpoints unless specified `Public`.

## 1. Standard Response Format

All endpoints return data wrapped in a standardized envelope to ensure consistent parsing on the frontend.

**Success (2xx):**
```json
{
  "data": { ... },
  "error": null,
  "meta": {
    "page": 1,
    "total": 100
  }
}
````

**Error (4xx, 5xx):**

```json
{
  "data": null,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Email is required."
  },
  "meta": null
}
```

-----

## 2. Authentication

### `POST /auth/login`

**Description:** Exchanges credentials for a session token.
**Auth:** Public

#### Request Body

**Contract:** `shared/src/contracts/auth.ts` -\> `LoginRequestSchema`

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### Response (200 OK)

```json
{
  "data": {
    "token": "eyJhbGci...",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "role": "user"
    }
  }
}
```

#### Response (401 Unauthorized)

```json
{
  "error": {
    "code": "AUTH_FAILED",
    "message": "Invalid email or password"
  }
}
```

-----

## 3. Users

### `GET /users/me`

**Description:** Get current authenticated user profile.
**Auth:** Required

#### Response (200 OK)

```json
{
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

-----

## 4. Health Check

### `GET /health`

**Description:** System status check.
**Auth:** Public

#### Response (200 OK)

```json
{
  "data": {
    "status": "ok",
    "timestamp": "2024-01-01T12:00:00Z",
    "version": "1.0.0"
  }
}
```
