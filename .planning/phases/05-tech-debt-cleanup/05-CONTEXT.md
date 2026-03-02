# Phase 5: Tech Debt Cleanup - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Close all tech debt items identified by the v1.0 milestone audit — use shared utilities consistently and fix display gaps. Three specific items: deletePhotoFiles bypass, import tote_photos display, formatDate duplication.

</domain>

<decisions>
## Implementation Decisions

### Date formatting on totes list
- Keep date-only display on the totes list page (no time component)
- Create a new shared date-only utility in `src/lib/formatDate.ts` (same file as existing `formatDate`)
- Replace the local `formatDate` function in `src/app/totes/page.tsx` with an import of the new utility
- The existing `formatDate` (with time) remains unchanged for detail pages

### Import success stats — tote photos
- Add tote photos count to the import success screen
- Position: after Photos (order: Totes, Items, Item Photos, Tote Photos, Metadata, Settings)
- Label: "Tote Photos"
- Rename existing "Photos" label to "Item Photos" for clarity alongside the new stat
- API already returns `tote_photos` count in the summary — just needs UI wiring

### deletePhotoFiles refactoring
- Pure code cleanup — no user-facing decisions
- Replace inline file deletion logic in `src/app/api/items/[id]/route.ts` lines 186-205 with `deletePhotoFiles()` import from `src/lib/photos.ts`

### Claude's Discretion
- Name of the new date-only formatting function (e.g., `formatDateShort`, `formatDateOnly`)
- Any minor refactoring needed to wire the deletePhotoFiles import cleanly

</decisions>

<specifics>
## Specific Ideas

No specific requirements — all three items are well-defined by the milestone audit.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/photos.ts`: Already exports `deletePhotoFiles(originalPath, thumbnailPath)` — used by tote and photo API routes
- `src/lib/formatDate.ts`: Exports `formatDate(dateStr)` with time — used by ToteHeader, ItemHeader, MovementHistory
- Import API (`src/app/api/import/route.ts`): Already returns `tote_photos` count in summary response (line 373)

### Established Patterns
- Shared utilities live in `src/lib/` with named exports
- camelCase function names: `generateToteId()`, `getDb()`, `formatDate()`
- Import stats use `import-result-stat` CSS class with value + label structure

### Integration Points
- `src/app/api/items/[id]/route.ts`: DELETE handler needs `deletePhotoFiles` import (already imports `getUploadDir`, `getThumbnailDir` from photos.ts)
- `src/app/import-export/page.tsx`: Import success display (lines 356-376) — add new stat div
- `src/app/totes/page.tsx`: Replace local function at line 217 with import

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-tech-debt-cleanup*
*Context gathered: 2026-03-02*
