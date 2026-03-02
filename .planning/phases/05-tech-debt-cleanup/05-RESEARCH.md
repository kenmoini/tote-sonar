# Phase 5: Tech Debt Cleanup - Research

**Researched:** 2026-03-02
**Domain:** Code quality — shared utility consolidation and UI completeness
**Confidence:** HIGH

## Summary

Phase 5 addresses three specific tech debt items identified by the v1.0 milestone audit. All three are well-scoped, low-risk changes with no new dependencies, no new libraries, and no architectural decisions to make. The existing codebase already contains every function, pattern, and CSS class needed — each change is a matter of wiring existing code correctly.

The three items are: (1) replacing inline file-deletion logic in the item DELETE handler with the shared `deletePhotoFiles` utility, (2) adding `tote_photos` count to the import success screen's TypeScript type and JSX, and (3) replacing the local `formatDate` function in the totes list page with a new date-only variant exported from the shared `formatDate.ts` utility module.

**Primary recommendation:** Implement all three changes in a single plan. No new libraries are needed. Each change touches 1-2 files and follows patterns already established in the codebase.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Keep date-only display on the totes list page (no time component)
- Create a new shared date-only utility in `src/lib/formatDate.ts` (same file as existing `formatDate`)
- Replace the local `formatDate` function in `src/app/totes/page.tsx` with an import of the new utility
- The existing `formatDate` (with time) remains unchanged for detail pages
- Add tote photos count to the import success screen
- Position: after Photos (order: Totes, Items, Item Photos, Tote Photos, Metadata, Settings)
- Label: "Tote Photos"
- Rename existing "Photos" label to "Item Photos" for clarity alongside the new stat
- API already returns `tote_photos` count in the summary — just needs UI wiring
- Pure code cleanup for deletePhotoFiles — no user-facing decisions
- Replace inline file deletion logic in `src/app/api/items/[id]/route.ts` lines 186-205 with `deletePhotoFiles()` import from `src/lib/photos.ts`

### Claude's Discretion
- Name of the new date-only formatting function (e.g., `formatDateShort`, `formatDateOnly`)
- Any minor refactoring needed to wire the deletePhotoFiles import cleanly

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | (existing) | App framework | Already in use; no changes needed |
| TypeScript | (existing) | Type safety | Already in use; type update needed for import summary |

### Supporting
No new libraries needed. All changes use existing project utilities.

### Alternatives Considered
None — all decisions are locked. No library choices to make.

**Installation:**
```bash
# No new packages required
```

## Architecture Patterns

### Recommended Project Structure
No structural changes. All modifications are within existing files:
```
src/
├── lib/
│   ├── formatDate.ts          # ADD: new date-only export
│   └── photos.ts              # EXISTING: deletePhotoFiles (no changes)
├── app/
│   ├── api/items/[id]/route.ts  # MODIFY: replace inline deletion with import
│   ├── import-export/page.tsx   # MODIFY: add tote_photos to type + JSX
│   └── totes/page.tsx           # MODIFY: replace local formatDate with import
```

### Pattern 1: Shared Utility Import (deletePhotoFiles)
**What:** Replace inline file deletion code with import of `deletePhotoFiles` from `@/lib/photos`
**When to use:** When a utility function already exists and is used by other routes
**Current (inline) code at lines 186-205 of `src/app/api/items/[id]/route.ts`:**
```typescript
// Current: inline re-implementation (20 lines)
const uploadsDir = getUploadDir();
const thumbnailsDir = getThumbnailDir();
for (const photo of photos) {
  try {
    const originalFile = path.resolve(uploadsDir, path.basename(photo.original_path));
    if (!originalFile.startsWith(uploadsDir + path.sep) && originalFile !== uploadsDir) continue;
    if (fs.existsSync(originalFile)) fs.unlinkSync(originalFile);
  } catch (fileErr) {
    console.error('Error deleting original photo file:', fileErr);
  }
  try {
    const thumbnailFile = path.resolve(thumbnailsDir, path.basename(photo.thumbnail_path));
    if (!thumbnailFile.startsWith(thumbnailsDir + path.sep) && thumbnailFile !== thumbnailsDir) continue;
    if (fs.existsSync(thumbnailFile)) fs.unlinkSync(thumbnailFile);
  } catch (fileErr) {
    console.error('Error deleting thumbnail file:', fileErr);
  }
}
```
**Target (shared utility) — matches tote DELETE pattern at `src/app/api/totes/[id]/route.ts:228-230`:**
```typescript
// Target: use shared utility (3 lines)
for (const photo of photos) {
  deletePhotoFiles(photo.original_path, photo.thumbnail_path);
}
```

