# Architecture Research

**Domain:** Personal inventory/organization app (Next.js full-stack, self-hosted, SQLite)
**Researched:** 2026-02-28
**Confidence:** HIGH (based on codebase analysis, official Next.js 16 docs, and established SQLite/self-hosted patterns)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Client)                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Pages    │  │ Forms    │  │ Photo    │  │ Search   │    │
│  │ (SSR)    │  │ (Client) │  │ Viewer   │  │ Bar      │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │              │              │              │          │
│       │         fetch() / FormData  │              │          │
├───────┴──────────────┴──────────────┴──────────────┴─────────┤
│                   Next.js App Router                          │
│  ┌───────────────────────────────────────────────────────┐   │
│  │              API Route Handlers (REST)                 │   │
│  │  /api/totes  /api/items  /api/photos  /api/search     │   │
│  │  /api/import /api/export /api/settings /api/health     │   │
│  └──────────────────────┬────────────────────────────────┘   │
│                         │                                     │
├─────────────────────────┴─────────────────────────────────────┤
│                     Data Access Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │  db.ts       │  │  sharp       │  │  Filesystem      │    │
│  │  (SQLite)    │  │  (Thumbnails)│  │  (Photo Storage)  │    │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘    │
│         │                 │                    │               │
├─────────┴─────────────────┴────────────────────┴──────────────┤
│                      Persistent Storage                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │ tote-sonar.db│  │ uploads/     │  │ thumbnails/      │    │
│  │ (SQLite WAL) │  │ (originals)  │  │ (200x200 covers) │    │
│  └──────────────┘  └──────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
                    Docker Volume: /app/data
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Page Components | Server-rendered shells that fetch data and delegate to client components | `src/app/totes/page.tsx`, `src/app/page.tsx` |
| Client Components | Interactive UI with forms, modals, drag-drop, photo viewers | `'use client'` pages, currently monolithic (1581 lines for item detail) |
| API Route Handlers | REST endpoints for all CRUD, photo upload/serve, search, import/export | `src/app/api/*/route.ts` files |
| Data Access Layer | SQLite singleton, schema init, path utilities | `src/lib/db.ts` (single file, ~140 lines) |
| Photo Pipeline | Upload validation, thumbnail generation via sharp, file serving with cache headers | Split across `api/items/[id]/photos/` and `api/photos/[id]/` |
| Shared Components | Navigation, Breadcrumb, ErrorDisplay (3 components total) | `src/components/` |
| Type Definitions | Centralized TypeScript interfaces for all entities | `src/types/index.ts` |

## Recommended Project Structure

The current structure is sound for the App Router pattern. The key structural change needed is decomposing monolithic page components. Recommended target structure:

```
src/
├── app/                        # Next.js App Router pages and API
│   ├── api/                    # REST route handlers (well-organized by resource)
│   │   ├── totes/              # Tote CRUD + QR generation
│   │   │   ├── route.ts        # GET all, POST new
│   │   │   ├── [id]/           # GET one, PUT, DELETE
│   │   │   │   ├── route.ts
│   │   │   │   ├── photos/     # ← NEW: Tote photo upload (mirrors items pattern)
│   │   │   │   │   └── route.ts
│   │   │   │   ├── items/      # GET items in tote
│   │   │   │   └── qr/         # QR code generation
│   │   │   └── qr/bulk/        # Bulk QR printing
│   │   ├── items/              # Item CRUD + metadata + photos
│   │   ├── photos/             # Photo serving (original + thumbnail)
│   │   ├── search/             # Search with filters
│   │   ├── import/             # ZIP import
│   │   ├── export/             # ZIP export
│   │   ├── dashboard/          # Aggregated stats
│   │   ├── settings/           # App configuration
│   │   ├── health/             # Health check endpoint
│   │   └── schema-check/       # Schema introspection
│   ├── totes/                  # Tote pages
│   │   ├── page.tsx            # Tote listing
│   │   └── [id]/               # Tote detail + items
│   │       ├── page.tsx        # Tote detail (currently 1121 lines — needs decomposition)
│   │       └── items/
│   │           └── [itemId]/
│   │               └── page.tsx # Item detail (currently 1581 lines — needs decomposition)
│   ├── items/[id]/             # Direct item access
│   ├── search/                 # Search results page
│   ├── settings/               # Settings page
│   ├── import-export/          # Import/Export page
│   └── page.tsx                # Dashboard
├── components/                 # Shared UI components (currently 3, needs expansion)
│   ├── ErrorDisplay.tsx        # Error state with network detection
│   ├── Breadcrumb.tsx          # Navigation breadcrumbs
│   ├── Navigation.tsx          # Header with search bar
│   ├── PhotoUpload.tsx         # ← NEW: Reusable photo upload widget
│   ├── PhotoGallery.tsx        # ← NEW: Photo viewer/lightbox
│   ├── ConfirmDialog.tsx       # ← NEW: Reusable confirmation modal
│   └── Toast.tsx               # ← NEW: Toast notification component
├── lib/                        # Server-side utilities
│   ├── db.ts                   # Database singleton + schema
│   ├── photos.ts               # ← NEW: Photo processing utilities (extract from route)
│   └── validation.ts           # ← NEW: Shared input validation
└── types/
    └── index.ts                # All TypeScript interfaces
```

