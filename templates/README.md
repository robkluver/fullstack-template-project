# Project Templates

This directory contains starter templates for different project configurations.

## Usage

Copy the relevant files to set up your project:

### Fullstack (Frontend + Backend)
```bash
# Root
cp templates/package.root.json package.json
cp templates/turbo.json turbo.json
cp templates/pnpm-workspace.yaml pnpm-workspace.yaml

# Apps
mkdir -p apps/web apps/api
cp templates/package.web.json apps/web/package.json
cp templates/package.api.json apps/api/package.json

# Shared package
mkdir -p packages/shared
cp templates/package.shared.json packages/shared/package.json
```

### Frontend Only
```bash
cp templates/package.root.json package.json
cp templates/turbo.json turbo.json
cp templates/pnpm-workspace.yaml pnpm-workspace.yaml

mkdir -p apps/web
cp templates/package.web.json apps/web/package.json

mkdir -p packages/shared
cp templates/package.shared.json packages/shared/package.json
```

### Backend Only
```bash
cp templates/package.root.json package.json
cp templates/turbo.json turbo.json
cp templates/pnpm-workspace.yaml pnpm-workspace.yaml

mkdir -p apps/api
cp templates/package.api.json apps/api/package.json

mkdir -p packages/shared
cp templates/package.shared.json packages/shared/package.json
```

## Template Files

| File | Purpose |
|------|---------|
| `package.root.json` | Root monorepo package.json |
| `package.web.json` | Next.js frontend app |
| `package.api.json` | AWS Lambda backend |
| `package.shared.json` | Shared types/schemas |
| `turbo.json` | Turborepo task configuration |
| `pnpm-workspace.yaml` | pnpm workspace definition |

## After Setup

1. Install dependencies: `pnpm install`
2. Run development: `pnpm dev`
3. Run tests: `pnpm test`
4. Build: `pnpm build`
