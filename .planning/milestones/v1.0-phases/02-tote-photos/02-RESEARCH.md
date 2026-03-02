# Phase 2: Tote Photos - Research

**Researched:** 2026-02-28
**Domain:** Photo upload/gallery for totes, shared component extraction, export/import expansion
**Confidence:** HIGH

## Summary

Phase 2 adds photo upload capability to totes (max 3 per tote), displays cover thumbnails in list views and dashboard, and extracts shared photo components from the existing 700+ line item detail page so both items and totes use the same UI and backend logic. The export/import system and cascade delete must be extended to handle `tote_photos`. This phase also requires a tote photo API route, a new database table, and updates to the photo serving routes.

The codebase already has a complete, working item photo implementation that serves as the exact blueprint: `src/app/api/items/[id]/photos/route.ts` handles upload with magic bytes validation and sharp thumbnail generation, `src/app/api/photos/[id]/route.ts` handles serving and deletion, and the item detail page (`src/app/totes/[id]/items/[itemId]/page.tsx`) contains all gallery, lightbox, drag-and-drop, and upload UI code inline (approximately 200 lines of photo-specific JSX and 100 lines of photo-specific state/handlers). The photo serving routes currently query only `item_photos` -- they must be updated to also serve `tote_photos`.

**Primary recommendation:** Work in three stages: (1) Backend first -- add `tote_photos` table, create `src/lib/photos.ts` shared utility, build tote photo API route, update photo serving/delete routes to handle both tables, update export/import, update tote cascade delete; (2) Extract shared components -- pull photo gallery, lightbox, upload, and drag-and-drop UI from item detail page into `src/components/photos/` directory, then refactor item detail page to use them; (3) Wire tote photo UI -- add shared photo components to tote detail page, add cover thumbnails to tote list and dashboard.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Photo gallery behavior**: Same gallery pattern as items: thumbnail grid with click-to-view lightbox. Max 3 photos per tote. Gallery positioned above the items list on tote detail page. Lightbox includes left/right navigation arrows to cycle through photos.
- **Cover thumbnail display**: Cover thumbnail = first uploaded photo (oldest by created_at). If cover photo is deleted, next photo becomes the new cover automatically. Totes with no photos show a placeholder icon (subtle camera or package icon). Cover thumbnails displayed on: totes list page, dashboard. Always first-uploaded as cover -- no "set as cover" UI.
- **Upload experience**: Same as items: drag-and-drop + click-to-browse button. Same file type validation (JPEG, PNG, WebP) and max size from settings. Upload available on tote creation and on detail page. Spinner overlay during upload, success/error toast after -- same as current item upload pattern.
- **Shared backend utility**: Extract common photo logic (upload processing, thumbnail generation, magic bytes validation) into `src/lib/photos.ts`. Both item and tote photo API routes call the shared utility -- DRY backend.
- **Refactoring scope**: Refactor the existing item detail page to use the new shared photo components. This proves the components work and eliminates duplicated photo UI code (QUAL-03, QUAL-04).

