---
phase: 01-correctness-and-safety
plan: 02
subsystem: api
tags: [zod, validation, magic-bytes, input-validation, path-traversal, error-handling]

# Dependency graph
requires:
  - phase: 01-correctness-and-safety
    provides: "Corrected search, import, and delete route handlers from Plan 01"
provides:
  - "Zod v4 schemas for all input-accepting API routes"
  - "Magic bytes validation for JPEG/PNG/WebP photo uploads"
  - "Shared parseJsonBody helper eliminating raw request.json() calls"
  - "Shared validateBody helper with field-level error extraction"
  - "safePath utility for path traversal prevention"
  - "Consistent 400 error format { error, errors? } across all API routes"
affects: [02-tote-photos, 03-page-decomposition, 04-polish]

# Tech tracking
tech-stack:
  added: [zod@4.3.6]
  patterns:
    - "parseJsonBody + validateBody two-step pattern for all JSON routes"
    - "IdParam.safeParse for integer URL params (items, photos, metadata)"
    - "Tote ID regex validation for 6-char alphanumeric text IDs"
    - "Magic bytes detection as authoritative file type check over MIME headers"
    - "safePath(baseDir, userInput) for path traversal prevention"

key-files:
  created:
    - "src/lib/validation.ts"
    - "src/lib/magic-bytes.ts"
  modified:
    - "src/app/api/totes/route.ts"
    - "src/app/api/totes/[id]/route.ts"
    - "src/app/api/totes/[id]/items/route.ts"
    - "src/app/api/totes/[id]/qr/route.ts"
    - "src/app/api/totes/qr/bulk/route.ts"
    - "src/app/api/items/[id]/route.ts"
    - "src/app/api/items/[id]/photos/route.ts"
    - "src/app/api/items/[id]/metadata/route.ts"
    - "src/app/api/items/[id]/metadata/[metadataId]/route.ts"
    - "src/app/api/items/[id]/move/route.ts"
    - "src/app/api/items/[id]/duplicate/route.ts"
    - "src/app/api/photos/[id]/route.ts"
    - "src/app/api/photos/[id]/thumbnail/route.ts"
    - "src/app/api/search/route.ts"
    - "src/app/api/import/route.ts"
    - "src/app/api/settings/route.ts"

key-decisions:
  - "Used detected MIME type from magic bytes (not client header) for photo file extensions"
  - "Kept MIME type pre-filter before buffer read as fast-fail optimization"
  - "Duplicate route accepts empty/invalid JSON body gracefully (defaults to same tote)"
  - "Search params validated with Zod but empty params return empty results (not 400)"

patterns-established:
  - "parseJsonBody + validateBody: two-step validation for all JSON-accepting routes"
  - "IdParam.safeParse: validate integer URL params before Number() coercion"
  - "Tote ID regex: /^[a-zA-Z0-9]{6}$/ for text-based tote IDs"
  - "Magic bytes: validateImageBuffer on buffer before file processing"
  - "safePath: shared utility for path traversal checks in file operations"

requirements-completed: [VALID-01, VALID-02, VALID-03, VALID-04]

# Metrics
duration: 6min
completed: 2026-02-28
---

# Phase 1 Plan 02: Input Validation Summary

**Zod v4 schemas on all 16 API route files with magic bytes photo validation, safePath traversal prevention, and consistent field-level 400 error responses**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-28T22:27:44Z
- **Completed:** 2026-02-28T22:34:23Z
- **Tasks:** 2
- **Files modified:** 18

## Accomplishments
- Installed Zod v4 and created shared validation library (validation.ts) with schemas for all input-accepting routes, parseJsonBody, validateBody, IdParam, and safePath helpers
- Created magic-bytes library detecting JPEG (FF D8 FF), PNG (89 50 4E 47...), and WebP (RIFF + WEBP at offset 8) file signatures
- Applied Zod validation to all 16 route files, eliminating all manual typeof/trim/Number() checks and raw request.json() calls
- Photo uploads now validate actual file content via magic bytes, using detected type for file extensions instead of trusting client MIME headers
- Import route refactored to use shared safePath() utility for ZIP entry path traversal protection
- Search route validates query params with SearchParamsSchema (max 500 chars for query, 255 for filters)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Zod and create validation + magic bytes libraries** - `704d19d` (feat)
2. **Task 2: Apply Zod validation and magic bytes to all API route handlers** - `8244517` (feat)

## Files Created/Modified
- `src/lib/validation.ts` - Shared Zod schemas, parseJsonBody, validateBody, IdParam, safePath helpers
- `src/lib/magic-bytes.ts` - JPEG/PNG/WebP detection via file signature magic bytes
- `package.json` - Added zod@4.3.6 dependency
- `src/app/api/totes/route.ts` - POST uses CreateToteSchema
- `src/app/api/totes/[id]/route.ts` - PUT uses UpdateToteSchema, GET/DELETE validate tote ID format
- `src/app/api/totes/[id]/items/route.ts` - POST uses CreateItemSchema
- `src/app/api/totes/[id]/qr/route.ts` - GET validates tote ID format
- `src/app/api/totes/qr/bulk/route.ts` - POST uses BulkQrSchema
- `src/app/api/items/[id]/route.ts` - All methods use IdParam, PUT uses UpdateItemSchema
- `src/app/api/items/[id]/photos/route.ts` - POST uses IdParam + validateImageBuffer, GET uses IdParam
- `src/app/api/items/[id]/metadata/route.ts` - POST uses CreateMetadataSchema + IdParam, GET uses IdParam
- `src/app/api/items/[id]/metadata/[metadataId]/route.ts` - PUT uses UpdateMetadataSchema + IdParam, DELETE uses IdParam
- `src/app/api/items/[id]/move/route.ts` - POST uses MoveItemSchema + IdParam
- `src/app/api/items/[id]/duplicate/route.ts` - POST uses DuplicateItemSchema + IdParam
- `src/app/api/photos/[id]/route.ts` - GET/DELETE use IdParam
- `src/app/api/photos/[id]/thumbnail/route.ts` - GET uses IdParam
- `src/app/api/search/route.ts` - GET validates params with SearchParamsSchema
- `src/app/api/import/route.ts` - Uses safePath() for ZIP entry extraction
- `src/app/api/settings/route.ts` - PUT uses UpdateSettingsSchema

## Decisions Made
- Used detected MIME type from magic bytes (not client MIME header) for determining photo file extensions -- prevents incorrect extensions when MIME header is spoofed but bytes are valid
- Kept the existing ALLOWED_TYPES MIME pre-filter as a fast-fail optimization before reading the full buffer into memory
- Duplicate route gracefully handles empty or invalid JSON body (defaults to same tote) since body is optional for that endpoint
- Search params validated with Zod but empty/missing params return empty results rather than 400 error, preserving existing UX behavior

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All API routes now have systematic input validation with Zod schemas
- Magic bytes validation prevents spoofed file uploads
- Consistent error format established for all future routes
- Phase 1 (Correctness and Safety) is complete -- all BUGS and VALID requirements resolved
- Ready for Phase 2 (Tote Photos) which will follow established validation patterns

## Self-Check: PASSED

- All 18 source files exist on disk (2 created, 16 modified)
- Commit 704d19d (Task 1) found in git log
- Commit 8244517 (Task 2) found in git log

---
*Phase: 01-correctness-and-safety*
*Completed: 2026-02-28*
