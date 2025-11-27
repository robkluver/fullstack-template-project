# Phase 5: Cross-Linking & Unified Agenda - DynamoDB Specification
**Phase**: 5 - Cross-Linking  
**Document**: 07-PHASE5-CROSS-LINKING.md  
**Index**: GSI4 (CrossLinks)  
**Access Patterns**: AP29-AP32  
**Depends on**: Phases 1-4

---

## Overview

Phase 5 enables linking between all entity types (notes → tasks, tasks → events, etc.) and provides a unified agenda view combining all entity types. This is the final piece that makes Nexus a cohesive knowledge base.

---

## Cross-Linking Architecture

### Link Object Schema

```typescript
interface Link {
  type: "EVENT" | "MASTER" | "TASK" | "REMINDER" | "NOTE";
  id: string;     // The target entity's ID
  title: string;  // Cached title for display (denormalized)
}
```

**Example Links Array**:
```javascript
{
  "links": [
    {
      "type": "TASK",
      "id": "task_refactor_auth",
      "title": "Refactor auth module"
    },
    {
      "type": "NOTE",
      "id": "note_design_doc",
      "title": "Auth Design Document"
    },
    {
      "type": "EVENT",
      "id": "evt_review_meeting",
      "title": "Auth Review Meeting"
    }
  ]
}
```

### GSI4 Population Rules

For each link in the `links` array, populate GSI4 with:
- `GSI4PK`: `LINKED#<targetType>#<targetId>`
- `GSI4SK`: `<sourceType>#<sourceId>`

**Example**: If Note `note_abc` links to Task `task_xyz`:
```javascript
{
  "PK": "USER#user_123",
  "SK": "NOTE#note_abc",
  "links": [{ "type": "TASK", "id": "task_xyz", "title": "Refactor..." }],
  "GSI4PK": "LINKED#TASK#task_xyz",  // Reverse lookup key
  "GSI4SK": "NOTE#note_abc"          // Source identifier
}
```

### Multi-Link Handling

When an item has multiple links, use the **first link for GSI4**. For complete reverse lookup and backlinks, scan the entire `links` arrays (or maintain a separate GSI if scale requires).

### Link Syntax in Markdown

```markdown
# In any Markdown field:
See task #Refactor auth           → Links to task with matching title
Related to @Design Document       → Links to note with matching title  
Discussed in !Weekly Standup      → Links to event with matching title
```

**Parser Patterns**:
```typescript
const LINK_PATTERNS = {
  task: /#([a-zA-Z0-9\s\-_]+)/g,      // #TaskTitle
  note: /@([a-zA-Z0-9\s\-_]+)/g,      // @NoteTitle
  event: /!([a-zA-Z0-9\s\-_]+)/g      // !EventTitle
};
```

---

## Access Patterns: AP29-AP32

### AP29: Get Items Linked to Entity
**Frequency**: 20%  
**Latency Target**: <15ms  
**Method**: GSI4 Query + BatchGetItem

```typescript
async function getLinkedItems(userId: string, entityType: string, entityId: string) {
  // Query GSI4 to find all items linking to this entity
  const result = await client.send(new QueryCommand({
    IndexName: "GSI4-CrossLinks",
    KeyConditionExpression: "GSI4PK = :pk",
    ExpressionAttributeValues: {
      ":pk": { S: `LINKED#${entityType}#${entityId}` }
    }
  }));
  
  // Extract source items (use Keys only from GSI4)
  const sourceKeys = result.Items?.map(item => ({
    PK: item.PK.S,
    SK: item.SK.S
  })) || [];
  
  // BatchGetItem to fetch full items
  const items = await docClient.send(new BatchGetCommand({
    RequestItems: {
      ProductivityData: { Keys: sourceKeys }
    }
  }));
  
  return items.Responses?.ProductivityData || [];
}
```

### AP30: Get Backlinks (Items Pointing to Entity)
**Frequency**: 15%  
**Latency Target**: <30ms  
**Method**: Scan + FilterExpression OR Lambda Scan

Since GSI4 only stores forward links, backlinks require scanning the source items' `links` arrays. For production, use a Lambda consumer on Streams to maintain a reverse index.

```typescript
async function getBacklinks(userId: string, targetId: string) {
  // Scan user's items for links to targetId
  const result = await client.send(new ScanCommand({
    TableName: "ProductivityData",
    FilterExpression: "contains(#links, :target)",
    ExpressionAttributeNames: { "#links": "links" },
    ExpressionAttributeValues: {
      ":target": { S: targetId }
    }
  }));
  
  return result.Items?.map(item => unmarshall(item)) || [];
}
```

### AP31: Unified Agenda (Events + Tasks + Reminders)
**Frequency**: 30%  
**Latency Target**: <20ms  
**Method**: GSI1 Query (returns all entity types)

```typescript
async function getUnifiedAgenda(userId: string, fromDate: Date, daysAhead: number = 7) {
  const endDate = new Date(fromDate);
  endDate.setDate(endDate.getDate() + daysAhead);
  
  // Single GSI1 query returns EVENT, TASK, REMINDER, NOTE, MASTER, INSTANCE
  const result = await client.send(new QueryCommand({
    IndexName: "GSI1-YearView",
    KeyConditionExpression: "GSI1PK = :pk AND GSI1SK BETWEEN :start AND :end",
    ExpressionAttributeValues: {
      ":pk": { S: `USER#${userId}#${fromDate.getFullYear()}` },
      ":start": { S: fromDate.toISOString() },
      ":end": { S: endDate.toISOString() }
    },
    Limit: 500  // Paginate if needed
  }));
  
  return result.Items?.map(item => ({
    ...unmarshall(item),
    // Group by date for UI rendering
    _date: unmarshall(item).GSI1SK.split('T')[0]
  })) || [];
}
```

**Response Format**:
```javascript
[
  {
    "entityType": "EVENT",
    "eventId": "evt_123",
    "title": "Team Standup",
    "startUtc": "2025-12-15T14:00:00Z",
    "color": "#3b82f6",
    "_date": "2025-12-15"
  },
  {
    "entityType": "TASK",
    "taskId": "task_xyz",
    "title": "Finish API spec",
    "dueUtc": "2025-12-15T17:00:00Z",
    "priority": 1,
    "_date": "2025-12-15"
  },
  {
    "entityType": "REMINDER",
    "reminderId": "rem_abc",
    "title": "Call dentist",
    "triggerUtc": "2025-12-15T15:00:00Z",
    "_date": "2025-12-15"
  }
]
```

### AP32: Global Search
**Frequency**: 5%  
**Latency Target**: <200ms  
**Method**: OpenSearch or DynamoDB Scan

For production, use OpenSearch updated via Streams for full-text search across title, body, description, notes.

---

## Stream Integration for Link Maintenance

**When a linked entity's title changes**:
1. DynamoDB Stream detects title change
2. Lambda queries GSI4 for all items linking to this entity
3. Lambda updates cached titles in linking items
4. Optional: Update full-text search index

---

## Implementation Checklist

- [ ] Implement Link object in all entities
- [ ] Add GSI4 population logic for all entities with links
- [ ] Parse Markdown link syntax (#Task, @Note, !Event)
- [ ] Implement getLinkedItems (GSI4 query)
- [ ] Implement getBacklinks (scan or reverse index)
- [ ] Implement unified agenda (GSI1 query)
- [ ] Add link caching for display
- [ ] Set up Lambda consumer for title cache invalidation
- [ ] Test cross-entity linking
- [ ] Implement full-text search (OpenSearch recommended)
- [ ] Load test: 1000 link operations/sec

---

**Phase 5 Status**: Ready for implementation ✅
