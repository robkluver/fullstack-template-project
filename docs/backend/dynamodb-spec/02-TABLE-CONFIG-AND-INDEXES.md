# ProductivityData DynamoDB - Table Configuration & Indexes
**Phase**: Foundation (Required before all other phases)  
**Document**: 02-TABLE-CONFIG-AND-INDEXES.md

---

## 1. Table Configuration

### Primary Table Definition

```javascript
{
  "TableName": "ProductivityData",
  "BillingMode": "PAY_PER_REQUEST",  // On-demand pricing
  
  "KeySchema": [
    { "AttributeName": "PK", "KeyType": "HASH" },
    { "AttributeName": "SK", "KeyType": "RANGE" }
  ],
  
  "AttributeDefinitions": [
    { "AttributeName": "PK", "AttributeType": "S" },
    { "AttributeName": "SK", "AttributeType": "S" },
    { "AttributeName": "GSI1PK", "AttributeType": "S" },
    { "AttributeName": "GSI1SK", "AttributeType": "S" },
    { "AttributeName": "GSI2PK", "AttributeType": "S" },
    { "AttributeName": "GSI2SK", "AttributeType": "S" },
    { "AttributeName": "GSI3PK", "AttributeType": "S" },
    { "AttributeName": "GSI3SK", "AttributeType": "S" },
    { "AttributeName": "GSI4PK", "AttributeType": "S" },
    { "AttributeName": "GSI4SK", "AttributeType": "S" }
  ],
  
  "StreamSpecification": {
    "StreamEnabled": true,
    "StreamViewType": "NEW_AND_OLD_IMAGES"
  },
  
  "TimeToLiveSpecification": {
    "Enabled": true,
    "AttributeName": "ttl"
  },
  
  "Tags": [
    { "Key": "Application", "Value": "Nexus" },
    { "Key": "Environment", "Value": "Production" }
  ]
}
```

### Billing Mode: PAY_PER_REQUEST (On-Demand)

**Why on-demand pricing**:
- Variable user activity (spiky usage patterns)
- No capacity planning overhead
- Auto-scales to any load
- Switch to provisioned after 3 months if traffic becomes predictable (saves ~40%)

**Cost Model**:
- Reads: $0.25 per million read units
- Writes: $1.25 per million write units
- Streams: $0.10 per million stream records
- Storage: $0.25 per GB/month

### Streams: Enabled with NEW_AND_OLD_IMAGES

**Why streams**:
- Real-time sync to mobile devices (WebSocket)
- Push notifications for reminders
- Webhook delivery
- Analytics pipeline (e.g., "tasks completed this week")
- Search index updates (OpenSearch/Elasticsearch)
- Auto-archive completed tasks after 24 hours (Lambda consumer)

**Stream Consumption**:
- Lambda functions process all writes
- Typical latency: <500ms end-to-end
- Cost-efficient: only pay for records processed

### TTL: Enabled on `ttl` Attribute

**Why TTL**:
- Auto-delete archived items after retention period
- Auto-delete old cancelled events (optional: keep 2 years)
- Compliance (e.g., GDPR right to erasure after N years)
- Cost optimization (prevent unbounded growth)

**Configuration**:
- Attribute Name: `ttl`
- Type: Number (Unix epoch seconds)
- Format: `Math.floor(Date.now() / 1000) + (seconds_to_live)`

**Example TTL Values**:
```javascript
// Archive task after 7 days
ttl = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)

// Delete completed reminder after 24 hours
ttl = Math.floor(Date.now() / 1000) + (24 * 60 * 60)

// Delete old cancelled events after 2 years
ttl = Math.floor(Date.now() / 1000) + (2 * 365 * 24 * 60 * 60)
```

---

## 2. Global Secondary Indexes

### GSI1: YearView (Primary Query Index)

```javascript
{
  "IndexName": "GSI1-YearView",
  "KeySchema": [
    { "AttributeName": "GSI1PK", "KeyType": "HASH" },
    { "AttributeName": "GSI1SK", "KeyType": "RANGE" }
  ],
  "Projection": {
    "ProjectionType": "ALL"
  },
  "BillingMode": "PAY_PER_REQUEST"
}
```

**Purpose**: Powers all calendar/agenda views (day, week, month, year) and unified timeline across all entity types

