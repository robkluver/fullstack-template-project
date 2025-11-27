# Phase 1: Calendar - DynamoDB Specification
**Phase**: 1 - Calendar  
**Document**: 03-PHASE1-CALENDAR.md  
**Entities**: EVENT, MASTER, INSTANCE, USER_META  
**Access Patterns**: AP1-AP10

---

## Overview

Phase 1 implements the calendar core of Nexus with support for:
- Single events (EVENT)
- Recurring events with RRULE (MASTER)
- Recurring event exceptions (INSTANCE)
- User metadata and preferences (USER_META)

This phase alone provides 95% of typical productivity app usage. All calendar, day, week, month, and year views are supported through GSI1 queries.

---

## Entity Definitions

### 4.1 Single Event (EVENT)

**Purpose**: One-time calendar event

**Base Table Keys**:
```javascript
PK: "USER#user_123"
SK: "EVENT#evt_abc123def456"
```

**GSI Keys**:
```javascript
GSI1PK: "USER#user_123#2025"
GSI1SK: "2025-12-15T14:00:00Z"
// GSI2PK and GSI2SK not populated (sparse index)
// GSI3PK and GSI3SK not populated (not a task)
// GSI4PK and GSI4SK populated only if item has links
```

**Complete Example**:
```javascript
{
  // Base table keys
  "PK": "USER#user_123",
  "SK": "EVENT#evt_abc123def456",
  
  // GSI1 keys (for calendar queries)
  "GSI1PK": "USER#user_123#2025",
  "GSI1SK": "2025-12-15T14:00:00Z",
  
  // Core attributes
  "entityType": "EVENT",
  "eventId": "evt_abc123def456",
  "title": "Team Standup",
  "description": "Daily sync with engineering team",
  
  // Temporal attributes
  "isAllDay": false,
  "startUtc": "2025-12-15T14:00:00Z",
  "endUtc": "2025-12-15T14:30:00Z",
  "startTzid": "America/New_York",
  "endTzid": null,  // Only for traveling events
  
  // Metadata
  "location": "Zoom: https://zoom.us/j/123456789",
  "color": "#4285F4",
  "status": "CONFIRMED",  // CONFIRMED | TENTATIVE | CANCELLED
  "tags": ["work", "engineering"],  // String Set (SS)
  "reminderMinutes": [15, 60],  // Number Set (NS)
  
  // Cross-linking (optional)
  "links": [],  // Empty = no cross-links
  
  // Version control
  "version": 1,
  "createdAt": "2025-11-20T10:00:00Z",
  "updatedAt": "2025-11-20T10:00:00Z",
  
  // iCalendar compatibility
  "icalUid": "evt_abc123def456@nexus.app",
  "sequence": 0
}
```

**Attribute Specifications**:

| Attribute | Type | Required | Description | Valid Values |
|-----------|------|----------|-------------|--------------|
| `PK` | String | Yes | Partition key | `USER#<userId>` |
| `SK` | String | Yes | Sort key | `EVENT#<eventId>` |
| `GSI1PK` | String | Yes | Year partition | `USER#<userId>#<YYYY>` |
| `GSI1SK` | String | Yes | Start time for sorting | ISO 8601 UTC timestamp |
| `entityType` | String | Yes | Entity discriminator | `EVENT` |
| `eventId` | String | Yes | Immutable UUID | `evt_` prefix + UUIDv4 |
| `title` | String | Yes | Event summary | 1-500 chars |
| `description` | String | No | Event details (Markdown) | Max 10KB |
| `isAllDay` | Boolean | Yes | All-day event flag | `true` or `false` |
| `startUtc` | String | Yes* | Start time in UTC | ISO 8601 (*not required if all-day) |
| `endUtc` | String | No | End time in UTC | ISO 8601 |
| `startTzid` | String | No | IANA timezone at start | `null` = floating event |
| `endTzid` | String | No | IANA timezone at end | Only for traveling events |
| `location` | String | No | Venue, address, or URL | Max 500 chars |
| `color` | String | No | Calendar color | Hex color code (12 muted colors) |
| `status` | String | Yes | Confirmation status | `CONFIRMED`, `TENTATIVE`, `CANCELLED` |
| `tags` | String Set | No | User-defined tags | DynamoDB SS type |
| `reminderMinutes` | Number Set | No | Reminder times | DynamoDB NS type (minutes before event) |
| `links` | List | No | Cross-links to other entities | List of link objects |
| `version` | Number | Yes | Optimistic locking | Incremented on each update |
| `createdAt` | String | Yes | Creation timestamp | ISO 8601 UTC |
| `updatedAt` | String | Yes | Last update timestamp | ISO 8601 UTC |
| `icalUid` | String | Yes | iCalendar UID | Format: `<eventId>@<domain>` |
| `sequence` | Number | No | iCalendar sequence | Incremented on updates (RFC 5545) |
| `ttl` | Number | No | Auto-deletion time | Unix epoch seconds |

