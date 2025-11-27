# Phase 3: Reminders - DynamoDB Specification
**Phase**: 3 - Reminders  
**Document**: 05-PHASE3-REMINDERS.md  
**Entity**: REMINDER  
**Access Patterns**: AP19-AP22  
**Depends on**: Phase 1 (table exists)

---

## Overview

Phase 3 adds one-shot timed notifications. Reminders work like Google Keep reminders or Due app—they trigger at a specific time and can be snoozed. They appear in the unified agenda view via GSI1.

---

## Entity Definition: REMINDER

**Purpose**: One-shot timed notification

**Base Table Keys**:
```javascript
PK: "USER#user_123"
SK: "REMINDER#rem_abc123xyz"
```

**GSI Keys**:
```javascript
// GSI1: For agenda view (sorted by trigger time)
GSI1PK: "USER#user_123#2025"
GSI1SK: "2025-12-25T08:00:00Z"  // triggerUtc

// GSI4: Only populated if reminder links to another entity
GSI4PK: "LINKED#EVENT#evt_dentist"
GSI4SK: "REMINDER#rem_abc123xyz"
```

**Complete Example**:
```javascript
{
  // Base table keys
  "PK": "USER#user_123",
  "SK": "REMINDER#rem_abc123xyz",
  
  // GSI1 keys (for agenda view)
  "GSI1PK": "USER#user_123#2025",
  "GSI1SK": "2025-12-25T08:00:00Z",
  
  // Core attributes
  "entityType": "REMINDER",
  "reminderId": "rem_abc123xyz",
  "title": "Buy holiday gifts",
  "note": "## Gift ideas\n- Mom: scarf\n- Dad: book\n- Sister: headphones",
  
  // Temporal attributes
  "triggerUtc": "2025-12-25T08:00:00Z",
  "triggerTzid": null,  // null = floating time (8am wherever you are)
  
  // Display
  "color": "#f59e0b",  // Amber
  
  // Status
  "status": "PENDING",  // PENDING | SNOOZED | COMPLETED | DISMISSED
  "snoozedUntil": null,  // Set when snoozed
  
  // Cross-linking (optional)
  "links": [],
  
  // Version control
  "version": 1,
  "createdAt": "2025-12-20T10:00:00Z",
  "updatedAt": "2025-12-20T10:00:00Z",
  
  // TTL for auto-cleanup of old completed reminders
  "ttl": null
}
```

**Attribute Specifications**:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `PK` | String | Yes | Partition key: `USER#<userId>` |
| `SK` | String | Yes | Sort key: `REMINDER#<reminderId>` |
| `GSI1PK` | String | Yes | Year partition: `USER#<userId>#<YYYY>` |
| `GSI1SK` | String | Yes | Trigger time: ISO 8601 UTC |
| `entityType` | String | Yes | Entity type: `REMINDER` |
| `reminderId` | String | Yes | Immutable ID: `rem_` prefix + UUIDv4 |
| `title` | String | Yes | Message: 1-500 chars |
| `note` | String | No | Details (Markdown): Max 5KB |
| `triggerUtc` | String | Yes | Trigger time: ISO 8601 UTC |
| `triggerTzid` | String | No | Timezone: IANA (null = floating) |
| `color` | String | No | Display color: Hex code |
| `status` | String | Yes | Status: PENDING, SNOOZED, COMPLETED, DISMISSED |
| `snoozedUntil` | String | No | Snooze until: ISO 8601 UTC |
| `links` | List | No | Cross-links: List of link objects |
| `version` | Number | Yes | Optimistic locking |
| `createdAt` | String | Yes | Creation: ISO 8601 UTC |
| `updatedAt` | String | Yes | Last update: ISO 8601 UTC |
| `ttl` | Number | No | Auto-deletion: Unix epoch |

**Status Behavior**:
| Status | Behavior |
|--------|----------|
| PENDING | Waiting to trigger; notification sent at triggerUtc |
| SNOOZED | Postponed; notification sent at snoozedUntil instead |
| COMPLETED | User marked done; no notification |
| DISMISSED | User dismissed; no notification |

**Snooze Options** (Nexus UX):
```javascript
const SNOOZE_OPTIONS = {
  "10min": () => addMinutes(new Date(), 10),
  "1h": () => addHours(new Date(), 1),
  "tomorrow9am": () => setHours(addDays(startOfDay(new Date()), 1), 9),
  "nextweek": () => addWeeks(new Date(), 1),
  "custom": (customTime) => customTime
};
```

**Floating Time Behavior**:
- When `triggerTzid` is `null`, reminder uses floating time
- "8am" means 8am in user's current timezone
- Perfect for habits that should trigger at the same local time everywhere

**Storage**: ~1KB per reminder

---

## Access Patterns: AP19-AP22

### AP19: Get Pending Reminders
**Frequency**: ~50%  
**Latency Target**: <10ms  
**Method**: GSI1 Query + FilterExpression

```typescript
async function getPendingReminders(userId: string, fromDate: Date, daysAhead: number = 7) {
  const endDate = new Date(fromDate);
  endDate.setDate(endDate.getDate() + daysAhead);
  
  return await client.send(new QueryCommand({
    IndexName: "GSI1-YearView",
    KeyConditionExpression: "GSI1PK = :pk AND GSI1SK BETWEEN :start AND :end",
    FilterExpression: "#status IN (:pending, :snoozed)",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":pk": { S: `USER#${userId}#${fromDate.getFullYear()}` },
      ":start": { S: fromDate.toISOString() },
      ":end": { S: endDate.toISOString() },
      ":pending": { S: "PENDING" },
      ":snoozed": { S: "SNOOZED" }
    }
  }));
}
```

### AP20: Create Reminder
**Frequency**: 15%  
**Latency Target**: <15ms  
**Method**: PutItem

### AP21: Snooze Reminder
**Frequency**: ~20%  
**Latency Target**: <15ms  
**Method**: UpdateItem

```typescript
async function snoozeReminder(userId: string, reminderId: string, snoozeUntil: string) {
  return await docClient.send(new UpdateCommand({
    TableName: "ProductivityData",
    Key: { PK: `USER#${userId}`, SK: `REMINDER#${reminderId}` },
    UpdateExpression: "SET #status = :snoozed, snoozedUntil = :until, #version = #version + :inc",
    ExpressionAttributeNames: { "#status": "status", "#version": "version" },
    ExpressionAttributeValues: {
      ":snoozed": "SNOOZED",
      ":until": snoozeUntil,
      ":inc": 1
    }
  }));
}
```

### AP22: Complete/Dismiss Reminder
**Frequency**: ~15%  
**Latency Target**: <10ms  
**Method**: UpdateItem

---

## Stream Integration

**DynamoDB Streams** trigger Lambda functions that:
1. Send push notifications (WebSocket, email, SMS)
2. Update GSI1SK when snoozedUntil changes
3. Delete old completed reminders (via TTL)
4. Sync to mobile devices

---

## Implementation Checklist

- [ ] Create Reminder entity CRUD
- [ ] Implement pending reminders query (GSI1 + FilterExpression)
- [ ] Add snooze logic with snoozedUntil update
- [ ] Implement floating time conversion
- [ ] Set up DynamoDB Streams consumer (Lambda)
- [ ] Send push notifications on trigger
- [ ] Auto-delete completed reminders (24h after completion)
- [ ] Test snooze functionality
- [ ] Load test: 1000 snooze operations/sec

---

**Phase 3 Status**: Ready for implementation ✅