**Key Patterns**:
- `GSI1PK`: `USER#<userId>#<YYYY>` (e.g., `USER#user_123#2025`)
- `GSI1SK`: ISO 8601 timestamp (e.g., `2025-12-15T14:00:00Z`)

**GSI1SK Usage by Entity Type**:
| Entity Type | GSI1SK Value | Purpose |
|-------------|--------------|---------|
| EVENT | `startUtc` | Sort events by start time |
| MASTER | `startUtc` (first occurrence) | Sort recurring series by start |
| INSTANCE | `startUtc` (modified time) | Sort exceptions by actual time |
| TASK | `dueUtc` or `startUtc` (whichever is earlier) | Show in agenda by relevant date |
| REMINDER | `triggerUtc` | Sort reminders by trigger time |
| NOTE | `createdAt` | Sort notes chronologically |

**Design Notes**:
- **No `T#` prefix**: ISO 8601 timestamps are naturally lexicographically sortable. Prefix adds 2 bytes with zero value.
- **ALL projection**: Avoids premature optimization, eliminates need for second GetItem, GSI storage typically <10% of total cost
- **Populated by**: All entities except USER_META

**Typical Query Pattern**:
```javascript
// Get all agenda items for a user in 2025
query({
  IndexName: "GSI1-YearView",
  KeyConditionExpression: "GSI1PK = :pk AND GSI1SK BETWEEN :start AND :end",
  ExpressionAttributeValues: {
    ":pk": "USER#user_123#2025",
    ":start": "2025-12-15T00:00:00Z",
    ":end": "2025-12-21T23:59:59Z"
  }
})
```

---

### GSI2: RecurrenceLookup (Sparse Index)

```javascript
{
  "IndexName": "GSI2-RecurrenceLookup",
  "KeySchema": [
    { "AttributeName": "GSI2PK", "KeyType": "HASH" },
    { "AttributeName": "GSI2SK", "KeyType": "RANGE" }
  ],
  "Projection": {
    "ProjectionType": "ALL"
  },
  "BillingMode": "PAY_PER_REQUEST"
}
```

**Purpose**: Adjacency list pattern to fetch recurring series (master + all exceptions)

**Key Patterns**:
- Master event:
  - `GSI2PK`: `MASTER#<masterId>`
  - `GSI2SK`: `MASTER` (always sorts first)
- Instance (exception):
  - `GSI2PK`: `MASTER#<masterId>` (same as master)
  - `GSI2SK`: `INSTANCE#<YYYYMMDD>` (sorts after master)

**Design Notes**:
- **Why "MASTER" as sort key**: Ensures master appears first in query results. Lexicographically: `"MASTER"` < `"INSTANCE#..."`.
- **Sparse index**: Only populate for recurring masters and instances (saves 80% on GSI writes)

**Cost Savings**:
- 80% of events are single (non-recurring)
- Each write saves 0.8 WCU = $28.80/year across 10K users
- Sparse indexes: **Best practice for productivity apps**

**Typical Query Pattern**:
```javascript
// Get all instances of a recurring event
query({
  IndexName: "GSI2-RecurrenceLookup",
  KeyConditionExpression: "GSI2PK = :pk",
  ExpressionAttributeValues: {
    ":pk": "MASTER#master_abc123"
  }
})
// Returns: master first, then all instances sorted by date
```

---

### GSI3: TaskStatus (Sparse Index)

```javascript
{
  "IndexName": "GSI3-TaskStatus",
  "KeySchema": [
    { "AttributeName": "GSI3PK", "KeyType": "HASH" },
    { "AttributeName": "GSI3SK", "KeyType": "RANGE" }
  ],
  "Projection": {
    "ProjectionType": "ALL"
  },
  "BillingMode": "PAY_PER_REQUEST"
}
```

**Purpose**: Powers Kanban board views—query tasks by status with priority sorting

**Key Patterns**:
- `GSI3PK`: `USER#<userId>#STATUS#<status>` (e.g., `USER#user_123#STATUS#IN_PROGRESS`)
- `GSI3SK`: `P<priority>#<createdAt>` (e.g., `P1#2025-12-15T10:00:00Z`)