### Claude's Discretion
- Component granularity: full extraction (PhotoGallery, PhotoUpload, etc.) vs single PhotoManager -- Claude picks based on what works best
- Component directory structure: `src/components/photos/` vs flat in `src/components/` -- Claude picks based on component count
- Exact lightbox navigation UX details (keyboard support, swipe gestures, etc.)
- Thumbnail size and crop strategy for cover images in list views

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PHOTO-01 | User can upload multiple photos per tote (same pattern as item photos, max 3) | Tote photo API route mirrors item photo route. Shared `processPhotoUpload()` utility handles upload, validation, sharp thumbnail generation. `tote_photos` table mirrors `item_photos` schema. |
| PHOTO-02 | Tote list views display the first uploaded photo as a cover thumbnail | Totes API GET list endpoint must include first photo ID per tote (subquery `ORDER BY created_at ASC LIMIT 1`). Totes list page renders cover thumbnail using existing `/api/photos/` route (after update to serve both tables). |
| PHOTO-03 | Dashboard displays tote cover thumbnails alongside recent items | Dashboard API and UI must be extended to include recent totes with cover photo IDs. Dashboard currently shows only recent items with thumbnails. |
| PHOTO-04 | User can delete individual tote photos | Existing `/api/photos/[id]/route.ts` DELETE handler must be updated to look up photos from both `item_photos` and `tote_photos` tables. Shared photo components include delete confirmation dialog. |
| PHOTO-05 | Deleting a tote cascades to remove tote photos from database and filesystem | Tote DELETE handler already cascades item photos; must be extended to also query and clean up `tote_photos` files before CASCADE delete. `tote_photos` FK references totes(id) with ON DELETE CASCADE. |
| PHOTO-06 | Export includes tote photos in ZIP archive | Export route must query `tote_photos` table and include in JSON data. Photo files are already exported from uploads/thumbnails dirs (all files), so no additional file handling needed. |
| PHOTO-07 | Import restores tote photos from ZIP archive | Import route must handle `tote_photos` array in JSON data with INSERT statements. Add to `requiredTables` validation and clear/insert logic. Photo files are already restored from ZIP dirs. |
| QUAL-03 | Shared PhotoUpload component extracted and reused for both items and totes | Extract upload UI (file input, drag-and-drop, error display, upload handler) into shared PhotoUpload component. Both item and tote detail pages consume it. |
| QUAL-04 | Shared PhotoGallery component extracted and reused for both items and totes | Extract gallery UI (thumbnail grid, lightbox with navigation, delete confirmation) into shared PhotoGallery component. Both item and tote detail pages consume it. |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | ^16.0.0 | App Router, API routes | Project framework |
| React | ^19.2.0 | UI components | Project UI library |
| better-sqlite3 | ^12.0.0 | SQLite database | Project database |
| sharp | ^0.34.0 | Thumbnail generation (200x200 cover) | Already used for item thumbnails |
| zod | ^4.3.6 | Input validation | Already used across all API routes |
| lucide-react | ^0.575.0 | Icons (Camera, Upload, X, Trash2, ImageIcon, etc.) | Already used throughout UI |
| adm-zip | ^0.5.0 | ZIP import parsing | Already used in import route |
| kemo-archiver | ^7.0.0 | ZIP export creation | Already used in export route |

### Supporting
No new dependencies needed. All required functionality is available through existing packages.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual drag-and-drop | react-dropzone | Adds dependency for ~30 lines of code already implemented inline. Item detail page already has working drag-and-drop handlers. |
| Manual lightbox | yet-another-react-lightbox | Adds dependency; existing lightbox is simple (<40 lines JSX). Decision adds left/right nav arrows which are ~10 more lines. |
| Photo serving via API | Next.js Image component | Photos are user-uploaded dynamic content served from filesystem, not static assets. API route with proper caching headers is the correct approach. |

**Installation:**
No new packages needed.

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    photos.ts              # NEW: Shared photo processing utility (backend)
    db.ts                  # MODIFY: Add tote_photos table to initializeSchema
    magic-bytes.ts         # EXISTING: No changes needed
    validation.ts          # EXISTING: No changes needed (IdParam already exists)
  types/
    index.ts               # MODIFY: Add TotePhoto interface
  components/
    photos/                # NEW: Shared photo UI components
      PhotoGallery.tsx     # Gallery grid + lightbox with navigation
      PhotoUpload.tsx      # Upload button + drag-and-drop zone
      PhotoDeleteConfirm.tsx  # Delete confirmation modal
      index.ts             # Barrel export
  app/
    api/
      totes/
        [id]/
          photos/
            route.ts       # NEW: POST (upload), GET (list) for tote photos
          route.ts         # MODIFY: DELETE cascade to include tote photos
      photos/
        [id]/
          route.ts         # MODIFY: Serve/delete from both item_photos and tote_photos
          thumbnail/
            route.ts       # MODIFY: Serve from both item_photos and tote_photos
      export/
        route.ts           # MODIFY: Include tote_photos in export
      import/
        route.ts           # MODIFY: Handle tote_photos in import
      dashboard/
        route.ts           # MODIFY: Include tote cover thumbnails
    totes/
      [id]/
        page.tsx           # MODIFY: Add photo gallery above items list
        items/
          [itemId]/
            page.tsx       # MODIFY: Replace inline photo code with shared components
      page.tsx             # MODIFY: Add cover thumbnails to tote cards
    page.tsx               # MODIFY: Add tote cover thumbnails to dashboard
```

### Pattern 1: Shared Photo Processing Utility (`src/lib/photos.ts`)

**What:** Extract common photo upload processing logic from the item photo route into a shared utility function that both item and tote photo routes call.

**When to use:** Any route that accepts photo uploads.

**Example:**
```typescript
// src/lib/photos.ts
import { validateImageBuffer } from '@/lib/magic-bytes';
import { getDb, getUploadDir, getThumbnailDir } from '@/lib/db';
import sharp from 'sharp';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const THUMBNAIL_WIDTH = 200;
const THUMBNAIL_HEIGHT = 200;

