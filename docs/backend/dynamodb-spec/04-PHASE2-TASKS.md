# Phase 2: Tasks & Kanban - DynamoDB Specification
**Phase**: 2 - Tasks  
**Document**: 04-PHASE2-TASKS.md  
**Entity**: TASK  
**Access Patterns**: AP11-AP18  
**Depends on**: Phase 1 (table exists)

---

## Overview

Phase 2 adds Kanban task management with priority-based sorting and status workflow. Tasks integrate seamlessly with the calendar via GSI1 (due dates appear in agenda) and have their own Kanban view via GSI3.

---

## Entity Definition: TASK

**Purpose**: Kanban task with priority, effort, and status tracking

**Base Table Keys**:
```javascript
PK: "USER#user_123"
SK: "TASK#task_abc123xyz"
```

**GSI Keys**:
```javascript
// GSI1: For agenda view (sorted by due date or start date)
GSI1PK: "USER#user_123#2025"
GSI1SK: "2025-12-20T09:00:00Z"  // dueUtc or startUtc (whichever is earlier)

// GSI3: For Kanban view (grouped by status, sorted by priority)
GSI3PK: "USER#user_123#STATUS#IN_PROGRESS"
GSI3SK: "P1#2025-12-15T10:00:00Z"  // Priority + createdAt

// GSI4: Only populated if task has links
GSI4PK: "LINKED#NOTE#note_xyz"  // If linked to a note
GSI4SK: "TASK#task_abc123xyz"
```

**Complete Example**:
```javascript
{
  // Base table keys
  "PK": "USER#user_123",
  "SK": "TASK#task_abc123xyz",
  
  // GSI1 keys (for agenda view)
  "GSI1PK": "USER#user_123#2025",
  "GSI1SK": "2025-12-20T09:00:00Z",
  
  // GSI3 keys (for Kanban view)
  "GSI3PK": "USER#user_123#STATUS#IN_PROGRESS",
  "GSI3SK": "P1#2025-12-15T10:00:00Z",
  
  // Core attributes
  "entityType": "TASK",
  "taskId": "task_abc123xyz",
  "title": "Refactor auth module",
  "description": "## Objective\nModernize authentication flow\n\n## Tasks\n- [ ] Update JWT handling\n- [ ] Add refresh tokens",
  
  // Status and workflow
  "status": "IN_PROGRESS",  // BACKLOG | IN_PROGRESS | COMPLETED | ARCHIVED
  
  // Priority (1-5, shown as colored vertical bar)
  "priority": 1,  // 1 = highest (red), 5 = lowest (gray)
  
  // Effort (Fibonacci story points)
  "effort": 8,  // 1, 2, 3, 5, 8, 13, 21, 34, 55, 89
  
  // Temporal attributes
  "startUtc": "2025-12-18T09:00:00Z",  // Planned start (appears in Agenda when upcoming)
  "dueUtc": "2025-12-20T17:00:00Z",    // Due date (red badge when overdue)
  "completedAt": null,                  // Set when status → COMPLETED
  
  // Labels (colored chips, same 12-color palette)
  "labels": ["security", "backend"],  // String Set
  
  // Cross-linking
  "links": [
    {
      "type": "NOTE",
      "id": "note_design_doc",
      "title": "Auth Design Document"  // Cached for display
    }
  ],
  
  // Version control
  "version": 3,
  "createdAt": "2025-12-15T10:00:00Z",
  "updatedAt": "2025-12-18T14:30:00Z",
  
  // TTL for auto-deletion (optional, for archived tasks)
  "ttl": null
}
```

