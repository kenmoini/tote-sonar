# Codebase Structure

**Analysis Date:** 2026-02-28

## Directory Layout

```
tote-sonar/
├── src/
│   ├── app/                          # Next.js App Router - pages and API routes
│   │   ├── api/                      # RESTful API route handlers
│   │   │   ├── dashboard/            # Dashboard metrics
│   │   │   ├── export/               # Data export to ZIP
│   │   │   ├── health/               # Health check status
│   │   │   ├── import/               # Data import from ZIP
│   │   │   ├── items/                # Item resource operations
│   │   │   │   └── [id]/             # Individual item detail and updates
│   │   │   │       ├── metadata/     # Item metadata operations
│   │   │   │       ├── photos/       # Photo upload and listing
│   │   │   │       ├── move/         # Move item between totes
│   │   │   │       └── duplicate/    # Duplicate item
│   │   │   ├── metadata-keys/        # Available metadata key suggestions
│   │   │   ├── photos/               # Photo retrieval and deletion
│   │   │   │   └── [id]/
│   │   │   │       └── thumbnail/    # Thumbnail serving
│   │   │   ├── schema-check/         # Database schema validation
│   │   │   ├── search/               # Search items and get filters
│   │   │   │   └── filters/          # Available location, owner, metadata keys
│   │   │   ├── settings/             # App settings CRUD
│   │   │   └── totes/                # Tote resource operations
│   │   │       ├── qr/               # QR code generation
│   │   │       └── [id]/             # Individual tote detail and updates
│   │   │           ├── items/        # Items in specific tote
│   │   │           └── qr/           # QR for specific tote
│   │   │
│   │   ├── (public pages)/           # User-facing routes
│   │   │   ├── page.tsx              # Dashboard homepage
│   │   │   ├── import-export/        # Import/export UI
│   │   │   ├── search/               # Search UI with filters
│   │   │   ├── settings/             # Settings UI
│   │   │   ├── totes/                # Totes list and detail
│   │   │   │   ├── page.tsx          # List all totes
│   │   │   │   ├── [id]/             # Tote detail page
│   │   │   │   │   └── items/        # Items in tote
│   │   │   │   │       └── [itemId]/ # Item detail page
│   │   │   │   └── items/            # Redirect container
│   │   │   │       └── [id]/         # Item detail (alt route)
│   │   │   ├── layout.tsx            # Root layout with Navigation
│   │   │   ├── globals.css           # Global styles
│   │   │   └── not-found.tsx         # 404 page
│   │   │
│   │   ├── layout.tsx                # Root layout wrapper
│   │   └── page.tsx                  # Homepage/Dashboard
│   │
│   ├── components/                   # Reusable React components
│   │   ├── Navigation.tsx            # Top navigation bar with search
│   │   ├── Breadcrumb.tsx            # Breadcrumb navigation
│   │   └── ErrorDisplay.tsx          # Error state component with retry
│   │
│   ├── lib/                          # Utility functions and helpers
│   │   └── db.ts                     # SQLite connection, schema, initialization
│   │
│   └── types/                        # TypeScript type definitions
│       └── index.ts                  # All domain models and interfaces
│
├── data/                             # Runtime data directory (generated)
│   ├── tote-sonar.db                 # SQLite database file
│   ├── uploads/                      # Full-size uploaded photos
│   └── thumbnails/                   # Generated thumbnail images
│
├── .github/
│   └── workflows/                    # GitHub Actions CI/CD
│
├── public/                           # Static assets (if any)
│
├── .planning/
│   └── codebase/                     # This analysis output
│
├── node_modules/                     # Dependencies (generated)
│
├── .next/                            # Next.js build output (generated)
│
├── package.json                      # Dependencies and scripts
├── tsconfig.json                     # TypeScript configuration
├── next.config.mjs                   # Next.js configuration
├── Dockerfile                        # Container image definition
├── init.sh                           # Database initialization script
└── README.md                         # Project documentation
```

## Directory Purposes

