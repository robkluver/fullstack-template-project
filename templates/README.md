# Project Templates

This directory contains starter templates for different project configurations.

**Recommended:** Use the `create-project.js` script instead of manual setup:

```bash
node scripts/create-project.js --name "My App" --type fullstack
```

## Manual Setup

If you prefer manual setup, copy the relevant files:

### Fullstack (Frontend + Backend)
```bash
# Root
cp templates/package.root.json package.json
cp templates/turbo.json turbo.json

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

mkdir -p apps/web
cp templates/package.web.json apps/web/package.json

mkdir -p packages/shared
cp templates/package.shared.json packages/shared/package.json
```

### Backend Only
```bash
cp templates/package.root.json package.json
cp templates/turbo.json turbo.json

mkdir -p apps/api
cp templates/package.api.json apps/api/package.json

mkdir -p packages/shared
cp templates/package.shared.json packages/shared/package.json
```

## Template Files

| File | Purpose |
|------|---------|
| `package.root.json` | Root monorepo package.json (includes workspaces) |
| `package.web.json` | Next.js frontend app |
| `package.api.json` | AWS Lambda backend |
| `package.shared.json` | Shared types/schemas |
| `turbo.json` | Turborepo task configuration |

## After Setup

1. Install dependencies: `yarn install`
2. Run development: `yarn dev`
3. Run tests: `yarn test`
4. Build: `yarn build`
