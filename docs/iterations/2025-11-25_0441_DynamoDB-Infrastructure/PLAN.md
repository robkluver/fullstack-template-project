# Plan: DynamoDB Infrastructure
**Date:** Tue Nov 25 04:41:06 UTC 2025
**Directory:** docs/iterations/2025-11-25_0441_DynamoDB-Infrastructure
**Reference:** `docs/backend/IMPLEMENTATION_CHECKLIST.md` Phase 1

## 1. Objective
Set up the ProductivityData DynamoDB table with single-table design, GSIs, streams, and monitoring.

## 2. Proposed Changes

### Backend (apps/api/)
- [ ] Create Terraform/CDK configuration for ProductivityData table
- [ ] Configure base table with PK (HASH) and SK (RANGE)
- [ ] Create GSI1-YearView (GSI1PK, GSI1SK) for calendar queries
- [ ] Create GSI2-RecurrenceLookup (GSI2PK, GSI2SK) as sparse index
- [ ] Enable DynamoDB Streams (NEW_AND_OLD_IMAGES)
- [ ] Enable TTL on `ttl` attribute
- [ ] Enable Point-in-Time Recovery (PITR)
- [ ] Configure CloudWatch alarms (ReadThrottle, WriteThrottle)
- [ ] Create DynamoDB client wrapper for Lambda functions
- [ ] Set up DynamoDB Local for development/testing

### Infrastructure
- [ ] Create `apps/api/infrastructure/` directory for IaC
- [ ] Add docker-compose.yml for DynamoDB Local

### Frontend
- N/A (infrastructure only)

## 3. Verification Plan
- [ ] **Automated:** DynamoDB table describe returns expected configuration
- [ ] **Automated:** Can write and read test item to local DynamoDB
- [ ] **Manual:** CloudWatch alarms visible in AWS console
- [ ] **Manual:** PITR enabled verification

## 4. Dependencies
- AWS CLI configured (for deployment)
- Docker (for DynamoDB Local)
- Node.js 20.x

## 5. Reference Docs
- `docs/backend/DATABASE_SCHEMA.md` - Table configuration (Section 2)
- `docs/backend/DYNAMODB_CONVENTIONS.md` - Design principles
- `docs/backend/IMPLEMENTATION_CHECKLIST.md` - Phase 1 commands