**Color Palette** (12 muted colors shared across all entities):
```javascript
const NEXUS_COLORS = {
  "slate":   "#64748b",
  "gray":    "#6b7280",
  "zinc":    "#71717a",
  "red":     "#ef4444",
  "orange":  "#f97316",
  "amber":   "#f59e0b",
  "yellow":  "#eab308",
  "lime":    "#84cc16",
  "green":   "#22c55e",
  "cyan":    "#06b6d4",
  "blue":    "#3b82f6",
  "violet":  "#8b5cf6"
};
```

**Storage**: ~2KB per event (without large description)

---

### 4.2 Recurring Master (MASTER)

**Purpose**: Template for recurring events (stores RRULE, generates virtual instances)

**Base Table Keys**:
```javascript
PK: "USER#user_123"
SK: "MASTER#mst_weekly_standup"
```

**GSI Keys**:
```javascript
GSI1PK: "USER#user_123#2025"
GSI1SK: "2025-01-06T15:00:00Z"  // First occurrence
GSI2PK: "MASTER#mst_weekly_standup"  // For series lookup
GSI2SK: "MASTER"  // Sorts before instances
```

**Complete Example**:
```javascript
{
  // Base table keys
  "PK": "USER#user_123",
  "SK": "MASTER#mst_weekly_standup",
  
  // GSI1 keys
  "GSI1PK": "USER#user_123#2025",
  "GSI1SK": "2025-01-06T15:00:00Z",
  
  // GSI2 keys (sparse - only for recurring)
  "GSI2PK": "MASTER#mst_weekly_standup",
  "GSI2SK": "MASTER",
  
  // Core attributes
  "entityType": "MASTER",
  "eventId": "mst_weekly_standup",
  "masterId": "mst_weekly_standup",  // Self-reference
  "title": "Weekly Team Standup",
  "description": "Weekly sync with the team",
  
  // Recurrence rule (RFC 5545)
  "rrule": "FREQ=WEEKLY;BYDAY=MO",
  "rruleUntil": null,  // Optional end date (ISO 8601 UTC) - set when series is ended
  "exdate": ["20251225", "20260101"],  // Cancelled dates (YYYYMMDD)
  "rdate": [],  // Additional dates (rare)
  "hasExceptions": true,  // Flag for optimization
  
  // Temporal attributes (first occurrence)
  "isAllDay": false,
  "startUtc": "2025-01-06T15:00:00Z",
  "endUtc": "2025-01-06T15:15:00Z",
  "startTzid": "America/New_York",
  
  // Metadata
  "location": "Zoom: https://zoom.us/j/987654321",
  "color": "#22c55e",
  "status": "CONFIRMED",
  "tags": ["work", "standup"],
  
  // Cross-linking (optional)
  "links": [],
  
  // Version control
  "version": 3,
  "createdAt": "2024-12-20T10:00:00Z",
  "updatedAt": "2025-11-15T09:00:00Z",
  
  "icalUid": "mst_weekly_standup@nexus.app"
}
```

