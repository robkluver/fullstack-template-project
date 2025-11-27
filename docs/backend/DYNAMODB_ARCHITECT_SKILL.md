# DynamoDB Architect Agent Skill

## Purpose & Scope

This document provides **specialized knowledge from "The DynamoDB Book" by Alex DeBrie** to guide a DynamoDB Architect Agent. It contains patterns, strategies, and implementation wisdom tailored for **Next.js/React + AWS serverless backend (REST API)** applications.

This document focuses on **actionable knowledge not typically found in general DynamoDB documentation**, derived from real-world production patterns and Alex DeBrie's extensive experience.

---

## Part 1: The DeBrie Data Modeling Methodology

### 1.1 The Iron Law of DynamoDB

> "You cannot design your table until you know how you'll use your data."

**The Non-Negotiable Process:**

1. **Create an Entity-Relationship Diagram (ERD)** — Understand entities and relationships
2. **Define ALL access patterns** — Be exhaustive; missing patterns cause future pain
3. **Model primary key structure** — Create entity charts with PK/SK patterns
4. **Add secondary indexes for remaining patterns** — Overload indexes; don't create one per pattern
5. **Validate, iterate, implement**

**90% of the work happens before writing code.** Rushing this phase guarantees problems.

### 1.2 The Two Approaches to Access Pattern Discovery

**API-Centric Approach (Best for REST APIs):**
- List every API endpoint your application will expose
- Document the expected request parameters and response shapes
- Map each endpoint to DynamoDB operations

**UI-Centric Approach (Best for full-stack apps):**
- Walk through every screen/page in your application
- Identify what data each screen needs
- Document the data assembly requirements

### 1.3 Access Pattern Documentation Template

```markdown
| Entity | Access Pattern | Index | Parameters | Notes |
|--------|---------------|-------|------------|-------|
| Sessions | Create Session | - | userId, sessionData | |
| Sessions | Get Session | - | sessionId | |
| Sessions | Delete Session (time-based) | - | - | Use TTL |
| Sessions | Delete Session (manual) | - | sessionId | |
```

**Always document these for each access pattern:**
- What parameters will be known at request time?
- What response shape is expected?
- Frequency (high/medium/low)?
- Latency requirements?
- Are there sorting requirements?

---

## Part 2: Primary Key Design Principles

### 2.1 The Entity Chart Pattern

**Always maintain an entity chart during design:**

```markdown
| Entity | PK | SK |
|--------|----|----|
| Customer | CUSTOMER#<Username> | CUSTOMER#<Username> |
| CustomerEmail | CUSTOMEREMAIL#<Email> | CUSTOMEREMAIL#<Email> |
| Order | CUSTOMER#<Username> | #ORDER#<OrderId> |
| OrderItem | ORDER#<OrderId>#ITEM#<ItemId> | ORDER#<OrderId>#ITEM#<ItemId> |
```

**Prefix conventions:**
- Use entity-type prefixes: `USER#`, `ORDER#`, `ORG#`
- Delimit with `#` for clarity
- Prevents accidental key collisions between entity types
- Makes debugging in the console easier

### 2.2 The Three Questions Before Modeling

Ask these for every data model:

1. **Should I use a simple or composite primary key?**
   - Simple: Only single-item operations needed
   - Composite: Any "fetch many" patterns exist → **Almost always composite**

2. **What interesting requirements do I have?**
   - Time-based access patterns?
   - Uniqueness constraints across multiple attributes?
   - Aggregation needs?
   - Large partitions?

3. **Which entity should I start modeling first?**
   - Start with "core" entities (parent entities in multiple relationships)
   - Start with the trickiest access patterns first

### 2.3 Primary Key Design Rules

**Rule 1: Consider what the client will know at read time**
```typescript
// BAD: Client won't know the CreatedAt timestamp at read time
PK: `USER#${userId}#${createdAt}`

// GOOD: Client knows username from URL
PK: `USER#${username}`
```

**Rule 2: Use prefixes to distinguish entity types**
```typescript
// Enables multiple entity types in same table without collision
{ PK: 'CUSTOMER#alexdebrie', SK: 'METADATA#alexdebrie', Type: 'Customer' }
{ PK: 'ORDER#12345', SK: 'METADATA#12345', Type: 'Order' }
```

**Rule 3: Ensure uniqueness requirements are met by primary key**
```typescript
// If username must be unique, it must be in the primary key
{ PK: 'USER#alexdebrie', SK: 'USER#alexdebrie' }
```

---

## Part 3: Relationship Strategies

### 3.1 One-to-Many Relationships

**Strategy 1: Denormalization with Complex Attribute**

*Use when:*
- No access patterns query the nested data directly
- Bounded number of related items
- Data fits within 400KB limit

```typescript
// Customer with embedded addresses (map type)
{
  PK: 'CUSTOMER#alexdebrie',
  SK: 'CUSTOMER#alexdebrie',
  Type: 'Customer',
  Username: 'alexdebrie',
  Email: 'alex@example.com',
  MailingAddresses: {
    Home: { Street: '123 Main', City: 'Seattle', State: 'WA', Zip: '98101' },
    Work: { Street: '456 Office', City: 'Seattle', State: 'WA', Zip: '98102' }
  }
}
```

**Strategy 2: Denormalization by Duplicating Data**

*Use when:*
- Need to fetch parent info with each child item
- Duplicated data is immutable or rarely changes
- Enables single-request fetching

```typescript
// Order items with duplicated product info
{
  PK: 'ORDER#12345',
  SK: 'ITEM#widget-1',
  Type: 'OrderItem',
  ProductName: 'Widget Pro',  // Duplicated from Product
  Price: 29.99,               // Duplicated, captured at order time
  Quantity: 2
}
```

**Strategy 3: Composite Primary Key + Query**

*Use when:*
- Need to fetch parent and children in single request
- Common access pattern: "Get X and all its Y"

```typescript
// Users and Orders in same item collection
{ PK: 'CUSTOMER#alexdebrie', SK: 'CUSTOMER#alexdebrie', Type: 'Customer' }
{ PK: 'CUSTOMER#alexdebrie', SK: 'ORDER#2024-01-15#001', Type: 'Order' }
{ PK: 'CUSTOMER#alexdebrie', SK: 'ORDER#2024-01-20#002', Type: 'Order' }

