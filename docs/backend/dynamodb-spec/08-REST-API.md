# REST API Design
**Document**: 08-REST-API.md  
**Base URL**: `https://api.nexus.app/v1`  
**Authentication**: Bearer JWT Token  
**Content-Type**: `application/json`

---

## Overview

This document specifies all REST endpoints for the Nexus application. All endpoints are organized by feature (Calendar, Tasks, Reminders, Notes, Cross-Linking) and include example requests/responses.

**Optimistic Locking**: Use `If-Match` header with version number to prevent concurrent modifications.

---

## Calendar Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| **GET** | `/users/:userId/agenda` | Get unified agenda |
| **GET** | `/users/:userId/events/:eventId` | Get single event |
| **POST** | `/users/:userId/events` | Create event |
| **PATCH** | `/users/:userId/events/:eventId` | Update event |
| **DELETE** | `/users/:userId/events/:eventId` | Delete event |
| **GET** | `/users/:userId/events/:masterId/series` | Get recurring series |
| **PATCH** | `/users/:userId/events/:masterId/instances/:date` | Modify instance |
| **DELETE** | `/users/:userId/events/:masterId/future` | End recurring series |

### GET /users/:userId/agenda

Get unified agenda across all entity types (events, tasks, reminders, notes).

**Query Parameters**:
- `from` (required): Start date (ISO 8601)
- `days` (optional): Number of days to fetch (default: 7)

**Response 200 OK**:
```json
{
  "agenda": [
    {
      "date": "2025-12-15",
      "dayName": "Monday",
      "isToday": true,
      "items": [
        {
          "type": "EVENT",
          "eventId": "evt_abc123",
          "title": "Team Standup",
          "startUtc": "2025-12-15T14:00:00Z",
          "endUtc": "2025-12-15T14:30:00Z",
          "color": "#3b82f6"
        },
        {
          "type": "TASK",
          "taskId": "task_xyz",
          "title": "Finish API spec",
          "dueUtc": "2025-12-15T17:00:00Z",
          "priority": 1,
          "isOverdue": true
        }
      ]
    }
  ],
  "meta": {
    "fromDate": "2025-12-15",
    "toDate": "2025-12-21",
    "totalItems": 45
  }
}
```

---

## Task Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| **GET** | `/users/:userId/tasks` | Get Kanban board |
| **GET** | `/users/:userId/tasks/:taskId` | Get single task |
| **POST** | `/users/:userId/tasks` | Create task |
| **PATCH** | `/users/:userId/tasks/:taskId` | Update task |
| **PATCH** | `/users/:userId/tasks/:taskId/status` | Update status |
| **DELETE** | `/users/:userId/tasks/:taskId` | Delete task |

### POST /users/:userId/tasks

Create a new task.

**Request Body**:
```json
{
  "title": "Refactor auth module",
  "description": "## Objective\nModernize authentication flow",
  "priority": 1,
  "effort": 8,
  "dueUtc": "2025-12-20T17:00:00Z",
  "labels": ["security", "backend"],
  "links": [
    { "type": "NOTE", "id": "note_design_doc", "title": "Auth Design Document" }
  ]
}
```

**Response 201 Created**:
```json
{
  "taskId": "task_abc123xyz",
  "title": "Refactor auth module",
  "status": "BACKLOG",
  "priority": 1,
  "version": 1,
  "createdAt": "2025-12-15T10:00:00Z"
}
```

### PATCH /users/:userId/tasks/:taskId/status

Update task status (with optimistic locking).

**Headers**:
- `If-Match`: Current version (e.g., "1")

**Request Body**:
```json
{
  "status": "IN_PROGRESS"
}
```

**Response 200 OK**:
```json
{
  "taskId": "task_abc123xyz",
  "status": "IN_PROGRESS",
  "version": 2,
  "updatedAt": "2025-12-15T11:00:00Z"
}
```

**Response 409 Conflict** (version mismatch):
```json
{
  "error": "VERSION_CONFLICT",
  "message": "Task was modified by another client. Please refresh and retry.",
  "currentVersion": 3
}
```

---

## Reminder Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| **GET** | `/users/:userId/reminders` | Get pending reminders |
| **GET** | `/users/:userId/reminders/:reminderId` | Get single reminder |
| **POST** | `/users/:userId/reminders` | Create reminder |
| **PATCH** | `/users/:userId/reminders/:reminderId` | Update reminder |
| **POST** | `/users/:userId/reminders/:reminderId/snooze` | Snooze reminder |
| **POST** | `/users/:userId/reminders/:reminderId/complete` | Complete reminder |

### GET /users/:userId/reminders

Get pending reminders for next N days.

**Query Parameters**:
- `days` (optional): Number of days ahead (default: 7)

**Response 200 OK**:
```json
{
  "reminders": [
    {
      "reminderId": "rem_abc123",
      "title": "Call dentist",
      "triggerUtc": "2025-12-15T08:00:00Z",
      "status": "PENDING",
      "color": "#f59e0b"
    }
  ]
}
```