**Additional Attributes for MASTER**:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `masterId` | String | Yes | Self-reference (same as eventId) |
| `rrule` | String | Yes | iCalendar recurrence rule (RFC 5545) |
| `rruleUntil` | String | No | End date for recurrence (ISO 8601 UTC). When set, no occurrences after this date. |
| `exdate` | List<String> | No | Exception dates in YYYYMMDD format |
| `rdate` | List<String> | No | Additional occurrence dates (rare) |
| `hasExceptions` | Boolean | No | True if instances exist (query optimization) |

**Client-side expansion**: Master defines the rule. Client (or server) expands RRULE to generate virtual instances for display. Only exceptions (modified/cancelled instances) are stored as separate items.

**Supported RRULE Patterns**:
```javascript
// Daily
"FREQ=DAILY"
"FREQ=DAILY;INTERVAL=2"  // Every other day

// Weekly
"FREQ=WEEKLY"
"FREQ=WEEKLY;BYDAY=MO,WE,FR"  // Mon, Wed, Fri

// Monthly
"FREQ=MONTHLY"
"FREQ=MONTHLY;BYMONTHDAY=15"  // 15th of each month

// Yearly
"FREQ=YEARLY"
"FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=25"  // Christmas
```

---

### 4.3 Recurring Instance (INSTANCE)

**Purpose**: Exception/override to a recurring series

**Base Table Keys**:
```javascript
PK: "USER#user_123"
SK: "INSTANCE#mst_weekly_standup#20251224"
```

**GSI Keys**:
```javascript
GSI1PK: "USER#user_123#2025"
GSI1SK: "2025-12-24T16:00:00Z"  // Modified time
GSI2PK: "MASTER#mst_weekly_standup"  // Links to master
GSI2SK: "INSTANCE#20251224"  // Sorts after master
```

**Complete Example** (rescheduled 1 hour later):
```javascript
{
  // Base table keys
  "PK": "USER#user_123",
  "SK": "INSTANCE#mst_weekly_standup#20251224",
  
  // GSI1 keys
  "GSI1PK": "USER#user_123#2025",
  "GSI1SK": "2025-12-24T16:00:00Z",  // New time
  
  // GSI2 keys
  "GSI2PK": "MASTER#mst_weekly_standup",
  "GSI2SK": "INSTANCE#20251224",
  
  // Core attributes
  "entityType": "INSTANCE",
  "eventId": "inst_20251224_xyz789",
  "masterId": "mst_weekly_standup",
  "recurrenceId": "2025-12-24T15:00:00Z",  // Original time (RFC 5545)
  
  "title": "Weekly Team Standup (MOVED)",
  "description": "Rescheduled due to holiday",
  "startUtc": "2025-12-24T16:00:00Z",  // Modified
  "endUtc": "2025-12-24T16:15:00Z",
  "startTzid": "America/New_York",
  
  "location": "Zoom: https://zoom.us/j/987654321",
  "color": "#22c55e",
  "status": "CONFIRMED",
  "modifiedFields": ["startUtc", "endUtc", "title", "description"],  // Audit trail
  
  // Cross-linking (optional)
  "links": [],
  
  "version": 1,
  "createdAt": "2025-12-20T10:00:00Z",
  "updatedAt": "2025-12-23T16:00:00Z"
}
```

**Additional Attributes for INSTANCE**:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `masterId` | String | Yes | Parent recurring event ID |
| `recurrenceId` | String | Yes | Original start time (iCalendar RECURRENCE-ID) |
| `modifiedFields` | List<String> | No | Which fields were changed (audit trail) |

**For cancelled instances**: Set `status: "CANCELLED"` OR add date to master's `exdate` array (both approaches valid per RFC 5545).

---

### 4.4 User Metadata (USER_META)

**Purpose**: User preferences, default timezone, cached statistics, configuration

**Base Table Keys**:
```javascript
PK: "USER#user_123"
SK: "USER_META#user_123"
```