**src/app:**
- Purpose: Next.js App Router pages and API routes
- Contains: Page components, layout wrappers, route handlers (route.ts)
- Key files: `layout.tsx` (root layout), `page.tsx` (homepage), `globals.css` (styling)

**src/app/api:**
- Purpose: RESTful API endpoints
- Contains: Next.js route handlers responding to HTTP requests
- Key files: Each subdirectory has `route.ts` implementing GET, POST, PUT, DELETE
- Pattern: Organized by resource (totes, items, photos, search, settings)

**src/components:**
- Purpose: Reusable UI components
- Contains: React functional components (all using 'use client')
- Key files: `Navigation.tsx` (main nav bar), `ErrorDisplay.tsx` (error states)

**src/lib:**
- Purpose: Core utility functions and configuration
- Contains: Database initialization, schema, helper functions
- Key files: `db.ts` (SQLite initialization, getDb, generateToteId)

**src/types:**
- Purpose: Centralized TypeScript type definitions
- Contains: Domain interfaces (Tote, Item, ItemPhoto, etc.)
- Key files: `index.ts` (all types)

**data/:**
- Purpose: Runtime data storage (generated at startup)
- Contains: SQLite database, uploaded photos, thumbnails
- Not committed to git, created automatically

## Key File Locations

**Entry Points:**

- `src/app/layout.tsx`: Root HTML layout, imports Navigation component
- `src/app/page.tsx`: Dashboard homepage (/), shows metrics and recent items
- `src/app/totes/page.tsx`: List all totes (/totes), create modal, bulk selection
- `src/app/search/page.tsx`: Search interface (/search)
- `src/app/items/[id]/page.tsx`: Item detail view (/items/:id)

**API Endpoints:**

- `src/app/api/totes/route.ts`: GET (list all), POST (create tote)
- `src/app/api/totes/[id]/route.ts`: GET (detail), PUT (update), DELETE (remove)
- `src/app/api/totes/[id]/items/route.ts`: GET (list items in tote), POST (add item)
- `src/app/api/items/[id]/route.ts`: GET (detail), PUT (update), DELETE (remove)
- `src/app/api/items/[id]/photos/route.ts`: POST (upload photo), GET (list photos)
- `src/app/api/items/[id]/metadata/route.ts`: POST (add metadata), GET (list metadata)
- `src/app/api/search/route.ts`: GET (search items by query/filters)
- `src/app/api/search/filters/route.ts`: GET (available location/owner/metadata keys)
- `src/app/api/dashboard/route.ts`: GET (dashboard metrics)
- `src/app/api/export/route.ts`: GET (download ZIP with all data and photos)
- `src/app/api/import/route.ts`: POST (upload ZIP to restore data)
- `src/app/api/health/route.ts`: GET (database connectivity check)
- `src/app/api/settings/route.ts`: GET (read all settings), POST (update setting)

**Configuration:**

