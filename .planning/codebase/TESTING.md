# Testing Patterns

**Analysis Date:** 2026-02-28

## Test Framework

**Status:** Not detected

**Current State:**
- No testing framework installed (jest, vitest, mocha, etc.)
- No test files found in codebase (`*.test.ts`, `*.spec.ts`)
- No test configuration files present (`jest.config.js`, `vitest.config.ts`, etc.)
- `package.json` contains no test-related dependencies

**Development Dependencies:**
- TypeScript (`^5.0.0`)
- @types packages for type checking only
- No testing libraries

## Manual Testing Approach

**What's Currently Tested:**
- API endpoints accessed via development server
- Components rendered in browser via Next.js dev server
- Database functionality through application usage

**How to Test Manually:**
```bash
npm run dev          # Start Next.js development server
# Test endpoints via:
# - Browser navigation to pages (http://localhost:3000)
# - curl/Postman for API endpoints (http://localhost:3000/api/*)
# - Browser console for client-side errors
```

## What Should Be Tested

### API Routes (High Priority)

**Location:** `src/app/api/**/*.ts`

**Critical Endpoints to Test:**
- `GET /api/totes` - List totes with sorting
- `POST /api/totes` - Create tote with validation
- `GET /api/items/[id]` - Get item details with related data
- `POST /api/items/[id]/photos` - Upload photos with validation
- `GET /api/search` - Search items with filters
- `POST /api/export` - Export database
- `POST /api/import` - Import database

**What to Test:**
- Happy path: Valid input returns correct response
- Validation: Invalid input returns 400 with error message
- Auth: Items/totes from different totes are isolated
- Edge cases: Empty arrays, null values, boundary conditions
- Error handling: Server errors return 500

### Component Rendering (Medium Priority)

**Location:** `src/components/**/*.tsx` and `src/app/**/*.tsx`

**Critical Components:**
- `Navigation.tsx` - Links, search, mobile menu toggle
- `ErrorDisplay.tsx` - Different error types display correct icons/messages
- `Breadcrumb.tsx` - Link generation and styling
- `TotesPage` - List rendering, sorting, bulk selection, creation
- `ToteDetailPage` - Item management, photos, editing

**What to Test:**
- Component renders with given props
- Event handlers fire correctly (button clicks, form submissions)
- Conditional rendering (loading, error, empty states)
- Props validation and defaults

### Client Logic (Medium Priority)

**Key Functions:**
- `isNetworkError()` in `ErrorDisplay.tsx` - Pattern matching for network errors
- `formatDate()` in `TotesPage` - Date formatting consistency
- `generateToteId()` in `db.ts` - ID generation uniqueness
- State management and hooks behavior

### Database Integration (High Priority)

**Location:** `src/lib/db.ts`

**What to Test:**
- Database initialization creates all tables
- Schema constraints (foreign keys, unique fields)
- Data persistence across application restarts
- Transaction behavior (bulk operations)
- Edge cases: Large datasets, concurrent access

## Validation Patterns Currently in Code

### Client-Side Validation (Forms)

**Pattern from `src/app/totes/page.tsx`:**
```typescript
const handleCreateTote = async (e: React.FormEvent) => {
  e.preventDefault();

  // Validate
  const errors: { name?: string; location?: string } = {};
  if (!formName.trim()) errors.name = 'Name is required';
  if (!formLocation.trim()) errors.location = 'Location is required';
  if (Object.keys(errors).length > 0) {
    setFormErrors(errors);
    return;
  }

  // Proceed with API call
  try {
    const res = await fetch('/api/totes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formName.trim(),
        location: formLocation.trim(),
        // ...
      }),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to create tote');
    }
    // Handle success
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Failed to create tote', 'error');
  }
};
```

### Server-Side Validation (API Routes)

