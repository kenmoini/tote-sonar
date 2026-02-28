# Technology Stack

**Analysis Date:** 2026-02-28

## Languages

**Primary:**
- TypeScript 5.0.0 - Frontend components, pages, and API routes
- JSX/TSX - React component definitions

**Secondary:**
- JavaScript - Configuration files and setup scripts

## Runtime

**Environment:**
- Node.js 24 (Alpine) - Development and production runtime via Docker

**Package Manager:**
- npm - Dependency management with package-lock.json lockfile present

## Frameworks

**Core:**
- Next.js 16.0.0 - Full-stack web application framework with App Router
  - Provides: Server-side rendering, API routes, static generation, middleware
  - Output: Standalone mode for Docker deployment

**UI Components:**
- Park UI (@ark-ui/react) 5.0.0 - Accessible component library
- Lucide React 0.575.0 - Icon library

**Testing:**
- Not configured in current dependencies

**Build/Dev:**
- TypeScript 5.0.0 - Type checking and transpilation
- Next.js built-in: ESLint (via `next lint`)

## Key Dependencies

**Critical:**
- better-sqlite3 12.0.0 - Embedded SQL database
  - Used for: Persistent data storage with WAL mode for reliability
  - Server external package in Next.js config
- sharp 0.34.0 - Image processing library
  - Used for: Thumbnail generation, EXIF rotation, image resizing
  - Server external package in Next.js config
- qrcode 1.5.0 - QR code generation
  - Used for: Server-side QR code generation as PNG images and data URLs

**Infrastructure:**
- kemo-archiver 7.0.0 - ZIP archive creation
  - Used for: Export functionality to create ZIP files with data and images
- adm-zip 0.5.0 - ZIP file reading and extraction
  - Used for: Import functionality to read and extract ZIP archives

**Type Definitions:**
- @types/node 20.0.0 - Node.js type definitions
- @types/react 19.2.0 - React type definitions
- @types/react-dom 19.2.0 - ReactDOM type definitions
- @types/better-sqlite3 7.6.0 - Database type definitions
- @types/qrcode 1.5.0 - QR code type definitions
- @types/archiver 7.0.0 - Archiver type definitions
- @types/adm-zip 0.5.0 - ADM-ZIP type definitions

## Configuration

**Environment:**
- `DATA_DIR` - Path to persistent data directory (defaults to `./data` in working directory)
  - Created automatically by `getDb()` in `src/lib/db.ts`
  - Contains: SQLite database, uploads, thumbnails directories
- `NODE_ENV` - Set to `production` in Docker runtime
- `NEXT_TELEMETRY_DISABLED` - Disabled in Docker (set to 1)
- `PORT` - Defaults to 3000 (configurable)
- `HOSTNAME` - Defaults to 0.0.0.0 in Docker for container accessibility

**Build:**
- `tsconfig.json` - TypeScript configuration with strict mode enabled
  - Path alias: `@/*` maps to `./src/*`
  - Target: ES2017
  - JSX: react-jsx
- `next.config.mjs` - Next.js configuration
  - Output: standalone (self-contained deployment)
  - External server packages: better-sqlite3, sharp
  - Remote image patterns: empty (no external image hosting)

**Development:**
- `init.sh` - Setup script for development environment
- `.eslintrc` - ESLint configuration (run via `next lint`)
- No Prettier config found - code formatting not enforced

## Platform Requirements

**Development:**
- Node.js 24 or compatible
- npm (with package-lock.json)
- Python 3, make, g++ (for native module compilation)
- vips-dev (for sharp image processing)

**Production:**
- Docker (Alpine Linux)
- Node.js 24 runtime in container
- 1GB+ storage for data volume (database, uploads, thumbnails)
- Exposed port: 3000

**Database:**
- SQLite (file-based, no separate database server required)
- WAL mode enabled for concurrent read/write access
- Foreign keys enforced
- Synchronous mode: FULL for durability

---

*Stack analysis: 2026-02-28*
