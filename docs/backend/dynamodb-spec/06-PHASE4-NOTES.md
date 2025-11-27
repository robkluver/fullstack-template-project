# Phase 4: Notes - DynamoDB Specification
**Phase**: 4 - Notes  
**Document**: 06-PHASE4-NOTES.md  
**Entity**: NOTE  
**Access Patterns**: AP23-AP28  
**Depends on**: Phase 1 (table exists)

---

## Overview

Phase 4 adds card-based, colorable Markdown notes. Similar to Bear and Google Keep, notes support pinning, tagging, and cross-linking to tasks and events. They appear in a timeline view and provide a flexible knowledge base.

---

## Entity Definition: NOTE

**Purpose**: Card-based, colorable Markdown notes

**Base Table Keys**:
```javascript
PK: "USER#user_123"
SK: "NOTE#note_abc123xyz"
```

**GSI Keys**:
```javascript
// GSI1: For timeline view (sorted by creation date)
GSI1PK: "USER#user_123#2025"
GSI1SK: "2025-11-20T10:00:00Z"  // createdAt

// GSI4: Only populated if note links to other entities
GSI4PK: "LINKED#TASK#task_refactor"
GSI4SK: "NOTE#note_abc123xyz"
```

**Complete Example**:
```javascript
{
  // Base table keys
  "PK": "USER#user_123",
  "SK": "NOTE#note_abc123xyz",
  
  // GSI1 keys (for timeline view)
  "GSI1PK": "USER#user_123#2025",
  "GSI1SK": "2025-11-20T10:00:00Z",
  
  // Core attributes
  "entityType": "NOTE",
  "noteId": "note_abc123xyz",
  "title": "2026 Architecture Planning",
  "body": "## Goals\n\n- Migrate to microservices\n- Implement event sourcing\n- Reduce latency by 50%",
  
  // Display
  "color": "#3b82f6",  // Blue
  "isPinned": true,    // Pinned notes appear at top
  
  // Organization
  "tags": ["architecture", "2026", "planning"],  // String Set
  
  // Status
  "status": "ACTIVE",  // ACTIVE | ARCHIVED
  
  // Cross-linking
  "links": [
    {
      "type": "TASK",
      "id": "task_q1_design",
      "title": "Complete Q1 design docs"
    },
    {
      "type": "EVENT",
      "id": "evt_arch_review",
      "title": "Architecture Review Meeting"
    }
  ],
  
  // Permanent URL support
  "slug": "2026-architecture-planning",  // URL-friendly version
  
  // Version control
  "version": 5,
  "createdAt": "2025-11-20T10:00:00Z",
  "updatedAt": "2025-11-24T14:30:00Z",
  
  // TTL for auto-deletion (optional, for archived notes)
  "ttl": null
}
```

**Attribute Specifications**:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `PK` | String | Yes | Partition key: `USER#<userId>` |
| `SK` | String | Yes | Sort key: `NOTE#<noteId>` |
| `GSI1PK` | String | Yes | Year partition: `USER#<userId>#<YYYY>` |
| `GSI1SK` | String | Yes | Creation time: ISO 8601 UTC |
| `entityType` | String | Yes | Entity type: `NOTE` |
| `noteId` | String | Yes | Immutable ID: `note_` prefix + UUIDv4 |
| `title` | String | Yes | Title: 1-500 chars |
| `body` | String | No | Content (Markdown): Max 50KB |
| `color` | String | No | Background color: Hex code |
| `isPinned` | Boolean | No | Pin to top: true/false |
| `tags` | String Set | No | Tags: DynamoDB SS type |
| `status` | String | Yes | Status: ACTIVE, ARCHIVED |
| `links` | List | No | Cross-links: List of link objects |
| `slug` | String | No | URL-friendly ID: Lowercase, hyphens |
| `version` | Number | Yes | Optimistic locking |
| `createdAt` | String | Yes | Creation: ISO 8601 UTC |
| `updatedAt` | String | Yes | Last update: ISO 8601 UTC |
| `ttl` | Number | No | Auto-deletion: Unix epoch |

**Note Views**:
| View | Display | Sort |
|------|---------|------|
| Grid | 3-5 columns responsive | Pinned first, then updatedAt DESC |
| List | Single column, compact | Pinned first, then updatedAt DESC |

**Slug Generation**:
```typescript
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')  // Remove special chars
    .replace(/\s+/g, '-')           // Spaces to hyphens
    .replace(/-+/g, '-')            // Collapse hyphens
    .slice(0, 50);                  // Limit length
}
```

**Storage**: ~5KB per note

---

## Access Patterns: AP23-AP28

### AP23: Get All Notes
**Frequency**: 40%  
**Latency Target**: <20ms  
**Method**: GSI1 Query + FilterExpression

```typescript
async function getAllNotes(userId: string, includeArchived: boolean = false) {
  const queryParams = {
    IndexName: "GSI1-YearView",
    KeyConditionExpression: "GSI1PK = :pk",
    ExpressionAttributeValues: { ":pk": { S: `USER#${userId}#${new Date().getFullYear()}` } }
  };
  
  if (!includeArchived) {
    queryParams.FilterExpression = "#status = :active";
    queryParams.ExpressionAttributeNames = { "#status": "status" };
    queryParams.ExpressionAttributeValues[":active"] = { S: "ACTIVE" };
  }
  
  return await client.send(new QueryCommand(queryParams));
}
```

### AP24: Get Single Note
**Frequency**: 30%  
**Latency Target**: <5ms  
**Method**: GetItem

### AP25: Create Note
**Frequency**: 20%  
**Latency Target**: <15ms  
**Method**: PutItem

### AP26: Update Note
**Frequency**: 5%  
**Latency Target**: <15ms  
**Method**: UpdateItem with version check

### AP27: Search Notes
**Frequency**: 3%  
**Latency Target**: <100ms  
**Method**: GSI1 Query + FilterExpression OR external search index (OpenSearch)

For production, use OpenSearch for full-text search, updated via Streams.

### AP28: Archive/Delete Note
**Frequency**: 2%  
**Latency Target**: <15ms  
**Method**: UpdateItem (set status=ARCHIVED) or DeleteItem

---

## Implementation Checklist

- [ ] Create Note entity CRUD
- [ ] Implement note timeline queries (GSI1)
- [ ] Add slug generation and uniqueness check
- [ ] Implement pinned notes sorting
- [ ] Add tag filtering
- [ ] Set up full-text search (OpenSearch optional)
- [ ] Implement note archival
- [ ] Test grid/list views
- [ ] Load test: 500 note operations/sec

---

**Phase 4 Status**: Ready for implementation ✅
