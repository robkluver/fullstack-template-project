# Development Process: The Iteration Loop

Every unit of work must follow this strict cycle to maintain context and prevent "drift."

**Related Docs:**
- `MODEL_SELECTION.md` - Which model to use for each task
- `TOKEN_EFFICIENCY.md` - Minimize context and cost
- `RECOVERY_STRATEGIES.md` - How to handle stuck states

---

## Phase 1: Initiation (Planner)

**Model:** Use Opus for planning tasks.

1.  **Select Task:** Pick an item from `TODO.md`.
2.  **Create Branch:** `claude/YYMMDD-feature-name` (e.g., `claude/251124-user-auth`)
3.  **Create Context:**
    * Run: `./scripts/start-iteration.sh "Feature Name"`
    * This creates: `docs/iterations/YYMMDD_HHMM_TaskName/`
4.  **Define Success:**
    * Create or update `docs/specs/{feature}.feature` (Gherkin).
    * *Rule:* If there is no Gherkin, there is no code.
5.  **Schema Design (If Needed):**
    * If the feature requires new DynamoDB entities or schema changes, invoke `/act-dynamodb-architect`
    * Wait for approved schema design before proceeding to Phase 2
    * Schema designs are documented in `docs/backend/dynamodb-spec/`

## Phase 1.5: Schema Design (DynamoDB Architect) — Optional

**Model:** Use Opus for schema design.

**Trigger:** Planner identifies that the feature requires database changes (new entities, new access patterns, schema modifications).

**Skip if:** Feature is frontend-only or uses existing entities without modification.

1.  **Analyze Requirements:**
    * Read feature requirements from `docs/PRODUCT_VISION.md`
    * Identify all data entities involved
    * List ALL access patterns the feature needs
2.  **Design Schema:**
    * Follow the DeBrie methodology (access pattern-first)
    * Create Entity Chart with PK/SK/GSI mappings
    * Validate against `docs/backend/DYNAMODB_CONVENTIONS.md`
3.  **Document:**
    * Update appropriate `docs/backend/dynamodb-spec/` phase file
    * Log decision to `docs/core/DYNAMODB_ARCHITECT_DECISION_LOG.md`
4.  **Handoff:**
    * Include schema design in iteration's `PLAN.md`
    * Backend Agent implements the approved schema

**Output:** Approved schema design with entity chart, access patterns, and dynamodb-spec update.

## Phase 2: Execution (Parallel Agents)

**Model:** Use Sonnet for implementation. Escalate to Opus if stuck (see `RECOVERY_STRATEGIES.md`).

1.  **Read:** Agents read `PLAN.md` and the Gherkin spec.
2.  **Execute with Checkpoints:**
    * Frontend Agent works in `apps/web/`.
    * Backend Agent works in `apps/api/`.
    * **Checkpoint after each task:** Run tests, commit if passing.
3.  **Log:**
    * Agents **MUST** append to `docs/iterations/.../WORK_LOG.md`.
    * Format: Bullet points. State *what* was done and *why*.
    * *Anti-Pattern:* Do not overwrite the log. Append only.
4.  **Track Progress:** Use TodoWrite tool to track task completion.
5.  **DynamoDB Validation:** When modifying database code, validate against `docs/backend/DYNAMODB_CONVENTIONS.md`.

### Execution Checkpoints (Mandatory)
| After | Action |
|-------|--------|
| Each file edit | Run relevant tests |
| Each passing test | Commit with descriptive message |
| Every 3-5 changes | Push to remote branch |
| Database changes | Validate against DYNAMODB_CONVENTIONS.md |
| Getting stuck | Document in WORK_LOG, escalate model |

### Recovery Protocol
If stuck after 2+ attempts on same issue:
1. Stop and document failed approaches in WORK_LOG.md
2. Escalate model: Haiku → Sonnet → Opus
3. Review prior attempts - do NOT repeat failed strategies
4. If Opus cannot resolve, mark as BLOCKED and request human input

See `RECOVERY_STRATEGIES.md` for detailed protocols.

## Phase 3: Verification (QA Agent)
1.  **Run Tests:** Execute `yarn test` and `yarn cypress:run`.
2.  **Verify Spec:** Ensure all Gherkin scenarios pass.
3.  **DynamoDB Compliance:** If iteration includes database changes, verify compliance with `docs/backend/DYNAMODB_CONVENTIONS.md`:
    * Key patterns follow conventions (PK, SK, GSI1PK, etc.)
    * Entity types are correct (EVENT, MASTER, INSTANCE, etc.)
    * Timestamps use ISO 8601 UTC format
    * Optimistic locking uses `version` attribute
4.  **Close Loop:**
    * Write `docs/iterations/.../RETRO.md`.
    * Update `TODO.md` (Mark as Done).

## Phase 4: Evolution (Orchestrator only)

* If RETRO.md proposes a process change → Orchestrator updates docs/core/* and commits with 
  message "RETRO: <iteration> – <change summary>"

---

## 📄 File Templates

### PLAN.md Template
```markdown
# Plan: [Title]
**Date:** [Timestamp]
**Gherkin Ref:** `docs/specs/[feature].feature`

## Objective
[One sentence summary]

## Task Breakdown
### Backend
- [ ] [Task 1]
- [ ] [Task 2]

### Frontend
- [ ] [Task 1]
- [ ] [Task 2]
```

### WORK_LOG.md Template
```markdown
# Work Log: [Title]

## Session Summary
[Brief overview of what was accomplished]

## Work Completed
### [Area 1]
- [Description of work done]

### [Area 2]
- [Description of work done]

## Issues Encountered
[List any blockers or issues and how they were resolved]

## Files Changed
| Directory | Files | Lines Added |
|-----------|-------|-------------|
| [dir] | [count] | [lines] |

---

## Iteration Metrics
| Metric | Value |
|--------|-------|
| **Start Time** | [YYYY-MM-DD HH:MM UTC] |
| **End Time** | [YYYY-MM-DD HH:MM UTC] |
| **Duration** | [X minutes/hours] |
| **Lines of Code** | [+N / -M] |
| **Files Created** | [N new files] |
| **Files Modified** | [N files] |
| **Build Status** | [Passing/Failing] |
| **Test Coverage** | [X%] (if applicable) |
```

### RETRO.md Template
```markdown
# Retrospective: [Title]

## What Went Well
1. [Item]

## What Could Be Improved
1. [Item]

## Technical Debt Created
- [ ] [Item requiring future attention]

## Lessons Learned
- [Insight gained]

## Next Steps
1. [Follow-up item]
```

---

## Iteration Metrics Requirements

Every iteration WORK_LOG.md **MUST** include the following metrics at the end:

| Metric | Description |
|--------|-------------|
| Start/End Time | UTC timestamps |
| Duration | Total development time |
| Lines of Code | Net lines added (+) or removed (-) |
| Files Created/Modified | Count of new and changed files |
| Build Status | Whether build passes |
| Test Coverage | If tests exist, coverage percentage |

These metrics help track velocity, identify patterns, and improve estimation accuracy