**GSI Keys**: Not populated (user metadata doesn't need calendar queries)

**Complete Example**:
```javascript
{
  "PK": "USER#user_123",
  "SK": "USER_META#user_123",
  
  "entityType": "USER_META",
  "userId": "user_123",
  
  // User preferences (matching Nexus Configuration requirements)
  "defaultTzid": "America/New_York",
  "preferences": {
    // Calendar preferences
    "weekStart": 1,  // 0 = Sunday, 1 = Monday
    "defaultEventDuration": 30,  // 15, 30, 45, or 60 minutes
    "defaultCalendarIncrement": 15,  // 10, 15, 30, or 60 minutes
    "defaultReminderMinutes": [15],
    
    // Display preferences
    "theme": "dark",  // "light", "dark", or "auto"
    
    // Task preferences
    "autoArchiveCompletedTasks": true,  // Move to Archived after 24h
    "autoArchiveDelayHours": 24,
    
    // Notification preferences
    "enableBrowserNotifications": true,
    "enableSoundNotifications": true
  },
  
  // Cached statistics (updated via DynamoDB Streams)
  "stats": {
    "totalEvents": 1247,
    "totalTasks": 523,
    "totalReminders": 89,
    "totalNotes": 156,
    "upcomingEvents": 23,
    "overdueTasks": 5,
    "lastEventCreated": "2025-11-20T10:00:00Z",
    "lastTaskCompleted": "2025-11-24T15:30:00Z"
  },
  
  // Version control
  "version": 12,
  "createdAt": "2024-01-15T00:00:00Z",
  "updatedAt": "2025-11-24T10:00:00Z"
}
```

**Use cases**:
- Store user's home timezone (critical for floating events and reminders)
- Store UI preferences (theme, calendar settings)
- Store feature toggles (auto-archive tasks)
- Cache aggregate statistics (updated via Streams)
- Single GetItem to bootstrap application state on login

---

## Access Patterns: AP1-AP10

### AP1: Week/Agenda View (Most Common - 90.9%)

**Scenario**: User opens app, shows today + next 7 days

**Performance**: 
- Latency: ~5-8ms (single query)
- RCUs: ~35 (70 events × 0.5 RCU)
- Network: 1 round trip (99.9% of time)

**Implementation**:
```typescript
async function getAgendaView(userId: string, fromDate?: Date) {
  const now = fromDate || new Date();
  const startUtc = now.toISOString();
  
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 7);
  const endUtc = endDate.toISOString();
  
  const year = now.getFullYear();
  const endYear = endDate.getFullYear();
  
  // 99.9% of queries: Single year (single query)
  if (year === endYear) {
    return await client.send(new QueryCommand({
      TableName: "ProductivityData",
      IndexName: "GSI1-YearView",
      KeyConditionExpression: "GSI1PK = :pk AND GSI1SK BETWEEN :start AND :end",
      ExpressionAttributeValues: {
        ":pk": { S: `USER#${userId}#${year}` },
        ":start": { S: startUtc },
        ":end": { S: endUtc }
      },
      Limit: 100
    }));
  }
  
  // 0.1% of queries: Year straddle (Dec 25-31 only)
  const [currentYear, nextYear] = await Promise.all([
    client.send(new QueryCommand({...})),
    client.send(new QueryCommand({...}))
  ]);
  
  return [...currentYear.Items, ...nextYear.Items].sort(...);
}
```

---

### AP2: Get Single Event (5%)

**Scenario**: User clicks event to view details

**Performance**:
- Latency: ~2ms
- RCUs: 0.5 (strongly consistent)

**Implementation**:
```typescript
async function getEventById(userId: string, eventId: string) {
  let skPrefix = "EVENT#";
  if (eventId.startsWith("mst_")) skPrefix = "MASTER#";
  else if (eventId.startsWith("inst_")) skPrefix = "INSTANCE#";
  
  return await docClient.send(new GetCommand({
    TableName: "ProductivityData",
    Key: {
      PK: `USER#${userId}`,
      SK: `${skPrefix}${eventId}`
    }
  }));
}
```

---

### AP3: Create Event (2%)

**Scenario**: User creates new calendar event

**Performance**:
- Latency: ~10ms
- WCUs: 2 (1 for base table, 1 for GSI1)

---

### AP4: Update Event with Optimistic Locking (1%)

**Scenario**: User reschedules event, prevent concurrent modification

**Performance**:
- Latency: ~12ms
- WCUs: 2

**Key Feature**: Version-based optimistic locking prevents update conflicts

---

### AP5: Create Recurring Event (0.5%)

**Scenario**: User creates "Daily standup" recurring event

**Performance**:
- Latency: ~12ms
- RCUs: ~75 (300 events)

---

### AP6: Delete Event (0.1%)

**Scenario**: User deletes an event

**Performance**:
- Latency: ~8ms
- WCUs: 1

---

### AP7: Get Recurring Series (0.05%)

**Scenario**: User edits recurring series, needs master + all exceptions

**Performance**:
- Latency: ~20ms (1 GetItem + 1 Query)
- RCUs: ~10 (master + typical 5-10 instances)

**Query**: GSI2-RecurrenceLookup on `MASTER#<masterId>` returns master first, then all exceptions sorted