**Attribute Specifications**:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `PK` | String | Yes | Partition key: `USER#<userId>` |
| `SK` | String | Yes | Sort key: `TASK#<taskId>` |
| `GSI1PK` | String | Yes | Year partition: `USER#<userId>#<YYYY>` |
| `GSI1SK` | String | Yes | Earliest date: ISO 8601 UTC (min of startUtc, dueUtc) |
| `GSI3PK` | String | Yes | Status partition: `USER#<userId>#STATUS#<status>` |
| `GSI3SK` | String | Yes | Priority + creation: `P<priority>#<createdAt>` |
| `entityType` | String | Yes | Entity type: `TASK` |
| `taskId` | String | Yes | Immutable ID: `task_` prefix + UUIDv4 |
| `title` | String | Yes | Summary: 1-500 chars |
| `description` | String | No | Details (Markdown): Max 10KB |
| `status` | String | Yes | Workflow: BACKLOG, IN_PROGRESS, COMPLETED, ARCHIVED |
| `priority` | Number | Yes | Priority: 1-5 (1 = highest) |
| `effort` | Number | No | Story points: 1, 2, 3, 5, 8, 13, 21, 34, 55, 89 |
| `startUtc` | String | No | Planned start: ISO 8601 UTC |
| `dueUtc` | String | No | Due date: ISO 8601 UTC |
| `completedAt` | String | No | Completion: ISO 8601 UTC |
| `labels` | String Set | No | Tags: DynamoDB SS type |
| `links` | List | No | Cross-links: List of link objects |
| `version` | Number | Yes | Optimistic locking |
| `createdAt` | String | Yes | Creation: ISO 8601 UTC |
| `updatedAt` | String | Yes | Last update: ISO 8601 UTC |
| `ttl` | Number | No | Auto-deletion: Unix epoch |

**Status Transitions**:
```
BACKLOG → IN_PROGRESS
BACKLOG → COMPLETED  // Skip in-progress for quick tasks
IN_PROGRESS → COMPLETED
IN_PROGRESS → BACKLOG  // Move back
COMPLETED → ARCHIVED   // Auto after 24h or manual
COMPLETED → IN_PROGRESS  // Reopen
ARCHIVED → BACKLOG    // Restore
```

**GSI1SK Calculation**:
```typescript
function calculateGSI1SK(task: Task): string {
  const dates = [task.startUtc, task.dueUtc].filter(Boolean);
  if (dates.length === 0) {
    // No dates set - use createdAt but with Z prefix to sort after dated items
    return `Z${task.createdAt}`;
  }
  return dates.sort()[0];  // Earliest date
}
```

**Storage**: ~2.5KB per task

---

## Access Patterns: AP11-AP18

### AP11: Get Kanban Board (All Statuses)
**Frequency**: 80%  
**Latency Target**: <15ms  
**Method**: 4× GSI3 Query (parallel)

Query GSI3 for each status in parallel and merge results.

### AP12: Get Tasks by Status
**Frequency**: 15%  
**Latency Target**: <10ms  
**Method**: GSI3 Query

```typescript
async function getTasksByStatus(userId: string, status: string) {
  return await client.send(new QueryCommand({
    IndexName: "GSI3-TaskStatus",
    KeyConditionExpression: "GSI3PK = :pk",
    ExpressionAttributeValues: {
      ":pk": { S: `USER#${userId}#STATUS#${status}` }
    }
    // Results auto-sorted by P1 first (highest priority), then by creation date
  }));
}
```

### AP13: Create Task
**Frequency**: 3%  
**Latency Target**: <15ms  
**Method**: PutItem

### AP14: Update Task Status (Drag-Drop)
**Frequency**: 1%  
**Latency Target**: <15ms  
**Method**: UpdateItem with version check

Must update `GSI3PK` and `GSI3SK` when status changes.

### AP15: Get Single Task
**Frequency**: 0.5%  
**Latency Target**: <5ms  
**Method**: GetItem

### AP16: Get Overdue Tasks
**Frequency**: 0.3%  
**Latency Target**: <20ms  
**Method**: GSI1 Query + FilterExpression

### AP17: Update Task Priority
**Frequency**: 0.1%  
**Latency Target**: <15ms  
**Method**: UpdateItem

Must update `GSI3SK` when priority changes.

### AP18: Archive Completed Tasks (Batch)
**Frequency**: 0.1%  
**Latency Target**: <50ms  
**Method**: BatchWriteItem

---

## Implementation Checklist

- [ ] Create Task entity CRUD
- [ ] Implement Kanban board queries (GSI3)
- [ ] Add status transition logic
- [ ] Implement auto-archive after 24h (Lambda + Streams)
- [ ] Add task priority sorting
- [ ] Implement effort estimation
- [ ] Add overdue highlighting
- [ ] Test Kanban views with 500+ tasks
- [ ] Load test: 1000 status updates/sec

---

**Phase 2 Status**: Ready for implementation ✅
