# Architecture

**Analysis Date:** 2026-02-28

## Pattern Overview

**Overall:** Next.js full-stack monolith with client-server separation using Next.js App Router, Server Components, and Server-side Routes (API Layer)

**Key Characteristics:**
- **Frontend:** React 19 with `'use client'` boundary for client-side interactivity
- **Backend:** Node.js with Next.js Server Functions for API routes (Route Handlers)
- **Database:** SQLite with better-sqlite3 ORM, file-based persistence in `data/` directory
- **File Storage:** Local filesystem for photos and thumbnails in `data/uploads/` and `data/thumbnails/`
- **Type Safety:** Full TypeScript implementation with centralized type definitions

## Layers

**Presentation Layer (Pages & Components):**
- Purpose: Server-rendered or client-rendered UI using React components
- Location: `src/app/` (pages) and `src/components/` (shared components)
- Contains: Next.js page components (`page.tsx`), client components with `'use client'` directive, UI logic
- Depends on: API Layer via fetch(), Navigation, type definitions from `src/types/`
- Used by: Browser/End User

**API Layer (Route Handlers):**
- Purpose: Expose REST API endpoints for CRUD operations and specialized functions
- Location: `src/app/api/` organized by resource (totes, items, photos, search, settings, etc.)
- Contains: Next.js Route Handlers (`route.ts` files), request/response handling, validation, database queries
- Depends on: Database Layer (`src/lib/db.ts`), Type definitions
- Used by: Presentation Layer via fetch(), external clients

**Data Access Layer:**
- Purpose: Database initialization, schema management, singleton connection, utility functions
- Location: `src/lib/db.ts`
- Contains: Database initialization, table schema (CREATE TABLE), transaction management, file path utilities
- Depends on: `better-sqlite3` package, Node.js `fs` and `path` modules
- Used by: API Layer for all database operations

**Type Definitions:**
- Purpose: Centralized TypeScript interfaces for type safety across frontend and backend
- Location: `src/types/index.ts`
- Contains: Tote, Item, ItemMetadata, ItemPhoto, MovementHistory, Setting, DashboardData, SearchResult, ApiResponse interfaces
- Used by: All layers (pages, components, API routes)

**Shared Components:**
- Purpose: Reusable UI elements shared across pages
- Location: `src/components/`
- Contains: Navigation (header with search), Breadcrumb (nav trail), ErrorDisplay (error state UI)
- Used by: Page components

## Data Flow

**Create Tote Flow:**

1. User submits form in `/totes` page (client-side `'use client'`)
2. Form handler calls `POST /api/totes` with JSON body
3. API route in `src/app/api/totes/route.ts` validates input (name, location required; optional size, color, owner)
4. Route generates 6-character alphanumeric ID via `generateToteId()`
5. Route inserts record into `totes` table via `getDb().prepare().run()`
6. Route returns created tote (201 status) to client
7. Client updates local state and refetches totes list

**Get Item Details Flow:**

1. User navigates to `/totes/[id]/items/[itemId]`
2. Page fetches from `GET /api/items/[id]` in `src/app/api/items/[id]/route.ts`
3. API route joins `items` + `totes` tables, fetches related metadata, photos, and movement history
4. Returns composite object with item, metadata, photos, movement_history
5. Client displays full item view with related data

**Search Flow:**

1. User enters query in global search bar (Navigation component)
2. Routes to `/search?q={query}`
3. Page fetches from `GET /api/search/route.ts` with query params (q, location, owner, metadata_key)
4. API builds dynamic WHERE clause with parameterized queries (prevents SQL injection)
5. Searches across item name, description, and metadata values
6. Returns items with tote context (tote_name, tote_id, tote_location)

**Photo Upload Flow:**

1. User uploads photo in item detail page via form with file input
2. Frontend reads file and sends multipart FormData to `POST /api/items/[id]/photos`
3. API validates file type (JPEG, PNG, WebP), file size (against max_upload_size setting)
4. Generates unique filename via `crypto.randomBytes(16).toString('hex')`
5. Writes original to `data/uploads/`, generates thumbnail via `sharp` library
6. Writes thumbnail to `data/thumbnails/`
7. Inserts photo record into `item_photos` table with paths
8. Returns photo metadata (201 status)

**State Management:**

- **Client State:** React hooks (useState) for form state, loading/error states, UI toggles, modal visibility
- **Database State:** SQLite at `data/tote-sonar.db` with WAL mode for durability
- **Settings Persistence:** Settings table for configuration (server_hostname, max_upload_size, default_tote_fields, default_metadata_keys, theme)
- **Movement History:** Tracks item transfers between totes via `item_movement_history` table with foreign keys

## Key Abstractions

