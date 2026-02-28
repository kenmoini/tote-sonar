# Coding Conventions

**Analysis Date:** 2026-02-28

## Naming Patterns

**Files:**
- Page components: PascalCase with file extension (e.g., `Navigation.tsx`, `ErrorDisplay.tsx`)
- Route handlers: `route.ts` (Next.js standard)
- Types: `index.ts` in dedicated types directory
- Utility/lib files: camelCase (e.g., `db.ts`)

**Functions:**
- PascalCase for React components: `export default function Navigation() { }`
- camelCase for utility functions: `generateToteId()`, `getDb()`, `formatDate()`
- Event handlers: camelCase with `handle` prefix: `handleCreateTote()`, `handleSort()`, `toggleSelectMode()`
- Helper functions with underscore: `getErrorInfo()`, `isNetworkError()`

**Variables:**
- camelCase for all variables and constants: `formName`, `selectedTotes`, `maxUploadSize`
- UPPERCASE for constants in conditions: `ALLOWED_TYPES`, `THUMBNAIL_WIDTH`, `MAX_UPLOAD_SIZE`
- Use descriptive names: `creatingRef`, `bulkQrLabels`, `showDeleteConfirm`

**Types:**
- PascalCase for interfaces and types: `interface Tote { }`, `interface CreateToteInput { }`
- Append `Input` for API request types: `CreateToteInput`, `UpdateToteInput`
- Append `Props` for component props: `interface ErrorDisplayProps { }`
- Database field names use snake_case in database but are mapped to camelCase in TypeScript

**Database Field Naming:**
- Tables and columns use snake_case: `item_metadata`, `tote_id`, `created_at`
- Type definitions convert to camelCase: `created_at` becomes `created_at` in interfaces (maintains DB convention)
- Some interfaces use mixed naming reflecting database schema: `Item` has `tote_id`, `created_at`, `updated_at`

## Code Style

**Formatting:**
- No explicit linter/formatter detected in project
- Indentation: 2 spaces (Next.js standard)
- Line length: No hard limit enforced, but typically under 120 characters
- Trailing commas: Present in multi-line imports and objects

**Imports Organization:**
- Order: React/Next.js → Third-party libraries → Internal imports (`@/`)
- Example from `Navigation.tsx`:
  ```typescript
  import { useState } from 'react';
  import Link from 'next/link';
  import { usePathname, useRouter } from 'next/navigation';
  import { [...lucide icons...] } from 'lucide-react';
  import { [...types...] } from '@/types';
  import ErrorDisplay from '@/components/ErrorDisplay';
  ```

**Path Aliases:**
- `@/*` maps to `./src/*` (configured in `tsconfig.json`)
- Used consistently: `@/lib/db`, `@/types`, `@/components/...`

## Error Handling

**API Routes (Server):**
- Try-catch blocks wrapping entire route handlers
- Explicit error logging with `console.error()` at catch block
- Type-safe error handling with `instanceof Error` checks
- Validation before database operations
- HTTP status codes: 400 (Bad Request), 404 (Not Found), 500 (Internal Server Error)
- Example pattern from `src/app/api/totes/route.ts`:
  ```typescript
  try {
    // validation...
    // operation...
    return NextResponse.json({ data: tote }, { status: 201 });
  } catch (error) {
    console.error('Error creating tote:', error);
    return NextResponse.json(
      { error: 'Failed to create tote' },
      { status: 500 }
    );
  }
  ```

**Client Components (React):**
- Error state stored in component state: `const [error, setError] = useState<string | null>(null)`
- Error passed to `ErrorDisplay` component for UI rendering
- Try-catch in async functions with error message extraction
- User-friendly error messages in UI, technical details logged
- Network error detection with pattern matching

**Validation Strategy:**
- Client-side form validation before submission
- Form error state management: `const [formErrors, setFormErrors] = useState<{ name?: string }>({})`
- Server-side validation on all API endpoints
- Type-safe request body parsing with try-catch and type casting

## Logging

**Framework:** `console.log()` and `console.error()` (standard Node.js)

**Patterns:**
- Information logs: `console.log('Database connected:', DB_PATH)`
- Error logs: `console.error('Error fetching totes:', error)`
- Logs at critical initialization points (database connection)
- Error logging in catch blocks only (debug errors)
- No structured logging framework (Pino, Winston, etc.) detected

