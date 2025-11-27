# DynamoDB Architect Log

**Purpose:** Record all DynamoDB schema design decisions and design changes for traceability and future reference.

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

<!--
DYNAMODB ARCHITECT AGENT: Append decisions below this line using the template format.
-->

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
