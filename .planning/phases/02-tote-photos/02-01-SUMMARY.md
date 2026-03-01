---
phase: 02-tote-photos
plan: 01
subsystem: api
tags: [sqlite, sharp, photo-upload, tote-photos, export-import]

# Dependency graph
requires:
  - phase: 01-correctness-safety
    provides: validation library, magic-bytes detection, safe photo upload pattern, export/import infrastructure
provides:
  - tote_photos database table with cascade delete
  - shared photo processing utility (processPhotoUpload, getMaxUploadSize, deletePhotoFiles)
  - POST/GET /api/totes/:id/photos endpoints
  - photo serving/delete with ?source=tote query param support
  - export/import round-trip for tote_photos
  - cover_photo_id in totes list and dashboard queries
  - TotePhoto, PhotoRecord TypeScript interfaces
affects: [02-tote-photos, ui-components, dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [shared photo utility extraction, source query param for table selection]

key-files:
  created:
    - src/lib/photos.ts
    - src/app/api/totes/[id]/photos/route.ts
  modified:
    - src/lib/db.ts
    - src/types/index.ts
    - src/app/api/items/[id]/photos/route.ts
    - src/app/api/photos/[id]/route.ts
    - src/app/api/photos/[id]/thumbnail/route.ts
    - src/app/api/totes/[id]/route.ts
    - src/app/api/totes/route.ts
    - src/app/api/export/route.ts
    - src/app/api/import/route.ts
    - src/app/api/dashboard/route.ts

key-decisions:
  - "Extracted photo processing into shared utility to DRY item and tote photo uploads"
  - "Used ?source=tote query param to reuse existing photo serving routes for tote photos"
  - "tote_photos optional in import for backward compatibility with pre-Phase-2 exports"
  - "Cover photo is the earliest tote_photo by created_at (ORDER BY ASC LIMIT 1)"

patterns-established:
  - "Shared utility pattern: extract common logic into src/lib/ when two routes share identical processing"
  - "Source query param pattern: ?source=tote selects tote_photos table; default selects item_photos"

requirements-completed: [PHOTO-01, PHOTO-04, PHOTO-05, PHOTO-06, PHOTO-07]

# Metrics
duration: 4min
completed: 2026-02-28
---

# Phase 02 Plan 01: Tote Photos Backend Summary

**Shared photo utility, tote_photos table, upload/serve/delete API, and export/import support for tote photos**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-01T01:51:19Z
- **Completed:** 2026-03-01T01:55:45Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments
- Created shared photo processing utility (processPhotoUpload, getMaxUploadSize, deletePhotoFiles) that DRYs up item and tote photo uploads
- Built complete tote photo API: upload (POST) with 3-photo limit, list (GET) ordered ASC for cover photo convention
- Updated photo serving routes (GET/DELETE /api/photos/:id, GET /api/photos/:id/thumbnail) to support tote photos via ?source=tote
- Cascade delete on tote removal now cleans up both item and tote photo files
- Export includes tote_photos; import handles tote_photos optionally for backward compatibility
- Totes list and dashboard queries include cover_photo_id subquery

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared photo utility, DB table, types, and tote photo API** - `d97115a` (feat)
2. **Task 2: Update photo serving routes and cascade delete for tote photos** - `30ee82e` (feat)
3. **Task 3: Update totes list query, export, and import for tote photos** - `ea90fc3` (feat)

## Files Created/Modified
- `src/lib/photos.ts` - Shared photo processing: upload, size check, file cleanup
- `src/lib/db.ts` - Added tote_photos table to schema initialization
- `src/types/index.ts` - Added TotePhoto, PhotoRecord interfaces; updated DashboardData
- `src/app/api/totes/[id]/photos/route.ts` - POST (upload) and GET (list) for tote photos
- `src/app/api/items/[id]/photos/route.ts` - Refactored to use shared processPhotoUpload
- `src/app/api/photos/[id]/route.ts` - GET/DELETE now support ?source=tote for tote photos
- `src/app/api/photos/[id]/thumbnail/route.ts` - GET now supports ?source=tote
- `src/app/api/totes/[id]/route.ts` - DELETE cascades tote photo file cleanup via shared utility
- `src/app/api/totes/route.ts` - GET includes cover_photo_id subquery
- `src/app/api/export/route.ts` - Includes tote_photos in export JSON
- `src/app/api/import/route.ts` - Optional tote_photos import with backward compat
- `src/app/api/dashboard/route.ts` - Returns recent_totes with cover_photo_id

## Decisions Made
- Extracted photo processing into shared utility to DRY item and tote photo uploads -- both routes were doing identical MIME/size/magic-bytes/sharp processing
- Used `?source=tote` query param to reuse existing `/api/photos/:id` routes instead of creating separate `/api/tote-photos/:id` routes -- fewer endpoints, simpler client code
- Made `tote_photos` optional in import for backward compatibility with pre-Phase-2 exports (not in requiredTables array)
- Cover photo convention: earliest tote_photo by `created_at` (ORDER BY ASC LIMIT 1) -- consistent with item photo first_photo_id pattern

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated dashboard route to satisfy DashboardData type**
- **Found during:** Task 1 (adding recent_totes to DashboardData interface)
- **Issue:** Adding required `recent_totes` field to DashboardData caused type error in dashboard/route.ts which was not providing that field
- **Fix:** Added recent_totes query (with cover_photo_id subquery) to dashboard GET handler
- **Files modified:** src/app/api/dashboard/route.ts
- **Verification:** TypeScript compiles without errors
- **Committed in:** d97115a (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for TypeScript compilation. Dashboard now also returns recent_totes which aligns with the DashboardData type update requested by the plan.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Tote photo backend API is complete and ready for UI integration (Plan 02: tote detail page, Plan 03: gallery/dashboard)
- All serving routes support both item and tote photos via source param
- Export/import handles tote photos for data portability

## Self-Check: PASSED

All created files verified on disk. All 3 task commits verified in git log.

---
*Phase: 02-tote-photos*
*Completed: 2026-02-28*
