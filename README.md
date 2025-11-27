# Nexus

A productivity application with calendar, tasks, reminders, and notes.

## Architecture

- **Frontend:** Next.js 16, React 19, Zustand, TanStack Query
- **Backend:** AWS Lambda (Node 20), DynamoDB (Single-Table Design), Serverless Framework
- **Database:** DynamoDB with year-based partitioning optimized for week-first calendar UI

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
nexus/
├── apps/
│   ├── web/              # Next.js frontend
│   └── api/              # AWS Lambda backend
├── packages/
│   ├── shared/           # Shared types & schemas
│   ├── eslint-config/    # Shared ESLint configuration
│   └── tsconfig/         # Shared TypeScript configuration
├── docs/                 # Documentation & specifications
│   ├── core/             # Architecture decisions
│   ├── backend/          # Backend standards & DB schema
│   ├── frontend/         # Frontend standards
│   └── specs/            # Gherkin specifications
├── scripts/              # Build & development scripts
└── CLAUDE.md             # Agent instructions
```

## Agent Usage

1. Read `PROJECT_OVERVIEW.md` to understand boundaries
2. Pick tasks from `TODO.md`
3. Log progress in iteration work logs