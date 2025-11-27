# Testing & Deployment Strategy
**Document**: 09-TESTING-AND-DEPLOYMENT.md  
**Audience**: QA Engineers, DevOps, Platform Engineers

---

## Testing Strategy

### Unit Tests (Lambda Functions)

Test all business logic in isolation:

```typescript
describe("Query Builders", () => {
  test("calculateGSI1SK for task calculates correct sort key", () => {
    const task = { startUtc: "2025-01-15T10:00:00Z", dueUtc: "2025-01-20T17:00:00Z" };
    expect(calculateGSI1SK(task)).toBe("2025-01-15T10:00:00Z"); // Earlier date
  });
  
  test("calculateGSI3SK for task with priority 1", () => {
    const task = { priority: 1, createdAt: "2025-01-15T10:00:00Z" };
    expect(calculateGSI3SK(task)).toBe("P1#2025-01-15T10:00:00Z");
  });
});

describe("RRULE Expansion", () => {
  test("expands daily RRULE for 7 days", () => {
    const rrule = "FREQ=DAILY";
    const start = "2025-01-15T10:00:00Z";
    const dates = expandRRULE(rrule, start, 7);
    expect(dates).toHaveLength(7);
  });
  
  test("respects rruleUntil end date", () => {
    const rrule = "FREQ=WEEKLY;BYDAY=MO";
    const start = "2025-01-15T10:00:00Z";
    const until = "2025-01-29T10:00:00Z";
    const dates = expandRRULE(rrule, start, until);
    expect(dates).toHaveLength(3); // 3 Mondays
  });
});

describe("Timezone Conversions", () => {
  test("converts UTC to user timezone", () => {
    const utc = "2025-01-15T14:00:00Z";
    const tz = "America/New_York";
    const local = convertToUserTimezone(utc, tz);
    expect(local).toBe("2025-01-15T09:00:00-05:00");
  });
});
```

**Test Coverage Target**: >90% for all entity operations

### Integration Tests (DynamoDB Local)

Test complete workflows with a local DynamoDB instance:

```bash
# Start DynamoDB Local
docker run -p 8000:8000 amazon/dynamodb-local

# Run integration tests
npm run test:integration
```

**Test Scenarios**:
- ✅ Create EVENT, query via GSI1
- ✅ Create MASTER, expand RRULE, create INSTANCE, query via GSI2
- ✅ Create TASK, update status, verify GSI3 updated
- ✅ Create NOTE with links, verify GSI4 populated
- ✅ Optimistic locking: concurrent updates fail gracefully
- ✅ Pagination: GSI1 with 200+ items
- ✅ Cross-entity linking and backlinks
- ✅ Unified agenda: single GSI1 query returns all entity types

**Sample Integration Test**:
```typescript
describe("Recurring Event Workflow", () => {
  test("create MASTER, query all instances, modify one, end series", async () => {
    // 1. Create master weekly standup
    const master = await createMaster(userId, {
      title: "Weekly Standup",
      rrule: "FREQ=WEEKLY;BYDAY=MO",
      startUtc: "2025-01-15T15:00:00Z"
    });
    
    // 2. Query master via GSI2
    const series = await getMasterSeries(userId, master.masterId);
    expect(series.master).toBeDefined();
    expect(series.instances).toHaveLength(0); // No exceptions yet
    
    // 3. Modify Jan 22 instance (reschedule to 4pm)
    const instance = await modifyInstance(userId, master.masterId, "2025-01-22", {
      startUtc: "2025-01-22T16:00:00Z"
    });
    expect(instance.recurrenceId).toBe("2025-01-22T15:00:00Z"); // Original time
    
    // 4. Query series again
    const updated = await getMasterSeries(userId, master.masterId);
    expect(updated.instances).toHaveLength(1);
    
    // 5. End series after Feb 12
    const ended = await endRecurringSeries(userId, master.masterId, "2025-02-12T23:59:59Z");
    expect(ended.rruleUntil).toBe("2025-02-12T23:59:59Z");
  });
});
```