interface PhotoUploadResult {
  filename: string;
  originalPath: string;   // relative: "uploads/abc123.jpg"
  thumbnailPath: string;  // relative: "thumbnails/thumb_abc123.jpg"
  fileSize: number;
  mimeType: string;
}

interface PhotoUploadError {
  error: string;
  status: number;
}

export async function processPhotoUpload(
  file: File,
  maxSize: number
): Promise<{ data: PhotoUploadResult } | { error: PhotoUploadError }> {
  // 1. MIME pre-filter
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: { error: `Invalid file type: ${file.type}. Supported: JPEG, PNG, WebP`, status: 400 } };
  }

  // 2. Size check
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    return { error: { error: `File size exceeds maximum of ${maxSizeMB}MB`, status: 400 } };
  }

  // 3. Read buffer and validate magic bytes
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const { valid, detectedType } = validateImageBuffer(buffer);
  if (!valid) {
    return { error: { error: 'File content does not match a supported image format.', status: 400 } };
  }

  // 4. Generate filename from detected type (authoritative over MIME header)
  const mimeType = detectedType!;
  const ext = mimeType === 'image/jpeg' ? '.jpg' : mimeType === 'image/png' ? '.png' : '.webp';
  const uniqueId = crypto.randomBytes(16).toString('hex');
  const filename = `${uniqueId}${ext}`;

  // 5. Write original file
  const uploadDir = getUploadDir();
  const originalPath = path.join(uploadDir, filename);
  fs.writeFileSync(originalPath, buffer);

  // 6. Generate thumbnail
  const thumbnailDir = getThumbnailDir();
  const thumbnailFilename = `thumb_${filename}`;
  const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);
  await sharp(buffer)
    .rotate()
    .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, { fit: 'cover', position: 'center' })
    .toFile(thumbnailPath);

  return {
    data: {
      filename,
      originalPath: `uploads/${filename}`,
      thumbnailPath: `thumbnails/${thumbnailFilename}`,
      fileSize: file.size,
      mimeType,
    },
  };
}

/**
 * Get max upload size from settings table.
 */
export function getMaxUploadSize(): number {
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = 'max_upload_size'").get() as { value: string } | undefined;
  return row ? parseInt(row.value, 10) : 5242880; // Default 5MB
}

/**
 * Clean up photo files from disk. Logs errors but does not throw.
 */