**Guidelines:**
- Use `console.error()` in API route catch blocks
- Use `console.log()` for startup/initialization messages only
- Include context in log messages (e.g., function name, resource being accessed)

## Comments

**When to Comment:**
- JSDoc comments for exported functions and types
- Inline comments for non-obvious logic
- SQL query comments for complex operations
- Database pragma comments explaining why (`// Force checkpoint of WAL data...`)

**JSDoc/TSDoc Usage:**
- Used sparingly, primarily for utility functions
- Example from `ErrorDisplay.tsx`:
  ```typescript
  /**
   * Determines if an error is a network/connectivity error.
   */
  function isNetworkError(error: string): boolean { }

  /**
   * Returns a user-friendly error message and suggestion based on the error type.
   */
  function getErrorInfo(error: string): { title: string; message: string; suggestion: string; isNetwork: boolean } { }
  ```

## Function Design

**Size Guidelines:**
- Component functions: 300-700 lines acceptable for complex pages (e.g., `TotesPage`)
- Route handlers: 100-200 lines typical
- Utility functions: 10-50 lines preferred
- Helper functions: 5-30 lines

**Parameters:**
- Named destructuring for React component props
- Named destructuring for API params: `{ params }: { params: Promise<{ id: string }> }`
- Use function overloading or union types for flexibility

**Return Values:**
- Explicit return types on exported functions
- Type annotations on all component exports
- NextResponse for API routes (not raw objects)
- React components return JSX.Element or React.ReactNode

## Module Design

**Exports:**
- Default exports for React components: `export default function Navigation() { }`
- Named exports for utility functions: `export function getDb() { }`
- Type exports with `export interface` and `export type`

**Barrel Files:**
- `src/types/index.ts` exports all type definitions centrally
- No barrel files for components (each imported individually)

**File Organization:**
- API routes follow Next.js App Router convention: `src/app/api/[resource]/route.ts`
- Component exports typically in same file
- Utility functions isolated in `lib/` directory
- Types centralized in `types/index.ts`

## State Management

**React Components:**
- `useState` for local component state
- `useCallback` with dependency arrays for memoized functions
- `useRef` for imperative values (e.g., `creatingRef`, `actionsRef`)
- State lifted to parent when needed by multiple children

**Async Patterns:**
- `useEffect` for side effects (data fetching)
- Fetch API with native promises
- Error and loading states managed separately
- Callback memoization to prevent infinite effect loops

**Example pattern from `src/app/totes/page.tsx`:**
```typescript
const [totes, setTotes] = useState<ToteWithCount[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

const fetchTotes = useCallback(async () => {
  try {
    setLoading(true);
    const res = await fetch(`/api/totes?sort=${sortBy}&order=${sortOrder}`);
    if (!res.ok) throw new Error('Failed to fetch totes');
    const json = await res.json();
    setTotes(json.data || []);
    setError(null);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load totes');
  } finally {
    setLoading(false);
  }
}, [sortBy, sortOrder]);

useEffect(() => {
  fetchTotes();
}, [fetchTotes]);
```

## TypeScript Configuration

**Strict Mode:** Enabled (`"strict": true`)

**Key Settings:**
- `target: "ES2017"` - Target JavaScript version
- `moduleResolution: "bundler"` - Resolve modules as bundler would
- `jsx: "react-jsx"` - Use React 17+ JSX transform
- `isolatedModules: true` - Each file can be transpiled independently
- Path aliases: `@/*` → `./src/*`

## Security Patterns

**SQL Injection Prevention:**
- Parameterized queries with `?` placeholders
- User input never interpolated directly into SQL
- Whitelist for sort columns: `const allowedSorts = ['name', 'location', ...]`

**File Upload Validation:**
- File type whitelist: `const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']`
- File size limit from settings with max enforced
- Unique filenames generated with crypto: `crypto.randomBytes(16).toString('hex')`

**Database Configuration:**
- Foreign key constraints enabled: `db.pragma('foreign_keys = ON')`
- WAL (Write-Ahead Logging) mode for durability: `db.pragma('journal_mode = WAL')`

---

*Convention analysis: 2026-02-28*
