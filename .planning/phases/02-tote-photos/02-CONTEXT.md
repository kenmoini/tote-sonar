# Phase 2: Tote Photos - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Add photo upload capability to totes (max 3 per tote), display cover thumbnails in list views and dashboard, and extract shared photo components from the existing item photo code so both items and totes use the same UI and backend logic. Export/import must handle tote photos.

</domain>

<decisions>
## Implementation Decisions

### Photo gallery behavior
- Same gallery pattern as items: thumbnail grid with click-to-view lightbox
- Max 3 photos per tote (consistent with items)
- Gallery positioned above the items list on tote detail page
- Lightbox includes left/right navigation arrows to cycle through photos

### Cover thumbnail display
- Cover thumbnail = first uploaded photo (oldest by created_at)
- If cover photo is deleted, next photo becomes the new cover automatically
- Totes with no photos show a placeholder icon (subtle camera or package icon)
- Cover thumbnails displayed on: totes list page, dashboard
- Always first-uploaded as cover — no "set as cover" UI

### Upload experience
- Same as items: drag-and-drop + click-to-browse button
- Same file type validation (JPEG, PNG, WebP) and max size from settings
- Upload only available on tote detail page (not during tote creation)
- Spinner overlay during upload, success/error toast after — same as current item upload pattern

### Shared backend utility
- Extract common photo logic (upload processing, thumbnail generation, magic bytes validation) into `src/lib/photos.ts`
- Both item and tote photo API routes call the shared utility — DRY backend

### Refactoring scope
- Refactor the existing item detail page to use the new shared photo components
- This proves the components work and eliminates duplicated photo UI code (QUAL-03, QUAL-04)

### Claude's Discretion
- Component granularity: full extraction (PhotoGallery, PhotoUpload, etc.) vs single PhotoManager — Claude picks based on what works best
- Component directory structure: `src/components/photos/` vs flat in `src/components/` — Claude picks based on component count
- Exact lightbox navigation UX details (keyboard support, swipe gestures, etc.)
- Thumbnail size and crop strategy for cover images in list views

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/api/items/[id]/photos/route.ts`: Full photo upload API with magic bytes validation, sharp thumbnail generation, Zod ID validation — extract common logic
- `src/lib/magic-bytes.ts`: `validateImageBuffer()` for JPEG/PNG/WebP detection — already shared
- `src/lib/validation.ts`: Zod schemas including `IdParam` — add tote photo schemas here
- `src/app/totes/[id]/items/[itemId]/page.tsx`: ~700+ line item detail page with inline photo upload, gallery, lightbox, drag-and-drop, delete confirm — extract into shared components
- `sharp` package: Already installed, used for 200x200 cover thumbnails

### Established Patterns
- Photo storage: `data/uploads/` for originals, `data/thumbnails/` for thumbs — same dirs for tote photos
- DB schema: `item_photos` table pattern (filename, original_path, thumbnail_path, file_size, mime_type) — mirror for `tote_photos`
- API pattern: POST multipart for upload, GET for list, DELETE for removal
- Client state: useState for loading/error/uploading states, useCallback for fetch, toast notifications
- File naming: `crypto.randomBytes(16).toString('hex')` + extension

### Integration Points
- `src/lib/db.ts`: Add `tote_photos` table to schema initialization
- `src/types/index.ts`: Add `TotePhoto` interface (mirror `ItemPhoto` with `tote_id` instead of `item_id`)
- `src/app/api/totes/[id]/`: Add `photos/route.ts` for tote photo CRUD
- `src/app/totes/[id]/page.tsx`: Add photo gallery above items list
- `src/app/totes/page.tsx`: Add cover thumbnail to tote cards
- `src/app/page.tsx`: Add tote cover thumbnails to dashboard
- `src/app/api/export/route.ts`: Include tote photos in export ZIP
- `src/app/api/import/route.ts`: Restore tote photos from import ZIP
- `src/app/api/totes/[id]/route.ts`: Cascade delete tote photos on tote deletion

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond what was discussed — open to standard approaches within the decisions above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-tote-photos*
*Context gathered: 2026-02-28*