### Structure Rationale

- **`src/app/api/`:** Already well-organized by resource. Tote photos API should mirror the existing `items/[id]/photos/` pattern exactly.
- **`src/components/`:** Currently only 3 components. The monolithic page files contain duplicated UI logic (photo upload, confirmation dialogs, toast notifications) that should be extracted into shared components.
- **`src/lib/`:** Currently only `db.ts`. Photo processing logic (sharp thumbnail generation, file validation, path management) is duplicated between the photo upload route and will be needed again for tote photos. Extract to `photos.ts`.
- **`src/types/`:** Single file works well at this scale. Add `TotePhoto` interface when tote photos are implemented.

## Architectural Patterns

### Pattern 1: Resource-Mirrored Photo Upload

**What:** Tote photos should use the identical architectural pattern as item photos -- same API shape, same database schema pattern, same file storage layout.

**When to use:** When adding photo support to any new entity (totes, in this case).

**Trade-offs:** Some code duplication between tote and item photo routes, but this is acceptable because it keeps each resource self-contained. Extracting shared photo utilities to `src/lib/photos.ts` minimizes the duplication to just the route handler glue code.

**Example:**
```typescript
// src/lib/photos.ts - Extracted shared photo logic
import sharp from 'sharp';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const THUMBNAIL_WIDTH = 200;
const THUMBNAIL_HEIGHT = 200;

export interface PhotoProcessingResult {
  filename: string;
  thumbnailFilename: string;
  fileSize: number;
  mimeType: string;
}

export function validatePhotoFile(file: File, maxSize: number): string | null {
  if (!ALLOWED_TYPES.includes(file.type as typeof ALLOWED_TYPES[number])) {
    return `Invalid file type: ${file.type}. Supported: JPEG, PNG, WebP`;
  }
  if (file.size > maxSize) {
    return `File exceeds maximum size of ${(maxSize / (1024 * 1024)).toFixed(1)}MB`;
  }
  return null; // no error
}

export async function processAndStorePhoto(
  buffer: Buffer,
  mimeType: string,
  uploadDir: string,
  thumbnailDir: string
): Promise<PhotoProcessingResult> {
  const ext = mimeType === 'image/jpeg' ? '.jpg' : mimeType === 'image/png' ? '.png' : '.webp';
  const uniqueId = crypto.randomBytes(16).toString('hex');
  const filename = `${uniqueId}${ext}`;
  const thumbnailFilename = `thumb_${filename}`;

  // Write original
  fs.writeFileSync(path.join(uploadDir, filename), buffer);

  // Generate thumbnail with EXIF auto-rotation
  await sharp(buffer)
    .rotate()
    .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, { fit: 'cover', position: 'center' })
    .toFile(path.join(thumbnailDir, thumbnailFilename));

  return { filename, thumbnailFilename, fileSize: buffer.length, mimeType };
}
```

### Pattern 2: Transactional Database-then-Filesystem Operations

**What:** When an operation touches both the database and filesystem (photo upload, item deletion with photos, import), perform the database write inside a transaction, then handle filesystem operations. If the filesystem write fails, roll back the database change.

**When to use:** Any operation that modifies both SQLite and the filesystem.

**Trade-offs:** Slightly more complex code, but prevents orphaned database records pointing to missing files (or orphaned files with no database record). The current codebase writes to the filesystem first and then inserts the database record, which can leave orphaned files on disk if the DB insert fails.

