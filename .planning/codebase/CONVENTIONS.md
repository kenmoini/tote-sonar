# Coding Conventions

**Analysis Date:** 2026-02-28

## Naming Patterns

**Files:**
- Page components: `page.tsx` in Next.js app directory structure (e.g., `src/app/totes/page.tsx`)
- Route handlers: `route.ts` in Next.js api directory (e.g., `src/app/api/totes/route.ts`)
- Component files: PascalCase with `.tsx` extension (e.g., `ErrorDisplay.tsx`, `Navigation.tsx`)
- Type/interface files: lowercase with `.ts` extension (e.g., `index.ts`)
- Utilities/libraries: lowercase with `.ts` extension (e.g., `db.ts`)

**Functions:**
- Async functions: camelCase prefixed with verb when appropriate (e.g., `handleCreateTote`, `fetchDashboard`, `fetchTotes`)
- Handler functions: prefixed with `handle` (e.g., `handleCreateTote`, `handleSort`, `handleSearch`)
- Fetch functions: prefixed with `fetch` (e.g., `fetchTotes`, `fetchDefaults`, `fetchDashboard`)
- Utility functions: camelCase with descriptive verbs (e.g., `generateToteId`, `isNetworkError`, `getErrorInfo`)
- API route handlers: `GET`, `POST`, `PUT`, `DELETE` (uppercase)

**Variables:**
- State variables: camelCase (e.g., `totes`, `loading`, `error`, `selectedTotes`)
- Ref variables: camelCase (e.g., `actionsRef`, `creatingRef`, `addItemFileInputRef`)
- Type-specific state: follows pattern `show<Feature>` or `<action><Feature>` (e.g., `showCreateForm`, `showDeleteConfirm`, `editingTote`)
- Loading states: `<action>ing` pattern (e.g., `creating`, `loading`, `deleting`, `editingTote`, `addingItem`)
- Error states: `<context>Error` pattern (e.g., `error`, `itemPhotoError`, `itemFormErrors`)
- Set state variables for toggles: `<feature>Toggled` or conditional (e.g., `selectMode`, `mobileMenuOpen`)

**Types:**
- Interfaces: PascalCase, prefixed with descriptive noun (e.g., `ErrorDisplayProps`, `ToteWithCount`, `DashboardData`, `ApiResponse`)
- Type unions: PascalCase (e.g., `SortField`, `SortOrder`, `QrLabelSize`)
- Imported types: use `interface` keyword in type definitions file (`src/types/index.ts`)
- Lowercase for simple types when used in code: `sortField`, `sortOrder`

## Code Style

**Formatting:**
- 2-space indentation (observed in all files)
- Semicolons required (enforced by TypeScript compilation)
- Single quotes for strings (JavaScript), double quotes for JSX attributes
- No trailing commas in multi-line function parameters
- File line length: appears to target around 100-120 characters but flexible for readability

**Linting:**
- ESLint: Not configured (no `.eslintrc.*` file present)
- Prettier: Not configured (no `.prettierrc` file present)
- TypeScript strict mode: Enabled (`"strict": true` in `tsconfig.json`)
- Next.js lint command available: `npm run lint` (uses Next.js default linting)

## Import Organization

**Order:**
1. External library imports (Next.js, React, third-party packages)
2. Internal component imports (using `@/` alias)
3. Type imports from `@/types`
4. File system imports (fs, path, etc.)

**Path Aliases:**
- `@/*` resolves to `./src/*` (configured in `tsconfig.json`)
- All relative imports use `@/` prefix for clarity
- Examples: `@/lib/db`, `@/components/Navigation`, `@/types`

**Import Style:**
- Named imports for specific exports
- Default imports for page components and route handlers
- Type imports: inline with variable imports (not using `type` keyword at import statement level based on observed code)

## Error Handling

**Patterns:**
- Try-catch blocks in all async functions (API routes and client components)
- API routes: Catch errors with `console.error()` logging, return `NextResponse.json()` with error message and HTTP status
- Client components: Catch errors with `err instanceof Error ? err.message : 'Unknown error'` pattern
- User-facing errors: Stored in state (e.g., `error`, `formErrors`) and displayed via error components or messages
- Validation errors: Collected in object state (e.g., `setFormErrors({ name: 'Name is required' })`) before submission
- Optional chaining used for safe null/undefined access: `data?.total_totes ?? 0`