// Query: Get customer and all orders
const result = await docClient.query({
  TableName: 'App',
  KeyConditionExpression: 'PK = :pk',
  ExpressionAttributeValues: { ':pk': 'CUSTOMER#alexdebrie' },
  ScanIndexForward: false  // Most recent orders first
});
```

**Strategy 4: Secondary Index + Query**

*Use when:*
- Can't fit relationship in base table item collection
- Need to avoid polluting existing item collections

```typescript
// Base table: Tickets in their own item collection
{ PK: 'TICKET#abc123', SK: 'TICKET#abc123', GSI1PK: 'ORG#Acme#USER#alex', GSI1SK: 'TICKET#abc123' }

// GSI1: Query to get all tickets for a user
const result = await docClient.query({
  TableName: 'App',
  IndexName: 'GSI1',
  KeyConditionExpression: 'GSI1PK = :pk',
  ExpressionAttributeValues: { ':pk': 'ORG#Acme#USER#alex' }
});
```

**Strategy 5: Composite Sort Key for Hierarchical Data**

*Use when:*
- Multiple levels of hierarchy (>2 levels)
- Need to query at different levels

```typescript
// Starbucks locations with hierarchical sort key
{ PK: 'USA', SK: 'WA#Seattle#98101#Store1' }
{ PK: 'USA', SK: 'WA#Seattle#98102#Store2' }
{ PK: 'USA', SK: 'WA#Bellevue#98004#Store1' }

// Query all Seattle stores
const result = await docClient.query({
  TableName: 'Stores',
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  ExpressionAttributeValues: { ':pk': 'USA', ':sk': 'WA#Seattle#' }
});
```

### 3.2 Many-to-Many Relationships

**Strategy 1: Shallow Duplication**

*Use when:*
- Only need minimal info about related entities
- Number of related entities is bounded
- Duplicated info is immutable

```typescript
// Class with student names embedded
{
  PK: 'CLASS#Math101',
  SK: 'CLASS#Math101',
  Type: 'Class',
  ClassName: 'Mathematics 101',
  Students: ['Alex DeBrie', 'Jane Smith', 'Bob Jones']  // Just names, not full student data
}
```

**Strategy 2: Adjacency List**

*Use when:*
- Need to query both directions of the relationship
- Information about the relationship is immutable or rarely changes

```typescript
// Movies and Actors with Role items
{ PK: 'MOVIE#Forrest Gump', SK: 'MOVIE#Forrest Gump', Type: 'Movie' }
{ PK: 'ACTOR#Tom Hanks', SK: 'ACTOR#Tom Hanks', Type: 'Actor' }
{ PK: 'MOVIE#Forrest Gump', SK: 'ACTOR#Tom Hanks', Type: 'Role', RoleName: 'Forrest' }

// GSI for reverse lookup
// GSI1PK: ACTOR#Tom Hanks, GSI1SK: MOVIE#Forrest Gump
```

**Strategy 3: Materialized Graph**

*Use when:*
- Highly-interconnected data
- Variety of relationship types
- Knowledge graph scenarios

```typescript
// Nodes with edges as items
{ PK: 'NODE#156', SK: 'INFO#PERSON', Name: 'Alex DeBrie' }
{ PK: 'NODE#156', SK: 'EDGE#MARRIED#2011-05-28', TargetNode: 'NODE#157' }
{ PK: 'NODE#156', SK: 'EDGE#JOB#Engineer', Company: 'Tech Corp' }

// GSI groups by edge type
// GSI1PK: EDGE#MARRIED#2011-05-28, GSI1SK: NODE#156
```

**Strategy 4: Normalization + Multiple Requests**

*Use when:*
- Highly mutable data in the relationship
- Fresh data is critical
- Accept the latency cost

```typescript
// Social media follows - data changes frequently
// Step 1: Get who user follows
const following = await docClient.query({
  TableName: 'Social',
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  ExpressionAttributeValues: { ':pk': 'USER#alex', ':sk': 'FOLLOWS#' }
});

