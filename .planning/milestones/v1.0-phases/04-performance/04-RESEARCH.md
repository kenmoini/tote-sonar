# Phase 4: Performance - Research

**Researched:** 2026-03-01
**Domain:** SQLite indexing, search pagination (OFFSET/LIMIT), dashboard query optimization
**Confidence:** HIGH

## Summary

Phase 4 is a pure performance optimization phase with no new features. It addresses three requirements: search pagination (PERF-01), database indexing (PERF-02), and dashboard query optimization (PERF-03). The codebase is a Next.js 16 App Router application using better-sqlite3 in WAL mode with synchronous queries.

The current search route (`/api/search`) returns up to 100 results with no pagination support. The schema in `src/lib/db.ts` has no indexes beyond primary keys -- foreign key columns (`items.tote_id`, `item_photos.item_id`, `tote_photos.tote_id`, `item_metadata.item_id`, `item_movement_history.item_id/from_tote_id/to_tote_id`) are all unindexed. The dashboard route already uses a reasonable pattern (4 queries: 2 counts + 2 recents with LIMIT 10), but its JOIN and subquery performance will benefit from the same foreign key indexes.

The technical approach is straightforward: add `CREATE INDEX IF NOT EXISTS` statements to `initializeSchema()`, extend the search API with `page`/`limit` params and a separate COUNT query, and add a pagination UI component to the search page. No new dependencies are needed. All work uses existing patterns already established in the codebase.

**Primary recommendation:** Add indexes first (PERF-02), then pagination API + UI (PERF-01), then verify dashboard performance (PERF-03). Indexes are foundational -- they improve everything else.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Search Pagination UX**: Page number navigation (1-2-3 style) at the bottom of search results. Full URL state -- page number, query, and all filters preserved in URL params for shareability/bookmarkability. When any filter changes (location, owner, metadata key), reset to page 1. Claude decides results per page based on UI density.
- **Dashboard Loading**: Keep single-load pattern -- one API call, one loading spinner. Keep item counts per tote in the recent totes query (GROUP BY with index will be fast). Optimize queries with indexes and limited scope rather than changing the loading architecture.
- **Result Count and Feedback**: Show exact count with range: "Showing 1-20 of 347 results". Show total page count: "Page 2 of 18". Requires a COUNT query alongside the data query.
- **Scale Expectations**: Proactive optimization -- no specific pain points today, preparing for growth. Target: handles hundreds of totes and thousands of items without degradation. No monitoring infrastructure needed -- just make it fast.

### Claude's Discretion
- Results per page (20 vs 50 -- pick based on UI density and item card size)
- Loading state between page transitions (subtle inline vs full spinner -- match existing app patterns)
- Whether tote list view also gets pagination (roadmap says "search pagination" but tote list may benefit too)
- Dashboard recents limit (keep at 10 or adjust)
- Empty state improvements for zero search results (keep current or add suggestions)
- Query logging / monitoring (not needed unless implementation reveals issues)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PERF-01 | Search supports pagination with offset/limit parameters (no 100-result hard cap) | Search API modification pattern, COUNT query approach, pagination component architecture, URL state management via `useSearchParams` |
| PERF-02 | Database has indexes on foreign key columns and frequently filtered columns (location, owner) | Complete index list, `CREATE INDEX IF NOT EXISTS` syntax, `EXPLAIN QUERY PLAN` verification approach |
| PERF-03 | Dashboard queries are optimized (limited scope, first photo only per item) | Dashboard already uses LIMIT 10 and first-photo subqueries; indexes on foreign keys will optimize JOIN and subquery performance |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | ^12.0.0 | SQLite database, index creation, EXPLAIN QUERY PLAN | Already in use; synchronous API, no new dependency needed |
| Next.js | ^16.0.0 | App Router, API routes, URL search params | Already in use; `useSearchParams` for pagination state |
| React | ^19.2.0 | UI rendering, pagination component | Already in use |
| Zod | ^4.3.6 | Validation of pagination params | Already in use for search param validation |

### Supporting
No new dependencies needed. This phase is entirely about optimizing existing code.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate COUNT query | `COUNT(*) OVER()` window function | Window function avoids second query but forces total into every row; separate COUNT is cleaner, easier to understand, and negligible overhead for SQLite at this scale |
| OFFSET/LIMIT pagination | Keyset (cursor) pagination | Keyset is faster for deep pages but requires ordered unique column, complex URL state, no arbitrary page jumps -- overkill for personal-scale app with thousands of items |