**Status Values**:
| Status | Description | Auto-Transition |
|--------|-------------|-----------------|
| `BACKLOG` | Not started | None |
| `IN_PROGRESS` | Actively working | None |
| `COMPLETED` | Done, visible for 24h | → ARCHIVED after 24h (via Lambda) |
| `ARCHIVED` | Hidden by default | TTL deletion optional |

**Priority Encoding in SK**:
- `P1` = Priority 1 (highest, red)
- `P2` = Priority 2
- `P3` = Priority 3 (default, gray)
- `P4` = Priority 4
- `P5` = Priority 5 (lowest)

**Design Notes**:
- **Sort Order**: ScanIndexForward=true gives P1 first (highest priority), then by creation date within priority
- **Sparse index**: Only populate for TASK entities (saves 90% on GSI writes for non-task items)

**Typical Query Pattern**:
```javascript
// Get all in-progress tasks for a user, sorted by priority
query({
  IndexName: "GSI3-TaskStatus",
  KeyConditionExpression: "GSI3PK = :pk",
  ExpressionAttributeValues: {
    ":pk": "USER#user_123#STATUS#IN_PROGRESS"
  },
  ScanIndexForward: true  // P1 first
})
```

---

### GSI4: CrossLinks (Sparse Index)

```javascript
{
  "IndexName": "GSI4-CrossLinks",
  "KeySchema": [
    { "AttributeName": "GSI4PK", "KeyType": "HASH" },
    { "AttributeName": "GSI4SK", "KeyType": "RANGE" }
  ],
  "Projection": {
    "ProjectionType": "KEYS_ONLY"
  },
  "BillingMode": "PAY_PER_REQUEST"
}
```

**Purpose**: Find all items that link to a specific entity (reverse lookup)

**Key Patterns**:
- `GSI4PK`: `LINKED#<targetEntityType>#<targetEntityId>`
- `GSI4SK`: `<sourceEntityType>#<sourceEntityId>`

**Examples**:
```javascript
// Note that links to Task "task_abc"
GSI4PK: "LINKED#TASK#task_abc"
GSI4SK: "NOTE#note_xyz"

// Task that links to Event "evt_123"
GSI4PK: "LINKED#EVENT#evt_123"
GSI4SK: "TASK#task_456"

// Multiple notes linking to same task query
query({
  IndexName: "GSI4-CrossLinks",
  KeyConditionExpression: "GSI4PK = :pk",
  ExpressionAttributeValues: {
    ":pk": "LINKED#TASK#task_abc"
  }
})
// Returns all items (any type) that link to task_abc
```

**Design Notes**:
- **KEYS_ONLY Projection**: Cross-link queries typically fetch full items separately with GetBatchItem for full item data; smaller index = lower storage cost
- **Sparse index**: Only populate for items with `links` array containing at least one entry
- **Enables backlinks**: Core Nexus feature—"Show me all notes linked to this task"

---

## 3. Key Naming Conventions

### Primary Table Keys
| Key | Pattern | Example | Encoding |
|-----|---------|---------|----------|
| `PK` | `USER#<userId>` | `USER#user_123` | All user's items in one partition |
| `SK` | `<ENTITY>#<entityId>` | `EVENT#evt_abc123` | Entity type prefix for filtering |

### GSI1 Keys (Calendar/Agenda)
| Key | Pattern | Example | Purpose |
|-----|---------|---------|---------|
| `GSI1PK` | `USER#<userId>#<YYYY>` | `USER#user_123#2025` | Year partition for calendar |
| `GSI1SK` | ISO 8601 timestamp | `2025-12-15T14:00:00Z` | Sortable by date/time |

### GSI2 Keys (Recurrence)
| Key | Pattern | Example | Purpose |
|-----|---------|---------|---------|
| `GSI2PK` | `MASTER#<masterId>` | `MASTER#master_recurring_abc` | Recurring series grouping |
| `GSI2SK` | `MASTER` or `INSTANCE#<date>` | `MASTER` / `INSTANCE#20251215` | Master first, instances sorted |

### GSI3 Keys (Task Status)
| Key | Pattern | Example | Purpose |
|-----|---------|---------|---------|
| `GSI3PK` | `USER#<userId>#STATUS#<status>` | `USER#user_123#STATUS#IN_PROGRESS` | Status-based filtering |
| `GSI3SK` | `P<priority>#<timestamp>` | `P1#2025-12-15T10:00:00Z` | Priority sort + date secondary |

