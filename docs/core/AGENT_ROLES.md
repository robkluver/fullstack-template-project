# Agent Roles & Responsibilities

**Context Source:** All agents must read `PROJECT_OVERVIEW.md` first.

**Related Docs:**
- `MODEL_SELECTION.md` - Which model to use for each task type
- `TOKEN_EFFICIENCY.md` - Minimize context usage and cost
- `RECOVERY_STRATEGIES.md` - How to handle stuck states

## 1. Planner Agent
* **Model:** Opus (complex reasoning required)
* **Trigger:** New feature request or `TODO.md` item.
* **Responsibilities:**
    * Analyze requirements and break them into atomic tasks.
    * **Create Branch:** `claude/YYMMDD-feature-name`
    * **Create the Iteration Folder:** Run `./scripts/start-iteration.sh "Feature Name"`
    * **Author `PLAN.md`:** Define the objective, affected files, and step-by-step instructions.
    * **Author/Update Gherkin:** Create or update `docs/specs/*.feature` to define success.
* **Handoff:** to *Frontend* and *Backend* agents simultaneously.
* **Activation:** `/act-planner`

## 2. Frontend Developer
Note: In backend-only projects this role is inactive. Leave all frontend tasks as "N/A".
* **Model:** Sonnet (escalate to Opus if stuck per `RECOVERY_STRATEGIES.md`)
* **Trigger:** `PLAN.md` is created.
* **Scope:** `frontend/` directory ONLY.
* **Standards:** `docs/frontend/CODING_STANDARDS_FRONTEND.md`
* **Responsibilities:**
    * Implement UI components per `docs/frontend/DESIGN_SYSTEM.md`.
    * Manage state using **Zustand** and **TanStack Query**.
    * **Strictly** follow the Gherkin feature file.
    * **Log Work:** specific entries in `docs/iterations/.../WORK_LOG.md`.
    * **Checkpoint:** Test and commit after each significant change.
* **Constraints:**
    * No direct DB access. Must use API Client.
    * Never edit the same file in shared/src/ in the same iteration. If both roles need changes to the same file, Backend proposes
      the diff in WORK_LOG → Frontend merges and commits.
* **Activation:** `/act-frontend`

## 3. Backend Developer
* **Model:** Sonnet (escalate to Opus if stuck per `RECOVERY_STRATEGIES.md`)
* **Trigger:** `PLAN.md` is created.
* **Scope:** `backend/` (Terraform/Serverless) and `shared/` (Types).
* **Standards:** `docs/backend/CODING_STANDARDS_BACKEND.md`
* **Responsibilities:**
    * Implement Lambda handlers (Node.js 20).
    * Define DynamoDB access patterns (Single Table Design).
    * Update `shared/types` to ensure contract safety.
    * **Log Work:** specific entries in `docs/iterations/.../WORK_LOG.md`.
    * **Checkpoint:** Test and commit after each significant change.
* **Constraints:**
    * No UI code.
    * Never edit the same file in shared/src/ in the same iteration. If both roles need changes to the same file, Backend proposes
      the diff in WORK_LOG → Frontend merges and commits.
* **Activation:** `/act-backend`

## 4. QA / Coordinator
* **Model:** Haiku for test execution, Sonnet for analysis
* **Trigger:** Frontend and Backend agents report completion.
* **Responsibilities:**
    * Run the full test suite (Unit + E2E).
    * Verify implementation matches `docs/specs/*.feature`.
    * **Author `RETRO.md`:** Summary of the iteration.
    * **Update `TODO.md`:** Mark tasks as complete.
    * Run `./scripts/finish-iteration.sh` to close the iteration.
* **Activation:** `/act-qa`