// Step 2: Batch get the actual user details
const userIds = following.Items.map(item => item.FollowedUserId);
const userDetails = await docClient.batchGet({
  RequestItems: { 'Social': { Keys: userIds.map(id => ({ PK: `USER#${id}`, SK: `USER#${id}` })) }}
});
```

### 3.3 Strategy Selection Matrix

| Relationship | Data Characteristics | Best Strategy |
|--------------|---------------------|---------------|
| One-to-Many | Bounded, rarely changes | Complex attribute |
| One-to-Many | Unbounded, need with parent | Composite PK + Query |
| One-to-Many | Unbounded, independent access | Secondary index |
| Many-to-Many | Minimal info needed | Shallow duplication |
| Many-to-Many | Immutable relationship data | Adjacency list |
| Many-to-Many | Highly mutable | Normalization + multiple requests |

---

## Part 4: Filtering Strategies

### 4.1 Filter with Partition Key (Primary)

**Always start here.** The partition key provides O(1) lookup to the correct partition.

```typescript
// Filter by actor (partition key)
const result = await docClient.query({
  TableName: 'Movies',
  KeyConditionExpression: 'PK = :pk',
  ExpressionAttributeValues: { ':pk': 'ACTOR#Tom Hanks' }
});
```

### 4.2 Filter with Sort Key

**For time ranges, prefixes, and subset selection:**

```typescript
// Orders in date range
const result = await docClient.query({
  TableName: 'App',
  KeyConditionExpression: 'PK = :pk AND SK BETWEEN :start AND :end',
  ExpressionAttributeValues: {
    ':pk': 'CUSTOMER#alexdebrie',
    ':start': 'ORDER#2024-01-01',
    ':end': 'ORDER#2024-01-31'
  }
});
```

**Filtering different entity types in same partition:**

```typescript
// Get only Issues (not Stars) from a repo
const result = await docClient.query({
  TableName: 'GitHub',
  KeyConditionExpression: 'PK = :pk AND SK <= :sk',
  ExpressionAttributeValues: {
    ':pk': 'REPO#alexdebrie/dynamodb-book',
    ':sk': 'REPO#alexdebrie/dynamodb-book'  // Issues sort before REPO, Stars sort after
  },
  ScanIndexForward: true
});
```

### 4.3 Composite Sort Key

*Use when filtering on multiple attributes:*

```typescript
// Orders with status AND date filtering
// SK pattern: <Status>#<OrderDate>
{ PK: 'CUSTOMER#alex', SK: 'CANCELLED#2024-01-15', Type: 'Order' }
{ PK: 'CUSTOMER#alex', SK: 'DELIVERED#2024-01-20', Type: 'Order' }
{ PK: 'CUSTOMER#alex', SK: 'SHIPPED#2024-01-25', Type: 'Order' }

// Get all cancelled orders in date range
const result = await docClient.query({
  TableName: 'App',
  KeyConditionExpression: 'PK = :pk AND SK BETWEEN :start AND :end',
  ExpressionAttributeValues: {
    ':pk': 'CUSTOMER#alex',
    ':start': 'CANCELLED#2024-01-01',
    ':end': 'CANCELLED#2024-12-31'
  }
});
```

**Important:** Composite sort key filtering only works on the first element. `<OrderDate>#<Status>` won't let you filter by status efficiently.

### 4.4 Sparse Indexes

**Type 1: Filter within entity type based on condition**

```typescript
// Only Admins have GSI1 attributes
{ PK: 'ORG#Acme', SK: 'USER#alex', Role: 'Admin', GSI1PK: 'ORG#Acme', GSI1SK: 'Admin' }
{ PK: 'ORG#Acme', SK: 'USER#bob', Role: 'Member' }  // No GSI1 attributes

// Query GSI1 to get only Admins
const admins = await docClient.query({
  TableName: 'App',
  IndexName: 'GSI1',
  KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
  ExpressionAttributeValues: { ':pk': 'ORG#Acme', ':sk': 'Admin' }
});
```

**Type 2: Project single entity type into index**

```typescript
// Only Customer items have CustomerIndex attribute
{ PK: 'CUSTOMER#alex', SK: 'CUSTOMER#alex', CustomerIndex: 'CUSTOMER#alex' }
{ PK: 'ORDER#123', SK: 'ORDER#123' }  // No CustomerIndex

// Scan CustomerIndex (much smaller than full table)
const allCustomers = await docClient.scan({
  TableName: 'App',
  IndexName: 'CustomerIndex'
});
```

### 4.5 Filter Expressions (Use Sparingly)

**Filter expressions are applied AFTER items are read.** You still pay for filtered-out items.

*Good use case: Remove small number of extraneous items:*

```typescript
// Get orders, filter out cancelled (small percentage)
const result = await docClient.query({
  TableName: 'App',
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  FilterExpression: '#status <> :cancelled',
  ExpressionAttributeNames: { '#status': 'Status' },
  ExpressionAttributeValues: {
    ':pk': 'CUSTOMER#alex',
    ':sk': 'ORDER#',
    ':cancelled': 'CANCELLED'
  }
});
```

### 4.6 Client-Side Filtering

*Use when:*
- Data set is small (<1MB)
- Need flexible, ad-hoc filtering
- Filtering options are numerous

