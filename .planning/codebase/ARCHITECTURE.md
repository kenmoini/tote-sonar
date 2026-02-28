# Architecture

**Analysis Date:** 2026-02-28

## Pattern Overview

**Overall:** Next.js 16 full-stack application with Server and Client Components using a RESTful API pattern with SQLite as the persistent data store.

**Key Characteristics:**
- Next.js App Router with dynamic route segments for nested resources
- Client-side state management using React hooks (useState, useCallback, useEffect)
- Server-side data persistence via SQLite with better-sqlite3
- API routes follow REST conventions with Next.js route handlers
- File uploads for photos with thumbnail generation via Sharp
- QR code generation for physical tote labeling

## Layers

**Presentation Layer:**
- Purpose: Renders UI components and manages user interactions
- Location: `src/app/` (page files) and `src/components/`
- Contains: React components using 'use client' directive, forms, modals, list views
- Depends on: API layer via fetch calls
- Used by: Browser client

**API Layer:**
- Purpose: Handles HTTP requests and implements business logic
- Location: `src/app/api/`
- Contains: Next.js route handlers (route.ts files)
- Depends on: Database layer via getDb()
- Used by: Presentation layer via fetch, external integrations

**Database Layer:**
- Purpose: Manages SQLite database connection, initialization, and file storage paths
- Location: `src/lib/db.ts`
- Contains: Database initialization, schema creation, utility functions
- Depends on: better-sqlite3, file system operations
- Used by: All API routes via getDb()

**Type System:**
- Purpose: Defines shared TypeScript interfaces across all layers
- Location: `src/types/index.ts`
- Contains: Domain models (Tote, Item, ItemMetadata, ItemPhoto, MovementHistory, Settings)
- Depends on: Nothing
- Used by: All layers

## Data Flow

**Create Tote Flow:**

1. User fills form in `src/app/totes/page.tsx`
2. Form submits to `POST /api/totes` with CreateToteInput
3. Route handler in `src/app/api/totes/route.ts` validates input and generates unique ID
4. Database record inserted via prepared statement from `src/lib/db.ts`
5. Response returned with created Tote object
6. Component updates local state and refetches tote list

**Search Items Flow:**

1. User enters search query in Navigation component
2. Routes to `src/app/search/page.tsx` with `?q=` parameter
3. SearchContent component fetches filters from `GET /api/search/filters`
4. User can refine with location, owner, metadata_key filters
5. `performSearch()` calls `GET /api/search?q=...&location=...&owner=...&metadata_key=...`
6. Route handler in `src/app/api/search/route.ts` builds dynamic SQL with conditions
7. Results joined with tote data and returned
8. Component renders matched items with tote context

**Photo Upload Flow:**

1. User clicks photo upload in item detail view
2. FormData sent to `POST /api/items/:id/photos`
3. Route handler in `src/app/api/items/[id]/photos/route.ts` validates:
   - File type (JPEG, PNG, WebP only)
   - File size against max_upload_size setting
   - Photo count (max 3 per item)
4. Sharp library rotates image based on EXIF, generates 200x200 thumbnail
5. Original and thumbnail written to filesystem via `getUploadDir()` and `getThumbnailDir()`
6. Database record created in item_photos table
7. Response with photo metadata returned to client

**Dashboard Data Flow:**

1. Dashboard page renders in `src/app/page.tsx`
2. Calls `GET /api/dashboard` on mount
3. Handler in `src/app/api/dashboard/route.ts` aggregates:
   - COUNT(*) from totes
   - COUNT(*) from items
   - Last 10 items with tote_name and first_photo_id via LEFT JOIN
4. Returns DashboardData object
5. Component displays metrics and recent items list with thumbnails

**State Management:**

- Form state in pages uses useState for controlled inputs
- Loading/error states per async operation
- URL search params used for filter persistence (useSearchParams hook)
- Photo data fetched on-demand, not pre-cached
- Settings cached in form defaults via fetchDefaults()
- No global state management library (Context API not used)

## Key Abstractions

**Tote (Container):**
- Purpose: Physical container for organizing items
- Examples: `src/types/index.ts` (Tote interface), `src/app/api/totes/route.ts`, `src/app/totes/page.tsx`
- Pattern: 6-character alphanumeric ID generated via `generateToteId()`, supports metadata fields (size, color, owner, location)

