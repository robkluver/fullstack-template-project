# Phase 9: Google Calendar Import - DynamoDB Specification
**Phase**: 9 - Google Calendar Import
**Document**: 10-PHASE9-GOOGLE-CALENDAR.md
**Entities**: NOTIFICATION (new), EVENT (modified), USER_META (modified)
**Access Patterns**: AP-GCAL-01 to AP-GCAL-09

---

## Overview

Phase 9 implements Google Calendar integration with:
- OAuth 2.0 authentication flow
- Incremental import from Google Calendar (primary calendar only)
- Conflict detection (preserve local changes)
- General-purpose notification system (persisted, database-backed)

---

## Entity Definitions

### 9.1 NOTIFICATION Entity (NEW)

**Purpose**: General-purpose notification system for import results, reminders, and system messages.

**Base Table Keys**:
```javascript
PK: "USER#user_123"
SK: "NOTIFICATION#notif_abc123def456"
```

**GSI Keys**:
```javascript
GSI1PK: "USER#user_123#2025"
GSI1SK: "2025-11-26T10:30:00Z"
GSI3PK: "USER#user_123#NOTIF#UNREAD"  // Status-based filtering
GSI3SK: "2025-11-26T10:30:00Z"
```

**Complete Example**:
```javascript
{
  // Base table keys
  "PK": "USER#user_123",
  "SK": "NOTIFICATION#notif_abc123def456",

  // GSI1 keys (chronological listing)
  "GSI1PK": "USER#user_123#2025",
  "GSI1SK": "2025-11-26T10:30:00Z",

  // GSI3 keys (status-based queries)
  "GSI3PK": "USER#user_123#NOTIF#UNREAD",
  "GSI3SK": "2025-11-26T10:30:00Z",

  // Core attributes
  "entityType": "NOTIFICATION",
  "notificationId": "notif_abc123def456",
  "type": "GOOGLE_IMPORT",
  "title": "Google Calendar Import Complete",
  "message": "42 events imported, 3 conflicts detected",
  "status": "UNREAD",

  // Type-specific metadata
  "metadata": {
    "imported": 42,
    "skipped": 5,
    "conflicts": [
      {
        "eventId": "evt_xyz789",
        "title": "Team Standup",
        "localUpdatedAt": "2025-11-25T10:00:00Z",
        "googleUpdatedAt": "2025-11-26T08:00:00Z"
      }
    ]
  },

  // Timestamps
  "readAt": null,
  "version": 1,
  "createdAt": "2025-11-26T10:30:00Z",
  "updatedAt": "2025-11-26T10:30:00Z",

  // Optional auto-deletion (30 days)
  "ttl": 1735689600
}
```

**Attribute Specifications**:

| Attribute | Type | Required | Description | Valid Values |
|-----------|------|----------|-------------|--------------|
| `PK` | String | Yes | Partition key | `USER#<userId>` |
| `SK` | String | Yes | Sort key | `NOTIFICATION#<notificationId>` |
| `GSI1PK` | String | Yes | Year partition | `USER#<userId>#<YYYY>` |
| `GSI1SK` | String | Yes | Creation time | ISO 8601 UTC |
| `GSI3PK` | String | Yes | Status partition | `USER#<userId>#NOTIF#<STATUS>` |
| `GSI3SK` | String | Yes | Creation time | ISO 8601 UTC |
| `entityType` | String | Yes | Entity discriminator | `NOTIFICATION` |
| `notificationId` | String | Yes | Unique ID | `notif_` prefix + UUIDv4 |
| `type` | String | Yes | Notification type | `GOOGLE_IMPORT`, `REMINDER_DUE`, `TASK_OVERDUE`, etc. |
| `title` | String | Yes | Short title | Max 100 chars |
| `message` | String | No | Notification body | Max 500 chars |
| `status` | String | Yes | Read status | `UNREAD`, `READ`, `DISMISSED` |
| `metadata` | Map | No | Type-specific data | JSON object |
| `readAt` | String | No | When user read | ISO 8601 UTC |
| `version` | Number | Yes | Optimistic locking | Incremented on update |
| `createdAt` | String | Yes | Creation time | ISO 8601 UTC |
| `updatedAt` | String | Yes | Last update | ISO 8601 UTC |
| `ttl` | Number | No | Auto-deletion | Unix epoch seconds |

**Notification Types**:

| Type | Description | Metadata Structure |
|------|-------------|-------------------|
| `GOOGLE_IMPORT` | Google Calendar import completed | `{ imported, skipped, conflicts[] }` |
| `REMINDER_DUE` | Reminder is due | `{ reminderId, eventId?, title }` |
| `TASK_OVERDUE` | Task is past due date | `{ taskId, title, dueUtc }` |

