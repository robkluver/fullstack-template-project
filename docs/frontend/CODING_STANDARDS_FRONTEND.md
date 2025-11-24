# Frontend Coding Standards

**Scope:** Next.js 16+, React 19, Tailwind CSS, Zustand, TanStack Query.
**Enforcement:** TypeScript Strict Mode + ESLint.

## 1. Directory Structure & Colocation
We follow a strict **Feature-based Colocation** strategy. Things that change together stay together. Do not group by file type.

### Component Structure
Every component gets its own directory.
```text
/components
└── /Button
    ├── Button.tsx          # Source
    ├── Button.test.tsx     # Unit Test (Jest + RTL)
    ├── Button.stories.tsx  # Storybook Documentation
    └── index.ts            # Public Interface (Barrel export)
````

### App Router Structure

Pages are grouped by route. Shared components specific to a route stay with that route.

```text
/app
└── /dashboard
    ├── page.tsx            # Server Component (Data fetching)
    ├── layout.tsx          # Layout wrapper
    └── _components/        # Components specific ONLY to dashboard
```

-----

## 2. Component Patterns

### Definition

  * **Function Components Only.** No Class components.
  * **Named Exports Only.** No `default export`.
      * *Why:* Better refactoring support and explicit naming in imports.
      * *Bad:* `export default function Button...`
      * *Good:* `export function Button...`

### Props Interface

  * Always define a specific interface named `[ComponentName]Props`.
  * **No `any`:** If the type is truly unknown, use `unknown` and narrow it.
  * Extend native HTML attributes when wrapping elements.


```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  isLoading?: boolean;
}

export function Button({ variant = 'primary', isLoading, ...props }: ButtonProps) {
  // ...
}
```

### Server vs. Client Components

  * **Default to Server Components.**
  * Add `'use client'` at the top **only** when you need:
      * `useState`, `useEffect`, or custom hooks.
      * Event listeners (`onClick`, `onChange`).
      * Browser-only APIs (`window`, `localStorage`).

-----

## 3. State Management

### Server State (Data Fetching)

  * **Tool:** **TanStack Query** (React Query).
  * **Rule:** Never store API data in `useState` or `Zustand` unless you are transforming it significantly for UI interactions.
  * **Pattern:** Create custom hooks for every query.

```tsx
// hooks/useUser.ts
export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => api.getUser(id),
    staleTime: 5 * 60 * 1000, // 5 mins
  });
}
```

### Global Client State

  * **Tool:** **Zustand**.
  * **Usage:** Pure UI state (Sidebar open/close, Theme, Modals, Complex Form Wizards).
  * **Pattern:** Create small, specific stores. Avoid one giant "AppStore".


```tsx
// stores/uiStore.ts
interface UiState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}));
```

-----

## 4. Styling (Tailwind CSS)

  * **Utility First:** Use Tailwind utility classes for layout and spacing.
  * **No `@apply`:** Avoid using `@apply` in CSS files. Keep styles in the JSX to maintain locality.
  * **Conditional Classes:** Use a utility like `clsx` or `cn` (shadcn/ui pattern) for dynamic class names.

```tsx
// ✅ Good
<div className={cn("bg-blue-500 p-4", isError && "bg-red-500")}>
```

-----

## 5. Testing Guidelines

### Unit Tests (Jest + React Testing Library)

  * **Focus:** Test behavior, not implementation details.
  * **Selectors:** Use `screen.getByRole` (accessibility first) or `data-testid` if necessary.
  * **Mocking:** Mock strictly at the boundaries (API calls, heavy sub-components).

### Storybook

  * **Mandatory:** Every UI component must have a `.stories.tsx` file.
  * **Variants:** Create stories for `Default`, `Loading`, `Error`, and `Empty` states.

-----

## 6. Naming Conventions

| Type | Case | Example |
| :--- | :--- | :--- |
| **Components** | PascalCase | `UserProfile.tsx` |
| **Hooks** | camelCase | `useAuth.ts` |
| **Utilities** | camelCase | `formatDate.ts` |
| **Constants** | UPPER\_SNAKE | `MAX_RETRY_COUNT` |
| **Types/Interfaces**| PascalCase | `UserResponse` |
| **Stores** | camelCase | `authStore.ts` |