## Architecture Patterns

### Index Placement in Schema Initialization

Indexes go in `initializeSchema()` in `src/lib/db.ts`, immediately after the CREATE TABLE statements. Use `CREATE INDEX IF NOT EXISTS` for idempotent creation.

```typescript
// Source: SQLite official documentation
// Add after existing CREATE TABLE statements in initializeSchema()
database.exec(`
  -- Foreign key indexes (PERF-02)
  CREATE INDEX IF NOT EXISTS idx_items_tote_id ON items(tote_id);
  CREATE INDEX IF NOT EXISTS idx_item_photos_item_id ON item_photos(item_id);
  CREATE INDEX IF NOT EXISTS idx_tote_photos_tote_id ON tote_photos(tote_id);
  CREATE INDEX IF NOT EXISTS idx_item_metadata_item_id ON item_metadata(item_id);
  CREATE INDEX IF NOT EXISTS idx_item_movement_history_item_id ON item_movement_history(item_id);
  CREATE INDEX IF NOT EXISTS idx_item_movement_history_from_tote_id ON item_movement_history(from_tote_id);
  CREATE INDEX IF NOT EXISTS idx_item_movement_history_to_tote_id ON item_movement_history(to_tote_id);

  -- Filter column indexes (PERF-02)
  CREATE INDEX IF NOT EXISTS idx_totes_location ON totes(location);
  CREATE INDEX IF NOT EXISTS idx_totes_owner ON totes(owner);

  -- Sort/order indexes for dashboard and search
  CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at);
  CREATE INDEX IF NOT EXISTS idx_totes_updated_at ON totes(updated_at);
`);
```

### Pagination API Pattern

The search API route adds `page` and `limit` query params. A separate COUNT query runs alongside the data query.

```typescript
// Source: Existing search route pattern + SQLite OFFSET/LIMIT documentation
// In /api/search/route.ts

// Parse pagination params
const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') || '1', 10) || 1);
const limit = Math.min(100, Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '20', 10) || 20));
const offset = (page - 1) * limit;

// COUNT query (same WHERE clause, no ORDER BY/LIMIT)
const countSql = `
  SELECT COUNT(*) as total
  FROM items i
  JOIN totes t ON i.tote_id = t.id
  ${whereClause}
`;
const { total } = db.prepare(countSql).get(...params) as { total: number };

// Data query (with OFFSET/LIMIT)
const dataSql = `
  SELECT i.*, t.name as tote_name, t.id as tote_id, t.location as tote_location
  FROM items i
  JOIN totes t ON i.tote_id = t.id
  ${whereClause}
  ORDER BY i.updated_at DESC
  LIMIT ? OFFSET ?
`;
const items = db.prepare(dataSql).all(...params, limit, offset);

// Response includes pagination metadata
return NextResponse.json({
  data: {
    items,
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
  },
});
```

### Pagination Validation Schema

Extend `SearchParamsSchema` in `src/lib/validation.ts`:

```typescript
export const SearchParamsSchema = z.object({
  q: z.string().max(500).optional(),
  location: z.string().max(255).optional(),
  owner: z.string().max(255).optional(),
  metadata_key: z.string().max(255).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
```

### Pagination Component Architecture

A reusable `Pagination` component placed below search results. The search page manages `page` state via URL params, consistent with existing `q`, `location`, `owner`, `metadata_key` URL state.

```typescript
// src/components/Pagination.tsx
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

// Renders: [< Prev] [1] [2] [3] ... [18] [Next >]
// Shows "Showing 1-20 of 347 results" and "Page 2 of 18"
```

### URL State Pattern

The search page already uses `window.history.pushState` for URL updates. The `page` param joins the existing params:

```typescript
// Extend existing updateUrl function
const updateUrl = (q: string, loc: string, own: string, metaKey: string, page: number) => {
  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  if (loc.trim()) params.set('location', loc.trim());
  if (own.trim()) params.set('owner', own.trim());
  if (metaKey.trim()) params.set('metadata_key', metaKey.trim());
  if (page > 1) params.set('page', String(page));  // omit page=1 for cleaner URLs
  const qs = params.toString();
  window.history.pushState({}, '', `/search${qs ? '?' + qs : ''}`);
};
```

