# Technology Stack & Constraints

**CRITICAL:** Do not install libraries not listed here without explicit user permission.

---

## Project Variants

This template supports three configurations:

| Variant | Frontend | Backend | Use Case |
|---------|----------|---------|----------|
| **Fullstack** | Next.js SPA | AWS Lambda | Most common - web app with API |
| **Frontend-only** | Next.js SPA | - | Static site, JAMstack, external API |
| **Backend-only** | - | AWS Lambda | API service, MCP server, microservice |

---

## Frontend (Web)

| Technology | Version | Notes |
|------------|---------|-------|
| **Next.js** | 16.x | App Router, Cache Components, React Compiler |
| **React** | 19.x | Stable since Dec 2024 (19.2.0+) |
| **TypeScript** | 5.9+ | Strict Mode enabled |
| **Tailwind CSS** | 4.x | Utility-first styling |
| **Zustand** | 5.x | Client state management |
| **TanStack Query** | 5.x | Server state / data fetching |
| **Zod** | 3.x | Runtime validation |

### Frontend Testing
| Tool | Purpose |
|------|---------|
| **Jest** | Unit tests |
| **React Testing Library** | Component testing |
| **Storybook** | Component documentation & visual testing |
| **Playwright** | E2E testing |

### Frontend Dev Tools
| Tool | Purpose |
|------|---------|
| **ESLint** | Linting (flat config) |
| **Prettier** | Code formatting |
| **Husky** | Git hooks |
| **lint-staged** | Pre-commit linting |

---

## Backend (AWS Serverless)

| Technology | Version | Notes |
|------------|---------|-------|
| **Node.js** | 20.x or 22.x | AWS Lambda runtime |
| **TypeScript** | 5.9+ | Strict Mode enabled |
| **Terraform** | 1.9+ | Primary IaC |
| **AWS CDK** | 2.x | Alternative to Terraform |
| **Zod** | 3.x | Request/response validation |
| **TSyringe** | 4.x | Dependency injection |

### AWS Services (Approved)
| Service | Use Case |
|---------|----------|
| **Lambda** | Compute |
| **API Gateway** | HTTP endpoints |
| **DynamoDB** | Database (Single-Table Design) |
| **S3** | File storage |
| **EventBridge** | Event-driven architecture |
| **SQS** | Message queues |
| **Cognito** | Auth (optional, see AUTH_STRATEGY.md) |
| **CloudWatch** | Logging & monitoring |

### Backend Testing
| Tool | Purpose |
|------|---------|
| **Jest** | Unit tests |
| **aws-sdk-client-mock** | AWS service mocking |
| **DynamoDB Local** | Integration testing |

---

## Shared / Monorepo Tools

| Technology | Version | Notes |
|------------|---------|-------|
| **pnpm** | 9.x | Package manager (faster than yarn) |
| **Turborepo** | 2.x | Monorepo build orchestration |
| **TypeScript** | 5.9+ | Shared across packages |
| **Zod** | 3.x | Shared schemas |

### Monorepo Structure
```
/
├── apps/
│   ├── web/              # Next.js frontend
│   └── api/              # Lambda backend
├── packages/
│   ├── shared/           # Shared types, schemas, utils
│   ├── eslint-config/    # Shared ESLint config
│   └── tsconfig/         # Shared TypeScript config
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Authentication Strategy

See `docs/core/AUTH_STRATEGY.md` for detailed authentication patterns.

| Scenario | Recommended Approach |
|----------|---------------------|
| First-party web app | Session cookies + CSRF |
| Mobile app / SPA | JWT with refresh tokens |
| Third-party API access | Bearer tokens (API keys) |
| OAuth provider integration | OAuth 2.0 PKCE flow |
| B2B API access | OAuth 2.0 Client Credentials |
| MCP Server | Bearer token (simple) |

---

## Version Compatibility Matrix

Ensure these versions work together (as of Nov 2024):

```
Node.js 20.x/22.x
├── TypeScript 5.9.x
├── Next.js 16.x
│   └── React 19.x (stable, requires react@19.2.0+)
├── Jest 29.x
├── Tailwind 4.x
├── ESLint 9.x (flat config)
│   └── typescript-eslint 8.x
└── pnpm 9.x
```

**Compatibility Notes:**
- Next.js 16 requires React 19.2+ (uses React Compiler)
- Update `@types/react` and `@types/react-dom` for React 19
- ESLint 9 uses flat config by default (eslint.config.mjs)
- Tailwind 4 uses CSS-based config (no tailwind.config.js needed)

---

## Explicitly NOT Approved

Do not use without discussion:
- **Express.js** - Use Lambda handlers directly
- **Prisma** - Use DynamoDB with direct SDK
- **Redux** - Use Zustand instead
- **Axios** - Use native fetch
- **Moment.js** - Use date-fns or native Intl
- **Lodash** - Use native methods or es-toolkit
