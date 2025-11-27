# API Reference

**Base URL:** `/api/v1`
**Auth:** Bearer Token (JWT) required for all endpoints unless specified `Public`.
**Full Specification:** See `docs/backend/DATABASE_SCHEMA.md` Section 9 for detailed request/response examples.

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

-----

## 5. Calendar Events

### `GET /users/:userId/agenda`

**Description:** Get agenda/week view with events.
**Auth:** Required
**Query:** `?from=<ISO8601>&days=7`

#### Response (200 OK)

```json
{
  "data": {
    "agenda": [
      {
        "date": "2025-12-15",
        "events": [
          {
            "eventId": "evt_abc123",
            "title": "Team Standup",
            "startUtc": "2025-12-15T14:00:00Z",
            "endUtc": "2025-12-15T14:30:00Z"
          }
        ]
      }
    ]
  }
}
```

### `GET /users/:userId/events/:eventId`

**Description:** Get single event details.
**Auth:** Required

### `POST /users/:userId/events`

**Description:** Create a new calendar event.
**Auth:** Required

#### Request Body

```json
{
  "title": "Meeting",
  "startUtc": "2025-12-20T14:00:00Z",
  "endUtc": "2025-12-20T15:00:00Z",
  "startTzid": "America/New_York",
  "tags": ["work"]
}
```

### `PATCH /users/:userId/events/:eventId`

**Description:** Update an event (uses optimistic locking).
**Auth:** Required
**Headers:** `If-Match: "<version>"`

### `DELETE /users/:userId/events/:eventId`

**Description:** Delete an event.
**Auth:** Required

### `POST /users/:userId/recurring`

**Description:** Create a recurring event master.
**Auth:** Required

### `GET /users/:userId/events/:masterId/series`

**Description:** Get recurring series (master + all instances).
**Auth:** Required

### `DELETE /users/:userId/events/:masterId/future`

**Description:** End recurring series after a date (sets rruleUntil).
**Auth:** Required
**Query:** `?after=<ISO8601>`
**Headers:** `If-Match: "<version>"`