**Storage**: ~1KB per notification

---

### 9.2 EVENT Entity Updates (Google Sync Metadata)

**New Attributes** (added to existing EVENT schema from Phase 1):

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `googleEventId` | String | No | Google Calendar event ID (unique within calendar) |
| `googleCalendarId` | String | No | Google Calendar ID (usually "primary") |
| `googleSyncedAt` | String | No | ISO 8601 UTC - when last synced from Google |
| `googleEtag` | String | No | Google's etag for change detection |

**Example EVENT with Google Sync Metadata**:
```javascript
{
  // ... existing EVENT attributes (see 03-PHASE1-CALENDAR.md) ...

  // Google Calendar sync metadata (optional - only for imported events)
  "googleEventId": "abc123xyz789@google.com",
  "googleCalendarId": "primary",
  "googleSyncedAt": "2025-11-25T08:00:00Z",
  "googleEtag": "\"3456789012345678\""
}
```

**Conflict Detection Logic**:

An event has a conflict when ALL of these are true:
1. `googleEventId` exists (was imported from Google)
2. `updatedAt > googleSyncedAt` (modified locally since last sync)
3. Google's etag has changed (modified in Google since last sync)

When conflict detected:
- Do NOT update the local event
- Add to conflicts array in import notification
- User can manually resolve later

---

### 9.3 USER_META Entity Updates (OAuth Tokens & Sync State)

**New Attributes** (added to existing USER_META schema from Phase 1):

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `googleOAuth` | Map | No | Google OAuth credentials container |
| `googleOAuth.accessToken` | String | - | Encrypted access token |
| `googleOAuth.refreshToken` | String | - | Encrypted refresh token |
| `googleOAuth.expiresAt` | String | - | ISO 8601 UTC token expiry |
| `googleOAuth.email` | String | - | Connected Google account email |
| `googleOAuth.connectedAt` | String | - | ISO 8601 UTC when connected |
| `googleCalendarSync` | Map | No | Sync state container |
| `googleCalendarSync.lastSyncAt` | String | - | ISO 8601 UTC last import time |
| `googleCalendarSync.syncToken` | String | - | Google's incremental sync token |

**Example USER_META with Google Integration**:
```javascript
{
  // ... existing USER_META attributes (see 03-PHASE1-CALENDAR.md) ...

  // Google OAuth credentials (tokens encrypted at rest)
  "googleOAuth": {
    "accessToken": "ya29.a0AfH6SMB...[encrypted]",
    "refreshToken": "1//0gYvWPn...[encrypted]",
    "expiresAt": "2025-11-26T11:30:00Z",
    "email": "user@gmail.com",
    "connectedAt": "2025-11-20T10:00:00Z"
  },

  // Google Calendar sync state
  "googleCalendarSync": {
    "lastSyncAt": "2025-11-26T10:30:00Z",
    "syncToken": "CPDAlvWDx78CEPDAlvWDx78CGAU="
  }
}
```

**Security Notes**:
- Access tokens and refresh tokens MUST be encrypted before storage
- Use AWS KMS or environment-based encryption keys
- Never log tokens in plaintext
- Tokens automatically refreshed when expired (1 hour lifetime)

---

## Access Patterns: AP-GCAL-01 to AP-GCAL-09

### AP-GCAL-01: Get Unread Notification Count

**Scenario**: Bell icon needs to show unread count/badge

