# DynamoDB Single-Table Design Conventions

**Version**: 1.0 - Template

**Status**: CANONICAL REFERENCE - ALL CHANGES MUST ADHERE TO THESE CONVENTIONS

**Last Updated**: [DATE]

**Authority**: Based on Alex DeBrie's "The DynamoDB Book" Best Practices

## Purpose of This Document

This document defines the immutable design principles and conventions for your DynamoDB single-table design. All future changes—adding new entity types, modifying access patterns, or refactoring existing code—MUST adhere to these conventions unless explicitly approved by the architecture review board.

Think of this as the "constitution" for your database design.

## 1. Core Design Principles (Immutable)

### Principle 1.1: Single-Table Design

**Rule**: All entities reside in ONE table: `[TableName]`

<!--
DYNAMODB ARCHITECT: Replace [TableName] with your project's table name (e.g., "AppData", "ProductData")
-->

**Rationale**:

- Reduces operational overhead (one table to monitor, backup, scale)
- Enables atomic transactions across entity types
- Minimizes network round trips (fetch related items in 1 query)
- Reduces costs (shared capacity, fewer provisioned resources)

**Example**:

```javascript
// CORRECT: Add new entity to your single table
// WRONG: Create separate table for new entity type
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

**Rule**: For time-based queries, GSI1 partition key MUST follow pattern: USER#<userId>#<YYYY>

**Rationale**:

- Enables efficient date-range queries within a year
- Week view is typically 10x more common than month view
- Result: Significant reduction in multi-query operations vs month-based partitioning

**Example**:

```javascript
// CORRECT: GSI1PK = "USER#user_123#2025"
// WRONG: GSI1PK = "USER#user_123#2025-12" // Month-based
```

### Principle 1.4: Sparse Indexes for Subset Queries

**Rule**: Use sparse GSIs when < 50% of items need to be indexed

**Rationale**:

- Saves write costs (no replication for non-matching items)
- Example: GSI2 only indexes hierarchical relationships
- Example: GSI1 only indexes items with dates

### Principle 1.5: State-Based Indexing (Non-Temporal Data)

**Rule**: Use GSI3 for list/status views (Kanban, Grid) independent of time.

**Rationale**:

- Items are often accessed by Status or Priority, not just date.
- Allows "Swimlane" queries (begins_with(SK, "TYPE#STATUS")).

## 2. Naming Conventions (Strictly Enforced)

### Convention 2.1: Attribute Names Use camelCase

**Rule**: All attribute names MUST use camelCase (lowercase first letter)

**Rationale**:

- JavaScript/Node.js application
- Matches ecosystem conventions

**Examples**:

```javascript
// CORRECT:
entityId, startUtc, triggerUtc, isPinned, status

// WRONG:
EntityId, StartUtc, Trigger_Utc, Is_Pinned
```

### Convention 2.2: Entity Types Use UPPERCASE

**Rule**: The entityType attribute value MUST be UPPERCASE

**Rationale**:

- Visual distinction in console debugging
- Signals "this is a constant, not a description"

**Valid Types**:

```javascript
// Define your entity types in UPPERCASE
entityType: "USER"
entityType: "ITEM"
entityType: "ORDER"
// etc.
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
"USER#<userId>"
"ITEM#<itemId>"
"ORDER#<orderId>"

// GSI1 (Time-based queries)
"USER#<userId>#<YYYY>" // PK
"<ISO_TIMESTAMP>" // SK

// GSI2 (Hierarchy)
"PARENT#<parentId>" // PK
"CHILD#<childId>" // SK

// GSI3 (State/List)
"USER#<userId>" // PK
"TYPE#<STATUS>#<SORT_KEY>" // SK
```

### Convention 2.5: Identifiers Use Prefixed UUIDs

**Rule**: Entity IDs MUST follow pattern: <prefix>_<uuid>

**Standard Prefixes**:

```javascript
// Define prefixes for your entity types
"user_" // Users
"item_" // Items
"order_" // Orders
// etc.
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

**Rule**: Time-range entities MUST store both start and end timestamps.

### Convention 3.4: Timezone Storage & Floating Time

**Rule**: Timezone IDs MUST use IANA format. null implies Floating Time.

**Rationale**:

* Calendar events (if this application uses them) often need floating time support (i.e., no specified TZ for date/time) - "7 am" stays 7 am everywhere you travel.

**Examples**:

```javascript
// CORRECT:
startTzid: "America/New_York" // Fixed time
startTzid: null // Floating time

// WRONG:
startTzid: "EST"
```

### Convention 3.5: Recurrence End Date Uses Dedicated Attribute

**Rule**: Recurring event end dates MUST use a dedicated attribute (e.g., rruleUntil).

## 4. GSI Design Patterns

### Pattern 4.1: GSI1 (Time-Based Queries)

**Rule**: Use USER#<id>#<YYYY> as PK to query items chronologically.

* Condition: Only project items with valid dates.

### Pattern 4.2: GSI2 (Hierarchy)

**Rule**: Sparse index. Only for items involved in a parent/child relationship.

### Pattern 4.3: GSI3 (State Views)

**Rule**: Use USER#<id> as PK. Use SK overloading to support different views.

- Template: TYPE#STATUS#SORT_KEY
- Example: ITEM#ACTIVE#1 (Allows querying by status).

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
| List query (GSI)           | <10ms | GSI Query |
| Single item read           | <5ms  | GetItem    |

### Standard 7.2: Pagination

**Rule**: Queries that may return >100 items MUST implement pagination.

## 8. Cost Optimization Principles

### Principle 8.1: Use Sparse Indexes When < 50% Coverage

**Rule**: Do not project inactive or archived items into time-based indexes.

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
- [ ] Timezone logic supports null (Floating Time) if applicable

### Code Changes

- [ ] All updates use optimistic locking (version check)
- [ ] Queries use GSI (not Scan on base table)
- [ ] Items only written to GSI1 if they have valid dates

This document is the law. Follow it, and your application will remain ultra-fast.
