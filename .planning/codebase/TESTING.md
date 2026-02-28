# Testing Patterns

**Analysis Date:** 2026-02-28

## Test Framework

**Runner:**
- Not detected - No testing framework configured

**Assertion Library:**
- Not applicable - No tests found

**Run Commands:**
- No test commands available in `package.json`
- Testing infrastructure is not set up

## Test File Organization

**Location:**
- No test files found in codebase (`src/**/*.test.*` and `src/**/*.spec.*` searches return no results)

**Naming:**
- Not applicable - No convention established

**Structure:**
- Not applicable - No tests implemented

## Test Coverage

**Requirements:**
- Not enforced - No testing framework configured

**Current Status:**
- 0% coverage - No tests exist

## Testing Strategy Observed in Code

### Manual Testing Patterns

While formal tests are not implemented, the codebase shows practices compatible with eventual testing:

**Type Safety:**
- TypeScript strict mode enabled (`"strict": true` in `tsconfig.json`)
- All function parameters have type annotations
- Interfaces defined for all data structures (`src/types/index.ts`)
- This provides compile-time validation and catches many errors before runtime

**Error Handling:**
- Comprehensive try-catch blocks in all async operations
- Validation before database mutations (see `src/app/api/totes/route.ts`)
- Form validation on client side before submission (see `src/app/totes/page.tsx`)
- HTTP status codes correctly set for different error conditions (400, 404, 500)

**Runtime Assertions:**
- Input validation through explicit checks:
```typescript
// From src/app/api/totes/route.ts
if (!body.name || (typeof body.name !== 'string')) {
  return NextResponse.json(
    { error: 'Name is required and must be a string' },
    { status: 400 }
  );
}
```

- Type checks for optional fields:
```typescript
if (body.size !== undefined && body.size !== null && typeof body.size !== 'string') {
  return NextResponse.json(
    { error: 'Size must be a string' },
    { status: 400 }
  );
}
```

- Quantity validation:
```typescript
const qty = Number(quantity);
if (isNaN(qty) || qty < 1 || !Number.isInteger(qty)) {
  return NextResponse.json(
    { error: 'Quantity must be a positive integer' },
    { status: 400 }
  );
}
```

**SQL Injection Prevention:**
- Parameterized queries used exclusively:
```typescript
db.prepare('SELECT * FROM items WHERE id = ?').get(itemId)
```

- Whitelist validation for sort columns:
```typescript
const allowedSorts = ['name', 'location', 'owner', 'created_at', 'updated_at'];
const safeSortBy = allowedSorts.includes(sortBy) ? sortBy : 'created_at';
```

## Areas Ready for Testing

**Unit Test Candidates:**
- `src/lib/db.ts` - Database utility functions:
  - `getDb()` - Connection pooling and initialization
  - `generateToteId()` - ID generation and uniqueness
  - `getUploadDir()` and `getThumbnailDir()` - Directory path resolution

- `src/types/index.ts` - Type definitions (compile-time only, but can validate interface contracts)

**Component Test Candidates (Would require Jest + React Testing Library):**
- `src/components/ErrorDisplay.tsx`:
  - `isNetworkError()` function - Different error message for network vs server errors
  - `getErrorInfo()` function - Error classification and messaging
  - Component rendering with different error types

- `src/components/Navigation.tsx`:
  - Navigation link active state logic
  - Mobile menu toggle
  - Search form submission

- `src/app/page.tsx` (Dashboard):
  - Data loading states
  - Empty state rendering
  - Recent items display

**API Route Test Candidates (Would require MSW or similar):**
- `src/app/api/totes/route.ts`:
  - GET: Sorting and filtering
  - POST: Tote creation with validation
  - Duplicate ID collision handling

- `src/app/api/items/[id]/route.ts`:
  - GET: Item details with related data
  - PUT: Item updates with validation
  - DELETE: Item and file cleanup

- `src/app/api/search/route.ts`:
  - Query parameter parsing
  - Multiple filter combinations
  - SQL query construction

**Integration Test Candidates:**
- Tote creation flow (form submission → API → list refresh)
- Item management workflow (add, edit, delete, fetch details)
- Search functionality with multiple filters
- File upload and photo handling
- Bulk operations (QR code generation, bulk delete)

## Common Testing Patterns (Not Yet Implemented)

### Recommended Test Structure for Future Implementation

**API Route Tests:**
```typescript
// Would test error handling, validation, database operations
describe('GET /api/totes', () => {
  it('should return totes sorted by created_at descending by default', async () => {
    // Test implementation
  });

  it('should validate sort column against whitelist', async () => {
    // Test SQL injection prevention
  });
});
```

**Component Tests:**
```typescript
// Would test rendering, state management, user interactions
describe('ErrorDisplay', () => {
  it('should display network error icon for network errors', () => {
    // Test implementation
  });

  it('should show retry button when onRetry callback provided', () => {
    // Test implementation
  });
});
```

**Utility Function Tests:**
```typescript
// Would test ID generation, error detection, data transformation
describe('generateToteId', () => {
  it('should generate 6-character alphanumeric IDs', () => {
    // Test implementation
  });

  it('should generate unique IDs', () => {
    // Test implementation
  });
});
```

## Testing Infrastructure Recommendations

**Framework Setup (Priority Order):**
1. **Jest** - Unit and API testing
   - Configure in `jest.config.js`
   - Add `@testing-library/react` for component testing
   - Add `@testing-library/jest-dom` for assertions

2. **MSW (Mock Service Worker)** - API mocking for tests
   - Mock all `fetch` calls in tests
   - Simulate different API responses

3. **Playwright** - E2E testing (optional for future)
   - Test full user workflows
   - Test QR code generation, bulk operations

**Test Files to Create:**
- `src/lib/db.test.ts` - Utility functions
- `src/components/ErrorDisplay.test.tsx` - Component and helper functions
- `src/components/Navigation.test.tsx` - Navigation logic
- `src/app/api/totes/route.test.ts` - API endpoint testing
- `src/app/api/items/[id]/route.test.ts` - Item operations

**Configuration Files Needed:**
- `jest.config.js` - Jest configuration
- `jest.setup.js` - Test environment setup
- Test utilities/helpers directory

## Current Test Approach

**Manual Testing Indicators:**
- Data attributes for accessibility testing: `data-testid="total-totes"`, `data-testid="total-items"` (found in `src/app/page.tsx`)
- Error states handled and displayed for manual verification
- Console logging for debugging: `console.error()` calls throughout
- Try-catch blocks in all async operations provide runtime error detection

**Gaps:**
- No automated regression testing
- No CI/CD integration for tests
- Manual testing required for all changes
- No coverage requirements or reports
- Complex client-side state management not validated by tests

---

*Testing analysis: 2026-02-28*