export function deletePhotoFiles(originalPath: string, thumbnailPath: string): void {
  const uploadDir = getUploadDir();
  const thumbnailDir = getThumbnailDir();

  try {
    const originalFile = path.resolve(uploadDir, path.basename(originalPath));
    if (originalFile.startsWith(uploadDir + path.sep) && fs.existsSync(originalFile)) {
      fs.unlinkSync(originalFile);
    }
  } catch (err) {
    console.error('Error deleting original photo file:', err);
  }

  try {
    const thumbnailFile = path.resolve(thumbnailDir, path.basename(thumbnailPath));
    if (thumbnailFile.startsWith(thumbnailDir + path.sep) && fs.existsSync(thumbnailFile)) {
      fs.unlinkSync(thumbnailFile);
    }
  } catch (err) {
    console.error('Error deleting thumbnail file:', err);
  }
}
```

### Pattern 2: Photo Serving from Multiple Tables

**What:** The existing photo serving routes (`/api/photos/[id]` and `/api/photos/[id]/thumbnail`) query only `item_photos`. They must be updated to check both `item_photos` and `tote_photos` since both share the same photo ID space (autoincrement in separate tables) or be given separate endpoints.

**Design choice -- separate ID spaces approach:** Since `item_photos` and `tote_photos` are separate tables with independent autoincrement IDs, photo IDs could collide. Two clean approaches:

**Option A (Recommended): Unified query with UNION**
```sql
SELECT * FROM item_photos WHERE id = ?
UNION ALL
SELECT * FROM tote_photos WHERE id = ?
```
This works but requires both tables to have identical column schemas. It also means IDs can collide (item_photo #5 and tote_photo #5 both exist). This is problematic.

**Option B (Recommended, simpler): Use a `type` parameter in the photo serving routes**
The photo serving routes receive the photo ID. The caller (frontend) already knows whether it's an item photo or tote photo. Add a query parameter `?table=item` or `?table=tote` to disambiguate.

**Option C (Best): Use tote-specific photo routes for tote photos**
- Keep `/api/photos/[id]` for item photos (unchanged)
- Add `/api/totes/[id]/photos/[photoId]` for tote photo serving
- Or simpler: add a query param to `/api/photos/[id]?source=tote`

**Actual recommendation: Use the `source` query param approach.** Since the existing `/api/photos/[id]` route serves by integer photo ID and the frontend always knows whether it's rendering an item photo or tote photo, pass `?source=tote` to indicate looking up from `tote_photos`. Default (no param) looks up from `item_photos` for backward compatibility. This is the smallest change and avoids breaking any existing code.

```typescript
// Updated /api/photos/[id]/route.ts and /api/photos/[id]/thumbnail/route.ts
const source = request.nextUrl.searchParams.get('source');
const table = source === 'tote' ? 'tote_photos' : 'item_photos';
const photo = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(photoId);
```

### Pattern 3: Shared Photo Components

**What:** Extract photo UI into reusable components in `src/components/photos/`.

**Component granularity recommendation (Claude's discretion):** Use three components: `PhotoGallery` (gallery grid + lightbox + delete confirm), `PhotoUpload` (upload button + drag-and-drop zone), and `PhotoDeleteConfirm` (delete confirmation modal). This gives good separation of concerns without over-fragmenting.

**Props design:**
```typescript
// PhotoUpload.tsx
interface PhotoUploadProps {
  entityType: 'item' | 'tote';
  entityId: string | number;
  currentPhotoCount: number;
  maxPhotos: number;            // 3
  onUploadComplete: () => void; // callback to refetch parent data
  maxUploadSize: number;
}

// PhotoGallery.tsx
interface PhotoGalleryProps {
  photos: PhotoRecord[];        // Generic type for both ItemPhoto and TotePhoto
  entityName: string;           // For alt text: "Photo of {entityName}"
  source: 'item' | 'tote';     // For photo URL query param
  onPhotoDeleted: () => void;   // callback to refetch parent data
}

// Shared type (works for both item and tote photos)
interface PhotoRecord {
  id: number;
  filename: string;
  original_path: string;
  thumbnail_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}
```

**Directory structure recommendation (Claude's discretion):** Use `src/components/photos/` subdirectory since there will be 3-4 files (components + barrel export). This keeps the components directory clean.

### Pattern 4: Cover Thumbnail in List Views

**What:** Show the first uploaded photo as a cover thumbnail on tote cards in the list page and dashboard.

**Backend approach:**
```sql
-- In totes list API: add first photo ID via subquery
SELECT t.*,
  COUNT(i.id) as item_count,
  (SELECT tp.id FROM tote_photos tp WHERE tp.tote_id = t.id ORDER BY tp.created_at ASC LIMIT 1) as cover_photo_id
FROM totes t
LEFT JOIN items i ON i.tote_id = t.id
GROUP BY t.id
ORDER BY ...
```

**Frontend approach:**
```tsx
// In tote card rendering
{tote.cover_photo_id ? (
  <img
    src={`/api/photos/${tote.cover_photo_id}/thumbnail?source=tote`}
    alt={`${tote.name} cover`}
    className="tote-cover-thumbnail"
  />
) : (
  <div className="tote-cover-placeholder">
    <Box size={24} />  {/* or Camera icon */}
  </div>
)}
```

### Pattern 5: Lightbox Navigation Arrows

**What:** The user decision specifies left/right navigation arrows in the lightbox to cycle through photos.

**Implementation:**
```typescript
// In PhotoGallery component
const [viewingIndex, setViewingIndex] = useState<number | null>(null);
const viewingPhoto = viewingIndex !== null ? photos[viewingIndex] : null;

const goToPrevPhoto = () => {
  if (viewingIndex !== null && viewingIndex > 0) {
    setViewingIndex(viewingIndex - 1);
  }
};

const goToNextPhoto = () => {
  if (viewingIndex !== null && viewingIndex < photos.length - 1) {
    setViewingIndex(viewingIndex + 1);
  }
};