### Load Tests

Test performance and scalability:

```bash
# Start load test with k6
k6 run --vus 100 --duration 10m load-tests/week-view.js

# Expected results:
# - Week view: < 20ms p99
# - Task CRUD: < 50ms p99
# - 1,000 concurrent users sustained
```

**Load Test Scenarios**:

1. **Week View (AP1)**: Most common access pattern
   - Target: 1,000 requests/sec
   - P99 latency: <20ms
   - No throttling

2. **Kanban Board (AP11)**: 4 parallel GSI3 queries
   - Target: 500 requests/sec
   - P99 latency: <30ms
   - No GSI throttling

3. **Task Status Updates (AP14)**: Stress test concurrent writes
   - Target: 100 updates/sec on same task
   - Verify version conflicts handled
   - Monitor GSI3 throughput

4. **Bulk Operations**: Archive 500 completed tasks
   - Target: Complete in <50ms
   - Use BatchWriteItem
   - Verify no throttling

---

## Deployment Checklist

### Pre-Deployment (Week 1)

- [ ] AWS account provisioned with DynamoDB access
- [ ] IAM roles created for Lambda, API Gateway, DynamoDB
- [ ] VPC/security groups configured
- [ ] KMS keys for encryption at rest
- [ ] S3 bucket for backups
- [ ] CloudWatch Log Groups created

### Table Deployment

- [ ] Create `ProductivityData` table via CloudFormation/Terraform
- [ ] Create 4 GSIs (GSI1, GSI2, GSI3, GSI4)
- [ ] Enable DynamoDB Streams (NEW_AND_OLD_IMAGES)
- [ ] Enable TTL on `ttl` attribute
- [ ] Enable Point-in-Time Recovery (PITR)
- [ ] Test backups/recovery procedure

### Lambda Functions

- [ ] Deploy all CRUD Lambda functions
- [ ] Set environment variables (DYNAMODB_TABLE_NAME, etc.)
- [ ] Set timeout to 30 seconds
- [ ] Memory: 512MB (adjust based on profiling)
- [ ] VPC configuration (if needed)
- [ ] IAM role with DynamoDB access
- [ ] CloudWatch Logs retention: 30 days

### API Gateway

- [ ] Create REST API
- [ ] Configure CORS
- [ ] Set up API key/throttling
- [ ] Enable CloudWatch logging
- [ ] Configure authorizer (JWT validation)
- [ ] Set request/response models
- [ ] Enable request validation

### DynamoDB Streams Consumer (Lambda)

- [ ] Deploy Streams consumer Lambda
- [ ] Configure event source mapping
- [ ] Batch size: 100
- [ ] Starting position: LATEST
- [ ] Error handling: DLQ for failed records
- [ ] Monitor Lambda concurrency

### Monitoring & Observability

**CloudWatch Dashboards**:
- [ ] DynamoDB throughput (RCU/WCU)
- [ ] API latency (p50, p99)
- [ ] Lambda invocation count and duration
- [ ] Error rates by endpoint
- [ ] GSI throttling events

**CloudWatch Alarms**:
- [ ] DynamoDB: ConsumedWriteCapacityUnits > threshold
- [ ] DynamoDB: UserErrors > 5/minute
- [ ] Lambda: Error rate > 1%
- [ ] API Gateway: 5xx errors > 5/minute

**X-Ray Tracing** (optional):
- [ ] Enable X-Ray on Lambda functions
- [ ] Sample rate: 10% (increase for debugging)
- [ ] Analyze latency by query type

### Security

- [ ] Enable encryption at rest (KMS)
- [ ] Enable encryption in transit (TLS)
- [ ] JWT token validation on all endpoints
- [ ] Rate limiting: 100 requests/sec per user
- [ ] DDoS protection (AWS Shield)
- [ ] WAF rules (optional)

---

## Cost Monitoring

### Monthly Cost for 10K Users