### Filter Reset Pattern

When any filter changes, reset to page 1. This is already the natural behavior since filter changes call `performSearch` which will set `page=1`:

```typescript
const handleLocationChange = (value: string) => {
  setLocationFilter(value);
  setCurrentPage(1);  // Reset to page 1
  // ... existing search logic
};
```

### EXPLAIN QUERY PLAN Verification

Use better-sqlite3 to verify index usage during development:

```typescript
// Verification script (not production code)
const db = getDb();
const plan = db.prepare(`
  EXPLAIN QUERY PLAN
  SELECT i.*, t.name as tote_name
  FROM items i
  JOIN totes t ON i.tote_id = t.id
  WHERE t.location LIKE ? COLLATE NOCASE
  ORDER BY i.updated_at DESC
  LIMIT 20 OFFSET 0
`).all('%garage%');

console.log(plan);
// Expected output should show:
// SEARCH items USING INDEX idx_items_tote_id (tote_id=?)
// SEARCH totes USING INDEX sqlite_autoindex_totes_1 (id=?)
// Not: SCAN items (which would indicate no index usage)
```

**Key indicators in EXPLAIN QUERY PLAN output:**
- `SEARCH ... USING INDEX idx_name` = Index is being used (good)
- `SEARCH ... USING COVERING INDEX idx_name` = Index contains all needed columns (best)
- `SCAN table_name` = Full table scan, no index (bad -- needs index)
- `USE TEMP B-TREE FOR ORDER BY` = Sorting in temp space (acceptable for small result sets)

### Anti-Patterns to Avoid
- **Skipping the COUNT query for "approximate" counts:** User explicitly wants exact "Showing X-Y of Z" counts. Always run the COUNT query.
- **Using window functions for count at this scale:** `COUNT(*) OVER()` bloats every row with the same number and fails on empty result sets (when OFFSET exceeds total). A separate COUNT query is cleaner.
- **Hardcoding pagination in CSS:** The pagination component should work for any page count, with ellipsis for large ranges.
- **Forgetting to cap max limit:** Always enforce `LIMIT <= 100` server-side to prevent abuse regardless of client input.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Page number range with ellipsis | Custom ellipsis logic from scratch | Simple helper function: show first, last, current +/- 1, and ellipsis markers | Edge cases with 1-2 pages, many pages, current near start/end |
| URL param serialization | Manual string concatenation | `URLSearchParams` (already used) | Handles encoding, empty values, special characters |
| Pagination param validation | Manual parseInt with fallbacks | Zod schema with `z.coerce.number()` (already established pattern) | Consistent with all other route validation |

**Key insight:** This phase adds no new dependencies. Every technique uses existing project patterns: Zod for validation, `URLSearchParams` for URL state, better-sqlite3 for queries, CSS from globals.css for styling.

## Common Pitfalls

### Pitfall 1: SQLite Does NOT Auto-Index Foreign Keys
**What goes wrong:** Developers assume foreign key constraints create indexes automatically (like MySQL InnoDB does). SQLite does not -- it only creates an index for PRIMARY KEY and UNIQUE constraints.
**Why it happens:** Other databases auto-index FKs, so it feels redundant to add indexes manually.
**How to avoid:** Explicitly create indexes on all FK columns with `CREATE INDEX IF NOT EXISTS`.
**Warning signs:** `EXPLAIN QUERY PLAN` shows `SCAN` on a table that should be joined via FK.

### Pitfall 2: OFFSET Performance Degrades at Scale
**What goes wrong:** SQLite still scans and discards rows up to the OFFSET value. At OFFSET 10000, it reads 10000 rows just to skip them.
**Why it happens:** OFFSET/LIMIT is inherently O(offset + limit), not O(limit).
**How to avoid:** For this project's target scale (thousands of items, not millions), OFFSET/LIMIT is fine. At 20 items per page, even page 100 (OFFSET 1980) is negligible for SQLite. No need for keyset pagination.
**Warning signs:** If the app ever needs to handle 100K+ items, keyset pagination would be warranted. Not a concern for personal-scale inventory.