// Keyboard navigation
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (viewingIndex === null) return;
    if (e.key === 'ArrowLeft') goToPrevPhoto();
    if (e.key === 'ArrowRight') goToNextPhoto();
    if (e.key === 'Escape') setViewingIndex(null);
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [viewingIndex, photos.length]);
```

### Anti-Patterns to Avoid

- **Duplicating photo upload logic between item and tote routes:** Extract into `src/lib/photos.ts` immediately. The item photo route has ~60 lines of upload processing that would be copy-pasted verbatim.
- **Creating separate photo serving routes for tote photos:** This duplicates the serving logic. Use a query parameter (`?source=tote`) on the existing routes instead.
- **Modifying the item detail page inline before extracting components:** Extract first, then the tote detail page gets the components "for free." Modifying inline first means you refactor twice.
- **Adding tote_photos without updating export/import:** Creates silent data loss when users backup/restore.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Thumbnail generation | Custom image resizing | `sharp` with `.resize(200, 200, { fit: 'cover' })` | Already in use, handles EXIF rotation, WebP, etc. |
| File type detection | Extension-based checking | `validateImageBuffer()` from `src/lib/magic-bytes.ts` | Already built in Phase 1, handles JPEG/PNG/WebP magic bytes |
| ID validation | Manual parseInt/isNaN | `IdParam` from `src/lib/validation.ts` | Zod coercion with positive integer check, already used everywhere |
| File cleanup | Manual unlink with no error handling | `deletePhotoFiles()` from new `src/lib/photos.ts` | Centralizes path traversal defense, try-catch, and logging |

**Key insight:** This phase is primarily about refactoring existing code (extraction + reuse) and mirroring an established pattern (item photos -> tote photos). Nearly zero new technical ground is being broken. The risk is in the refactoring quality, not in technical unknowns.

## Common Pitfalls

### Pitfall 1: Photo ID Collision Between Tables
**What goes wrong:** `item_photos` and `tote_photos` both use INTEGER PRIMARY KEY AUTOINCREMENT. Both tables can have a photo with id=1. If photo serving routes don't know which table to query, they serve the wrong photo.
**Why it happens:** Autoincrement IDs are per-table in SQLite, not global.
**How to avoid:** Pass `?source=tote` query parameter on all tote photo URLs. Default to `item_photos` for backward compatibility.
**Warning signs:** Tote photo thumbnails show item photos or 404.

### Pitfall 2: Tote Cascade Delete Missing Photo File Cleanup
**What goes wrong:** `ON DELETE CASCADE` on `tote_photos` removes DB records when a tote is deleted, but photo files remain on disk as orphans.
**Why it happens:** CASCADE handles DB rows but knows nothing about the filesystem. The current tote DELETE handler already handles item photo file cleanup but doesn't know about tote photos.
**How to avoid:** In the tote DELETE handler, query both item photos AND tote photos before deleting the tote row. Clean up all files after CASCADE.
**Warning signs:** Disk usage grows over time despite deleting totes.

### Pitfall 3: Export/Import Ignoring tote_photos Table
**What goes wrong:** Exporting data omits `tote_photos` records from JSON. Importing from a backup silently drops all tote photos.
**Why it happens:** The export route has a hardcoded list of tables to query, and the import route has `requiredTables` validation and explicit INSERT blocks per table.
**How to avoid:** Add `tote_photos` to export query list, import `requiredTables` array, import INSERT block, and import summary.
**Warning signs:** After export/import cycle, all tote photos are missing.

### Pitfall 4: Component Extraction Breaking Item Photos
**What goes wrong:** Extracting photo components from the item detail page introduces regressions -- upload stops working, lightbox doesn't open, delete fails.
**Why it happens:** The item detail page has 70+ state variables. Photo state is interleaved with item editing, metadata, movement history, and other concerns. Extracting photo code requires carefully identifying which state variables are photo-specific vs shared.
**How to avoid:** The shared components should be self-contained with their own internal state. The parent page passes minimal props: entity type/ID, photo list, callbacks. The component manages uploading/viewing/deleting state internally.
**Warning signs:** Item detail page photos stop working after refactor.

### Pitfall 5: Import Backward Compatibility
**What goes wrong:** Importing an export from before Phase 2 (which doesn't have `tote_photos` in the JSON) fails validation because `requiredTables` includes `tote_photos`.
**Why it happens:** The import validation checks for required table arrays in the JSON data.
**How to avoid:** Make `tote_photos` optional in import validation. Use `data.tote_photos || []` when processing. Add to `requiredTables` only if the export version indicates it should be present, or simply treat it as optional.
**Warning signs:** Users can't import their old backups after updating.

### Pitfall 6: Dashboard Not Showing Tote Thumbnails (PHOTO-03)
**What goes wrong:** PHOTO-03 requires the dashboard to display tote cover thumbnails. The current dashboard shows only recent items. Need to decide: add a "Recent Totes" section? Or add tote thumbnails somewhere else?
**Why it happens:** The requirement says "alongside recent items" which is ambiguous.
**How to avoid:** Add a "Recent Totes" section to the dashboard similar to "Recently Added Items," showing the most recently created/updated totes with their cover thumbnails.
**Warning signs:** PHOTO-03 verification fails because dashboard doesn't show tote photos.

## Code Examples

### Database Schema: tote_photos Table
```sql
-- Add to initializeSchema() in src/lib/db.ts
CREATE TABLE IF NOT EXISTS tote_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tote_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_path TEXT NOT NULL,
  thumbnail_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (tote_id) REFERENCES totes(id) ON DELETE CASCADE
);
```

**Note on schema migration:** Since `CREATE TABLE IF NOT EXISTS` is used for all tables, adding a new table requires no migration system. The table is simply created on next app startup if it doesn't exist. This is safe because we're adding a new table, not modifying an existing one. The STATE.md concern about migration is valid for column changes but does not apply here.

### Type Definition: TotePhoto
```typescript
// Add to src/types/index.ts
export interface TotePhoto {
  id: number;
  tote_id: string;
  filename: string;
  original_path: string;
  thumbnail_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}