```typescript
// Fetch all items, filter in application
const result = await docClient.query({
  TableName: 'App',
  KeyConditionExpression: 'PK = :pk',
  ExpressionAttributeValues: { ':pk': 'USER#alex#SETTINGS' }
});

// Client-side filtering
const activeSettings = result.Items.filter(item => item.IsActive);
const recentSettings = activeSettings.filter(item => 
  new Date(item.UpdatedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
);
```

---

## Part 5: Sorting Strategies

### 5.1 Timestamp Formats

**Use ISO-8601 format (sortable, human-readable):**

```typescript
// GOOD: ISO-8601 - sortable and readable
SK: 'ORDER#2024-01-15T14:30:00.000Z'

// ACCEPTABLE: Epoch timestamp - sortable but not readable
SK: 'ORDER#1705329000'

// BAD: Display format - NOT sortable
SK: 'ORDER#January 15, 2024'  // NEVER DO THIS
```

### 5.2 KSUIDs for Unique, Sortable IDs

**KSUID = K-Sortable Unique Identifier**
- 27-character string
- Timestamp prefix for chronological sorting
- Random suffix for uniqueness
- Better than UUIDv4 for DynamoDB

```typescript
import KSUID from 'ksuid';

// Generate KSUID
const ksuid = KSUID.randomSync();
console.log(ksuid.string); // '1YnlHOfSSk3DhX4BR6lMAceAo1V'

// Use in primary key
{
  PK: 'DEAL#1YnlHOfSSk3DhX4BR6lMAceAo1V',
  SK: 'DEAL#1YnlHOfSSk3DhX4BR6lMAceAo1V',
  DealId: '1YnlHOfSSk3DhX4BR6lMAceAo1V',
  CreatedAt: '2024-01-15T14:30:00.000Z'
}
```

### 5.3 Sorting on Mutable Attributes

**Problem:** You can't update primary key attributes. If you sort by `UpdatedAt` in SK, every update requires delete + create.

**Solution:** Use secondary index for sorting on mutable attributes:

```typescript
// Base table: Immutable primary key
{ PK: 'ORG#Acme', SK: 'TICKET#abc123', UpdatedAt: '2024-01-15', TicketId: 'abc123' }

// GSI: Sort by UpdatedAt (GSI handles the delete+create automatically)
// GSI1PK: ORG#Acme, GSI1SK: 2024-01-15

// Query most recently updated tickets
const result = await docClient.query({
  TableName: 'App',
  IndexName: 'GSI1',
  KeyConditionExpression: 'GSI1PK = :pk',
  ExpressionAttributeValues: { ':pk': 'ORG#Acme' },
  ScanIndexForward: false  // Most recent first
});
```

### 5.4 Zero-Padding for Numeric Sorting

**Problem:** String sorting: "10" < "2" (lexicographic)

**Solution:** Zero-pad numbers:

```typescript
// BAD: String sorting breaks
'ISSUE#1', 'ISSUE#10', 'ISSUE#2'  // Sorts: 1, 10, 2

// GOOD: Zero-padded
'ISSUE#00001', 'ISSUE#00002', 'ISSUE#00010'  // Sorts: 1, 2, 10
```

### 5.5 Ascending vs Descending Item Collection Design

**Design your sort key based on how you'll read:**

```typescript
// If you want most recent first, put parent at END of collection
{ PK: 'USER#alex', SK: 'ORDER#2024-01-01#001' }
{ PK: 'USER#alex', SK: 'ORDER#2024-01-15#002' }
{ PK: 'USER#alex', SK: 'USER#alex' }  // Parent at end

// Query with ScanIndexForward=false: User item first, then recent orders
```

### 5.6 Zero-Padded Difference (Advanced)

*Use when:* Two different relationships need same sort order in one item collection.

```typescript
// Calculate zero-padded difference: MAX_VALUE - actual_value
const maxIssueNumber = 99999;
const issueNumber = 157;
const zeroPaddedDiff = String(maxIssueNumber - issueNumber).padStart(5, '0'); // '99842'

// Now items sort in reverse order by issue number
{ PK: 'REPO#myrepo', SK: 'ISSUE#OPEN#99842' }   // Issue 157
{ PK: 'REPO#myrepo', SK: 'ISSUE#OPEN#99841' }   // Issue 158
{ PK: 'REPO#myrepo', SK: '#REPO#myrepo' }       // Repo item
```

---

## Part 6: Hot Partition Prevention

### 6.1 Identifying Hot Partition Risk

**Warning signs:**
- Single partition key receives majority of traffic
- Time-series data with "current" bucket getting all writes
- Global counters or aggregations
- "Latest items" patterns with single partition

### 6.2 Write Sharding (Time-Based)

**Problem:** All deals go into single partition, causing hot partition.

**Solution:** Truncate timestamp to create time-based buckets:

