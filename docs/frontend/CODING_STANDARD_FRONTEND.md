# Frontend Coding Standards

**Scope:** Next.js 16+, React 19, Tailwind, Zustand, TanStack Query.
**Enforcement:** TypeScript Strict Mode + ESLint.

## 1. Directory Structure & Colocation
We follow a strict **colocation strategy**. Things that change together stay together.

### Component Structure
Do not group by file type (e.g., do NOT put all CSS in one folder). Group by Feature/Component.

```text
/components
└── /Button
    ├── Button.tsx          # Source
    ├── Button.test.tsx     # Unit Test
    ├── Button.stories.tsx  # Storybook Documentation
    └── index.ts            # Public Interface (Barrel export)
````

### Page Structure (Next.js App Router)

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

  * Always define a specific interface. Do not use `any`.
  * Extend HTML attributes when wrapping native elements.

<!-- end list -->

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  isLoading?: boolean;
}
```

### Server vs. Client Components

  * **Default to Server Components.**
  * Add `'use client'` at the top **only** when you need:
      * `useState`, `useEffect`, or custom hooks.
      * Event listeners (`onClick`).
      * Browser-only APIs (`window`, `localStorage`).

-----

## 3. State Management

### Server State (Data Fetching)

  * **Tool:** **TanStack Query** (React Query).
  * **Rule:** Never store API data in `useState` or `Zustand` unless you are transforming it significantly.
  * **Pattern:** Create custom hooks for every query.

<!-- end list -->

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
  * **Usage:** UI state (Sidebar open/close, Theme, Modals).
  * **Pattern:** Create small, specific stores. Avoid one giant "AppStore".

<!-- end list -->

```tsx
// stores/uiStore.ts
interface UIState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}
```

-----

## 4. Styling (Tailwind CSS)

  * **Utility First:** Use Tailwind utility classes for layout and spacing.
  * **No `@apply`:** Avoid using `@apply` in CSS files unless creating a reusable animation.
  * **Class Sorting:** Use the prettier plugin for class sorting if available, or order by: `Layout -> Box Model -> Typography -> Visuals`.
  * **Conditional Classes:** Use `clsx` or `cn` utility (if using shadcn/ui pattern).

-----

## 5. Testing Guidelines

### Unit Tests (Jest + RTL)

  * **Focus:** Test behavior, not implementation details.
  * **Selectors:** Use `screen.getByRole` (accessibility first) or `data-testid`.
  * **Mocking:** Mock strictly at the boundaries (API calls, heavy sub-components).

### Storybook

  * **Mandatory:** Every UI component must have a Story.
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


