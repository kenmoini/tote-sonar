# Phase 1: Correctness and Safety - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix bugs in search/import/photo-delete and add systematic input validation across all API routes. All existing features must produce correct results and all API inputs must be validated before processing. Requirements: BUGS-01, BUGS-02, BUGS-03, VALID-01, VALID-02, VALID-03, VALID-04.

</domain>

<decisions>
## Implementation Decisions

### Error Response Format
- Use field-level validation errors: `{ error: string, errors?: { field: string, message: string }[] }`
- Strict consistent error shape across ALL API routes — same structure whether it's a tote, item, photo, or settings endpoint
- Photo upload rejections include specific reason: "File type image/svg+xml is not allowed. Accepted: JPEG, PNG, WebP" or "File exceeds 5MB limit"
- Introduce Zod for schema validation on all API routes (VALID-01 requirement) — structured validation with automatic field-level error extraction

### Delete Cleanup Behavior
- Log and continue strategy: delete DB records even if file cleanup fails — don't block the user's delete action over filesystem issues
- Silent success to the user — no warnings about orphaned files in the API response; log file cleanup failures server-side for debugging
- Clean up BOTH original uploads (data/uploads/) AND thumbnails (data/thumbnails/) on delete
- Query-first approach: fetch all photo file paths from DB BEFORE deleting records (CASCADE), store paths in memory, then delete DB records, then delete files from disk

### Import Failure Recovery
- All-or-nothing rollback: wrap entire import in a database transaction; if anything fails, roll back everything
- Foreign keys re-enabled in a `finally` block — guaranteed regardless of error state
- Validate upfront: parse and validate the entire JSON/ZIP structure before touching the database; fail fast with clear error if file is malformed
- Detailed progress in error messages: "Import failed at item 47 of 120: invalid metadata format. No data was imported."
- Clean up written files on rollback: if transaction rolls back, also delete any photo files written to data/uploads/ and data/thumbnails/ during the failed import attempt

### Search Filter Logic
- AND logic for combining text search with metadata/location/owner filters: results must match ALL criteria
- Text search matches all words (AND): searching "red drill" finds items with both "red" AND "drill" in name or description
- Case-insensitive text search using SQLite COLLATE NOCASE or LOWER()
- Metadata filter uses partial matching (LIKE): searching metadata key "color" for "red" matches "dark red"

### Claude's Discretion
- Exact Zod schema structure and helper utilities
- How to organize shared validation logic (middleware vs per-route)
- Search query builder refactoring approach (parameterized builder vs manual fix)
- Specific magic bytes to check for JPEG/PNG/WebP validation (VALID-02)
- Path sanitization implementation details (VALID-03)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The focus is on correctness and safety, not UX innovation. Fix the bugs, add validation, make errors consistent.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ErrorDisplay` component (`src/components/ErrorDisplay.tsx`): already handles error display on frontend — can be extended for field-level errors
- `crypto.randomBytes()` pattern in photo upload route: already used for secure filename generation, can be referenced for other secure ID generation
- Parameterized SQL queries: already established pattern, search fix should follow same approach

### Established Patterns
- Try-catch in API routes with `console.error()` logging and `NextResponse.json()` error responses — validation errors should follow this pattern
- `getDb()` singleton for database access — all validation and transaction work uses this
- Photo file paths stored in `item_photos` table with `file_path` and `thumbnail_path` columns — cleanup must reference both

### Integration Points
- All API routes in `src/app/api/` need Zod validation added
- Search route (`src/app/api/search/route.ts`) SQL builder needs rewrite (line 48-59 condition splicing is buggy)
- Import route (`src/app/api/import/route.ts`) needs transaction wrapping and finally-block FK re-enable
- Item delete (`src/app/api/items/[id]/route.ts` lines 187-200) and tote delete (`src/app/api/totes/[id]/route.ts` lines 251-264) need query-first photo cleanup
- Photo upload (`src/app/api/items/[id]/photos/route.ts`) needs magic bytes validation added

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-correctness-and-safety*
*Context gathered: 2026-02-28*