```typescript
// Truncate to day bucket
const truncatedTimestamp = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';

{
  PK: 'DEAL#abc123',
  SK: 'DEAL#abc123',
  GSI1PK: `DEALS#${truncatedTimestamp}`,  // 'DEALS#2024-01-15T00:00:00.000Z'
  GSI1SK: `DEAL#${ksuid}`
}
```

**Querying across buckets:**

```typescript
async function getRecentDeals(count = 25) {
  const deals = [];
  let currentDate = new Date();
  let attempts = 0;
  
  while (deals.length < count && attempts < 5) {
    const bucket = currentDate.toISOString().split('T')[0] + 'T00:00:00.000Z';
    const result = await docClient.query({
      TableName: 'Deals',
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': `DEALS#${bucket}` },
      ScanIndexForward: false,
      Limit: count - deals.length
    });
    deals.push(...result.Items);
    currentDate.setDate(currentDate.getDate() - 1);
    attempts++;
  }
  
  return deals.slice(0, count);
}
```

### 6.3 Write Sharding (Hash-Based)

**For high-write-volume aggregations:**

```typescript
// Calculate shard ID
const shardCount = 15;
const shardId = hashCode(username) % shardCount;

{
  PK: 'CUSTOMER#alex',
  SK: 'CUSTOMER#alex',
  GSI1PK: `CUSTOMER#${shardId}`,  // 'CUSTOMER#7'
  GSI1SK: totalSpent.toString().padStart(10, '0')
}

// Query requires scatter-gather across all shards
async function getTopCustomers(limit = 10) {
  const results = await Promise.all(
    Array.from({ length: 15 }, (_, i) => 
      docClient.query({
        TableName: 'App',
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': `CUSTOMER#${i}` },
        ScanIndexForward: false,
        Limit: limit
      })
    )
  );
  
  // Merge and sort all results
  return results
    .flatMap(r => r.Items)
    .sort((a, b) => b.TotalSpent - a.TotalSpent)
    .slice(0, limit);
}
```

### 6.4 Caching Hot Data

**For read-heavy hot partitions, cache in DynamoDB:**

```typescript
// After adding new deal, update cache items
async function updateDealsCache(newDeal) {
  // Get last 2 days of deals
  const recentDeals = await getRecentDeals(50);
  
  // Write to N cache items (spread read load)
  const cacheCount = 5;
  await Promise.all(
    Array.from({ length: cacheCount }, (_, i) => 
      docClient.put({
        TableName: 'App',
        Item: {
          PK: `DEALSCACHE#${i}`,
          SK: `DEALSCACHE#${i}`,
          Deals: recentDeals,
          UpdatedAt: new Date().toISOString()
        }
      })
    )
  );
}

// Read from random cache item
async function getCachedDeals() {
  const cacheId = Math.floor(Math.random() * 5);
  const result = await docClient.get({
    TableName: 'App',
    Key: { PK: `DEALSCACHE#${cacheId}`, SK: `DEALSCACHE#${cacheId}` }
  });
  return result.Item?.Deals ?? [];
}
```

---

## Part 7: Transactions & Uniqueness

### 7.1 Ensuring Uniqueness on Multiple Attributes

**Problem:** Both username AND email must be unique.

**Solution:** Create tracking item for each unique attribute in a transaction:

```typescript
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';

async function createUser(user: { username: string; email: string; name: string }) {
  await docClient.send(new TransactWriteCommand({
    TransactItems: [
      {
        Put: {
          TableName: 'App',
          Item: {
            PK: `USER#${user.username}`,
            SK: `USER#${user.username}`,
            Type: 'User',
            Username: user.username,
            Email: user.email,
            Name: user.name
          },
          ConditionExpression: 'attribute_not_exists(PK)'
        }
      },
      {
        Put: {
          TableName: 'App',
          Item: {
            PK: `USEREMAIL#${user.email}`,
            SK: `USEREMAIL#${user.email}`,
            Type: 'UserEmail',
            Username: user.username
          },
          ConditionExpression: 'attribute_not_exists(PK)'
        }
      }
    ]
  }));
}
```

### 7.2 Reference Counts with Transactions

**Maintain counts atomically:**

```typescript
async function starRepo(username: string, repoOwner: string, repoName: string) {
  await docClient.send(new TransactWriteCommand({
    TransactItems: [
      {
        Put: {
          TableName: 'GitHub',
          Item: {
            PK: `REPO#${repoOwner}/${repoName}`,
            SK: `STAR#${username}`,
            Type: 'Star',
            StarredAt: new Date().toISOString()
          },
          ConditionExpression: 'attribute_not_exists(PK)'  // Prevent double-star
        }
      },
      {
        Update: {
          TableName: 'GitHub',
          Key: {
            PK: `REPO#${repoOwner}/${repoName}`,
            SK: `REPO#${repoOwner}/${repoName}`
          },
          UpdateExpression: 'SET StarCount = StarCount + :inc',
          ConditionExpression: 'attribute_exists(PK)',
          ExpressionAttributeValues: { ':inc': 1 }
        }
      }
    ]
  }));
}
```

### 7.3 Sequential IDs

**Pattern for Jira-style issue numbers:**

```typescript
async function createIssue(projectId: string, issueData: any) {
  // Step 1: Increment counter and get new value
  const counterResult = await docClient.update({
    TableName: 'App',
    Key: { PK: `PROJECT#${projectId}`, SK: 'ISSUECOUNTER' },
    UpdateExpression: 'SET #count = if_not_exists(#count, :zero) + :inc',
    ExpressionAttributeNames: { '#count': 'CurrentIssueNumber' },
    ExpressionAttributeValues: { ':zero': 0, ':inc': 1 },
    ReturnValues: 'UPDATED_NEW'
  });
  
  const issueNumber = counterResult.Attributes.CurrentIssueNumber;
  
  // Step 2: Create issue with that number
  await docClient.put({
    TableName: 'App',
    Item: {
      PK: `PROJECT#${projectId}`,
      SK: `ISSUE#${String(issueNumber).padStart(5, '0')}`,
      Type: 'Issue',
      IssueNumber: issueNumber,
      ...issueData
    }
  });
  
  return issueNumber;
}
```

---

## Part 8: Pagination

### 8.1 Cursor-Based Pagination

**Build pagination hints into URL structure:**

```typescript
// API: GET /users/alexdebrie/orders?before=1YRfXS14inXwIJEf9tO5hWnL2pi

