# Project Template

A reusable project template for Claude-assisted fullstack development.

## Quick Start

Create a new project from this template:

```bash
node scripts/create-project.js --name "My App" --type fullstack --scope @mycompany
```

Or copy this template directory and customize it manually.

## Template Features

- **Agent Roles:** Pre-configured Claude Code slash commands for Planner, Frontend, Backend, QA, Tech Lead, and DynamoDB Architect roles
- **Development Process:** Iteration-based workflow with checkpoints, PLAN.md, WORK_LOG.md, and RETRO.md
- **Coding Standards:** Frontend (React/Next.js) and Backend (Lambda/DynamoDB) conventions
- **Monorepo Structure:** Turborepo with shared ESLint, TypeScript, and Prettier configs
- **Frontend Scaffold:** Next.js with Tailwind CSS, Zustand, TanStack Query
- **Backend Scaffold:** AWS Lambda with Serverless Framework, DynamoDB single-table design

## Documentation

| Document | Purpose |
|----------|---------|
| `docs/core/AGENT_ROLES.md` | Role definitions and handoff protocols |
| `docs/core/PROCESS.md` | Iteration lifecycle |
| `docs/core/MODEL_SELECTION.md` | When to use Opus/Sonnet/Haiku |
| `docs/core/TOKEN_EFFICIENCY.md` | Context optimization |
| `docs/core/RECOVERY_STRATEGIES.md` | Handling stuck states |
| `docs/core/TECH_STACK.md` | Approved libraries and versions |
| `docs/frontend/CODING_STANDARDS_FRONTEND.md` | React/Next.js conventions |
| `docs/backend/CODING_STANDARDS_BACKEND.md` | Lambda/DynamoDB conventions |
| `docs/backend/DYNAMODB_CONVENTIONS.md` | Single-table design principles |
| `docs/backend/DYNAMODB_ARCHITECT_SKILL.md` | Alex DeBrie patterns (The DynamoDB Book) |
| `docs/frontend/DESIGN_GUIDELINES.md` | UX/UI design system |

## Creating a New Project

After setting up from this template, you should:

1. Update `PROJECT_OVERVIEW.md` with your project context
2. Create `docs/PRODUCT_VISION.md` with your requirements
3. Update `TODO.md` with your roadmap
4. Create `docs/backend/dynamodb-spec/` for your database schema (if using DynamoDB)
5. Create `docs/specs/` for your Gherkin feature files

## Development

```bash
# Install dependencies
yarn install

# Start development servers
yarn dev

# Run tests
yarn test

# Build for production
yarn build
```

## Project Structure

```
/
├── apps/
│   ├── web/              # Next.js frontend
│   └── api/              # AWS Lambda backend
├── packages/
│   ├── shared/           # Shared types & schemas
│   ├── eslint-config/    # Shared ESLint configuration
│   └── tsconfig/         # Shared TypeScript configuration
├── docs/                 # Documentation & specifications
│   ├── core/             # Roles, Tech Stack, Process
│   ├── backend/          # Backend standards & DynamoDB conventions
│   ├── frontend/         # Frontend standards & Design Guidelines
│   ├── specs/            # Gherkin specifications (create for your project)
│   └── iterations/       # Iteration work logs (created by scripts)
├── scripts/              # Build & development scripts
├── templates/            # Templates for create-project.js
├── CLAUDE.md             # Agent instructions
├── PROJECT_OVERVIEW.md   # Project context (customize for your project)
└── TODO.md               # Project roadmap
```

## Agent Usage

1. Read `PROJECT_OVERVIEW.md` to understand project boundaries
2. Activate a role using slash commands (`/act-planner`, `/act-backend`, etc.)
3. Pick tasks from `TODO.md`
4. Start an iteration with `./scripts/start-iteration.sh "Feature Name"`
5. Log progress in `docs/iterations/.../WORK_LOG.md`
