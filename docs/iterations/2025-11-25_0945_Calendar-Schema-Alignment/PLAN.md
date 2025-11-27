# Plan: Calendar-Schema-Alignment
**Date:** Tue Nov 25 09:45:34 UTC 2025
**Directory:** docs/iterations/2025-11-25_0945_Calendar-Schema-Alignment
**Reference:** `docs/backend/dynamodb-spec/03-PHASE1-CALENDAR.md`

## 1. Objective

Align existing Calendar handlers with the new DynamoDB Specification v3.0 to ensure schema consistency before implementing Tasks, Reminders, and Notes phases.

## 2. Gap Analysis

### Current State (Existing Handlers)
- EVENT, MASTER, INSTANCE entities implemented
- GSI1 (YearView) and GSI2 (RecurrenceLookup) configured
- Basic CRUD operations working

### Required Changes (v3.0 Spec)
| Area | Current | Required | Action |
|------|---------|----------|--------|
| GSI3 (TaskStatus) | Not defined | Required for Phase 2 | Add to serverless.yml |
| GSI4 (CrossLinks) | Not defined | Required for Phase 5 | Add to serverless.yml |
| `links` attribute | Missing | Required (empty array default) | Add to all calendar handlers |
| Doc references | Old paths | New dynamodb-spec/ paths | Update comments |
| USER_META entity | Missing | Required for preferences | Implement handler |
| DynamoDB Streams | Commented out | Enable for future features | Uncomment in serverless.yml |

## 3. Proposed Changes

### Backend - serverless.yml
- [x] Add GSI3-TaskStatus index definition
- [x] Add GSI4-CrossLinks index definition (KEYS_ONLY projection)
- [x] Enable DynamoDB Streams (NEW_AND_OLD_IMAGES)
- [x] Add GSI3PK, GSI3SK, GSI4PK, GSI4SK to AttributeDefinitions

### Backend - Handlers
- [x] createEvent.ts: Add `links: []` attribute, update doc reference
- [x] createRecurring.ts: Add `links: []` attribute, update doc reference
- [x] getAgenda.ts: Update doc reference
- [x] getEvent.ts: Update doc reference
- [x] updateEvent.ts: Update doc reference
- [x] deleteEvent.ts: Update doc reference
- [x] getSeries.ts: Update doc reference
- [x] endSeries.ts: Update doc reference

### Backend - New Handler
- [x] Add `GET /users/:userId/meta` handler for USER_META entity
- [x] Add `PATCH /users/:userId/meta` handler for updating preferences

### Shared Types
- [x] Add USER_META types to packages/shared/src/types/

## 4. Verification Plan
- [x] **Automated:** serverless.yml validates (no syntax errors)
- [ ] **Manual:** DynamoDB Local table recreated with new GSIs
- [ ] **Automated:** Existing calendar tests pass (if any)

## 5. Out of Scope
- Task handlers (Phase 2)
- Reminder handlers (Phase 3)
- Note handlers (Phase 4)
- Cross-linking implementation (Phase 5)

These will be implemented in subsequent iterations after schema alignment is complete.
