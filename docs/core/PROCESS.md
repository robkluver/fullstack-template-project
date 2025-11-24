# Development Process: The Iteration Loop

Every unit of work must follow this strict cycle to maintain context and prevent "drift."

## Phase 1: Initiation (Planner)
1.  **Select Task:** Pick an item from `TODO.md`.
2.  **Create Context:**
    * Create folder: `docs/iterations/YYMMDD_HHMM_TaskName/`.
    * Create file: `PLAN.md` (See template below).
3.  **Define Success:**
    * Create or update `docs/specs/{feature}.feature` (Gherkin).
    * *Rule:* If there is no Gherkin, there is no code.

## Phase 2: Execution (Parallel Agents)
1.  **Read:** Agents read `PLAN.md` and the Gherkin spec.
2.  **Execute:**
    * Frontend Agent works in `frontend/`.
    * Backend Agent works in `backend/`.
3.  **Log:**
    * Agents **MUST** append to `docs/iterations/.../WORK_LOG.md`.
    * Format: Bullet points. State *what* was done and *why*.
    * *Anti-Pattern:* Do not overwrite the log. Append only.

## Phase 3: Verification (QA Agent)
1.  **Run Tests:** Execute `yarn test` and `yarn cypress:run`.
2.  **Verify Spec:** Ensure all Gherkin scenarios pass.
3.  **Close Loop:**
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