**Example:**
```typescript
// Correct order: DB transaction wrapping filesystem operations
const db = getDb();
const insertPhoto = db.transaction((photoData) => {
  // Insert DB record first to validate constraints
  const result = db.prepare(`
    INSERT INTO item_photos (item_id, filename, original_path, thumbnail_path, file_size, mime_type)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(...photoData);

  // If DB insert succeeds, write files
  try {
    fs.writeFileSync(originalPath, buffer);
    await generateThumbnail(buffer, thumbnailPath);
  } catch (fsError) {
    // Clean up any partial filesystem writes
    if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath);
    if (fs.existsSync(thumbnailPath)) fs.unlinkSync(thumbnailPath);
    throw fsError; // This rolls back the transaction
  }

  return result;
});
```

### Pattern 3: Component Decomposition for Monolithic Pages

**What:** Extract repeated UI patterns from large page components into focused, reusable components. The item detail page (1581 lines) and tote detail page (1121 lines) both contain inline implementations of photo upload, confirmation dialogs, toast messages, and action menus.

**When to use:** When page components exceed ~300-400 lines, or when the same UI pattern appears in multiple pages.

**Trade-offs:** More files to navigate, but each component is independently testable and reusable. State management becomes cleaner when each component owns its own loading/error state.

**Current problem illustrated:**
```typescript
// Item detail page has 30+ useState calls at the top level
const [uploading, setUploading] = useState(false);
const [uploadError, setUploadError] = useState<string | null>(null);
const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
const [viewingPhoto, setViewingPhoto] = useState<ItemPhoto | null>(null);
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [deletingItem, setDeletingItem] = useState(false);
const [photoToDelete, setPhotoToDelete] = useState<ItemPhoto | null>(null);
// ... 25+ more state variables
```

**Target decomposition:**
```typescript
// Each concern becomes its own component with encapsulated state
<PhotoUpload entityId={itemId} entityType="item" maxPhotos={3} onUpload={refreshItem} />
<PhotoGallery photos={item.photos} onDelete={handleDeletePhoto} />
<MetadataEditor metadata={item.metadata} onSave={handleSaveMetadata} />
<MovementHistory history={item.movement_history} />
<ConfirmDialog open={showDelete} onConfirm={handleDelete} message="Delete this item?" />
```

## Data Flow

### Request Flow

```
[User Action in Browser]
    ↓
[Client Component] → fetch('/api/resource') → [Route Handler] → [db.prepare().run()] → [SQLite]
    ↓                                              ↓                                      ↓
[setState(data)] ←────── JSON Response ←────── [Query Result] ←──────────────────── [Database]
```

### Photo Upload Flow (Current)

```
[User selects file]
    ↓
[Client validates type/size] → FormData → POST /api/items/:id/photos
    ↓                                              ↓
[Show uploading spinner]              [Server validates file again]
    ↓                                              ↓
[Receive response]                    [Write original to uploads/]
    ↓                                              ↓
[Refresh item data]                   [Generate thumbnail via sharp]
    ↓                                              ↓
[Display new photo]                   [Insert record into item_photos]
                                                   ↓
                                      [Return photo metadata (201)]
```

### Photo Serving Flow

```
[<img src="/api/photos/:id/thumbnail">]
    ↓
[Route Handler] → [SELECT from item_photos] → [Read file from disk]
    ↓
[Return binary with Cache-Control: immutable, max-age=31536000]
```

### Import/Export Flow

```
Export:
[GET /api/export] → [Query all tables] → [Read photo files from disk]
    ↓
[Build JSON manifest + ZIP with photos] → [Stream ZIP response]

Import:
[POST /api/import with ZIP] → [Parse ZIP] → [Validate JSON manifest]
    ↓
[Begin SQLite transaction] → [Insert totes → items → metadata → photos]
    ↓