**Pattern from `src/app/api/totes/route.ts` (POST handler):**
```typescript
try {
  let body: CreateToteInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid or empty request body. JSON with at least "name" and "location" fields is required.' },
      { status: 400 }
    );
  }

  // Handle non-object body
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json(
      { error: 'Request body must be a JSON object with "name" and "location" fields.' },
      { status: 400 }
    );
  }

  // Validate required fields
  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json(
      { error: 'Name is required and must be a string' },
      { status: 400 }
    );
  }

  if (!body.name.trim()) {
    return NextResponse.json(
      { error: 'Name is required' },
      { status: 400 }
    );
  }

  // Similar for other fields...

  // Proceed with database insert
} catch (error) {
  console.error('Error creating tote:', error);
  return NextResponse.json(
    { error: 'Failed to create tote' },
    { status: 500 }
  );
}
```

### Photo Upload Validation

**Pattern from `src/app/api/items/[id]/photos/route.ts`:**
```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const THUMBNAIL_WIDTH = 200;

// Validate file type
if (!ALLOWED_TYPES.includes(file.type)) {
  return NextResponse.json(
    { error: `Invalid file type: ${file.type}. Supported formats: JPEG, PNG, WebP` },
    { status: 400 }
  );
}

// Validate file size
if (file.size > maxSize) {
  const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
  return NextResponse.json(
    { error: `File size exceeds maximum of ${maxSizeMB}MB` },
    { status: 400 }
  );
}
```

## Error Handling Patterns in Code

**Network Error Detection:**
From `src/components/ErrorDisplay.tsx`:
```typescript
function isNetworkError(error: string): boolean {
  const networkPatterns = [
    'failed to fetch',
    'network error',
    'networkerror',
    'load failed',
    'fetch failed',
    'err_connection_refused',
    'econnrefused',
    'net::err_',
    'typeerror: failed to fetch',
    'the network connection was lost',
    'the internet connection appears to be offline',
    'a network error occurred',
    'unable to connect',
  ];
  const lowerError = error.toLowerCase();
  return networkPatterns.some(pattern => lowerError.includes(pattern));
}
```

**Error State Management:**
```typescript
const [error, setError] = useState<string | null>(null);

const fetchData = useCallback(async () => {
  try {
    setLoading(true);
    const res = await fetch('/api/endpoint');
    if (!res.ok) throw new Error('Failed to fetch');
    const json = await res.json();
    setError(null);
    // Update data...
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Unknown error');
  } finally {
    setLoading(false);
  }
}, []);
```

## Recommended Testing Framework Setup

**If implementing tests, recommend:**

1. **Testing Framework:** Vitest
   - Modern, fast, ESM-native
   - Better TypeScript support than Jest
   - Works well with Next.js
   ```bash
   npm install -D vitest @vitest/ui happy-dom
   ```

2. **Component Testing:** React Testing Library
   ```bash
   npm install -D @testing-library/react @testing-library/user-event
   ```

3. **API Testing:** msw (Mock Service Worker) for intercepting fetch calls
   ```bash
   npm install -D msw
   ```

4. **Database Testing:** Use in-memory SQLite for unit tests
   ```bash
   npm install -D sqlite3  # Or use better-sqlite3 in memory mode
   ```

## Test File Organization Pattern

**Recommended structure:**
```
src/
├── app/
│   ├── api/
│   │   └── totes/
│   │       ├── route.ts
│   │       └── route.test.ts
│   └── page.tsx
├── components/
│   ├── Navigation.tsx
│   └── Navigation.test.tsx
└── lib/
    ├── db.ts
    └── db.test.ts
```

**Convention:** Co-located test files with `.test.ts` suffix next to source files

## Coverage Gaps

**Critical areas without tests:**
1. API validation logic - Direct user input handling
2. Database transactions - Concurrent operations, rollback
3. Photo upload processing - Sharp image transformations
4. Export/Import functionality - Data serialization/deserialization
5. QR code generation - Multiple endpoints
6. Search filters - Complex query building

## Performance Testing

**Not currently implemented.**

**Should test:**
- Bulk operations (50+ QR code generation)
- Large import files (size limits)
- Search performance with large datasets
- Database query performance with indexes

---

*Testing analysis: 2026-02-28*