**Tote (Container):**
- Purpose: Represents a physical container to organize items
- Examples: `src/app/totes/[id]/page.tsx`, `src/app/api/totes/[id]/route.ts`, `src/types/index.ts` (Tote interface)
- Pattern: RESTful resource with properties (name, location, size, color, owner), unique 6-char ID, timestamps

**Item (Contents):**
- Purpose: Represents an object stored in a tote
- Examples: `src/app/items/[id]/page.tsx`, `src/app/api/items/[id]/route.ts`, `src/types/index.ts` (Item interface)
- Pattern: AUTOINCREMENT integer ID, linked to tote via tote_id foreign key, supports metadata and photos

**ItemMetadata (Extensible Attributes):**
- Purpose: Key-value pairs for flexible item properties (e.g., color, material, brand)
- Examples: `src/app/api/items/[id]/metadata/route.ts`, `item_metadata` table
- Pattern: Many-to-one from items, unique key names tracked in `metadata_keys` table for autocomplete

**ItemPhoto (Visual Evidence):**
- Purpose: Photos of items with auto-generated thumbnails
- Examples: `src/app/api/items/[id]/photos/route.ts`, `item_photos` table
- Pattern: Original + thumbnail files on disk, max 3 per item, EXIF auto-rotation via sharp

**QR Code Labels:**
- Purpose: Printable QR codes linking to tote detail pages
- Examples: `src/app/api/totes/[id]/qr/route.ts`, `src/app/api/totes/qr/bulk/route.ts`
- Pattern: Generated on-demand via `qrcode` library, data URL embedded in page for printing

## Entry Points

**Web Application:**
- Location: `src/app/page.tsx`
- Triggers: User navigates to `/` (root)
- Responsibilities: Renders dashboard with metric cards (total totes, total items), recently added items list, welcome screen when empty

**Dashboard API:**
- Location: `src/app/api/dashboard/route.ts`
- Triggers: GET request to `/api/dashboard`
- Responsibilities: Aggregates tote count, item count, and recent items (last 10) with tote names

**Totes Management:**
- Location: `src/app/totes/page.tsx`
- Triggers: User navigates to `/totes` or clicks "Totes" in nav
- Responsibilities: Lists all totes as cards, supports create/edit/delete, bulk selection for QR printing, sorting

**Tote Detail View:**
- Location: `src/app/totes/[id]/page.tsx`
- Triggers: User clicks tote card
- Responsibilities: Shows tote properties, item list, allows add/edit/delete items, print QR, edit tote metadata

**Item Detail View:**
- Location: `src/app/totes/[id]/items/[itemId]/page.tsx` and `/app/items/[id]/page.tsx`
- Triggers: User clicks item in tote or from dashboard
- Responsibilities: Full item view with metadata, photos, movement history; edit/delete item

**Global Search:**
- Location: `src/app/search/page.tsx`
- Triggers: User submits search bar or navigates to `/search?q=query`
- Responsibilities: Search items by name, description, location, owner, metadata; display results with tote context

**Settings:**
- Location: `src/app/settings/page.tsx`
- Triggers: User clicks "Settings" in nav
- Responsibilities: Edit application settings (server hostname, upload size, default tote fields, default metadata keys, theme)

**Import/Export:**
- Location: `src/app/import-export/page.tsx`
- Triggers: User clicks "Import/Export" in nav
- Responsibilities: Bulk import totes and items from JSON, export all data to JSON/ZIP

## Error Handling

**Strategy:** Layered try-catch with user-facing error messages, server logs, and ErrorDisplay component

**Patterns:**
- API routes wrap database operations in try-catch, return 500 on unexpected errors with generic message
- Client pages fetch with error state, display ErrorDisplay component with retry button
- Form validation errors show field-level error text
- Unrecognized paths show `/src/app/not-found.tsx` (404 page)
- API validation returns 400 with descriptive error message (e.g., "Name is required")

## Cross-Cutting Concerns

**Logging:** Console logging for database connection, schema initialization, and server-side errors; prefixed by operation type

**Validation:**
- Input validation at API layer (type checking, required fields, string trimming)
- SQL injection prevention via parameterized queries (db.prepare().all(...params))
- File upload validation (MIME type whitelist, size limits, max photos per item)

**Authentication:** Not implemented; assumes single-user/private environment

**File Cleanup:** Cascade delete via foreign keys; manual file system cleanup in item deletion route (orphaned uploads/thumbnails deleted)

**Database Consistency:**
- Foreign key constraints enabled (`PRAGMA foreign_keys = ON`)
- Cascade delete on tote/item deletion
- WAL mode for durability across crashes

---

*Architecture analysis: 2026-02-28*