---

### AP8: Modify Recurring Instance (0.05%)

**Scenario**: User reschedules one instance of daily standup

**Performance**:
- Latency: ~18ms (1 GetItem + 1 PutItem + 1 UpdateItem)
- WCUs: 4 (instance creation + GSI writes + master update)

---

### AP9: End Recurring Series (0.05%)

**Scenario**: User clicks "Delete all future occurrences" on a recurring event

**Performance**:
- Latency: ~12ms
- WCUs: 1

**Implementation**: Set `rruleUntil` attribute to stop generating future occurrences

---

### AP10: Filter by Tags (< 0.01%)

**Scenario**: User filters calendar to show only "work" events for 2025

**Performance**:
- Latency: ~30-50ms (reads entire year partition, filters server-side)
- RCUs: ~900 (3,650 events × 0.5 RCU, but only matching items returned)
- **Note**: FilterExpression consumes RCUs for all items scanned, not just returned

---

## Implementation Checklist

### Phase 1 Development Tasks

- [ ] Implement EVENT entity CRUD operations
  - [ ] CreateEvent (AP3)
  - [ ] GetEvent (AP2)
  - [ ] UpdateEvent (AP4)
  - [ ] DeleteEvent (AP6)

- [ ] Implement MASTER and INSTANCE entities
  - [ ] CreateRecurringEvent (AP5)
  - [ ] GetRecurringSeries (AP7)
  - [ ] ModifyRecurringInstance (AP8)
  - [ ] EndRecurringSeries (AP9)

- [ ] Implement agenda queries
  - [ ] WeekView (AP1)
  - [ ] MonthView (using AP1 + date range)
  - [ ] YearView (using AP1 + larger date range)
  - [ ] TagFilter (AP10)

- [ ] Implement USER_META
  - [ ] GetUserPreferences
  - [ ] UpdateUserPreferences
  - [ ] GetUserStats (read-only, updated via Streams)

- [ ] Add optimistic locking to all updates
  - [ ] Version attribute tracking
  - [ ] Conditional expression checks
  - [ ] Conflict error handling

- [ ] Add iCalendar support
  - [ ] icalUid generation
  - [ ] sequence number tracking
  - [ ] RRULE parsing/expansion
  - [ ] RECURRENCE-ID handling

- [ ] Testing
  - [ ] Unit tests for all access patterns
  - [ ] Integration tests with DynamoDB Local
  - [ ] Load test: 1000 week-view queries/sec
  - [ ] Timezone conversion tests (DST handling)

---

## Next Steps

1. Deploy table schema from `02-TABLE-CONFIG-AND-INDEXES.md`
2. Implement Phase 1 entity schemas and CRUD operations
3. Build REST API endpoints (see `08-REST-API.md`)
4. Run integration tests
5. Proceed to Phase 2 (Tasks) once calendar is complete

---

**Phase 1 Status**: Ready for implementation ✅
