---
phase: 01-correctness-and-safety
plan: 01
subsystem: api
tags: [sqlite, search, import, delete, file-cleanup, foreign-keys, path-traversal]

# Dependency graph
requires: []
provides:
  - "Correct search query builder with parameterized word-level AND matching"
  - "Safe import route with PRAGMA outside transaction and rollback file cleanup"
  - "Hardened photo/item/tote delete routes with graceful file cleanup"
affects: [01-correctness-and-safety]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Parameterized SQL builder with word-level AND conditions"
    - "PRAGMA toggle outside transaction boundary with finally re-enable"
    - "Query-first delete pattern: fetch file paths before CASCADE, then cleanup with per-file try-catch"
    - "Path traversal prevention via path.resolve() + startsWith() check"
    - "Written file tracking for rollback cleanup on import failure"

key-files:
  created: []
  modified:
    - "src/app/api/search/route.ts"
    - "src/app/api/import/route.ts"
    - "src/app/api/photos/[id]/route.ts"
    - "src/app/api/items/[id]/route.ts"
    - "src/app/api/totes/[id]/route.ts"

key-decisions:
  - "DB record deleted before file cleanup in photo DELETE to ensure authoritative action succeeds"
  - "Path traversal check added to import ZIP extraction as defensive security measure"
  - "Upfront record validation added to import before any DB operations"

patterns-established:
  - "Parameterized query builder: conditions[] and params[] built together, no index-based mutation"
  - "Delete cleanup pattern: query paths first, delete DB record, then try-catch each file individually"
  - "Import safety: validate upfront, pragma outside transaction, finally re-enable, track files for rollback"

requirements-completed: [BUGS-01, BUGS-02, BUGS-03]

# Metrics
duration: 3min
completed: 2026-02-28
---

# Phase 1 Plan 01: Fix Correctness and Safety Bugs Summary

**Rewrote search SQL builder with word-level AND matching, fixed import PRAGMA placement outside transactions, and hardened all delete routes with graceful file cleanup**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-28T22:21:08Z
- **Completed:** 2026-02-28T22:24:11Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Search route rewritten with clean parameterized builder using word-level AND matching across name, description, and metadata values (BUGS-01)
- Import route restructured to toggle PRAGMA foreign_keys outside transaction boundary with guaranteed finally re-enable, upfront record validation, file tracking for rollback, and path traversal protection (BUGS-02)
- Photo DELETE handler fixed to delete DB record first, then clean up files with individual try-catch blocks (BUGS-03)
- Item and tote DELETE handlers hardened with per-file try-catch, path.resolve() safety checks, and consistent error logging format (BUGS-03)

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite search query builder with word-level AND matching** - `08c2785` (fix)
2. **Task 2: Fix import FK pragma and harden photo cleanup on delete** - `bccb967` (fix)

## Files Created/Modified
- `src/app/api/search/route.ts` - Rewritten query builder with parameterized word-level AND matching, COLLATE NOCASE
- `src/app/api/import/route.ts` - PRAGMA outside transaction, upfront validation, writtenFiles tracking, path traversal protection
- `src/app/api/photos/[id]/route.ts` - DB record deleted first, file cleanup in individual try-catch blocks
- `src/app/api/items/[id]/route.ts` - Per-file try-catch cleanup, path.resolve() safety, consistent error logging
- `src/app/api/totes/[id]/route.ts` - Per-file try-catch cleanup, path.resolve() safety, consistent error logging

## Decisions Made
- DB record deletion moved before file cleanup in photo DELETE (authoritative action succeeds even if files are stubborn)
- Path traversal protection added to import ZIP extraction even though path.basename() already strips directory components (defense in depth)
- Upfront record validation checks id, name, and location/tote_id fields -- deeper FK integrity deferred to the database engine itself

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All three bugs (BUGS-01, BUGS-02, BUGS-03) are fixed
- Ready for Plan 02 (input validation with Zod) which builds on these corrected route handlers
- Search route is clean and ready for Zod query param validation
- Import route structure is ready for enhanced Zod data validation
- All delete routes follow consistent patterns ready for any future hardening

## Self-Check: PASSED

- All 5 modified source files exist on disk
- All 1 created planning file exists on disk
- Commit 08c2785 (Task 1) found in git log
- Commit bccb967 (Task 2) found in git log

---
*Phase: 01-correctness-and-safety*
*Completed: 2026-02-28*