**Item (Inventory Unit):**
- Purpose: Physical object stored in a tote
- Examples: `src/types/index.ts` (Item interface), `src/app/api/totes/[id]/items/route.ts`
- Pattern: Auto-incrementing integer ID, quantity tracking, movement history

**ItemMetadata (Flexible Attributes):**
- Purpose: User-defined key-value pairs for custom item attributes
- Examples: `src/types/index.ts` (ItemMetadata interface), `src/app/api/items/[id]/metadata/route.ts`
- Pattern: Allows extensible tagging without schema changes

**ItemPhoto (Visual Documentation):**
- Purpose: Store images of items with optimized thumbnails
- Examples: `src/types/index.ts` (ItemPhoto interface), `src/app/api/items/[id]/photos/route.ts`
- Pattern: Dual file storage (original + thumbnail), MIME type tracking, file size validation

**MovementHistory (Audit Trail):**
- Purpose: Track which tote an item came from and moved to
- Examples: `src/types/index.ts` (MovementHistory interface), `src/app/api/items/[id]/move/route.ts`
- Pattern: Immutable record with from_tote_id and to_tote_id, timestamps

## Entry Points

**Homepage/Dashboard:**
- Location: `src/app/page.tsx`
- Triggers: Navigation to `/` or app load
- Responsibilities: Display overview metrics (total totes, total items), show recently added items with thumbnails, provide quick navigation to create first tote

**Totes List:**
- Location: `src/app/totes/page.tsx`
- Triggers: Navigation to `/totes`
- Responsibilities: List all totes with filtering/sorting, create form modal, bulk selection for QR printing, bulk deletion with confirmation

**Item Detail:**
- Location: `src/app/totes/[id]/items/[itemId]/page.tsx`
- Triggers: Navigation to `/totes/:toteId/items/:itemId`
- Responsibilities: Display item details, manage metadata key-value pairs, upload/view photos, track movement history

**Search:**
- Location: `src/app/search/page.tsx`
- Triggers: Navigation to `/search` or search form submission
- Responsibilities: Text search across item names/descriptions and metadata values, filter by location/owner/metadata key, display results with tote context

**Settings:**
- Location: `src/app/settings/page.tsx`
- Triggers: Navigation to `/settings`
- Responsibilities: Configure defaults for tote creation, set max upload size, manage custom metadata keys

## Error Handling

**Strategy:** Consistent HTTP status codes with JSON error responses, client-side toast notifications, ErrorDisplay component for user-facing errors

**Patterns:**

- **Validation Errors (400):** Request body validation in all POST/PUT handlers. Examples: `src/app/api/totes/route.ts` validates name and location required, `src/app/api/items/[id]/photos/route.ts` validates file type and size
- **Not Found (404):** Resource lookup failures. Example: `src/app/api/items/[id]/route.ts` returns 404 if item doesn't exist
- **Internal Errors (500):** Try-catch blocks log to console and return generic error message. Never expose internal details in response
- **Client-Side:** useCallback hooks wrap fetch in try-catch, set error state, display ErrorDisplay component from `src/components/ErrorDisplay.tsx`

## Cross-Cutting Concerns

**Logging:**
- Server-side: console.error() on all catch blocks in route handlers and db.ts
- Examples: `src/lib/db.ts` logs "Database connected" and "Database schema initialized", route handlers log operation failures
- No structured logging library (console only)

**Validation:**
- Server-side mandatory: All route handlers validate input types and required fields
- Pattern: Check non-null, type check with typeof, trim strings, range check numbers
- Examples: `src/app/api/totes/route.ts` validates body is object (not array), name/location required and trimmed, optional fields type-checked

**Authentication:**
- Not implemented - no auth layer present
- App is single-user/local deployment model
- Database and file access are unrestricted

**CORS:**
- Default Next.js CORS (same-origin only)
- No CORS headers configured in route handlers
- Suitable for same-domain frontend consumption

**Database Transactions:**
- Pragma settings: `foreign_keys = ON`, `synchronous = FULL`, `journal_mode = WAL`
- Cascading deletes configured: Deleting a tote cascades to items, metadata, photos, movement history
- No explicit transaction blocks - single-statement operations rely on foreign key constraints

---

*Architecture analysis: 2026-02-28*