### POST /users/:userId/reminders/:reminderId/snooze

Snooze a reminder to a later time.

**Request Body**:
```json
{
  "until": "2025-12-15T14:00:00Z"
}
```

**Response 200 OK**:
```json
{
  "reminderId": "rem_abc123",
  "status": "SNOOZED",
  "snoozedUntil": "2025-12-15T14:00:00Z",
  "version": 2
}
```

---

## Note Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| **GET** | `/users/:userId/notes` | Get all notes |
| **GET** | `/users/:userId/notes/:noteId` | Get single note |
| **POST** | `/users/:userId/notes` | Create note |
| **PATCH** | `/users/:userId/notes/:noteId` | Update note |
| **DELETE** | `/users/:userId/notes/:noteId` | Archive note |

### GET /users/:userId/notes

Get all notes (optionally including archived).

**Query Parameters**:
- `includeArchived` (optional): Include archived notes (default: false)

**Response 200 OK**:
```json
{
  "notes": [
    {
      "noteId": "note_abc123",
      "title": "2026 Architecture Planning",
      "color": "#3b82f6",
      "isPinned": true,
      "updatedAt": "2025-11-24T14:30:00Z"
    }
  ]
}
```

---

## Cross-Linking Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| **GET** | `/users/:userId/linked/:type/:id` | Get linked items |
| **GET** | `/users/:userId/backlinks/:type/:id` | Get backlinks |
| **GET** | `/users/:userId/search` | Global search |
| **GET** | `/users/:userId/bootstrap` | Get bootstrap data |

### GET /users/:userId/linked/:type/:id

Get all items that link to a specific entity.

**Example**: `/users/user_123/linked/TASK/task_abc123`

**Response 200 OK**:
```json
{
  "targetEntity": {
    "type": "TASK",
    "id": "task_abc123",
    "title": "Refactor auth module"
  },
  "linkedItems": [
    {
      "type": "NOTE",
      "id": "note_design_doc",
      "title": "Auth Design Document",
      "updatedAt": "2025-11-24T14:30:00Z"
    },
    {
      "type": "EVENT",
      "id": "evt_review_meeting",
      "title": "Auth Review Meeting",
      "startUtc": "2025-12-20T14:00:00Z"
    }
  ]
}
```

### GET /users/:userId/search

Global full-text search across all entity types.

**Query Parameters**:
- `q` (required): Search query
- `limit` (optional): Max results (default: 20)

**Response 200 OK**:
```json
{
  "results": [
    {
      "type": "TASK",
      "id": "task_xyz",
      "title": "Refactor auth",
      "excerpt": "Modernize authentication flow..."
    },
    {
      "type": "NOTE",
      "id": "note_abc",
      "title": "Auth Design Document",
      "excerpt": "Design considerations for auth module..."
    }
  ],
  "meta": {
    "query": "auth",
    "totalResults": 42
  }
}
```

### GET /users/:userId/bootstrap

Get bootstrap data for app initialization (user preferences, stats, cached counts).

**Response 200 OK**:
```json
{
  "user": {
    "userId": "user_123",
    "defaultTzid": "America/New_York"
  },
  "preferences": {
    "weekStart": 1,
    "theme": "dark",
    "autoArchiveCompletedTasks": true
  },
  "stats": {
    "totalEvents": 1247,
    "totalTasks": 523,
    "totalReminders": 89,
    "overdueTasks": 5
  }
}
```

---

## Error Responses

All endpoints return consistent error responses:

**400 Bad Request**:
```json
{
  "error": "INVALID_INPUT",
  "message": "Title is required",
  "field": "title"
}
```

**401 Unauthorized**:
```json
{
  "error": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

**404 Not Found**:
```json
{
  "error": "NOT_FOUND",
  "message": "Task not found",
  "resourceType": "TASK",
  "resourceId": "task_xyz"
}
```

**409 Conflict** (version mismatch):
```json
{
  "error": "VERSION_CONFLICT",
  "message": "Resource was modified by another client",
  "currentVersion": 3
}
```

**429 Too Many Requests**:
```json
{
  "error": "RATE_LIMITED",
  "message": "Too many requests. Retry after 60 seconds.",
  "retryAfter": 60
}
```

**500 Internal Server Error**:
```json
{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred",
  "requestId": "req_abc123xyz"
}
```

---

## HTTP Headers

**Request Headers**:
- `Authorization: Bearer <jwt_token>` (required)
- `Content-Type: application/json` (for POST/PATCH)
- `If-Match: "<version>"` (for optimistic locking on updates)

**Response Headers**:
- `Content-Type: application/json`
- `X-Request-Id: <request_id>`
- `ETag: "<version>"` (on successful updates)
- `Cache-Control: private, max-age=60` (for cacheable endpoints)

---

**API Status**: Production Ready ✅