### GSI4 Keys (Cross-Links)
| Key | Pattern | Example | Purpose |
|-----|---------|---------|---------|
| `GSI4PK` | `LINKED#<type>#<id>` | `LINKED#TASK#task_abc123` | Reverse link lookup |
| `GSI4SK` | `<sourceType>#<sourceId>` | `NOTE#note_xyz789` | Source entity identification |

---

## 4. Common Attributes (All Entities)

These attributes appear on every item in the table:

```javascript
{
  // Primary Keys (always required)
  "PK": "USER#<userId>",                    // Partition key
  "SK": "<ENTITY>#<entityId>",              // Sort key
  
  // GSI1 (Calendar/Agenda) - all except USER_META
  "GSI1PK": "USER#<userId>#<YYYY>",         // Year partition
  "GSI1SK": "<timestamp>",                  // ISO 8601 timestamp
  
  // Entity Type Discrimination
  "entityType": "EVENT|MASTER|INSTANCE|TASK|REMINDER|NOTE|USER_META",
  
  // Version Control (Optimistic Locking)
  "version": 1,                             // Incremented on each update
  
  // Timestamps
  "createdAt": "2025-12-15T10:00:00Z",     // ISO 8601 UTC
  "updatedAt": "2025-12-15T10:00:00Z",     // ISO 8601 UTC
  
  // Optional: Auto-deletion
  "ttl": 1766947200                         // Unix epoch seconds
}
```

---

## 5. Deployment Checklist

### Pre-Deployment
- [ ] AWS account with DynamoDB service access
- [ ] IAM role with `dynamodb:CreateTable`, `dynamodb:CreateGlobalSecondaryIndex` permissions
- [ ] Terraform or CloudFormation prepared for IaC deployment
- [ ] Backup strategy defined (AWS Backup, S3 exports)

### Deployment Steps
1. [ ] Create table "ProductivityData" with PAY_PER_REQUEST billing
2. [ ] Create all 4 GSIs (GSI1, GSI2, GSI3, GSI4)
3. [ ] Enable DynamoDB Streams (NEW_AND_OLD_IMAGES)
4. [ ] Enable TTL on `ttl` attribute
5. [ ] Add tags (Application: Nexus, Environment: Production)
6. [ ] Configure Lambda consumer for streams
7. [ ] Set up CloudWatch alarms:
   - [ ] ConsumedReadCapacityUnits > 500
   - [ ] ConsumedWriteCapacityUnits > 500
   - [ ] UserErrors > 5/minute
   - [ ] SystemErrors > 1/minute

### Post-Deployment
- [ ] Verify table is active (ACTIVE status)
- [ ] Verify all 4 GSIs are active
- [ ] Test basic CRUD operations:
  - [ ] PutItem
  - [ ] GetItem
  - [ ] UpdateItem
  - [ ] Query (base table and each GSI)
- [ ] Verify streams are flowing to Lambda
- [ ] Monitor initial cost (first 1 hour should be minimal)

---

## 6. Cost Estimation

### Monthly Cost for 10,000 Users

Assumptions:
- 10 events/day per user
- 5 tasks/day per user
- 3 reminders/day per user
- 2 notes/day per user
- Moderate caching: 60% read reduction

**Read Operations**: ~$26.50
- Typical read: ~0.5 WCU (rounded up)
- ~10M reads/month = 5M read units
- At $0.25 per million: $1.25
- **With caching (60% reduction)**: ~$0.50

**Write Operations**: ~$26.50
- Typical write: ~1 WCU
- ~3M writes/month (new items + updates)
- At $1.25 per million: $3.75

**DynamoDB Streams**: ~$8.60
- ~3M stream records/month
- At $0.10 per million: $0.30

**Storage**: ~$4.32
- ~17.3 GB/year per user = ~1.4 GB/month
- 10K users = ~14 GB/month
- At $0.25 per GB: $3.50

**Total**: ~$39.42/month

**For 100K users**: ~$394/month (linear scaling)

**Comparison**:
- RDS PostgreSQL: $100+/month
- Traditional multi-table: $150+/month
- **Nexus DynamoDB: $39.42/month**

