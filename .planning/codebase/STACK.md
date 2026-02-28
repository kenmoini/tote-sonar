# Technology Stack

**Analysis Date:** 2026-02-28

## Languages

**Primary:**
- TypeScript 5.0.0 - Full codebase including backend API routes and frontend components
- JavaScript (ESM) - Configuration files and build tooling

**Secondary:**
- SQL - SQLite database schema and queries via better-sqlite3

## Runtime

**Environment:**
- Node.js 24 Alpine (production) - Defined in `Dockerfile`
- Node.js LTS compatible for development

**Package Manager:**
- npm (npm v8 from Renovate config)
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 16.0.0 - Full-stack React framework with API routes
  - Standalone output mode configured in `next.config.mjs`
  - Server-side database access via API routes
  - App Router (directory structure at `src/app/`)

**UI & Styling:**
- React 19.2.0 - Component library
- React DOM 19.2.0 - DOM rendering
- Ark UI 5.0.0 - Unstyled, accessible component primitives (imported at `@ark-ui/react`)
- Lucide React 0.575.0 - Icon library used throughout UI (`lucide-react` imports in all pages)

## Key Dependencies

**Critical:**
- better-sqlite3 12.0.0 - Synchronous SQLite database client (`src/lib/db.ts`)
  - Server external package configured in `next.config.mjs`
  - Marked as `serverExternalPackages` due to native bindings

**Image Processing:**
- sharp 0.34.0 - Image manipulation and thumbnail generation (`src/app/api/items/[id]/photos/route.ts`)
  - Handles EXIF auto-rotation, resizing to 200x200px thumbnails
  - Server external package configured in `next.config.mjs`
  - Requires vips-dev in Docker for Alpine

**QR Code Generation:**
- qrcode 1.5.0 - QR code generation for tote labels
  - Used in `src/app/api/totes/[id]/qr/route.ts` and `src/app/api/totes/qr/bulk/route.ts`
  - Generates PNG images or data URLs with 300x300px dimension

**Archive & Compression:**
- kemo-archiver 7.0.0 - ZIP archive creation for bulk exports (`src/app/api/export/route.ts`)
- adm-zip 0.5.0 - ZIP file reading for imports (`src/app/api/import/route.ts`)

## Configuration

**Environment:**
- `DATA_DIR` - Root directory for SQLite database and file uploads (defaults to `./data` in project root, overridable)
- No `.env` files detected - configuration via environment variables or defaults
- Production deployment sets:
  - `PORT=3000`
  - `HOSTNAME=0.0.0.0`
  - `NODE_ENV=production`
  - `NEXT_TELEMETRY_DISABLED=1`
  - `DATA_DIR=/app/data` (Docker)

**Build:**
- `next.config.mjs` - Next.js configuration
  - Output mode: `standalone` for self-contained deployments
  - Server external packages: `better-sqlite3`, `sharp` (native bindings)
  - Image remotePatterns: empty (no external image sources)
- `tsconfig.json` - TypeScript configuration
  - Target: ES2017
  - Strict mode enabled
  - Path aliases: `@/*` → `./src/*`
  - Module resolution: bundler (Next.js)

## Database

**Type:** SQLite 3
- File-based relational database at `[DATA_DIR]/tote-sonar.db`
- WAL (Write-Ahead Logging) mode enabled for better concurrency
- Foreign keys enabled
- Synchronous mode FULL for durability

**Schema:**
- `totes` - Container entities with id, name, location, size, color, owner
- `items` - Inventory items within totes
- `item_photos` - Photo references for items (max 3 per item)
- `item_metadata` - Custom key-value attributes on items
- `metadata_keys` - Autocomplete registry of metadata keys
- `item_movement_history` - Audit trail of item movements between totes
- `settings` - Application configuration (server_hostname, max_upload_size, themes, defaults)

**Initialization:** Automatic schema creation on database connection via `initializeSchema()` in `src/lib/db.ts`

## File Storage

**Local Filesystem:**
- Uploads directory: `[DATA_DIR]/uploads/` - Original photo files (JPEG, PNG, WebP)
- Thumbnails directory: `[DATA_DIR]/thumbnails/` - Generated 200x200px thumbnails
- Temporary exports: In-memory ZIP streams (no disk staging)

**Access:**
- Read/write via Node.js `fs` module
- Photo paths stored in database for retrieval via API routes

## Platform Requirements

**Development:**
- Node.js 20+ (for TypeScript and build tooling)
- npm or yarn
- Python 3 (for better-sqlite3 native compilation)
- C++ compiler (g++) - for better-sqlite3 and sharp node-gyp compilation

**Production:**
- Node.js 24 Alpine base image
- vips-dev library (for sharp image processing)
- python3, make, g++, node-addon-api, node-gyp (build stage only)
- Disk space for: SQLite database, photo uploads, generated thumbnails
- Volume mount at `/app/data` for persistent storage (Docker deployment model)

---

*Stack analysis: 2026-02-28*