[Extract photo files to uploads/ and thumbnails/] → [Commit transaction]
```

### Key Data Flows

1. **Tote-to-Item containment:** Items reference totes via `tote_id` foreign key with CASCADE delete. Deleting a tote deletes all items, which cascades to photos, metadata, and movement history. Filesystem cleanup happens in the DELETE route handler.

2. **Photo lifecycle:** Upload writes file to `data/uploads/`, generates thumbnail to `data/thumbnails/`, records paths in `item_photos` table. Serving reads from filesystem with immutable cache headers. Deletion removes both files and the database record.

3. **Search aggregation:** Search queries join across `items`, `totes`, and `item_metadata` tables using a dynamically-built WHERE clause with parameterized queries. Results include tote context (name, location) for display.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-50 totes, <500 items | Current architecture is appropriate. SQLite with WAL handles this easily. No changes needed. |
| 50-500 totes, 500-5000 items | Add search pagination (currently returns all results). Add database indexes on commonly-queried columns. Consider lazy-loading photos in lists. |
| 500+ totes, 5000+ items | SQLite still handles this scale well. Add virtual table (FTS5) for full-text search instead of LIKE queries. Consider streaming photo thumbnails instead of serving full buffers. |

### Scaling Priorities

1. **First bottleneck: Search performance.** The current search uses `LIKE '%query%'` which cannot use indexes. For personal use (<1000 items) this is fine, but adding SQLite FTS5 is the correct next step if search becomes slow.

2. **Second bottleneck: Photo serving memory.** Photos are read entirely into memory via `fs.readFileSync()` before being sent as a response. For large photos this allocates significant memory per request. Switching to `fs.createReadStream()` with streaming responses would fix this, but is unlikely to matter for single-user personal use.

## Anti-Patterns

### Anti-Pattern 1: Monolithic Page Components

**What people do:** Put all UI logic, state management, form handling, modals, and data fetching into a single page component file.

**Why it's wrong:** The item detail page is 1581 lines with 30+ useState calls. This makes it impossible to test individual features, hard to reason about state interactions, and forces full-page re-renders when any state changes. Adding tote photos to the tote detail page (1121 lines) following the same pattern would make it worse.

**Do this instead:** Extract reusable components with encapsulated state. A `PhotoUpload` component should own its own `uploading`, `uploadError`, and `dragState`. A `ConfirmDialog` should own its own visibility state. The page component becomes an orchestrator that composes these pieces and handles only top-level data fetching.

### Anti-Pattern 2: Filesystem-First, Database-Second Writes

**What people do:** Write the photo file to disk first, then insert the database record. If the database insert fails, an orphaned file remains on disk.

**Why it's wrong:** Over time, orphaned files accumulate and consume storage with no way to discover or clean them. The current codebase writes files first (`fs.writeFileSync`) then inserts into the database, meaning a crash between these operations leaves orphaned files.

**Do this instead:** Use SQLite transactions that encompass both the database write and filesystem operations. If either fails, clean up both. Alternatively, implement a periodic orphan cleanup that scans the uploads directory against the database.

### Anti-Pattern 3: Missing Error Boundaries

**What people do:** Rely only on try-catch in event handlers and per-component error state, without Next.js `error.tsx` boundary files.

**Why it's wrong:** If a server component throws during render, or if an unhandled exception occurs in a client component outside an event handler, the entire page crashes with no recovery option. The current codebase has no `error.tsx` files anywhere.

**Do this instead:** Add `error.tsx` at the app root (`src/app/error.tsx`) for global error recovery, and at critical route segments (`src/app/totes/error.tsx`, `src/app/totes/[id]/error.tsx`) for granular recovery. These provide a "Try Again" button that re-renders the route segment without a full page reload.

### Anti-Pattern 4: Synchronous File Reads for Photo Serving

**What people do:** Use `fs.readFileSync()` to load entire photo files into memory before sending the response.

**Why it's wrong:** For a 10MB photo, this allocates 10MB of Node.js heap per request. While acceptable for single-user, it becomes a problem if multiple browser tabs are open or if the user is browsing rapidly.

**Do this instead:** Use streaming responses with `fs.createReadStream()` and pipe to the response. This handles files of any size with constant memory usage:

```typescript
import { createReadStream } from 'fs';

