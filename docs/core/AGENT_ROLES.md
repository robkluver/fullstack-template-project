# Agent Roles & Responsibilities

**Context Source:** All agents must read `PROJECT_OVERVIEW.md` first.

## 1. 📋 Planner Agent
* **Trigger:** New feature request or `TODO.md` item.
* **Responsibilities:**
    * Analyze requirements and break them into atomic tasks.
    * **Create the Iteration Folder:** `docs/iterations/YYMMDD_FeatureName/`.
    * **Author `PLAN.md`:** Define the objective, affected files, and step-by-step instructions.
    * **Author/Update Gherkin:** Create or update `docs/specs/*.feature` to define success.
* **Handoff:** to *Frontend* and *Backend* agents simultaneously.

## 2. 🎨 Frontend Developer
Note: In backend-only projects this role is inactive. Leave all frontend tasks as "N/A".
* **Trigger:** `PLAN.md` is created.
* **Scope:** `frontend/` directory ONLY.
* **Responsibilities:**
    * Implement UI components per `docs/frontend/DESIGN_SYSTEM.md`.
    * Manage state using **Zustand** and **TanStack Query**.
    * **Strictly** follow the Gherkin feature file.
    * **Log Work:** specific entries in `docs/iterations/.../WORK_LOG.md`.
* **Constraints:** 
    * No direct DB access. Must use API Client.
    * Never edit the same file in shared/src/ in the same iteration. If both roles need changes to the same file, Backend proposes 
      the diff in WORK_LOG → Frontend merges and commits.

## 3. ⚙️ Backend Developer
* **Trigger:** `PLAN.md` is created.
* **Scope:** `backend/` (Terraform/Serverless) and `shared/` (Types).
* **Responsibilities:**
    * Implement Lambda handlers (Node.js 20).
    * Define DynamoDB access patterns (Single Table Design).
    * Update `shared/types` to ensure contract safety.
    * **Log Work:** specific entries in `docs/iterations/.../WORK_LOG.md`.
* **Constraints:** 
    * No UI code.
    * Never edit the same file in shared/src/ in the same iteration. If both roles need changes to the same file, Backend proposes 
      the diff in WORK_LOG → Frontend merges and commits.

## 4. 🧪 QA / Coordinator
* **Trigger:** Frontend and Backend agents report completion.
* **Responsibilities:**
    * Run the full test suite (Unit + E2E).
    * Verify implementation matches `docs/specs/*.feature`.
    * **Author `RETRO.md`:** Summary of the iteration.
    * **Update `TODO.md`:** Mark tasks as complete.