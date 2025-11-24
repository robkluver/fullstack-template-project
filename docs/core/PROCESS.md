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

## Phase 2: Execution (Parallel Agents)

**Model:** Use Sonnet for implementation. Escalate to Opus if stuck (see `RECOVERY_STRATEGIES.md`).

1.  **Read:** Agents read `PLAN.md` and the Gherkin spec.
2.  **Execute with Checkpoints:**
    * Frontend Agent works in `frontend/`.
    * Backend Agent works in `backend/`.
    * **Checkpoint after each task:** Run tests, commit if passing.
3.  **Log:**
    * Agents **MUST** append to `docs/iterations/.../WORK_LOG.md`.
    * Format: Bullet points. State *what* was done and *why*.
    * *Anti-Pattern:* Do not overwrite the log. Append only.
4.  **Track Progress:** Use TodoWrite tool to track task completion.

### Execution Checkpoints (Mandatory)
| After | Action |
|-------|--------|
| Each file edit | Run relevant tests |
| Each passing test | Commit with descriptive message |
| Every 3-5 changes | Push to remote branch |
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