### Pitfall 3: COUNT Query Uses Different WHERE Clause Than Data Query
**What goes wrong:** The COUNT and data queries drift apart -- one gets a filter update, the other doesn't. Result: "Showing 1-20 of 50 results" but there are actually 73 results.
**How to avoid:** Build the WHERE clause ONCE, then reuse it in both the COUNT and data SQL strings. The current code already builds `whereClause` as a variable -- reuse it for both queries.
**Warning signs:** Total count doesn't match sum of all pages' items.

### Pitfall 4: Page State Persists After Filter Change
**What goes wrong:** User is on page 5, changes the location filter, and the API returns page 5 of new results (which may be empty or confusing).
**Why it happens:** The `page` state wasn't reset when filters changed.
**How to avoid:** Every filter change handler must reset `page` to 1. The CONTEXT.md explicitly requires this: "When any filter changes, reset to page 1."
**Warning signs:** Empty result pages after changing filters.

### Pitfall 5: Pagination Displays "Page 1 of 0"
**What goes wrong:** When total is 0 (no results), `Math.ceil(0 / 20)` = 0, leading to "Page 1 of 0".
**How to avoid:** Don't render pagination controls when total is 0. Only show "Showing X-Y of Z" and pagination when there are results.
**Warning signs:** Pagination controls visible on empty search results.

## Code Examples

### Complete Index Creation Block

```sql
-- Source: SQLite CREATE INDEX IF NOT EXISTS documentation
-- All indexes needed for PERF-02

-- Foreign key columns (critical for JOIN performance)
CREATE INDEX IF NOT EXISTS idx_items_tote_id ON items(tote_id);
CREATE INDEX IF NOT EXISTS idx_item_photos_item_id ON item_photos(item_id);
CREATE INDEX IF NOT EXISTS idx_tote_photos_tote_id ON tote_photos(tote_id);
CREATE INDEX IF NOT EXISTS idx_item_metadata_item_id ON item_metadata(item_id);
CREATE INDEX IF NOT EXISTS idx_item_movement_history_item_id ON item_movement_history(item_id);
CREATE INDEX IF NOT EXISTS idx_item_movement_history_from_tote_id ON item_movement_history(from_tote_id);
CREATE INDEX IF NOT EXISTS idx_item_movement_history_to_tote_id ON item_movement_history(to_tote_id);

-- Frequently filtered columns (used in search WHERE clauses)
CREATE INDEX IF NOT EXISTS idx_totes_location ON totes(location);
CREATE INDEX IF NOT EXISTS idx_totes_owner ON totes(owner);

-- Ordering columns (used in ORDER BY for dashboard and search)
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at);
CREATE INDEX IF NOT EXISTS idx_totes_updated_at ON totes(updated_at);
```

### Pagination Component Page Range Logic

```typescript
// Generate page numbers with ellipsis
// Example: [1, '...', 4, 5, 6, '...', 18]
function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '...')[] = [];

  // Always show first page
  pages.push(1);

  if (current > 3) pages.push('...');

  // Pages around current
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('...');

  // Always show last page
  if (total > 1) pages.push(total);

  return pages;
}
```

### Search API Response Shape (Updated)

```typescript
// Current response:
{ data: { items: [...], total: 47 } }

// Updated response with pagination metadata:
{ data: { items: [...], total: 347, page: 2, limit: 20, total_pages: 18 } }
```

### Dashboard Query (No Changes Needed)

The dashboard route already queries efficiently:

```sql
-- Recent items: LIMIT 10 with first photo subquery
SELECT i.*, t.name as tote_name,
  (SELECT ip.id FROM item_photos ip WHERE ip.item_id = i.id
   ORDER BY ip.created_at ASC LIMIT 1) as first_photo_id
FROM items i
JOIN totes t ON t.id = i.tote_id
ORDER BY i.created_at DESC
LIMIT 10

-- Recent totes: LIMIT 10 with item count and cover photo
SELECT t.*, COUNT(i.id) as item_count,
  (SELECT tp.id FROM tote_photos tp WHERE tp.tote_id = t.id
   ORDER BY tp.created_at ASC LIMIT 1) as cover_photo_id
FROM totes t
LEFT JOIN items i ON i.tote_id = t.id
GROUP BY t.id
ORDER BY t.updated_at DESC
LIMIT 10
```