async function getOrders(username: string, beforeOrderId?: string, limit = 20) {
  const params: QueryCommandInput = {
    TableName: 'App',
    KeyConditionExpression: beforeOrderId 
      ? 'PK = :pk AND SK < :sk'
      : 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: beforeOrderId
      ? { ':pk': `CUSTOMER#${username}`, ':sk': `ORDER#${beforeOrderId}` }
      : { ':pk': `CUSTOMER#${username}`, ':prefix': 'ORDER#' },
    ScanIndexForward: false,
    Limit: limit
  };
  
  const result = await docClient.query(params);
  
  return {
    orders: result.Items,
    nextCursor: result.Items.length === limit 
      ? result.Items[result.Items.length - 1].OrderId 
      : null
  };
}
```

### 8.2 Handling ExclusiveStartKey

**For internal pagination (not URL-based):**

```typescript
async function getAllOrders(username: string) {
  const orders = [];
  let lastEvaluatedKey: Record<string, any> | undefined;
  
  do {
    const result = await docClient.query({
      TableName: 'App',
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: { ':pk': `CUSTOMER#${username}`, ':prefix': 'ORDER#' },
      ExclusiveStartKey: lastEvaluatedKey
    });
    
    orders.push(...result.Items);
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  
  return orders;
}
```

---

## Part 9: Implementation Best Practices

### 9.1 Separate Indexing Attributes from Application Attributes

```typescript
// DynamoDB item has both indexing and application attributes
const dynamoItem = {
  PK: 'USER#alexdebrie',           // Indexing
  SK: 'USER#alexdebrie',           // Indexing
  GSI1PK: 'ORG#Acme',              // Indexing
  GSI1SK: 'USER#alexdebrie',       // Indexing
  Username: 'alexdebrie',          // Application
  FirstName: 'Alex',               // Application
  LastName: 'DeBrie',              // Application
  Email: 'alex@example.com'        // Application
};

// Transform to/from application object
interface User {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  organizationName: string;
}

function toUser(item: any): User {
  return {
    username: item.Username,
    firstName: item.FirstName,
    lastName: item.LastName,
    email: item.Email,
    organizationName: item.GSI1PK.split('#')[1]
  };
}
```

### 9.2 Data Access Layer at Application Boundary

**Keep DynamoDB logic isolated:**

```typescript
// data/repositories/userRepository.ts
export class UserRepository {
  constructor(private docClient: DynamoDBDocumentClient, private tableName: string) {}
  
  async getUser(username: string): Promise<User | null> {
    const result = await this.docClient.get({
      TableName: this.tableName,
      Key: { PK: `USER#${username}`, SK: `USER#${username}` }
    });
    return result.Item ? toUser(result.Item) : null;
  }
  
  async createUser(user: User): Promise<void> {
    await this.docClient.put({
      TableName: this.tableName,
      Item: toDynamoItem(user),
      ConditionExpression: 'attribute_not_exists(PK)'
    });
  }
}

// API handler - no DynamoDB knowledge
export async function GET(request: Request, { params }: { params: { username: string } }) {
  const user = await userRepository.getUser(params.username);
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(user);
}
```

### 9.3 Add Type Attribute to Every Item

```typescript
{
  PK: 'USER#alexdebrie',
  SK: 'USER#alexdebrie',
  Type: 'User',  // Always include this
  // ... other attributes
}
```

**Benefits:**
- Easy filtering in DynamoDB Streams
- Simpler analytics exports
- Debugging in console
- Clear entity identification

### 9.4 Debug Scripts for Access Patterns

**Create helper scripts:**

```typescript
// scripts/debug-user.ts
import { docClient, tableName } from '../lib/dynamodb';

async function debugUser(username: string) {
  // Get all items for user's partition
  const result = await docClient.query({
    TableName: tableName,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': `CUSTOMER#${username}` }
  });
  
  console.log(`Found ${result.Items.length} items for user ${username}:`);
  result.Items.forEach(item => {
    console.log(`  Type: ${item.Type}, SK: ${item.SK}`);
  });
}

debugUser(process.argv[2]);
```

### 9.5 Attribute Name Shortening (Large Tables)

**For cost savings on very large tables:**

```typescript
// Development: Readable names
{ PK: '...', Username: 'alexdebrie', FirstName: 'Alex', LastName: 'DeBrie' }

// Production: Shortened names (saves storage costs)
{ PK: '...', u: 'alexdebrie', fn: 'Alex', ln: 'DeBrie' }

// Data layer handles translation
function toUser(item: any): User {
  return {
    username: item.u || item.Username,
    firstName: item.fn || item.FirstName,
    lastName: item.ln || item.LastName
  };
}
```

---

## Part 10: Migration Strategies

### 10.1 Adding New Attributes (Lazy Migration)

**No ETL needed - add defaults in application:**

```typescript
function toUser(item: any): User {
  return {
    username: item.Username,
    firstName: item.FirstName,
    lastName: item.LastName,
    // Handle new attribute with default
    birthdate: item.Birthdate ?? null,
    createdAt: item.CreatedAt ?? '2020-01-01T00:00:00.000Z'  // Default for old items
  };
}
```

### 10.2 Adding New Entity Type (No Relations)

**Simply write new items:**

```typescript
// New entity type - just start writing
{
  PK: 'PROJECT#myproject',
  SK: 'PROJECT#myproject',
  Type: 'Project',
  Name: 'My Project',
  CreatedAt: '2024-01-15T00:00:00.000Z'
}
```

### 10.3 Adding New Entity to Existing Item Collection

**Model to fit existing collection:**

```typescript
// Existing: Users in ACCOUNT# partition
{ PK: 'ACCOUNT#alex', SK: 'ACCOUNT#alex', Type: 'User' }

// New: Gists in same partition using KSUID
{ PK: 'ACCOUNT#alex', SK: 'GIST#1YnlHOfSSk3DhX4BR6lMAceAo1V', Type: 'Gist' }
```

### 10.4 ETL Migration for New Index Attributes

**When you need to add GSI attributes to existing items:**

```typescript
async function migrateUsersForNewIndex() {
  let lastEvaluatedKey: Record<string, any> | undefined;
  let processed = 0;
  
  do {
    // Scan for User items
    const result = await docClient.scan({
      TableName: 'App',
      FilterExpression: '#type = :type',
      ExpressionAttributeNames: { '#type': 'Type' },
      ExpressionAttributeValues: { ':type': 'User' },
      ExclusiveStartKey: lastEvaluatedKey
    });
    
    // Update each item with new GSI attributes
    for (const item of result.Items) {
      await docClient.update({
        TableName: 'App',
        Key: { PK: item.PK, SK: item.SK },
        UpdateExpression: 'SET GSI1PK = :gsi1pk, GSI1SK = :gsi1sk',
        ExpressionAttributeValues: {
          ':gsi1pk': `ORG#${item.OrganizationName}`,
          ':gsi1sk': `USER#${item.Username}`
        }
      });
      processed++;
      if (processed % 100 === 0) console.log(`Processed ${processed} items`);
    }
    
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  
  console.log(`Migration complete. Total items: ${processed}`);
}
```

### 10.5 Parallel Scans for Large Migrations

```typescript
async function parallelMigration(totalSegments = 10) {
  await Promise.all(
    Array.from({ length: totalSegments }, (_, segment) => 
      migrateSegment(segment, totalSegments)
    )
  );
}

async function migrateSegment(segment: number, totalSegments: number) {
  let lastEvaluatedKey: Record<string, any> | undefined;
  
  do {
    const result = await docClient.scan({
      TableName: 'App',
      FilterExpression: '#type = :type',
      ExpressionAttributeNames: { '#type': 'Type' },
      ExpressionAttributeValues: { ':type': 'User' },
      Segment: segment,
      TotalSegments: totalSegments,
      ExclusiveStartKey: lastEvaluatedKey
    });
    
    // Process items...
    
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);
}
```

---

## Part 11: Singleton Items

### 11.1 Purpose

**Singleton items track global state or aggregate views:**

```typescript
// Container for all brands
{
  PK: 'BRANDS',
  SK: 'BRANDS',
  Type: 'BrandsContainer',
  BrandNames: ['Apple', 'Samsung', 'Google', 'Microsoft']  // List attribute
}

// Feature flags
{
  PK: 'CONFIG',
  SK: 'FEATUREFLAGS',
  Type: 'FeatureFlags',
  EnableNewCheckout: true,
  EnableDarkMode: false,
  MaintenanceMode: false
}
```

### 11.2 Usage

```typescript
// Get all brands in one request
async function getAllBrands(): Promise<string[]> {
  const result = await docClient.get({
    TableName: 'App',
    Key: { PK: 'BRANDS', SK: 'BRANDS' }
  });
  return result.Item?.BrandNames ?? [];
}

// Add new brand
async function addBrand(brandName: string) {
  await docClient.update({
    TableName: 'App',
    Key: { PK: 'BRANDS', SK: 'BRANDS' },
    UpdateExpression: 'SET BrandNames = list_append(if_not_exists(BrandNames, :empty), :brand)',
    ExpressionAttributeValues: {
      ':empty': [],
      ':brand': [brandName]
    }
  });
}
```

---

## Part 12: DynamoDB Streams Patterns

### 12.1 Async Aggregations

**Keep hot path fast, aggregate async:**

```typescript
// Lambda triggered by DynamoDB Stream
export async function handler(event: DynamoDBStreamEvent) {
  for (const record of event.Records) {
    if (record.eventName === 'INSERT') {
      const newItem = unmarshall(record.dynamodb.NewImage);
      
      if (newItem.Type === 'Order') {
        // Update customer aggregations
        await docClient.update({
          TableName: 'App',
          Key: { PK: `CUSTOMER#${newItem.CustomerId}`, SK: `CUSTOMER#${newItem.CustomerId}` },
          UpdateExpression: 'SET TotalOrders = TotalOrders + :one, TotalSpent = TotalSpent + :amount',
          ExpressionAttributeValues: { ':one': 1, ':amount': newItem.TotalAmount }
        });
      }
    }
  }
}
```

### 12.2 Event Broadcasting

```typescript
// Send notifications when deals are added
export async function handler(event: DynamoDBStreamEvent) {
  for (const record of event.Records) {
    if (record.eventName === 'INSERT') {
      const newItem = unmarshall(record.dynamodb.NewImage);
      
      if (newItem.Type === 'Deal') {
        // Notify brand watchers
        await notifyBrandWatchers(newItem.Brand, newItem);
        
        // Notify category watchers
        await notifyCategoryWatchers(newItem.Category, newItem);
      }
    }
  }
}
```

---

## Part 13: TTL for Automatic Expiration

### 13.1 Session Store Pattern

```typescript
{
  PK: 'SESSION#abc123',
  SK: 'SESSION#abc123',
  Type: 'Session',
  UserId: 'user123',
  CreatedAt: '2024-01-15T14:30:00.000Z',
  ExpiresAt: 1705420200  // Unix timestamp - TTL attribute
}

// IMPORTANT: Always validate TTL in application code
async function getSession(sessionId: string): Promise<Session | null> {
  const result = await docClient.get({
    TableName: 'App',
    Key: { PK: `SESSION#${sessionId}`, SK: `SESSION#${sessionId}` }
  });
  
  if (!result.Item) return null;
  
  // Items may exist briefly after TTL expires (up to 48 hours)
  if (result.Item.ExpiresAt < Math.floor(Date.now() / 1000)) {
    return null;
  }
  
  return toSession(result.Item);
}
```

---

## Part 14: Don't Use ORMs/ODMs

### 14.1 Why Not

1. **ODMs push wrong data model** - They encourage one-table-per-entity
2. **Hides DynamoDB's power** - Key overloading, item collections lost
3. **Performance issues** - Generic queries instead of purpose-built
4. **Learning impediment** - Never truly understand DynamoDB

### 14.2 What to Use Instead

**Purpose-built data access layer:**

```typescript
// Instead of ORM, use repository pattern with raw SDK
class OrderRepository {
  async getOrderWithItems(orderId: string): Promise<OrderWithItems | null> {
    const result = await this.docClient.query({
      TableName: this.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': `ORDER#${orderId}` }
    });
    
    if (!result.Items?.length) return null;
    
    const order = result.Items.find(i => i.Type === 'Order');
    const items = result.Items.filter(i => i.Type === 'OrderItem');
    
    return {
      ...toOrder(order),
      items: items.map(toOrderItem)
    };
  }
}
```

---

## Part 15: When NOT to Use Single-Table Design

### 15.1 Early-Stage Applications with High Flexibility Needs

- Access patterns unknown/rapidly changing
- Developer velocity more important than performance
- Data model still evolving
- Team unfamiliar with DynamoDB

**Alternative:** Multi-table design (Faux-SQL approach)

### 15.2 GraphQL Applications

- GraphQL resolver pattern expects separate types
- Each resolver makes independent data fetches
- Single-table benefits (reduced requests) not realized

---

## Part 16: Key Limits to Remember

| Limit | Value | Impact |
|-------|-------|--------|
| Item size | 400KB | Break up large items |
| Query/Scan result | 1MB | Implement pagination |
| Partition throughput | 3000 RCU / 1000 WCU | Write sharding needed |
| Item collection (with LSI) | 10GB | Use GSI instead |
| GSIs per table | 20 | Overload indexes |
| Transactions | 25 items | Split large transactions |

---

## Quick Reference: Strategy Selection

### Relationship Strategy Cheatsheet

```
Need to fetch parent + children in one request?
  → Composite PK + Query OR Secondary Index + Query

Children bounded and rarely change?
  → Denormalization with complex attribute

Many-to-many with minimal related data needed?
  → Shallow duplication

Many-to-many with immutable relationship data?
  → Adjacency list

Many-to-many with mutable relationship data?
  → Normalization + multiple requests
```

### Filtering Strategy Cheatsheet

```
First filter by...
  → Partition key (always)

Then filter by...
  → Sort key conditions (BETWEEN, begins_with)

Multiple filter attributes?
  → Composite sort key

Need to exclude subset of items?
  → Sparse index

Flexible ad-hoc filtering?
  → Client-side filtering (small data sets only)
```

### Sorting Strategy Cheatsheet

```
Need unique + sortable IDs?
  → KSUID

Sorting on mutable attribute?
  → Use secondary index

Need reverse chronological?
  → ScanIndexForward=false

Numeric sorting in strings?
  → Zero-pad numbers
```

---

**End of DynamoDB Architect Agent Skill**

*This document captures the methodology, patterns, and wisdom from "The DynamoDB Book" by Alex DeBrie, adapted for Next.js/React + AWS serverless applications. Use this as your authoritative guide for DynamoDB architecture decisions.*
