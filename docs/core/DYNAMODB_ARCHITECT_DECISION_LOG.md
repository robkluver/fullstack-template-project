# DynamoDB Architect Decision Log

**Purpose:** Record all DynamoDB schema design decisions, entity additions, access pattern changes, and migration plans.

**Maintained by:** DynamoDB Architect Agent only.

---

## Log Format

Each entry must include:
- **Timestamp:** ISO 8601 format (YYYY-MM-DD HH:MM UTC)
- **Type:** `SCHEMA_DESIGN` | `SCHEMA_REVIEW` | `MIGRATION_PLAN` | `CONVENTION_UPDATE`
- **Feature/Requestor:** Feature name or developer role
- **Decision:** `APPROVED` | `CHANGES_REQUIRED` | `DEFERRED`
- **Summary:** Brief bullet points including entities affected, access patterns, and GSI usage

---

## Decision Log

### 2025-11-26 — Role Initialization

**Timestamp:** 2025-11-26 00:00 UTC
**Type:** SCHEMA_DESIGN
**Feature/Requestor:** Role Initialization
**Decision:** N/A (Documentation)

**Context:** DynamoDB Architect role created to govern database schema design.

**Notes:**
- Role established with exclusive authority over DYNAMODB_CONVENTIONS.md and dynamodb-spec/*.md
- Primary knowledge base: DYNAMODB_ARCHITECT_SKILL.md (Alex DeBrie patterns)
- All schema changes must be logged to this document

---

### 2025-11-26 — Google Calendar Import Schema Design

**Timestamp:** 2025-11-26 06:20 UTC
**Type:** SCHEMA_DESIGN
**Feature/Requestor:** Google Calendar Import (Phase 9) / Planner Agent
**Decision:** APPROVED

**Context:** Design schema for Google Calendar OAuth integration, incremental import with conflict detection, and a general-purpose notification system.

**Entities Affected:**
- **NOTIFICATION** (NEW) - General-purpose notification entity for import results, reminders, system messages
- **EVENT** (MODIFIED) - Added 4 optional Google sync attributes for imported events
- **USER_META** (MODIFIED) - Added OAuth token storage and sync state tracking

**Access Patterns:**

| # | Pattern | Index | Notes |
|---|---------|-------|-------|
| AP-GCAL-01 | Get unread notification count | GSI3 | `USER#<id>#NOTIF#UNREAD` for bell badge |
| AP-GCAL-02 | List notifications | GSI1 | Year partition + entityType filter |
| AP-GCAL-03 | Get single notification | Base | Standard GetItem |
| AP-GCAL-04 | Update notification status | Base | Changes GSI3PK on status change |
| AP-GCAL-05 | Create notification | Base | Writes to GSI1 + GSI3 |
| AP-GCAL-06 | Get OAuth status | Base | Reads USER_META.googleOAuth |
| AP-GCAL-07 | Store OAuth tokens | Base | Updates USER_META |
| AP-GCAL-08 | Find event by Google ID | Base | Query with filter (acceptable for batch) |
| AP-GCAL-09 | Get events modified since | GSI1 | For conflict detection |

**Design Decisions:**
- NOTIFICATION uses GSI3 for status-based queries (`USER#<id>#NOTIF#UNREAD`) - efficient unread badge count
- OAuth tokens stored in USER_META (not separate entity) - single GetItem on app load
- Google sync metadata on EVENT entity (not separate table) - follows single-table design principle
- Conflict detection via `updatedAt > googleSyncedAt` comparison
- Lazy migration for all changes - no ETL required

**Files Updated:**
- `docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md` - New phase document with complete entity schemas, access patterns, and implementation guide

**Migration Notes:**
- Lazy migration for EVENT: Google sync attributes added when event first imported
- Lazy migration for USER_META: OAuth attributes added when user first connects Google
- Backward compatible: Existing events and user metadata work without changes

---

<!--
TEMPLATE FOR NEW ENTRIES:

### YYYY-MM-DD — [Feature or Brief Title]

**Timestamp:** YYYY-MM-DD HH:MM UTC
**Type:** [SCHEMA_DESIGN | SCHEMA_REVIEW | MIGRATION_PLAN | CONVENTION_UPDATE]
**Feature/Requestor:** [Feature name | Backend Agent | Planner]
**Decision:** [APPROVED | CHANGES_REQUIRED | DEFERRED]

**Context:** [1-2 sentences describing the requirement or request]

**Entities Affected:**
- [ENTITY_NAME] - [Brief description of changes]

**Access Patterns:**
| # | Pattern | Index | Notes |
|---|---------|-------|-------|
| AP1 | [Description] | [GSI1/GSI3/Base] | [Any notes] |

**Design Decisions:**
- [Key design choice and rationale]

**Files Updated:**
- `docs/backend/dynamodb-spec/[XX-PHASE.md]` - [What was added/changed]

**Migration Notes:** (if applicable)
- [Migration approach: lazy/ETL/none]
- [Backward compatibility considerations]

---
-->