- `src/lib/db.ts`: Database initialization, schema creation, utility exports
- `src/types/index.ts`: All TypeScript interfaces for data models
- `tsconfig.json`: TypeScript compiler options, path aliases (@/*)
- `package.json`: Dependencies, scripts, version info
- `next.config.mjs`: Next.js runtime configuration

**Core Logic:**

- `src/components/Navigation.tsx`: Top nav bar with search input, mobile menu, navigation links
- `src/components/ErrorDisplay.tsx`: Reusable error display with retry button
- `src/app/totes/page.tsx`: Tote listing with sorting, filtering, bulk operations

**Testing:**

- No test files present in codebase
- No test runner configured (Jest, Vitest not installed)

## Naming Conventions

**Files:**

- Page components: `page.tsx` (in Next.js route directories)
- API route handlers: `route.ts` (in Next.js api route directories)
- Components: PascalCase.tsx (e.g., `Navigation.tsx`, `ErrorDisplay.tsx`)
- Utilities: camelCase.ts (e.g., `db.ts`)
- Types: `index.ts` in types/ directory
- Database: `tote-sonar.db`
- Image files: UUID-based hex strings with extension (e.g., `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.jpg`)
- Thumbnails: `thumb_` prefixed (e.g., `thumb_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.jpg`)

**Directories:**

- API routes: Lowercase with optional [param] for dynamic segments (e.g., `totes/[id]/items`)
- Pages: Lowercase or [param] for dynamic routes (e.g., `search`, `settings`, `totes`)
- Components: PascalCase grouping (e.g., `components/`)
- Utilities: `lib/` for core functions, `types/` for TypeScript definitions
- Data: `data/` for runtime storage (uploads, thumbnails, database)

**Functions:**

- camelCase for all function names
- Examples: `getDb()`, `generateToteId()`, `handleCreateTote()`, `performSearch()`, `fetchDashboard()`
- Async functions follow same convention (no Async suffix)

**Variables:**

- camelCase for all variables and state
- Examples: `formName`, `selectedTotes`, `bulkQrLabels`, `sortBy`, `metadataKeyFilter`
- Boolean prefixes: `is*`, `has*`, `show*` (e.g., `isSelected`, `hasSearched`, `showCreateForm`)

**Type Names:**

- PascalCase for all interfaces (e.g., `Tote`, `Item`, `ItemPhoto`, `CreateToteInput`)
- Input types suffix: `Input` (e.g., `CreateToteInput`, `UpdateItemInput`)
- Derived types inherit pattern: `ToteWithCount`, `SearchResult`, `DashboardData`

## Where to Add New Code

**New Feature (e.g., add tags to items):**

1. **Define types:** Add to `src/types/index.ts` (e.g., `ItemTag` interface, `CreateTagInput`)
2. **Create API endpoints:**
   - List tags: `src/app/api/items/[id]/tags/route.ts` with GET handler
   - Create tag: `src/app/api/items/[id]/tags/route.ts` POST handler
   - Delete tag: `src/app/api/items/[id]/tags/[tagId]/route.ts` DELETE handler
3. **Update database:** Modify schema in `src/lib/db.ts` initializeSchema() function to create tags table with foreign keys
4. **Update pages:** Modify relevant page (e.g., `src/app/items/[id]/page.tsx`) to fetch tags and render tag UI
5. **Add components:** Create `src/components/TagInput.tsx` if complex tag input needed
6. **Test:** Add manual testing notes to code comments

**New Page/Section:**

1. Create directory under `src/app/` (e.g., `src/app/analytics/`)
2. Add `page.tsx` with 'use client' directive
3. Fetch data from appropriate API endpoint (create if needed)
4. Import and use shared components (Navigation via layout inheritance)
5. Add styling via CSS classes (global stylesheet in `src/app/globals.css`)

**New Component:**

1. Create file in `src/components/YourComponent.tsx`
2. Use 'use client' directive at top (all components are client components)
3. Import icons from lucide-react as needed
4. Export as default function
5. Import in pages where needed

**Utility Function:**

1. Add to `src/lib/db.ts` if database-related (e.g., query helpers)
2. Create new file `src/lib/yourUtility.ts` if general purpose
3. Export named functions or default export
4. Import in components/pages with `import { func } from '@/lib/yourUtility'`

**New API Endpoint (e.g., statistics):**

1. Create directory: `src/app/api/statistics/`
2. Create `route.ts` with handler function: `export async function GET(request: NextRequest)`
3. Retrieve data via `getDb()` prepared statements
4. Return `NextResponse.json({ data: {...} })` or error responses
5. Update types in `src/types/index.ts` if returning new data shapes
6. Call from page via `fetch('/api/statistics')`

## Special Directories

**data/:**
- Purpose: Runtime storage for database and uploaded files
- Generated: Yes - created at first startup by `src/lib/db.ts`
- Committed: No - in .gitignore
- Cleanup: Delete entire directory to reset application state

**.next/:**
- Purpose: Next.js build output and cache
- Generated: Yes - created by `npm run build`
- Committed: No - in .gitignore
- Cleanup: Safe to delete, regenerated on build

**node_modules/:**
- Purpose: Installed npm dependencies
- Generated: Yes - created by `npm install`
- Committed: No - in .gitignore
- Cleanup: Safe to delete, reinstall with `npm install`

---

*Structure analysis: 2026-02-28*
