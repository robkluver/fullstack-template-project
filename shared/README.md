# Shared Library Standards

**Scope:** Pure TypeScript, Zod Schemas, API Contracts.
**Rule:** Code here must be platform-agnostic (runs in Node.js AND Browser).

## 1. Directory Structure

```text
shared/
├── src/
│   ├── types/           # Pure TypeScript Interfaces (DTOs)
│   ├── contracts/       # Zod Schemas (Runtime Validation)
│   ├── constants/       # Magic strings, Enums, API Routes
│   └── utils/           # Pure logic (formatting, calculations)
└── index.ts             # Public Export Barrel
````

## 2. Data Contracts (Zod vs Types)

We use a **Schema-First** approach. Define the Zod schema first, then infer the TypeScript type.

**Why:** This ensures runtime validation (Backend) and compile-time checking (Frontend) always match.

**Example: `shared/src/contracts/auth.ts`**

```typescript
import { z } from 'zod';

// 1. Define Zod Schema (Runtime)
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// 2. Infer TypeScript Type (Static)
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
```

## 3. API Response Format

All API responses must follow this standardized envelope.

**File: `shared/src/types/api.ts`**

```typescript
export interface ApiResponse<T> {
  data: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    page: number;
    total: number;
  };
}
```

## 4. Rules & Constraints

1.  **No Side Effects:** Files must simply export functions/types. No global executions.
2.  **No Platform Specifics:**
      * ❌ No `window` or `document` (breaks Backend).
      * ❌ No `fs` or `path` (breaks Frontend).
3.  **No Heavy Dependencies:** Do not import huge libraries (e.g., `lodash`). Keep the bundle size small.

## 5. Publishing / Workflow

  * This folder acts as a local NPM workspace (`@nexus/shared`).
  * **Backend:** Imports to validate inputs in Handlers.
  * **Frontend:** Imports to type API calls and validate forms.