```

### Tote Photo API Route
```typescript
// src/app/api/totes/[id]/photos/route.ts
// POST: Upload photo to tote (mirrors item photo route but uses shared utility)
// GET: List photos for a tote (ORDER BY created_at ASC for cover-first ordering)
```

### Updated Photo Serving Route
```typescript
// src/app/api/photos/[id]/route.ts - Updated GET and DELETE
const source = request.nextUrl.searchParams.get('source');
const table = source === 'tote' ? 'tote_photos' : 'item_photos';
const photo = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(photoId);
```

### Updated Export Route
```typescript
// Add to export data object
const totePhotos = db.prepare('SELECT * FROM tote_photos ORDER BY created_at').all();
// ...
data: {
  totes, items, item_photos: itemPhotos,
  tote_photos: totePhotos,  // NEW
  item_metadata: itemMetadata, metadata_keys: metadataKeys,
  item_movement_history: movementHistory, settings,
}
```

### Updated Import Route
```typescript
// Add tote_photos to import (make optional for backward compat)
if (data.tote_photos && data.tote_photos.length > 0) {
  const insertTotePhoto = db.prepare(
    'INSERT INTO tote_photos (id, tote_id, filename, original_path, thumbnail_path, file_size, mime_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  for (const photo of data.tote_photos) {
    insertTotePhoto.run(
      photo.id, photo.tote_id, photo.filename,
      photo.original_path, photo.thumbnail_path,
      photo.file_size, photo.mime_type,
      photo.created_at || new Date().toISOString()
    );
  }
}
```

### Updated Tote Delete Route
```typescript
// Before deleting tote, get BOTH item photos and tote photos
const itemPhotos = db.prepare(`
  SELECT ip.original_path, ip.thumbnail_path
  FROM item_photos ip JOIN items i ON ip.item_id = i.id
  WHERE i.tote_id = ?
`).all(id);

const totePhotos = db.prepare(`
  SELECT original_path, thumbnail_path
  FROM tote_photos WHERE tote_id = ?
`).all(id);

// Delete tote (CASCADE handles DB records)
db.prepare('DELETE FROM totes WHERE id = ?').run(id);