**Implementation**:
```typescript
async function getUnreadNotificationCount(userId: string): Promise<number> {
  const result = await client.send(new QueryCommand({
    TableName: "ProductivityData",
    IndexName: "GSI3-TaskStatus",
    KeyConditionExpression: "GSI3PK = :pk",
    ExpressionAttributeValues: {
      ":pk": { S: `USER#${userId}#NOTIF#UNREAD` }
    },
    Select: "COUNT"
  }));

  return result.Count || 0;
}
```

**Performance**:
- Latency: ~3ms
- RCUs: ~0.5 (count only)

---

### AP-GCAL-02: List User's Notifications

**Scenario**: User opens notification dropdown, show recent notifications

**Implementation**:
```typescript
async function listNotifications(
  userId: string,
  year: number = new Date().getFullYear(),
  limit: number = 20
): Promise<Notification[]> {
  const result = await client.send(new QueryCommand({
    TableName: "ProductivityData",
    IndexName: "GSI1-YearView",
    KeyConditionExpression: "GSI1PK = :pk",
    FilterExpression: "entityType = :type",
    ExpressionAttributeValues: {
      ":pk": { S: `USER#${userId}#${year}` },
      ":type": { S: "NOTIFICATION" }
    },
    ScanIndexForward: false,  // Most recent first
    Limit: limit
  }));

  return result.Items?.map(item => unmarshall(item)) || [];
}
```

**Performance**:
- Latency: ~5ms
- RCUs: ~2-5 (depending on notifications in year)

---

### AP-GCAL-03: Get Single Notification

**Scenario**: User clicks notification to view details

**Implementation**:
```typescript
async function getNotification(userId: string, notificationId: string) {
  return await client.send(new GetCommand({
    TableName: "ProductivityData",
    Key: {
      PK: `USER#${userId}`,
      SK: `NOTIFICATION#${notificationId}`
    }
  }));
}
```

**Performance**:
- Latency: ~2ms
- RCUs: 0.5

---

### AP-GCAL-04: Mark Notification as Read/Dismissed

**Scenario**: User reads or dismisses notification

**Implementation**:
```typescript
async function updateNotificationStatus(
  userId: string,
  notificationId: string,
  newStatus: 'READ' | 'DISMISSED',
  currentVersion: number
) {
  const now = new Date().toISOString();

  await client.send(new UpdateCommand({
    TableName: "ProductivityData",
    Key: {
      PK: `USER#${userId}`,
      SK: `NOTIFICATION#${notificationId}`
    },
    UpdateExpression: `
      SET #status = :newStatus,
          GSI3PK = :newGsi3pk,
          readAt = :readAt,
          updatedAt = :now,
          version = version + :one
    `,
    ConditionExpression: "version = :expectedVersion",
    ExpressionAttributeNames: {
      "#status": "status"
    },
    ExpressionAttributeValues: {
      ":newStatus": newStatus,
      ":newGsi3pk": `USER#${userId}#NOTIF#${newStatus}`,
      ":readAt": newStatus === 'READ' ? now : null,
      ":now": now,
      ":one": 1,
      ":expectedVersion": currentVersion
    }
  }));
}
```

**Performance**:
- Latency: ~8ms
- WCUs: 2

---

### AP-GCAL-05: Create Notification

**Scenario**: Import completes, system creates notification

**Implementation**:
```typescript
async function createNotification(notification: CreateNotificationInput) {
  const notificationId = `notif_${uuidv4()}`;
  const now = new Date().toISOString();
  const year = new Date().getFullYear();

  const item = {
    PK: `USER#${notification.userId}`,
    SK: `NOTIFICATION#${notificationId}`,
    GSI1PK: `USER#${notification.userId}#${year}`,
    GSI1SK: now,
    GSI3PK: `USER#${notification.userId}#NOTIF#UNREAD`,
    GSI3SK: now,
    entityType: "NOTIFICATION",
    notificationId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    status: "UNREAD",
    metadata: notification.metadata || {},
    readAt: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
    // Optional TTL: 30 days
    ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
  };

  await client.send(new PutCommand({
    TableName: "ProductivityData",
    Item: item
  }));

  return item;
}
```

**Performance**:
- Latency: ~10ms
- WCUs: 3 (base + GSI1 + GSI3)

---

### AP-GCAL-06: Get Google OAuth Status

**Scenario**: Settings page checks if Google Calendar is connected

**Implementation**:
```typescript
async function getGoogleOAuthStatus(userId: string) {
  const result = await client.send(new GetCommand({
    TableName: "ProductivityData",
    Key: {
      PK: `USER#${userId}`,
      SK: `USER_META#${userId}`
    },
    ProjectionExpression: "googleOAuth.email, googleOAuth.connectedAt, googleCalendarSync.lastSyncAt"
  }));

  if (!result.Item?.googleOAuth) {
    return { connected: false };
  }

  return {
    connected: true,
    email: result.Item.googleOAuth.email,
    connectedAt: result.Item.googleOAuth.connectedAt,
    lastSyncAt: result.Item.googleCalendarSync?.lastSyncAt
  };
}
```

**Performance**:
- Latency: ~2ms
- RCUs: 0.5

---

### AP-GCAL-07: Store Google OAuth Tokens

**Scenario**: OAuth callback stores tokens after user grants access

**Implementation**:
```typescript
async function storeGoogleOAuthTokens(
  userId: string,
  tokens: GoogleOAuthTokens,
  googleEmail: string
) {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString();

  await client.send(new UpdateCommand({
    TableName: "ProductivityData",
    Key: {
      PK: `USER#${userId}`,
      SK: `USER_META#${userId}`
    },
    UpdateExpression: `
      SET googleOAuth = :oauth,
          updatedAt = :now,
          version = version + :one
    `,
    ExpressionAttributeValues: {
      ":oauth": {
        accessToken: encrypt(tokens.accessToken),  // MUST encrypt
        refreshToken: encrypt(tokens.refreshToken),  // MUST encrypt
        expiresAt,
        email: googleEmail,
        connectedAt: now
      },
      ":now": now,
      ":one": 1
    }
  }));
}
```

**Performance**:
- Latency: ~8ms
- WCUs: 1

---

### AP-GCAL-08: Find Event by Google Event ID

**Scenario**: During import, check if event already exists in Nexus

**Implementation**:
```typescript
async function findEventByGoogleId(userId: string, googleEventId: string) {
  // Query base table with filter (acceptable for import batch processing)
  const result = await client.send(new QueryCommand({
    TableName: "ProductivityData",
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    FilterExpression: "googleEventId = :googleId",
    ExpressionAttributeValues: {
      ":pk": { S: `USER#${userId}` },
      ":skPrefix": { S: "EVENT#" },
      ":googleId": { S: googleEventId }
    }
  }));

  return result.Items?.[0] ? unmarshall(result.Items[0]) : null;
}
```

**Performance**:
- Latency: ~20-50ms (depends on user's event count)
- RCUs: ~10-50 (scan with filter)

**Note**: For high-frequency lookups, consider adding GSI5 with `googleEventId` as partition key.

---

### AP-GCAL-09: Get Events Modified Since Last Sync

**Scenario**: Find local changes for conflict detection during incremental import

**Implementation**:
```typescript
async function getEventsModifiedSince(userId: string, sinceTimestamp: string) {
  // Use GSI1 query with filter on updatedAt
  const year = new Date(sinceTimestamp).getFullYear();

  const result = await client.send(new QueryCommand({
    TableName: "ProductivityData",
    IndexName: "GSI1-YearView",
    KeyConditionExpression: "GSI1PK = :pk",
    FilterExpression: "entityType = :type AND googleEventId <> :empty AND updatedAt > :since",
    ExpressionAttributeValues: {
      ":pk": { S: `USER#${userId}#${year}` },
      ":type": { S: "EVENT" },
      ":empty": { S: "" },
      ":since": { S: sinceTimestamp }
    }
  }));

  return result.Items?.map(item => unmarshall(item)) || [];
}
```

**Performance**:
- Latency: ~30-50ms
- RCUs: ~20-50 (depends on events in year)

---

## Migration Notes

### For Existing EVENT Entities
- **Migration Type**: Lazy (no ETL required)
- **Approach**: New Google sync attributes are optional; added when event is first imported
- **Backward Compatibility**: Existing events work without changes
- **Existing events**: Will have `undefined` for all Google sync attributes

### For Existing USER_META Entities
- **Migration Type**: Lazy (no ETL required)
- **Approach**: New OAuth attributes added when user first connects Google
- **Backward Compatibility**: Existing USER_META works without changes
- **Existing users**: Will have `undefined` for `googleOAuth` and `googleCalendarSync`

---

## Implementation Checklist

### Phase 9 Development Tasks

- [ ] Implement NOTIFICATION entity CRUD operations
  - [ ] CreateNotification (AP-GCAL-05)
  - [ ] GetNotification (AP-GCAL-03)
  - [ ] ListNotifications (AP-GCAL-02)
  - [ ] GetUnreadCount (AP-GCAL-01)
  - [ ] UpdateNotificationStatus (AP-GCAL-04)

- [ ] Implement Google OAuth storage
  - [ ] StoreGoogleOAuthTokens (AP-GCAL-07)
  - [ ] GetGoogleOAuthStatus (AP-GCAL-06)
  - [ ] RevokeGoogleOAuth (delete googleOAuth from USER_META)
  - [ ] Token encryption/decryption

- [ ] Implement Google Calendar import logic
  - [ ] FindEventByGoogleId (AP-GCAL-08)
  - [ ] GetEventsModifiedSince (AP-GCAL-09)
  - [ ] CreateEventFromGoogle (with sync metadata)
  - [ ] UpdateEventFromGoogle (with conflict detection)
  - [ ] ConflictDetection logic

- [ ] Add optimistic locking to all updates

- [ ] Testing
  - [ ] Unit tests for all access patterns
  - [ ] Integration tests with DynamoDB Local
  - [ ] Conflict detection scenarios
  - [ ] Token encryption verification

---

## Next Steps

1. Implement backend API endpoints (see `08-REST-API.md` for contracts)
2. Implement frontend notification UI components
3. Implement Google OAuth flow
4. Implement import logic with conflict detection
5. Run integration tests
6. Proceed to QA verification

---

**Phase 9 Status**: Ready for implementation