Adding indexes on `items.tote_id`, `item_photos.item_id`, and `tote_photos.tote_id` will make these JOINs and subqueries use index lookups instead of table scans. No query restructuring needed.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No indexes on FKs | `CREATE INDEX IF NOT EXISTS` on all FKs | Always been SQLite best practice | JOINs go from SCAN to SEARCH |
| `LIMIT 100` hard cap | `LIMIT ?` with `OFFSET ?` and page param | Standard pagination pattern | Users can access all results |
| Single result count | Separate COUNT query + data query | Standard pagination pattern | Enables "X of Y" display |

**Not needed for this phase:**
- Keyset/cursor pagination (overkill for personal-scale inventory)
- Query result caching (SQLite with WAL mode is already fast enough)
- Virtual scroll / infinite scroll (user decided on page-number navigation)
- Database connection pooling (better-sqlite3 is synchronous, single connection)

## Discretion Recommendations

Based on research findings, here are recommendations for areas left to Claude's discretion:

### Results Per Page: 20
The search result cards show name, description, tote info, and location -- moderate density. At 20 per page, users see a full screen of results without excessive scrolling. The search input, filter panel, and pagination controls consume roughly 200px of viewport, leaving room for approximately 15-20 item cards at standard viewport height. Use 20 as default.

### Loading State Between Pages: Keep Existing Spinner
The app already uses a `loading` boolean with a spinner div. Reuse this same pattern for page transitions. The spinner appears instantly on page change, disappears when data arrives. No need for skeleton loaders or inline spinners -- the full-page spinner is the established pattern.

### Tote List Pagination: Skip for Now
The tote list view (`/totes`) loads all totes at once. At hundreds of totes, this remains performant with indexes. Tote cards are smaller than search results. Adding pagination would complicate the existing sort controls and bulk selection features. Defer unless performance testing reveals issues.

### Dashboard Recents Limit: Keep at 10
The dashboard shows "recently added items" and "recently updated totes" with LIMIT 10. This is a reasonable preview. The indexes will make this query fast. No change needed.

### Empty State: Keep Current
The current empty state ("No items match your search") is functional. No need to add suggestions or "did you mean" for a personal inventory app.

## Open Questions

1. **Metadata subquery in search performance**
   - What we know: The search query uses `i.id IN (SELECT im.item_id FROM item_metadata im WHERE im.value LIKE ? COLLATE NOCASE)` for text search and `i.id IN (SELECT im.item_id FROM item_metadata im WHERE im.key = ?)` for metadata key filter. The index on `item_metadata.item_id` will help the JOIN back, but the `LIKE` on `value` requires a scan of `item_metadata`.
   - What's unclear: Whether a composite index on `item_metadata(item_id, value)` or `item_metadata(item_id, key)` would help.
   - Recommendation: Start with the single-column FK index. At personal scale (thousands of items, tens of metadata per item), the subquery scan is fast. Composite indexes can be added later if EXPLAIN QUERY PLAN shows bottlenecks.

## Sources

### Primary (HIGH confidence)
- [SQLite EXPLAIN QUERY PLAN](https://www.sqlite.org/eqp.html) - Output format, SCAN vs SEARCH indicators, index verification
- [SQLite Foreign Key Support](https://sqlite.org/foreignkeys.html) - Confirms SQLite does NOT auto-index FK columns
- [SQLite CREATE INDEX](https://www.sqlitetutorial.net/sqlite-index/) - Index creation syntax, performance benefits
- [better-sqlite3 GitHub](https://github.com/WiseLibs/better-sqlite3) - API for prepare/all/get, EXPLAIN compatibility

### Secondary (MEDIUM confidence)
- [Baeldung: Total Row Count with LIMIT/OFFSET](https://www.baeldung.com/sql/limit-offset-include-total-row-count) - COUNT(*) OVER() vs separate query patterns
- [GeeksforGeeks: Paginate Results in SQLite](https://www.geeksforgeeks.org/sqlite/how-to-paginate-results-in-sqlite/) - OFFSET/LIMIT patterns, window function approach
- [SQLite Window Functions](https://sqlite.org/windowfunctions.html) - Confirms COUNT(*) OVER() support in SQLite

### Tertiary (LOW confidence)
- None -- all findings verified with official documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies; all patterns use existing project libraries
- Architecture: HIGH - OFFSET/LIMIT pagination and CREATE INDEX are well-documented SQLite patterns, verified against official docs
- Pitfalls: HIGH - All pitfalls sourced from SQLite documentation and verified behavior

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable technology, no fast-moving dependencies)