// Clean up ALL photo files
for (const photo of [...itemPhotos, ...totePhotos]) {
  deletePhotoFiles(photo.original_path, photo.thumbnail_path);
}
```

### Tote List API with Cover Photo
```typescript
// Updated GET /api/totes
const totes = db.prepare(`
  SELECT t.*,
    COUNT(i.id) as item_count,
    (SELECT tp.id FROM tote_photos tp
     WHERE tp.tote_id = t.id
     ORDER BY tp.created_at ASC LIMIT 1) as cover_photo_id
  FROM totes t
  LEFT JOIN items i ON i.tote_id = t.id
  GROUP BY t.id
  ORDER BY t.${sortColumn} ${sortOrder}
`).all();
```

### Dashboard API with Tote Thumbnails
```typescript
// Add recent totes to dashboard API
const recentTotes = db.prepare(`
  SELECT t.*,
    COUNT(i.id) as item_count,
    (SELECT tp.id FROM tote_photos tp
     WHERE tp.tote_id = t.id
     ORDER BY tp.created_at ASC LIMIT 1) as cover_photo_id
  FROM totes t
  LEFT JOIN items i ON i.tote_id = t.id
  GROUP BY t.id
  ORDER BY t.created_at DESC
  LIMIT 5
`).all();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline photo code in page components | Extracted shared components | This phase | Enables reuse across items and totes |
| Item-only photo support | Both item and tote photos | This phase | Core feature gap filled |
| Photo routes query single table | Photo routes accept `source` param | This phase | Support multiple photo entity types |

**No deprecated/outdated patterns to worry about** -- the existing implementation uses current Next.js 16 App Router patterns, React 19, and modern TypeScript.

## Open Questions

1. **Dashboard tote thumbnails layout**
   - What we know: PHOTO-03 requires "tote cover thumbnails on dashboard." The current dashboard has metric cards + recent items list.
   - What's unclear: Should totes appear in the recent items list, have their own "Recent Totes" section, or integrate into metric cards?
   - Recommendation: Add a "Recent Totes" section below the metric cards and above "Recently Added Items." This gives tote photos visibility without disrupting the existing items list. Show 5 most recent totes with cover thumbnails, name, location, item count.

2. **Tote creation photo upload**
   - What we know: Decision says "Upload available on tote creation and on detail page."
   - What's unclear: The tote creation form is a modal. Adding drag-and-drop to a modal is awkward and the tote doesn't have an ID yet when the form opens.
   - Recommendation: Use the same pattern as the item creation form on the tote detail page -- the create tote modal allows selecting a photo file, which is uploaded after the tote is created (two-step: create tote, then upload photo to the newly created tote). This matches the existing pattern in `handleAddItem()`.

3. **Cover thumbnail size for tote cards**
   - What we know: Existing item thumbnails in list views use the 200x200 thumbnails generated by sharp. Tote cards currently show a Box icon where a cover image would go.
   - What's unclear: What aspect ratio/size should the cover thumbnail be in tote cards?
   - Recommendation: Use the same 200x200 thumbnails (already generated). Display at the card level as a small square thumbnail (similar to how item thumbnails appear in list rows). The existing CSS class `item-thumbnail-img` can be reused or a similar `tote-cover-thumbnail` class can be created.

## Sources

### Primary (HIGH confidence)
- **Existing codebase analysis** -- All findings based on direct reading of:
  - `src/app/api/items/[id]/photos/route.ts` (item photo upload API, 139 lines)
  - `src/app/api/photos/[id]/route.ts` (photo serving and delete, 100 lines)
  - `src/app/api/photos/[id]/thumbnail/route.ts` (thumbnail serving, 51 lines)
  - `src/app/totes/[id]/items/[itemId]/page.tsx` (item detail page, 1300+ lines with inline photo UI)
  - `src/app/totes/[id]/page.tsx` (tote detail page, 1122 lines, target for photo gallery)
  - `src/app/totes/page.tsx` (tote list page, 717 lines, target for cover thumbnails)
  - `src/app/page.tsx` (dashboard, 175 lines, target for tote thumbnails)
  - `src/app/api/export/route.ts` (export, 106 lines)
  - `src/app/api/import/route.ts` (import, 369 lines)
  - `src/app/api/totes/[id]/route.ts` (tote CRUD with cascade delete, 253 lines)
  - `src/lib/db.ts` (schema initialization, 144 lines)
  - `src/lib/magic-bytes.ts` (file type detection, 74 lines)
  - `src/lib/validation.ts` (Zod schemas, 193 lines)
  - `src/types/index.ts` (type definitions, 156 lines)
  - `package.json` (dependencies)

### Secondary (MEDIUM confidence)
- Phase 1 research and plan documents for established patterns and decisions

### Tertiary (LOW confidence)
- None -- all findings are based on direct codebase analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all libraries already in use
- Architecture: HIGH - directly mirrors existing item photo pattern with well-understood refactoring
- Pitfalls: HIGH - identified from direct analysis of existing code and integration points

**Research date:** 2026-02-28
**Valid until:** Indefinite (codebase-specific findings, no external dependency version concerns)