---

## 7. Backup & Disaster Recovery

### Backup Strategy
- **Point-in-Time Recovery (PITR)**: Enabled by default
  - 35 days of recovery window
  - Restores to any second during the window
  - Cost: 20% of table's backup storage
  
- **On-Demand Backups**: Create manual snapshots
  - Full table backup (all data + indexes)
  - Cost: Same as table storage for duration
  - Use before major schema changes

### Recovery Procedures
1. **Failed write**: DynamoDB auto-retries with exponential backoff
2. **Data corruption**: Restore from PITR to point before corruption
3. **Accidental deletion**: Restore from PITR or on-demand backup
4. **Regional failure**: Activate Global Tables (multi-region)

### Optional: Global Tables (Multi-Region)
```javascript
{
  "GlobalTableName": "ProductivityData",
  "ReplicationGroup": [
    { "RegionName": "us-east-1" },
    { "RegionName": "eu-west-1" },
    { "RegionName": "ap-northeast-1" }
  ]
}
```
**Cost**: 2x table cost for multi-region (3 regions = 3x)
**Benefit**: <1ms latency anywhere, automatic failover

---

## 8. Monitoring Setup

### CloudWatch Metrics (Default Free)
- ConsumedReadCapacityUnits
- ConsumedWriteCapacityUnits
- UserErrors
- SystemErrors
- SuccessfulRequestLatency
- ConditionalCheckFailedRequests

### CloudWatch Alarms (Recommended)
```javascript
[
  {
    "AlarmName": "DynamoDB-HighReadThrottling",
    "MetricName": "ReadThrottleEvents",
    "Threshold": 5,
    "ComparisonOperator": "GreaterThanThreshold"
  },
  {
    "AlarmName": "DynamoDB-HighWriteThrottling",
    "MetricName": "WriteThrottleEvents",
    "Threshold": 5,
    "ComparisonOperator": "GreaterThanThreshold"
  },
  {
    "AlarmName": "DynamoDB-HighStorageUsage",
    "MetricName": "ConsumedStorageUnits",
    "Threshold": 80000000000,  // 80GB
    "ComparisonOperator": "GreaterThanThreshold"
  }
]
```

### X-Ray Tracing (Enable on Lambda)
- Traces each DynamoDB request
- Shows latency breakdown
- Identifies slow queries
- Cost: $0.50 per million traced requests

---

## 9. Performance Tuning

### Query Optimization
1. **Use specific attributes** in ProjectionExpression (for non-GSI1)
2. **Filter in database** with FilterExpression when possible
3. **Batch operations** with BatchGetItem/BatchWriteItem
4. **Paginate large results** with Limit + ExclusiveStartKey
5. **Use GSI1** for calendar queries (year-based partitioning wins)

### Common Query Patterns
```javascript
// 1. Get all agenda items for a week (BEST)
query({
  IndexName: "GSI1-YearView",
  KeyConditionExpression: "GSI1PK = :pk AND GSI1SK BETWEEN :start AND :end",
  ExpressionAttributeValues: {
    ":pk": "USER#user_123#2025",
    ":start": "2025-12-15T00:00:00Z",
    ":end": "2025-12-21T23:59:59Z"
  }
  // Returns all events, tasks, reminders in one query
})

// 2. Get all tasks in progress (BEST)
query({
  IndexName: "GSI3-TaskStatus",
  KeyConditionExpression: "GSI3PK = :pk",
  ExpressionAttributeValues: {
    ":pk": "USER#user_123#STATUS#IN_PROGRESS"
  }
  // Already sorted by priority
})

// 3. Get all instances of a recurring event (BEST)
query({
  IndexName: "GSI2-RecurrenceLookup",
  KeyConditionExpression: "GSI2PK = :pk",
  ExpressionAttributeValues: {
    ":pk": "MASTER#master_abc123"
  }
  // Master first, then all exceptions
})
```

---

## 10. Next Steps

1. Deploy this table schema using CloudFormation or Terraform
2. Proceed to **03-PHASE1-CALENDAR.md** to implement calendar entities
3. Monitor costs daily during first week
4. Set up CloudWatch dashboards for team visibility

---

**Document Status**: Ready for deployment ✅