### Pattern 2: Shared Date Formatting Utility
**What:** Add a new named export to `src/lib/formatDate.ts` for date-only formatting (no time), then import it in the totes list page
**When to use:** When the existing `formatDate` includes time but the totes list intentionally omits it
**Current local function at line 217 of `src/app/totes/page.tsx`:**
```typescript
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr + 'Z');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
```
**Recommended new export in `src/lib/formatDate.ts`:**
```typescript
/**
 * Formats a date string (UTC) into a date-only format (no time component).
 * Used on list pages where time is not needed.
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'Z');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
```
**Reasoning for name `formatDateShort`:**
- `formatDateShort` clearly communicates "shorter version of formatDate" (date without time)
- Follows camelCase convention established by project (`generateToteId`, `getDb`, `formatDate`)
- Alternatives considered: `formatDateOnly` (slightly longer, equally clear). Both are acceptable — `formatDateShort` is marginally more concise.

### Pattern 3: Import Summary Stats UI
**What:** Add `tote_photos` field to the TypeScript summary type and render it as a new stat div
**When to use:** When the API already returns a field but the UI type omits it
**Current summary type at line 22 of `src/app/import-export/page.tsx`:**
```typescript
summary?: { totes: number; items: number; photos: number; metadata: number; settings: number };
```
**Target type:**
```typescript
summary?: { totes: number; items: number; photos: number; tote_photos: number; metadata: number; settings: number };
```
**New stat JSX (inserted after the "Photos"/"Item Photos" stat, before metadata):**
```tsx
<div className="import-result-stat">
  <span className="import-result-stat-value">{importResult.summary.tote_photos}</span>
  <span className="import-result-stat-label">Tote Photos</span>
</div>
```
**Also rename existing "Photos" label to "Item Photos"** (locked decision from CONTEXT.md):
```tsx
{/* Before: */}
<span className="import-result-stat-label">Photos</span>
{/* After: */}
<span className="import-result-stat-label">Item Photos</span>
```

### Anti-Patterns to Avoid
- **Creating a new utility file for formatDateShort:** The user explicitly decided it goes in the same `src/lib/formatDate.ts` file. Do not create a separate file.
- **Changing the existing formatDate function:** It is used by ToteHeader, ItemHeader, and MovementHistory — must remain unchanged.
- **Making tote_photos required in the summary type:** The import API returns it optionally (`(data.tote_photos || []).length`), so the field should handle the case where old exports lack tote_photos. However, since the API always returns the count (defaulting to 0), the type field itself can be non-optional — the API guarantees the value.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File deletion with path safety | Inline fs.unlinkSync with manual path resolution | `deletePhotoFiles()` from `@/lib/photos` | Already handles path.resolve, basename extraction, startsWith guard, try/catch per file |
| Date formatting | Local arrow function | `formatDateShort()` from `@/lib/formatDate` | Centralizes format decisions, testable, single source of truth |

**Key insight:** All three tech debt items exist because code was written before the shared utility existed (deletePhotoFiles case) or the shared utility didn't cover the variant needed (formatDate case) or a feature was added to the API without updating the UI type (tote_photos case). None require building anything new — just wiring existing pieces correctly.

## Common Pitfalls

### Pitfall 1: Removing Unused Imports After deletePhotoFiles Refactoring
**What goes wrong:** After replacing inline deletion code, the `fs`, `path`, `getUploadDir`, and `getThumbnailDir` imports may become unused, causing TypeScript/ESLint warnings.
**Why it happens:** The inline code directly uses `fs.existsSync`, `fs.unlinkSync`, `path.resolve`, `path.basename`, `getUploadDir()`, and `getThumbnailDir()`. After switching to `deletePhotoFiles`, these may no longer be needed in this file.
**How to avoid:** Check whether `fs`, `path`, `getUploadDir`, and `getThumbnailDir` are used elsewhere in the file after the refactoring. The GET and PUT handlers do NOT use them, so they can likely all be removed. However, `getUploadDir` and `getThumbnailDir` are imported from `@/lib/db` on line 2 alongside `getDb` — so update the import to only keep `getDb`.
**Warning signs:** TypeScript compiler warnings about unused imports.

**Detailed import analysis for `src/app/api/items/[id]/route.ts`:**
- Line 1: `NextRequest, NextResponse` — KEEP (used by all handlers)
- Line 2: `getDb, getUploadDir, getThumbnailDir` from `@/lib/db` — REMOVE `getUploadDir, getThumbnailDir` (only used in inline deletion code)
- Line 3: `parseJsonBody, validateBody, IdParam, UpdateItemSchema` from `@/lib/validation` — KEEP (used by PUT/GET)
- Line 4: `fs` — REMOVE (only used in inline deletion code)
- Line 5: `path` — REMOVE (only used in inline deletion code)
- ADD: `import { deletePhotoFiles } from '@/lib/photos';`

