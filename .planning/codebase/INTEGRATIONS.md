# External Integrations

**Analysis Date:** 2026-02-28

## APIs & External Services

**QR Code Generation:**
- qrcode library - Generates QR codes for tote identification
  - SDK/Client: `qrcode` package v1.5.0
  - No external API - local generation only
  - Output formats: PNG images or data URLs
  - Routes: `src/app/api/totes/[id]/qr/route.ts`, `src/app/api/totes/qr/bulk/route.ts`

**Image Processing:**
- sharp library - Processes uploaded images
  - SDK/Client: `sharp` package v0.34.0
  - No external API - local processing only
  - Features: EXIF auto-rotation, thumbnail generation (200x200px)
  - Route: `src/app/api/items/[id]/photos/route.ts`

## Data Storage

**Databases:**
- SQLite 3 (file-based)
  - Connection: File path at `[DATA_DIR]/tote-sonar.db`
  - Client: better-sqlite3 (synchronous, native binding)
  - Implementation file: `src/lib/db.ts`
  - Pragmas: WAL mode, foreign keys ON, synchronous FULL
  - Schema auto-initialized on connection

**File Storage:**
- Local filesystem only
  - Original photo uploads: `[DATA_DIR]/uploads/`
  - Generated thumbnails: `[DATA_DIR]/thumbnails/`
  - No cloud storage integration
  - File management: Node.js `fs` module direct access

**Caching:**
- None - Direct database queries on each request
- Next.js does not cache API routes with dynamic parameters

## Authentication & Identity

**Auth Provider:**
- None - Application is unauthenticated
- No user sessions, login, or permission layers
- Direct access to all data via API endpoints

## Monitoring & Observability

**Error Tracking:**
- None detected - No integration with error tracking services (Sentry, etc.)
- All errors logged to console via `console.error()`

**Logs:**
- stdout/stderr only
  - Database connection status logged on `getDb()` initialization
  - Export/import operation errors logged
  - Photo upload errors logged
  - QR generation errors logged
  - No structured logging or log aggregation

## CI/CD & Deployment

**Hosting:**
- Containerized via Docker (Dockerfile at project root)
- Standalone Next.js application (output: 'standalone')
- Runs as non-root user `tote-sonar` (uid 1001) in production
- Exposes port 3000

**CI Pipeline:**
- Renovate bot configured for dependency updates (`renovate.json`)
  - Schedule: daily
  - Auto-merges minor/patch updates for npm and GitHub Actions
  - npm v8 constraint enforced
  - NVM and npm managers configured

**Deployment Model:**
- Docker multi-stage build:
  1. Base stage: Installs build dependencies (python3, make, g++, vips-dev)
  2. Build stage: Compiles Next.js to standalone output
  3. Runner stage: Copies only necessary artifacts to clean Alpine image

## Environment Configuration

**Required env vars:**
- `DATA_DIR` - Path to persistent data directory (optional, defaults to `./data`)
- `PORT` - HTTP server port (optional, defaults to 3000)
- `HOSTNAME` - HTTP server bind address (optional, defaults to 0.0.0.0)
- `NODE_ENV` - Set to `production` in Docker image
- `NEXT_TELEMETRY_DISABLED` - Set to 1 in Docker image to disable Next.js telemetry

**Application-level configuration:**
- Stored in SQLite `settings` table, not environment variables
- Configurable via `/api/settings` endpoint:
  - `server_hostname` - Base URL for QR codes (defaults to `http://localhost:3000`)
  - `max_upload_size` - Maximum file upload size in bytes (defaults to 5242880 = 5MB)
  - `default_tote_fields` - JSON array of default tote fields
  - `default_metadata_keys` - JSON array of default metadata keys
  - `theme` - UI theme preference (defaults to `light`)

**Secrets location:**
- No secrets management - application is self-contained
- No API keys, database credentials, or authentication tokens
- Suitable for single-user or trusted-network deployments

## Data Import/Export

**Export Endpoint:**
- `GET /api/export` - Downloads complete backup as ZIP
  - Contains: `tote-sonar-data.json` (all database tables), `/uploads/` (photos), `/thumbnails/` (thumbnails)
  - Format: kemo-archiver ZIP with zlib compression level 6
  - Filename format: `tote-sonar-export-YYYY-MM-DD.zip`

**Import Endpoint:**
- `POST /api/import` - Restores complete backup from ZIP
  - Accepts: ZIP files in export format
  - Validation: Checks for required JSON structure and data tables
  - Transaction model: Atomic - all-or-nothing import
  - Photo extraction: Files copied from ZIP to `uploads/` and `thumbnails/` directories

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

## File Upload Constraints

**Photo Uploads:**
- Endpoint: `POST /api/items/[id]/photos`
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
- Max file size: Configurable via settings (default 5MB)
- Photo limit: Maximum 3 photos per item
- Validation: Content-type check, file size check, item existence check

**Generated Files:**
- Thumbnails: 200x200px, `cover` fit with center position crop
- Filename generation: Crypto random hex (16 bytes) + extension
- EXIF handling: Auto-rotation applied before resizing

---

*Integration audit: 2026-02-28*
