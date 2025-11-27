# [Project Name] - Project Overview & Agent Directives

<!--
PLANNER AGENT: This file is your responsibility to complete when starting a new project.
Fill in the sections below with project-specific information.
Remove these HTML comments once you've completed the sections.
-->

## Context

<!--
PLANNER: Describe your project in 2-3 sentences.
Example: "MyApp is a task management application featuring projects, tasks, and team collaboration."
-->

**[Project Name]** is [brief description of what the application does].

- **Stack:** [e.g., Next.js (Frontend) + AWS Lambda (Backend)]
- **Database:** [e.g., DynamoDB Single-Table Design with year-based partitioning]
- **Architecture:** [e.g., Serverless, Mobile-First, Eventual consistency]
- **Methodology:** Agentic Parallel Development with Gherkin-driven iterations

## Authoritative Specifications

<!--
PLANNER: Update these paths once you create the project-specific documents.
-->

| Document | Location | Purpose |
|----------|----------|---------|
| **Product Vision** | `docs/PRODUCT_VISION.md` | Top-level requirements, feature specs, use cases (create this) |
| **Design Guidelines** | `docs/frontend/DESIGN_GUIDELINES.md` | UX/UI specs, interactions, visual design |
| **DynamoDB Specification** | `docs/backend/dynamodb-spec/` | Database design with phase-specific docs (create for your entities) |
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

<!--
PLANNER: Update this structure to match your project once it's set up.
-->

```text
/
├── apps/
│   ├── api/                 # AWS Lambda backend (Serverless Framework)
│   └── web/                 # Next.js frontend (App Router)
├── packages/
│   ├── shared/              # Shared Types & Schemas (NPM Workspace)
│   ├── eslint-config/       # Shared ESLint configuration
│   └── tsconfig/            # Shared TypeScript configuration
├── docs/
│   ├── PRODUCT_VISION.md    # Top-level product requirements (create this)
│   ├── core/                # Roles, Tech Stack, Process
│   ├── frontend/            # Standards, Design Guidelines
│   ├── backend/             # DynamoDB Conventions, dynamodb-spec/
│   ├── specs/               # Living Gherkin Feature files
│   └── iterations/          # Active & Past Work Logs
└── scripts/                 # CI/CD and Agent utilities
```

## DynamoDB Specification Structure

<!--
DYNAMODB ARCHITECT: Create these phase documents as you design entities for the project.
Follow the naming convention below.
-->

The database design should be split into focused documents by implementation phase:

| Document | Phase | Content |
|----------|-------|---------|
| `01-OVERVIEW.md` | All | Architecture overview, design decisions |
| `02-TABLE-CONFIG-AND-INDEXES.md` | Foundation | Table schema, GSI definitions |
| `03-PHASE1-[FEATURE].md` | 1 | First feature's entities |
| `04-PHASE2-[FEATURE].md` | 2 | Second feature's entities |
| `...` | ... | Additional phases as needed |
| `XX-REST-API.md` | API | All endpoint contracts |
| `XX-TESTING-AND-DEPLOYMENT.md` | Ops | Testing, deployment, monitoring |
