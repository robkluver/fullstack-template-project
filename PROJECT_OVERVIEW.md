# Nexus - Project Overview & Agent Directives

## Context

**Nexus** is a productivity application featuring calendar, tasks, reminders, and notes.

- **Stack:** Next.js (Frontend) + AWS Lambda (Backend)
- **Database:** DynamoDB Single-Table Design with year-based partitioning
- **Architecture:** Eventual consistency, Mobile-First design
- **Methodology:** Agentic Parallel Development with Gherkin-driven iterations

## Authoritative Specifications

| Document | Location | Purpose |
|----------|----------|---------|
| **Product Vision** | `docs/PRODUCT_VISION.md` | Top-level requirements, feature specs, use cases |
| **Design Guidelines** | `docs/frontend/DESIGN_GUIDELINES.md` | UX/UI specs, interactions, visual design (use for Gherkin feature files) |
| **DynamoDB Specification** | `docs/backend/dynamodb-spec/01-OVERVIEW.md` | Complete database design with phase-specific docs |
| **Master Roadmap** | `TODO.md` | Current status and task tracking |

## Knowledge Map (Read ONLY what you need)

### 1. The Rules (Immutable Context)
* **Roles & Workflows:** `docs/core/AGENT_ROLES.md` (Who you are, who to hand off to)
* **Technology Hard Limits:** `docs/core/TECH_STACK.md` (Strict version locks)
* **Development Process:** `docs/core/PROCESS.md` (The Iteration Lifecycle)
* **Model Selection:** `docs/core/MODEL_SELECTION.md` (When to use Opus/Sonnet/Haiku)
* **Token Efficiency:** `docs/core/TOKEN_EFFICIENCY.md` (Minimize context and cost)
* **Recovery Strategies:** `docs/core/RECOVERY_STRATEGIES.md` (How to handle stuck states)

### 2. Domain Specifics (Context on Demand)
* **Frontend Agent:** Read `docs/frontend/CODING_STANDARDS_FRONTEND.md` + `docs/frontend/DESIGN_GUIDELINES.md`
* **Backend Agent:** Read `docs/backend/CODING_STANDARDS_BACKEND.md` + relevant phase doc from `docs/backend/dynamodb-spec/`
* **DynamoDB Architect:** Read `docs/backend/DYNAMODB_ARCHITECT_SKILL.md` + `docs/backend/DYNAMODB_CONVENTIONS.md` + `docs/backend/dynamodb-spec/`
* **DynamoDB Design:** Read `docs/backend/DYNAMODB_CONVENTIONS.md` (THE LAW)
* **Shared Contract:** Read `packages/shared/src/types/` (Types/Constants)

### 3. Current State (Dynamic Context)
* **Master Roadmap:** `TODO.md` (Root level)
* **Current Iteration:** Check `docs/iterations/` for the latest timestamped folder.
    * `PLAN.md`: Your instructions for the current task.
    * `WORK_LOG.md`: Where you log your actions.

## Prime Directives
1.  **No Hallucinations:** Do not install libraries not listed in `TECH_STACK.md`.
2.  **No Context Dumping:** Do not read all files. Read only the "Knowledge Map" files relevant to your current role.
3.  **Gherkin is Law:** You cannot mark a task "Done" until the specific Gherkin scenarios in the Plan pass.
4.  **One Source of Truth:**
    * Product Requirements → `docs/PRODUCT_VISION.md`
    * UX/UI Design → `docs/frontend/DESIGN_GUIDELINES.md`
    * API Contracts → `packages/shared/src/types`
    * Database Schema → `docs/backend/dynamodb-spec/` (phase-specific docs)
    * DynamoDB Conventions → `docs/backend/DYNAMODB_CONVENTIONS.md`
5.  **Iteration Start:** All work MUST begin with `./scripts/start-iteration.sh "Feature Name"`. Manual folder creation is forbidden.
6.  **Branch Naming:** All branches must follow `claude/YYMMDD-descriptive-name` format.
7.  **Model Efficiency:** Use the right model for the task (see `MODEL_SELECTION.md`). Start cheap, escalate when stuck.
8.  **Recovery Protocol:** When stuck 2+ times on same issue, stop, document, escalate model, and review failed approaches before trying again.

## Directory Structure
```text
/
├── apps/
│   ├── api/                 # AWS Lambda backend (Serverless Framework)
│   └── web/                 # Next.js 16+ frontend (App Router)
├── packages/
│   ├── shared/              # Shared Types & Schemas (NPM Workspace)
│   ├── eslint-config/       # Shared ESLint configuration
│   └── tsconfig/            # Shared TypeScript configuration
├── docs/
│   ├── PRODUCT_VISION.md    # Top-level product requirements
│   ├── core/                # Roles, Tech Stack, Process
│   ├── frontend/            # Standards, Design Guidelines
│   ├── backend/             # DynamoDB Conventions, dynamodb-spec/
│   ├── specs/               # Living Gherkin Feature files
│   └── iterations/          # Active & Past Work Logs
└── scripts/                 # CI/CD and Agent utilities
```

## DynamoDB Specification Structure

The database design is split into focused documents by implementation phase:

| Document | Phase | Content |
|----------|-------|---------|
| `01-OVERVIEW.md` | All | Architecture overview, design decisions |
| `02-TABLE-CONFIG-AND-INDEXES.md` | Foundation | Table schema, GSI definitions |
| `03-PHASE1-CALENDAR.md` | 1 | EVENT, MASTER, INSTANCE, USER_META |
| `04-PHASE2-TASKS.md` | 2 | TASK entity with Kanban support |
| `05-PHASE3-REMINDERS.md` | 3 | REMINDER entity with snooze |
| `06-PHASE4-NOTES.md` | 4 | NOTE entity with Markdown |
| `07-PHASE5-CROSS-LINKING.md` | 5 | Cross-linking, Unified Agenda |
| `08-REST-API.md` | API | All endpoint contracts |
| `09-TESTING-AND-DEPLOYMENT.md` | Ops | Testing, deployment, monitoring |