**Assumptions**:
- 10 events/day per user
- 5 tasks/day per user
- 3 reminders/day per user
- 2 notes/day per user

**Breakdown**:
| Component | Cost | Notes |
|-----------|------|-------|
| Reads | $26.50 | ~100M reads/month, $0.25 per million |
| Writes | $3.75 | ~3M writes/month, $1.25 per million |
| Streams | $0.30 | ~3M stream records, $0.10 per million |
| Storage | $3.50 | ~14GB, $0.25 per GB/month |
| **Total** | **$34.05** | Excluding caching, monitoring |

**Cost Optimization**:
1. **Enable caching** (Redis): 60s TTL on agenda views = 60% read reduction = -$16/month
2. **Reserved capacity** (after 3 months): 40% discount on predictable workload
3. **Compress large items**: Markdown bodies > 10KB should be gzipped
4. **Archive old items**: Delete via TTL after 2 years

**Cost per User**: $34.05 / 10,000 = **$0.0034/user/month**

### Tracking Costs

Use AWS Cost Explorer to track:
- DynamoDB on-demand charges
- Lambda execution costs
- Data transfer (minimal for single region)
- CloudWatch Logs ingestion

---

## Rollout Plan

### Phase 1: Canary (Week 1)
- Deploy to 1% of users
- Monitor error rates, latency, costs
- Verify alarms are working
- Collect baseline metrics

### Phase 2: Gradual (Week 2-3)
- Roll out to 10% of users
- Monitor for issues
- Test failover
- Confirm cost projections

### Phase 3: General Availability (Week 4)
- Deploy to 100% of users
- Monitor continuously
- Plan optimization based on real usage
- Document lessons learned

---

## Troubleshooting

### High Latency (>50ms p99)

1. Check CloudWatch metrics:
   - GSI1 throughput (check for throttling)
   - Lambda cold starts (enable provisioned concurrency)
   - DynamoDB capacity exceeded

2. Check X-Ray traces:
   - Which operation is slow? (GetItem, Query, Scan)
   - Network latency vs compute latency

3. Solutions:
   - Add provisioned concurrency to Lambda
   - Enable caching with Redis
   - Optimize filter expressions (push predicates to DynamoDB)

### Version Conflicts (409 Errors)

1. Concurrent update attempts
2. Check request logs for source IP
3. Implement client-side exponential backoff
4. Consider optimistic locking TTL (don't retry after 5 seconds)

### Cost Overruns

1. Check for hot partitions:
   - Is one user queried 100x more?
   - Spread load across key ranges

2. Check for full table scans:
   - Use CloudWatch Insights to find Scan operations
   - Ensure all queries use keys or FilterExpression

3. Check for inefficient queries:
   - Are filter expressions filtering 90% of items?
   - Move filters to application logic if better

---

## Post-Deployment

### Week 1: Stabilization
- Monitor error rates hourly
- Respond to any critical issues
- Verify alarms are working
- Collect initial performance data

### Week 2-4: Optimization
- Analyze query patterns
- Optimize slow operations
- Adjust caching strategies
- Fine-tune Lambda memory/timeout

### Month 2+: Maintenance
- Weekly cost review
- Monthly capacity planning
- Document runbooks for common issues
- Plan for scale (100K+ users)

---

## Scaling Beyond 100K Users

**Projected Costs** (linear scaling):
- 100K users: $340/month
- 1M users: $3,400/month
- 10M users: $34,000/month

**Optimization for Scale**:
1. **Global Tables**: Multi-region for <10ms latency anywhere
2. **Caching Layer**: Redis cluster for 80% read reduction
3. **Separate Search Index**: OpenSearch for full-text queries
4. **Archive Old Data**: Move data >2 years to S3 Glacier
5. **Provisioned Capacity**: Switch to provisioned mode after usage stabilizes

**Cost at 1M users with optimizations**: ~$10,000/month (vs $100K+ for traditional database)

---

**Deployment Status**: Ready ✅

**Next**: Deploy Phase 1 (Calendar) to canary users