const stream = createReadStream(filePath);
return new Response(stream as unknown as ReadableStream, {
  headers: {
    'Content-Type': mimeType,
    'Cache-Control': 'public, max-age=31536000, immutable',
  },
});
```

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Client Components to API | `fetch()` with JSON/FormData | All data mutations go through REST API routes. No Server Actions used currently. |
| API Routes to Database | `getDb().prepare().run/all/get()` | Synchronous better-sqlite3 calls. DB singleton persists across HMR via `globalThis`. |
| API Routes to Filesystem | `fs.writeFileSync()` / `fs.readFileSync()` | Synchronous filesystem I/O. Photo paths stored as relative (`uploads/filename`) in DB, resolved against `DATA_DIR` at runtime. |
| Photo Processing | `sharp` library | Used only during upload for thumbnail generation. EXIF auto-rotation via `.rotate()`. No post-processing or lazy generation. |
| Import/Export | `adm-zip` (import) / `kemo-archiver` (export) | Different ZIP libraries for read vs write. JSON manifest + binary photo files in ZIP. |

### Component Build Order (Dependencies)

The following build order respects component dependencies. Items higher in the list are prerequisites for items below:

1. **Photo utility extraction (`src/lib/photos.ts`)** -- No dependencies. Extract shared validation and processing logic from the existing item photo upload route. This unblocks tote photo upload without code duplication.

2. **Shared UI components (`PhotoUpload`, `ConfirmDialog`, `Toast`)** -- Depends on extracting patterns from existing pages. These components must be built before refactoring monolithic pages, because the refactored pages will compose these components.

3. **Tote photo API (`/api/totes/[id]/photos/`)** -- Depends on photo utility extraction. Mirrors the existing item photo API structure. Needs a new `tote_photos` database table with the same schema pattern as `item_photos`.

4. **Database schema migration for `tote_photos`** -- Depends on tote photo API design. Add `CREATE TABLE IF NOT EXISTS tote_photos` to `initializeSchema()`. Update import/export to handle the new table.

5. **Error boundary files (`error.tsx`)** -- No dependencies. Can be added at any point. Should be done early because it provides safety net for all subsequent work.

6. **Page decomposition (item detail, tote detail)** -- Depends on shared UI components being available. The largest refactoring task. Extract inline photo upload, metadata editing, movement history, and action menus into composed components.

7. **Input validation hardening (`src/lib/validation.ts`)** -- No strict dependencies, but best done after page decomposition so validation logic can be shared between client-side form validation and server-side API validation.

8. **Performance improvements (search pagination, streaming photo responses)** -- Depends on nothing structurally, but should be last because current performance is adequate for personal use and the work is lower priority than correctness.

## Hardening Patterns for Self-Hosted Personal Apps

### Database Integrity

The current codebase already implements several important SQLite hardening measures:

- **WAL mode** (`PRAGMA journal_mode = WAL`): Allows concurrent reads during writes, survives process crashes without data loss.
- **Foreign keys enforced** (`PRAGMA foreign_keys = ON`): Prevents orphaned records.
- **FULL synchronous** (`PRAGMA synchronous = FULL`): Ensures writes are flushed to disk before reporting success. This is the safest setting for preventing data loss on power failure.
- **WAL checkpoint on startup** (`PRAGMA wal_checkpoint(TRUNCATE)`): Recovers any pending WAL data from previous unclean shutdowns.

**Additional hardening to consider:**

- **Backup strategy:** Periodic SQLite `.backup()` call to create a point-in-time copy of the database. For a self-hosted app, a cron job or startup-time backup to a secondary location is sufficient.
- **PRAGMA integrity_check:** Run `PRAGMA integrity_check` on startup (or on a schedule) to detect database corruption early.

### Error Recovery

- **Next.js error boundaries** (`error.tsx`): Catch rendering errors and offer "Try Again" without full page reload. Currently missing entirely.
- **Network error detection:** The existing `ErrorDisplay` component already classifies network vs server errors and shows appropriate recovery guidance. This is well-implemented.
- **Retry-friendly API design:** All API operations are idempotent (GET) or create new records (POST). PUT operations use full replacement semantics. This means retrying a failed request is safe.

### Graceful Degradation

- **Photos as enhancement:** If a photo file is missing from disk but the database record exists, serve a placeholder image instead of returning a 500 error. Currently returns 404, which is acceptable but could be more graceful.
- **Thumbnail fallback:** If thumbnail generation fails during upload, store the original photo path as the thumbnail path so the photo is still viewable (at full size) rather than broken.
- **Search without metadata:** If the metadata tables are corrupted or empty, search should still work for item names and descriptions. The current dynamic WHERE clause handles this correctly.
- **Import partial success:** The import currently runs in a single transaction (all-or-nothing). Consider reporting partial results: "Imported 45/50 totes, 3 photos had errors" with details on what failed.

## Sources

- Next.js 16.1.6 official documentation: Route Handlers (verified via WebFetch, 2026-02-27)
- Next.js 16.1.6 official documentation: Error Handling with error.tsx boundaries (verified via WebFetch, 2026-02-27)
- Next.js 16.1.6 official documentation: Server Functions and Mutations (verified via WebFetch, 2026-02-27)
- SQLite WAL mode documentation: https://www.sqlite.org/wal.html (HIGH confidence, well-established)
- better-sqlite3 transaction API: https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md (HIGH confidence)
- Codebase analysis of `src/lib/db.ts`, `src/app/api/items/[id]/photos/route.ts`, `src/app/api/photos/[id]/route.ts`, `src/components/ErrorDisplay.tsx`, `src/app/totes/[id]/items/[itemId]/page.tsx` (direct inspection)

---
*Architecture research for: Tote Sonar personal inventory app*
*Researched: 2026-02-28*