**HTTP Status Codes Used:**
- 200: Successful GET/PUT requests
- 201: Successful POST (resource creation)
- 400: Validation errors, invalid request body
- 404: Resource not found
- 500: Server-side errors with generic message

**Example Error Pattern** (`src/app/api/totes/route.ts`):
```typescript
try {
  // operation
} catch (error) {
  console.error('Error <action>:', error);
  return NextResponse.json(
    { error: 'Failed to <action>' },
    { status: 500 }
  );
}
```

## Logging

**Framework:** `console` (console.error for errors, console.log for info)

**Patterns:**
- `console.error('Error <action>:', error)` - Used in API routes and error scenarios
- `console.log('Database connected:', DB_PATH)` - Used for initialization/configuration logging
- `console.log('Database schema initialized')` - Used for major system state changes
- No debug logging or verbose logging observed

**When to Log:**
- API errors with context of operation
- Database initialization and connection status
- Configuration loaded messages
- Schema initialization completion

## Comments

**When to Comment:**
- Comments explain WHY, not WHAT
- Single-line comments for non-obvious logic
- Block comments for complex validation logic

**JSDoc/TSDoc:**
- Limited use observed
- Function documentation found in `ErrorDisplay.tsx` for utility functions
- Simple pattern used:
```typescript
/**
 * Determines if an error is a network/connectivity error.
 */
function isNetworkError(error: string): boolean { ... }

/**
 * Returns a user-friendly error message and suggestion based on the error type.
 */
function getErrorInfo(error: string): { ... } { ... }
```

**Comment Examples from Codebase:**
- SQL injection prevention: `// Whitelist allowed sort columns to prevent SQL injection`
- Synchronous guards: `// Synchronous guard against double-submit (ref is updated instantly, unlike state)`
- State management: `// Pre-populate form fields with defaults when the create form is opened`
- Edge cases: `// Ensure uniqueness (extremely unlikely collision but handle it)`
- File system operations: `// Clean up photo files from disk`

## Function Design

**Size:**
- Most functions 10-50 lines
- Complex functions broken into smaller steps with intermediate variables
- Long functions acceptable when they handle complete workflows (e.g., `handleCreateTote` ~50 lines)

**Parameters:**
- Named parameters preferred
- Destructuring used for props (`{ error, onRetry, retryLabel }`)
- Type annotations required for all parameters
- NextRequest/NextResponse parameters in API routes explicitly destructured

**Return Values:**
- Explicit return statements
- Always return type declared for non-void functions
- JSON responses wrapped in `NextResponse.json()`
- React components return JSX (implicitly)

## Module Design

**Exports:**
- Default export for page components: `export default function TotesPage() { ... }`
- Default export for route handlers: `export async function GET(...) { ... }`
- Named exports for utility functions: `export function getDb()`, `export function generateToteId()`
- Default export for components: `export default function ErrorDisplay(...) { ... }`

**Barrel Files:**
- Central type definitions in `src/types/index.ts` - exports all type interfaces
- No other barrel files observed (components, utils have individual exports)

## Client vs Server Code

**Client Components:**
- Use `'use client'` directive at top of file
- Use React hooks: `useState`, `useEffect`, `useCallback`, `useRef`
- Can use browser APIs directly
- Examples: `src/app/page.tsx`, `src/app/totes/page.tsx`, `src/components/Navigation.tsx`

**Server Components:**
- No `'use client'` directive
- Cannot use hooks or browser APIs
- Examples: `src/app/layout.tsx`

**API Routes:**
- Located in `src/app/api/` directory
- Use Next.js `NextRequest` and `NextResponse` for handling HTTP
- Examples: `src/app/api/totes/route.ts`, `src/app/api/items/[id]/route.ts`

## Database Access

**Pattern:**
- Import `getDb()` from `@/lib/db` in API routes
- All database access through prepared statements: `db.prepare(sql).get()`, `.all()`, `.run()`
- Type casting after queries: `as Tote | undefined`, `as (Item & { ... })[]`
- No ORM used; raw SQL with parameterized queries for safety

---

*Convention analysis: 2026-02-28*
