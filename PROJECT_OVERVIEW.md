# Project Overview & Agent Directives

## 📍 Context
This is a **Next.js (Frontend) + AWS Serverless (Backend)** monorepo.
**Architecture:** Eventual consistency, Single-Table DynamoDB, Mobile-First design.
**Methodology:** Agentic Parallel Development with strict Gherkin-driven iterations.

## 🗺️ Knowledge Map (Read ONLY what you need)

### 1. The Rules (Immutable Context)
* **Roles & Workflows:** `docs/core/AGENT_ROLES.md` (Who you are, who to hand off to)
* **Technology Hard Limits:** `docs/core/TECH_STACK.md` (Strict version locks)
* **Development Process:** `docs/core/PROCESS.md` (The Iteration Lifecycle)
* **Model Selection:** `docs/core/MODEL_SELECTION.md` (When to use Opus/Sonnet/Haiku)
* **Token Efficiency:** `docs/core/TOKEN_EFFICIENCY.md` (Minimize context and cost)
* **Recovery Strategies:** `docs/core/RECOVERY_STRATEGIES.md` (How to handle stuck states)

### 2. Domain Specifics (Context on Demand)
* **Frontend Agent:** Read `docs/frontend/CODING_STANDARDS_FRONTEND.md`
* **Backend Agent:** Read `docs/backend/CODING_STANDARDS_BACKEND.md`
* **Shared Contract:** Read `shared/README.md` (Types/Constants)

### 3. Current State (Dynamic Context)
* **Master Roadmap:** `TODO.md` (Root level)
* **Current Iteration:** Check `docs/iterations/` for the latest timestamped folder.
    * `PLAN.md`: Your instructions for the current task.
    * `WORK_LOG.md`: Where you log your actions.

## 🛑 Prime Directives
1.  **No Hallucinations:** Do not install libraries not listed in `TECH_STACK.md`.
2.  **No Context Dumping:** Do not read all files. Read only the "Knowledge Map" files relevant to your current role.
3.  **Gherkin is Law:** You cannot mark a task "Done" until the specific Gherkin scenarios in the Plan pass.
4.  **One Source of Truth:**
    * API Contracts → `shared/types`
    * Database Schema → `docs/backend/DATABASE_SCHEMA.md`
    * UI Design → `docs/frontend/DESIGN_SYSTEM.md`
5.  **Iteration Start:** All work MUST begin with `./scripts/start-iteration.sh "Feature Name"`. Manual folder creation is forbidden.
6.  **Branch Naming:** All branches must follow `claude/YYMMDD-descriptive-name` format.
7.  **Model Efficiency:** Use the right model for the task (see `MODEL_SELECTION.md`). Start cheap, escalate when stuck.
8.  **Recovery Protocol:** When stuck 2+ times on same issue, stop, document, escalate model, and review failed approaches before trying again.

## 📂 Directory Structure
```text
/
├── backend/                 # AWS Serverless (Lambda/Terraform)
├── frontend/                # Next.js 16+ (App Router)
├── shared/                  # Shared Types & Constants (NPM Workspace)
├── docs/
│   ├── core/                # Roles, Tech Stack, Process
│   ├── frontend/            # Standards, Design System
│   ├── backend/             # DB Schema, API Specs
│   ├── specs/               # Living Gherkin Feature files
│   └── iterations/          # Active & Past Work Logs
└── scripts/                 # CI/CD and Agent utilities