### Pitfall 2: Forgetting to Rename "Photos" to "Item Photos"
**What goes wrong:** Adding "Tote Photos" stat without renaming existing "Photos" label creates ambiguity.
**Why it happens:** Easy to focus on adding the new element and forget the label change on the existing one.
**How to avoid:** The CONTEXT.md explicitly requires renaming "Photos" to "Item Photos". Do both changes together.
**Warning signs:** Two stats both saying "Photos" related things with unclear distinction.

### Pitfall 3: formatDateShort Name Collision
**What goes wrong:** Naming the new function `formatDate` would collide with the existing export.
**Why it happens:** Temptation to use the same name since it "replaces" the local version.
**How to avoid:** Use a distinct name (`formatDateShort`). The totes page import changes from a local function definition to an import statement with the new name.
**Warning signs:** TypeScript "duplicate identifier" error.

## Code Examples

Verified patterns from the existing codebase:

### deletePhotoFiles Usage (from `src/app/api/totes/[id]/route.ts:228-230`)
```typescript
// Source: src/app/api/totes/[id]/route.ts
import { deletePhotoFiles } from '@/lib/photos';

// After DB delete (cascade handles records), clean up files:
for (const photo of allPhotos) {
  deletePhotoFiles(photo.original_path, photo.thumbnail_path);
}
```

### formatDate Import Pattern (from `src/app/totes/[id]/_components/ToteHeader.tsx:6`)
```typescript
// Source: src/app/totes/[id]/_components/ToteHeader.tsx
import { formatDate } from '@/lib/formatDate';

// Usage in JSX:
<span className="meta-card-value">{formatDate(tote.created_at)}</span>
```

### Import Result Stat Pattern (from `src/app/import-export/page.tsx:357-361`)
```typescript
// Source: src/app/import-export/page.tsx
<div className="import-result-stat">
  <span className="import-result-stat-value">{importResult.summary.totes}</span>
  <span className="import-result-stat-label">Totes</span>
</div>
```

### API Summary Response (from `src/app/api/import/route.ts:370-376`)
```typescript
// Source: src/app/api/import/route.ts
// API already returns tote_photos in the summary object:
{
  totes: data.totes.length,
  items: data.items.length,
  photos: data.item_photos.length,
  tote_photos: (data.tote_photos || []).length,
  metadata: data.item_metadata.length,
  settings: data.settings.length,
}
```

## State of the Art

No version changes or deprecated APIs involved. All changes use existing project code.

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline file deletion in item DELETE | Shared `deletePhotoFiles` utility | Phase 1 created utility, Phase 2 adopted it in tote route | Item route is the last holdout |
| No `formatDateShort` variant | Add date-only export to `formatDate.ts` | Phase 3 created `formatDate.ts` but only with time variant | Totes list page gets a proper shared import |
| `photos` count only in import summary | `photos` + `tote_photos` in import summary | Phase 2 added API field but UI was not updated | UI finally shows the data the API provides |

## Open Questions

None. All three changes are fully specified by the CONTEXT.md decisions and verified against the source code. No ambiguity remains.

## Sources

### Primary (HIGH confidence)
- `src/lib/photos.ts` — verified `deletePhotoFiles` function signature and implementation (lines 139-160)
- `src/lib/formatDate.ts` — verified existing `formatDate` function (lines 5-14)
- `src/app/api/items/[id]/route.ts` — verified inline deletion code at lines 186-205, import list at lines 1-5
- `src/app/import-export/page.tsx` — verified summary type at line 22, stat rendering at lines 357-376
- `src/app/totes/page.tsx` — verified local `formatDate` at line 217, usage at lines 638 and 683
- `src/app/api/import/route.ts` — verified `tote_photos` in summary response at line 373
- `src/app/api/totes/[id]/route.ts` — verified `deletePhotoFiles` import and usage pattern at lines 5, 228-230
- `src/app/api/photos/[id]/route.ts` — verified `deletePhotoFiles` import and usage pattern at lines 4, 92
- `.planning/v1.0-MILESTONE-AUDIT.md` — verified all three tech debt items

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all existing code verified by reading source files
- Architecture: HIGH — all three patterns already exist in the codebase; this phase just applies them consistently
- Pitfalls: HIGH — pitfalls are import cleanup and label renaming, both verifiable at compile time

**Research date:** 2026-03-02
**Valid until:** Indefinite — no external dependencies or versioning concerns
