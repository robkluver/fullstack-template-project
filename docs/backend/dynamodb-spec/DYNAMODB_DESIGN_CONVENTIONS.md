# ProductivityData DynamoDB Design Conventions

**Version**: 3.0 - Nexus MVP Production Ready

**Status**: ✅ CANONICAL REFERENCE - ALL CHANGES MUST ADHERE TO THESE CONVENTIONS

**Last Updated**: November 25, 2025

**Authority**: Based on Alex DeBrie's "The DynamoDB Book" Best Practices

## Purpose of This Document

This document defines the immutable design principles and conventions for the ProductivityData DynamoDB table. All future changes—adding new entity types, modifying access patterns, or refactoring existing code—MUST adhere to these conventions unless explicitly approved by the architecture review board.

Think of this as the "constitution" for our database design.

## 1. Core Design Principles (Immutable)

### Principle 1.1: Single-Table Design

**Rule**: All entities (events, tasks, reminders, notes, etc.) reside in ONE table: ProductivityData

**Rationale**:

- Reduces operational overhead (one table to monitor, backup, scale)
- Enables atomic transactions across entity types
- Minimizes network round trips (fetch related items in 1 query)
- Reduces costs (shared capacity, fewer provisioned resources)

**Example**:

```javascript
✅ CORRECT: Add new NOTE entity to ProductivityData table  
❌ WRONG: Create separate Notes table
```

**When to violate**: NEVER. If you think you need a second table, you're probably wrong. Consult the architecture team first.

### Principle 1.2: Access Pattern-First Design

**Rule**: Design keys based on access patterns, NOT on entity structure

**Rationale**:

- DynamoDB is a key-value store optimized for known access patterns
- Relational normalization does not apply
- Query efficiency > storage normalization

**Process**:

1. List ALL access patterns with frequency estimates
2. Design keys to satisfy top 3-5 patterns efficiently
3. Validate that remaining patterns can be satisfied (even if slightly less efficient)
4. If a pattern cannot be satisfied, add a GSI (not a new table)

### Principle 1.3: Year-Based Partitioning (Temporal Data)

**Rule**: For time-based queries (Calendar, Agenda), GSI1 partition key MUST follow pattern: USER#<userId>#<YYYY>

**Rationale**:

- Powers the "Unified Agenda" (Events + Tasks + Reminders)
- Week view is 10x more common than month view
- Result: 91% reduction in multi-query operations vs month-based partitioning

**Example**:

```javascript
✅ CORRECT: GSI1PK = "USER#user_123#2025"  
❌ WRONG: GSI1PK = "USER#user_123#2025-12" // Month-based
```

### Principle 1.4: Sparse Indexes for Subset Queries

**Rule**: Use sparse GSIs when < 50% of items need to be indexed

**Rationale**:

- Saves write costs (no replication for non-matching items)
- Example: GSI2 only indexes recurring hierarchies (~20% of items)
- Example: GSI1 only indexes Tasks/Reminders if they have a date

### Principle 1.5: State-Based Indexing (Non-Temporal Data)

**Rule**: Use GSI3 for list/status views (Kanban, Grid) independent of time.

**Rationale**:

- Tasks and Notes are often accessed by Status (Backlog) or Priority (Pinned), not just date.
- Allows "Swimlane" queries (begins_with(SK, "TASK#IN_PROGRESS")).

## 2. Naming Conventions (Strictly Enforced)

### Convention 2.1: Attribute Names Use camelCase

**Rule**: All attribute names MUST use camelCase (lowercase first letter)

**Rationale**:

- JavaScript/Node.js application
- Matches ecosystem conventions

**Examples**:

```javascript
✅ CORRECT:  
eventId, startUtc, triggerUtc, isPinned, snoozeState

❌ WRONG:  
EventId, StartUtc, Trigger_Utc, Is_Pinned
```

### Convention 2.2: Entity Types Use UPPERCASE

**Rule**: The entityType attribute value MUST be UPPERCASE

**Rationale**:

- Visual distinction in console debugging
- Signals "this is a constant, not a description"

**Valid Types**:

```javascript
entityType: "EVENT"  
entityType: "MASTER"  
entityType: "INSTANCE"  
entityType: "TASK"  
entityType: "REMINDER"  
entityType: "NOTE"
```

### Convention 2.3: Primary Key Names Are Generic

**Rule**: Base table keys are ALWAYS named PK and SK. GSI keys are GSI<N>PK and GSI<N>SK.

**Rationale**:

- Enables overloading (multiple entity types in same table)
- Future-proof

### Convention 2.4: Key Prefixes Are Descriptive and Consistent

**Rule**: All key values MUST follow the pattern: <ENTITY_TYPE>#<identifier> or <ENTITY_TYPE>#<discriminator>

**Standard Prefixes**:

```javascript
// Base Table SK  
"EVENT#<eventId>"  
"TASK#<taskId>"  
"REMINDER#<reminderId>"  
"NOTE#<noteId>"  

// GSI1 (Agenda/Time)  
"USER#<userId>#<YYYY>" // PK  
"<ISO_TIMESTAMP>" // SK (Events, Due Tasks, Reminders)  

// GSI2 (Hierarchy)  
"MASTER#<masterId>" // PK  
"INSTANCE#<date>" // SK  

// GSI3 (State/List)  
"USER#<userId>" // PK  
"TASK#<STATUS>#<PRIORITY>" // SK (Kanban)  
"NOTE#<PINNED>#<UPDATED>" // SK (Notes Grid)
```

### Convention 2.5: Identifiers Use Prefixed UUIDs

**Rule**: Entity IDs MUST follow pattern: <prefix>_<uuid>

**Standard Prefixes**:

```javascript
"evt_" // Events  
"mst_" // Recurring masters  
"inst_" // Recurring instances  
"task_" // Tasks  
"rem_" // Reminders  
"note_" // Notes
```

## 3. Data Type Conventions

### Convention 3.1: Timestamps MUST Be ISO 8601 UTC Strings

**Rule**: All timestamp attributes MUST use ISO 8601 format in UTC (YYYY-MM-DDTHH:mm:ssZ)

**Rationale**:

- Lexicographically sortable
- Human-readable

### Convention 3.2: Use Sets for Unordered, Non-Duplicate Data

**Rule**: Use String Set (SS) or Number Set (NS) when data has no meaningful order and duplicates are invalid.

**Examples**:

```javascript
tags: new Set(["work", "urgent"])
```

### Convention 3.3: Store Both Start AND End Timestamps

**Rule**: Events MUST store both startUtc AND endUtc.

### Convention 3.4: Timezone Storage & Floating Time

**Rule**: Timezone IDs MUST use IANA format. null implies Floating Time.

**Rationale**:

* Nexus requirement: "7 am" stays 7 am everywhere you travel (habits).

**Examples**:

```javascript
✅ CORRECT:  
startTzid: "America/New_York" // Fixed time  
startTzid: null // Floating time  

❌ WRONG:  
startTzid: "EST"
```

### Convention 3.5: Recurrence End Date Uses Dedicated Attribute

**Rule**: Recurring event end dates MUST use the rruleUntil attribute.

## 4. GSI Design Patterns

### Pattern 4.1: GSI1 (The Unified Agenda)

**Rule**: Use USER#<id>#<YYYY> as PK to query Events, Tasks, and Reminders chronologically.

* Condition: Only project Tasks/Reminders if they have a valid date (dueUtc or triggerUtc).

### Pattern 4.2: GSI2 (Hierarchy)

**Rule**: Sparse index. Only for items involved in a parent/child relationship (e.g., Recurring Events).

### Pattern 4.3: GSI3 (State Views)

**Rule**: Use USER#<id> as PK. Use SK overloading to support Kanban and Lists.

- Template: TYPE#STATUS#SORT_KEY
- Kanban: TASK#IN_PROGRESS#1 (Allows querying by column).
- Notes: NOTE#1 (Pinned) or NOTE#0 (Recent).

## 5. Required Attributes (All Entities)

### Rule 5.1: Mandatory Attributes

```javascript
{  
  PK: string,  
  SK: string,  
  entityType: string, // UPPERCASE  
  [entityId]: string, // prefixed uuid  
  version: number, // Optimistic locking  
  createdAt: string,  
  updatedAt: string  
}
```

## 6. Optimistic Locking (CRITICAL)

### Rule 6.1: ALL Updates MUST Use Optimistic Locking

**Rule**: Every UpdateCommand MUST include ConditionExpression: "version = :expected".

## 7. Performance Standards

### Standard 7.1: Latency Targets

**Rule**: All access patterns MUST meet these p99 latency targets.

| Operation                  | Target | Method     |
|----------------------------|--------|------------|
| Unified Agenda (Events+Tasks) | <10ms | GSI1 Query |
| Kanban Board Load          | <10ms | GSI3 Query |
| Single item read           | <5ms  | GetItem    |

### Standard 7.2: Pagination

**Rule**: Queries that may return >100 items MUST implement pagination.

## 8. Cost Optimization Principles

### Principle 8.1: Use Sparse Indexes When < 50% Coverage

**Rule**: Do not project "Backlog" tasks or "Archived" notes into GSI1 (Agenda).

### Principle 8.2: Avoid FilterExpression for Large Scans

**Rule**: FilterExpression is acceptable ONLY when scanning < 1,000 items.

## 9. Validation Checklist

Before deploying ANY change, verify:

### Schema Changes

- [ ] PK/SK follow convention (generic names, prefixed values)
- [ ] GSI1PK includes year (USER#<userId>#<YYYY>)
- [ ] GSI3 uses State/Sort overloading (TYPE#STATUS#SORT)
- [ ] Attributes use camelCase
- [ ] Entity type is UPPERCASE
- [ ] Timezone logic supports null (Floating)

### Code Changes

- [ ] All updates use optimistic locking (version check)
- [ ] Queries use GSI (not Scan on base table)
- [ ] Tasks/Reminders only written to GSI1 if dated

This document is the law. Follow it, and Nexus will remain ultra-fast. 🎯