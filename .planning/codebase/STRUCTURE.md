# Codebase Structure

**Analysis Date:** 2026-02-28

## Directory Layout

```
/Users/kenmoini/Development/tote-sonar/
├── src/                          # Application source code
│   ├── app/                       # Next.js App Router pages and API routes
│   │   ├── page.tsx               # Dashboard page (/)
│   │   ├── layout.tsx             # Root layout with Navigation wrapper
│   │   ├── globals.css            # Global styles
│   │   ├── not-found.tsx          # 404 page
│   │   ├── api/                   # REST API routes
│   │   │   ├── dashboard/         # Dashboard data endpoint
│   │   │   ├── totes/             # Tote CRUD and QR generation
│   │   │   ├── items/             # Item CRUD, move, duplicate
│   │   │   ├── photos/            # Photo serving (thumbnail/original)
│   │   │   ├── search/            # Search items with filters
│   │   │   ├── settings/          # Get/update application settings
│   │   │   ├── metadata-keys/     # Fetch unique metadata key names
│   │   │   ├── import/            # Bulk import JSON data
│   │   │   ├── export/            # Export all data as JSON/ZIP
│   │   │   ├── health/            # Health check endpoint
│   │   │   └── schema-check/      # Database schema verification
│   │   ├── totes/                 # Tote pages
│   │   │   ├── page.tsx           # Totes list and create form
│   │   │   └── [id]/              # Tote detail view
│   │   │       ├── page.tsx       # Tote detail with items list
│   │   │       └── items/[itemId]/ # Item detail view
│   │   ├── items/[id]/            # Item detail alternate route
│   │   │   └── page.tsx
│   │   ├── search/                # Search results page
│   │   │   └── page.tsx
│   │   ├── import-export/         # Import/export UI
│   │   │   └── page.tsx
│   │   └── settings/              # Settings page
│   │       └── page.tsx
│   ├── components/                # Reusable React components
│   │   ├── Navigation.tsx         # Top nav bar with logo, links, search
│   │   ├── Breadcrumb.tsx         # Navigation breadcrumb trail
│   │   └── ErrorDisplay.tsx       # Error state UI with retry button
│   ├── lib/                       # Utility modules
│   │   └── db.ts                  # Database connection, schema, helpers
│   └── types/                     # TypeScript type definitions
│       └── index.ts               # Centralized interfaces (Tote, Item, etc.)
│
├── data/                          # Runtime data directory (created if missing)
│   ├── tote-sonar.db              # SQLite database file (created at startup)
│   ├── uploads/                   # Original uploaded photos
│   └── thumbnails/                # Generated thumbnail images
│
├── node_modules/                  # Dependencies (115 packages at build time)
├── .next/                         # Next.js build output
│
├── package.json                   # Dependencies and scripts
├── package-lock.json              # Locked dependency versions
├── tsconfig.json                  # TypeScript configuration
├── next.config.mjs                # Next.js configuration
├── renovate.json                  # Dependency update config
├── Dockerfile                     # Docker image definition
├── init.sh                        # Startup script for initialization
├── setup-test-data.js             # Script to populate test data
├── README.md                      # Project documentation
├── LICENSE                        # License file
└── .gitignore                     # Git ignore rules
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js App Router directory; defines all pages and API routes
- Contains: Page components (`.tsx` with `export default`), layout wrappers, API route handlers (`route.ts`)
- Key files: `page.tsx` (entry pages), `layout.tsx` (layout component), `route.ts` (API handlers)

**`src/app/api/`:**
- Purpose: REST API endpoint definitions
- Contains: Route handlers (POST, GET, PUT, DELETE) for each resource
- Organization: Subdirectories by resource type (totes, items, photos, search, etc.); `[id]` denotes dynamic segments

**`src/components/`:**
- Purpose: Reusable React components shared across pages
- Contains: Navigation header, breadcrumb nav, error display
- Pattern: Each component is a `.tsx` file exporting a React component

**`src/lib/`:**
- Purpose: Utility modules for shared logic
- Contains: Database operations, helpers, constants
- Key file: `db.ts` (singleton database connection, schema initialization, ID generation)

**`src/types/`:**
- Purpose: TypeScript interface definitions for type safety
- Contains: Data models (Tote, Item, ItemMetadata, etc.), API response shapes, enums
- Key file: `index.ts` (all types exported from single module)

**`data/`:**
- Purpose: Runtime data storage (created automatically on startup)
- Contains: SQLite database file, photo uploads, thumbnail images
- Ignored in git; persists between restarts if using Docker volume mount

## Key File Locations

**Entry Points:**
- `src/app/page.tsx`: Dashboard landing page
- `src/app/layout.tsx`: Root layout with Navigation component
- `src/app/api/dashboard/route.ts`: Dashboard data API endpoint

**Configuration:**
- `package.json`: Dependencies (Next.js, React, better-sqlite3, sharp, qrcode, etc.)
- `tsconfig.json`: TypeScript compiler options and path aliases
- `next.config.mjs`: Next.js configuration (minimal setup)
- `src/lib/db.ts`: Database path configuration via `DATA_DIR` env var

**Core Logic:**
- `src/lib/db.ts`: Database initialization, schema, utilities (generateToteId, getUploadDir, getThumbnailDir)
- `src/app/api/totes/route.ts`: GET all totes, POST create tote
- `src/app/api/items/[id]/route.ts`: GET item with metadata/photos, PUT update, DELETE item
- `src/app/api/items/[id]/photos/route.ts`: POST photo upload, GET photo list
- `src/app/api/search/route.ts`: Search items across name, description, metadata

**Testing:**
- `setup-test-data.js`: Script to populate database with test data
- No automated test files detected (manual testing assumed)

## Naming Conventions

**Files:**
- Page components: `page.tsx` (lowercase, no export function name needed)
- API routes: `route.ts` (lowercase, exports GET/POST/PUT/DELETE functions)
- Components: PascalCase (e.g., `Navigation.tsx`, `ErrorDisplay.tsx`)
- Types: `index.ts` in `types/` directory
- Styles: `globals.css` for global styles; scoped CSS via component-level classes

**Directories:**
- Dynamic segments: `[id]`, `[itemId]` (square brackets for URL parameters)
- Grouping: Flat structure under `api/` with subdirectories per resource
- No `pages/` directory (uses Next.js 13+ App Router structure)

**Functions:**
- API handlers: Named exports (GET, POST, PUT, DELETE)
- Database utilities: camelCase (getDb, generateToteId, getUploadDir)
- Components: Default export of React component with PascalCase name

**Variables:**
- State: camelCase (e.g., `totes`, `showCreateForm`, `selectedTotes`)
- Types: PascalCase (e.g., `Tote`, `Item`, `DashboardData`)
- Constants: UPPER_SNAKE_CASE (e.g., `ALLOWED_TYPES`, `THUMBNAIL_WIDTH`)

**Database:**
- Tables: snake_case (totes, items, item_photos, item_metadata, item_movement_history, metadata_keys, settings)
- Columns: snake_case (id, created_at, updated_at, tote_id, file_size, mime_type)
- Foreign keys: follow column name (e.g., `tote_id` references `totes.id`)

## Where to Add New Code

**New Feature (e.g., "Add comments to items"):**
- Primary code:
  - Add `comments` table to schema in `src/lib/db.ts`
  - Create API route `src/app/api/items/[id]/comments/route.ts`
  - Add Comment interface to `src/types/index.ts`
  - Create/update page component in `src/app/totes/[id]/items/[itemId]/page.tsx` or `src/app/items/[id]/page.tsx`
- Tests: Create test data in `setup-test-data.js` if needed

**New Component/Module:**
- Implementation: `src/components/YourComponent.tsx` (reusable across pages)
- Or: Create component inline in page if only used once
- Import: Use path alias `@/components/YourComponent`

**New API Endpoint:**
- Location: `src/app/api/{resource}/route.ts` (if top-level) or `src/app/api/{resource}/[id]/route.ts` (if sub-resource)
- Pattern:
  1. Define handler function (GET, POST, PUT, DELETE)
  2. Extract params via `params: Promise<{ id }>` if dynamic
  3. Validate input (required fields, types)
  4. Query database via `getDb().prepare(sql).run/get/all()`
  5. Return `NextResponse.json()` with data or error

**Utilities:**
- Shared helpers: `src/lib/` directory (e.g., `src/lib/format.ts` for date formatting)
- Database operations: Keep in `src/lib/db.ts` or create separate `src/lib/queries.ts`

**Type Definitions:**
- New types: Add to `src/types/index.ts`
- Use consistent naming: `{Entity}`, `Create{Entity}Input`, `Update{Entity}Input`

## Special Directories

**`src/app/api/[id]/` dynamic segments:**
- Purpose: Handle parameterized API routes
- Generated: No, manually created with square bracket names
- Committed: Yes, part of source code

**`data/` directory:**
- Purpose: Runtime data storage
- Generated: Yes, created at startup if missing
- Committed: No, ignored via `.gitignore`

**`.next/` build directory:**
- Purpose: Next.js build artifacts
- Generated: Yes, created via `npm run build`
- Committed: No, ignored via `.gitignore`

---

*Structure analysis: 2026-02-28*
