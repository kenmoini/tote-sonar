# Stack Research

**Domain:** Personal inventory/organization app (self-hosted, local-first)
**Researched:** 2026-02-28
**Confidence:** MEDIUM-HIGH (versions verified via npm registry; patterns based on established community consensus and existing codebase analysis)

## Context

This research focuses on three specific dimensions the current Tote Sonar stack needs for hardening and feature completion:

1. **Image handling** -- tote photo uploads, processing pipeline, client-side UX
2. **Local-first storage** -- SQLite hardening, schema migrations, data integrity
3. **Hardening patterns** -- input validation, security headers, error handling for self-hosted deployment

The existing stack (Next.js 16, React 19, better-sqlite3, sharp, Park UI) is solid and appropriate. This research recommends additions and reinforcements, not replacements.

## Recommended Stack

### Core Technologies (Already In Place -- Keep As-Is)

| Technology | Current | Latest | Purpose | Status |
|------------|---------|--------|---------|--------|
| Next.js | ^16.0.0 | 16.1.6 | Full-stack framework with App Router | Update to ^16.1.0 for bug fixes |
| React | ^19.2.0 | 19.2.x | UI rendering | Current |
| TypeScript | ^5.0.0 | 5.x | Type safety | Current |
| better-sqlite3 | ^12.0.0 | 12.6.2 | Embedded database | Update to ^12.6.0 for fixes |
| sharp | ^0.34.0 | 0.34.5 | Image processing (thumbnails, EXIF, resize) | Update to ^0.34.5 |
| Park UI (@ark-ui/react) | ^5.0.0 | 5.x | Accessible component library | Current |

**Rationale for keeping:** The existing stack is well-suited for a self-hosted single-user inventory app. SQLite + better-sqlite3 is the correct database choice (no server process, single-file backup, sufficient for personal scale). sharp is the standard Node.js image processing library (libvips-based, fast, mature). Next.js App Router provides the server component model needed for file I/O and database access without a separate API server.

### Supporting Libraries -- New Additions

| Library | Version | Purpose | Why Recommended | Confidence |
|---------|---------|---------|-----------------|------------|
| zod | ^4.3.6 | Schema validation for all API inputs | Standard validation library in the TypeScript/Next.js ecosystem. Zod 4 is the current stable release (Zod 3 is deprecated). Provides runtime type checking that TypeScript alone cannot. Already well-integrated with Next.js form actions and route handlers. | HIGH |
| react-dropzone | ^15.0.0 | Drag-and-drop file upload UI | De facto standard for React file upload UX. Handles drag events, file selection, type filtering, and accessibility. Eliminates custom drop zone implementation. v15 supports React 19. | HIGH |
| file-type | ^21.3.0 | Magic-byte file type detection | Validates actual file content rather than trusting MIME type from client. Critical security measure -- prevents uploading disguised files. Reads file header bytes to determine true format. | HIGH |
| heic-convert | ^2.1.0 | HEIC/HEIF to JPEG conversion | iPhone photos default to HEIC format. Users will try to upload HEIC photos and expect them to work. sharp cannot natively process HEIC without system-level libheif. This pure-JS converter handles the gap. | MEDIUM |

### Development Tools -- New Additions

| Tool | Version | Purpose | Notes | Confidence |
|------|---------|---------|-------|------------|
| vitest | ^4.0.18 | Unit and integration testing | Fast, ESM-native, works with Next.js out of the box. Built-in coverage, mocking, snapshot testing. Preferred over Jest for modern Next.js projects due to ESM compatibility. | HIGH |
| @testing-library/react | ^16.3.2 | Component testing | Standard for testing React components by user behavior rather than implementation details. | HIGH |
| prettier | ^3.8.1 | Code formatting | Codebase has no formatter configured. Consistent formatting reduces diff noise and review friction. | MEDIUM |

### Hardening Libraries -- New Additions

| Library | Version | Purpose | Why Recommended | Confidence |
|---------|---------|---------|-----------------|------------|
| sanitize-filename | ^1.6.3 | Filename sanitization | Prevents path traversal attacks in uploaded file names. Strips directory separators, null bytes, and OS-reserved characters. Small, focused, no dependencies. | HIGH |

## What NOT to Add

### Database Layer

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Drizzle ORM / Prisma / any ORM | The app uses 15-20 straightforward SQL queries. An ORM adds abstraction overhead, migration tooling complexity, and bundle size for zero benefit at this scale. better-sqlite3's prepared statements are already safe from SQL injection. The codebase is readable with raw SQL. | Keep better-sqlite3 with raw SQL. Add Zod validation at the API boundary instead. |
| drizzle-kit migrations | Adds a build step and CLI tooling for a schema with 7 tables. Manual migration scripts (versioned SQL files run on startup) are simpler and more transparent for a self-hosted app. | Write versioned migration SQL files, run sequentially on app start. |
| SQLite WAL2 mode | Experimental, not supported by better-sqlite3. WAL mode (already configured) is correct for this use case. | Keep WAL mode. |
| PostgreSQL / MySQL | Requires a separate database server. Violates the self-contained deployment constraint. SQLite handles personal-scale inventory data (thousands of items) trivially. | Keep SQLite. |

### Image Processing

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Cloudinary / Uploadthing / S3 | Cloud dependencies violate self-hosted constraint. Adds external service dependency, API keys, and network latency for an app that runs on a home server. | Keep local filesystem storage with sharp for processing. |
| ImageMagick / GraphicsMagick | System-level dependencies that complicate Docker builds. sharp (libvips) is faster and available as a prebuilt npm binary. | Keep sharp. Already in use and working. |
| next/image optimization | Built for CDN/cloud deployment patterns. In a self-hosted single-user app, pre-generating thumbnails on upload (current pattern with sharp) is simpler and more predictable than on-demand optimization. | Keep sharp-based thumbnail generation on upload. |
| blurhash | Nice-to-have placeholder effect, but adds complexity for minimal benefit in a personal app where images load from localhost. Not worth the processing overhead on upload. | Standard CSS skeleton/loading states. |
| multer | Server-side multipart parsing middleware. Next.js App Router already provides `request.formData()` which handles multipart parsing natively. Multer is for Express/Connect middleware patterns. | Keep using native `request.formData()`. Already in use. |

### Frontend

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| React Query / TanStack Query | The app uses standard fetch + useState patterns. Adding a data fetching library adds complexity without solving a real problem -- there is no cache invalidation, optimistic updates, or complex state management need in a single-user app. | Keep fetch + server components. Use `router.refresh()` for revalidation after mutations. |
| Redux / Zustand / Jotai | No cross-component state management need. Server components handle data fetching. The few client interactions (modals, form state) are local component state. | Keep React useState/useReducer for local state. |
| Tailwind CSS | The app already uses Park UI's styling system. Adding Tailwind would create two competing styling approaches. | Keep Park UI / Panda CSS styling. |

### Security

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| helmet.js | Express middleware, not compatible with Next.js App Router. | Set security headers in `next.config.mjs` via the `headers()` config function or in middleware. |
| CSRF tokens | The app has no authentication. CSRF is only relevant when there are authenticated sessions to protect. If auth is added later, use Next.js middleware-based CSRF. | Not needed for v1. Revisit if auth is added. |
| Rate limiting libraries | Single-user self-hosted app. Rate limiting protects multi-user services from abuse. The only "user" is the owner. | Not needed for v1. If exposed to network, use reverse proxy (nginx/Caddy) rate limiting instead of app-level. |

## Hardening Patterns

### 1. Input Validation with Zod (HIGH confidence)

Every API route handler should validate inputs with Zod schemas before processing. This is the single highest-impact hardening change.

**Pattern:**
```typescript
// src/lib/schemas.ts -- centralized validation schemas
import { z } from 'zod';

export const createToteSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  location: z.string().min(1).max(200).trim(),
  size: z.string().max(100).optional(),
  color: z.string().max(50).optional(),
  owner: z.string().max(200).optional(),
});

export const createItemSchema = z.object({
  name: z.string().min(1).max(500).trim(),
  description: z.string().max(5000).optional(),
  quantity: z.number().int().min(1).max(999999).default(1),
});

export const photoUploadSchema = z.object({
  fileSize: z.number().max(10485760), // 10MB hard cap
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});
```

**Why Zod 4 over alternatives:**
- Zod is the ecosystem standard for TypeScript validation (most downloaded, best documented)
- Zod 4 has 2-7x performance improvement over Zod 3
- Direct integration with Next.js server actions via `useActionState`
- Valibot is smaller but has less ecosystem support and documentation
- Yup and Joi are older, less TypeScript-native

### 2. File Upload Security (HIGH confidence)

Current photo upload has good basics (type checking, size limits) but needs hardening:

```typescript
import { fileTypeFromBuffer } from 'file-type';
import sanitizeFilename from 'sanitize-filename';

// Verify actual file type matches claimed MIME type
const buffer = Buffer.from(await file.arrayBuffer());
const detected = await fileTypeFromBuffer(buffer);
if (!detected || !ALLOWED_TYPES.includes(detected.mime)) {
  return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
}

// Sanitize any user-provided filename components
const safeName = sanitizeFilename(file.name);
```

### 3. Security Headers via Next.js Config (HIGH confidence)

Add to `next.config.mjs`:

```javascript
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '0' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; img-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
        },
      ],
    },
  ];
},
```

### 4. SQLite Schema Migrations (MEDIUM confidence)

The current `CREATE TABLE IF NOT EXISTS` pattern works for initial setup but cannot handle schema changes (adding columns, renaming fields) without data loss.

**Recommended pattern -- versioned migration files:**

```
data/migrations/
  001_initial_schema.sql
  002_add_tote_photos.sql
  003_add_search_index.sql
```

```typescript
// In db.ts initialization
function runMigrations(db: Database.Database) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT (datetime('now'))
  )`);

  const current = (db.prepare('SELECT MAX(version) as v FROM schema_version').get() as { v: number | null })?.v ?? 0;

  const migrations = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()
    .filter(f => parseInt(f) > current);

  for (const file of migrations) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    db.exec(sql);
    db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(parseInt(file));
  }
}
```

**Why not drizzle-kit:** The migration runner above is ~20 lines of code. drizzle-kit adds a CLI tool, config file, snapshot directory, and push/pull workflow designed for team collaboration. For a single-developer self-hosted app with 7 tables, the overhead is not justified.

### 5. Error Handling Standardization (MEDIUM confidence)

Current API routes have inconsistent error handling. Standardize with a wrapper:

```typescript
// src/lib/api-utils.ts
export function apiHandler(handler: (req: NextRequest, ctx: any) => Promise<NextResponse>) {
  return async (req: NextRequest, ctx: any) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.errors },
          { status: 400 }
        );
      }
      console.error(`[${req.method}] ${req.url}:`, error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}
```

## Image Handling Architecture

### Upload Pipeline (for both item and tote photos)

```
Client                    Server (Route Handler)              Filesystem
  |                              |                                |
  |-- FormData (photo file) ---->|                                |
  |                              |-- Zod validate metadata ------>|
  |                              |-- file-type verify bytes ----->|
  |                              |-- sharp: auto-rotate --------->|
  |                              |-- sharp: resize thumbnail ---->|
  |                              |-- write original to uploads/ ->|
  |                              |-- write thumb to thumbnails/ ->|
  |                              |-- INSERT into DB ------------->|
  |<---- JSON { photo record } --|                                |
```

### HEIC Handling Decision

| Approach | Trade-off | Recommendation |
|----------|-----------|----------------|
| Convert HEIC on upload | Adds heic-convert dependency (~2MB), processing time ~1-3s per image | Add if users report HEIC issues |
| Reject HEIC with helpful error | Zero dependencies, clear UX ("Convert to JPEG in your phone settings") | Start here |
| Accept HEIC, serve via sharp | sharp needs system libheif, complicates Docker build | Avoid |

**Recommendation:** Start by rejecting HEIC with a clear error message. Add `heic-convert` if user feedback shows this is a friction point. Most phones can be configured to use JPEG, and many users share JPEG-converted photos anyway.

### Tote Photos Schema

Mirror the existing `item_photos` pattern:

```sql
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

This is the first schema migration (002) after the initial schema is captured.

## Installation

```bash
# New runtime dependencies
npm install zod@^4.3.6 react-dropzone@^15.0.0 file-type@^21.3.0 sanitize-filename@^1.6.3

# New dev dependencies
npm install -D vitest@^4.0.18 @testing-library/react@^16.3.2 prettier@^3.8.1

# Update existing dependencies to latest patch
npm install next@^16.1.0 sharp@^0.34.5 better-sqlite3@^12.6.0
```

**Note on file-type v21:** This is an ESM-only package. Next.js App Router handles ESM natively in route handlers and server components. If any import issues arise in the build, use dynamic import: `const { fileTypeFromBuffer } = await import('file-type');`

## Alternatives Considered

| Category | Recommended | Alternative | When to Use Alternative |
|----------|-------------|-------------|-------------------------|
| Validation | Zod 4 | Valibot | If bundle size is critical (Valibot is ~5KB vs Zod's ~15KB). Not relevant here since validation runs server-side. |
| File upload UX | react-dropzone | Custom drag-and-drop | If you need highly custom upload UI that react-dropzone's API constrains. Unlikely for this app. |
| File type check | file-type | mmmagic | If you need system-level libmagic integration. Overkill for image-only validation. |
| Testing | Vitest | Jest | If existing Jest config/tests exist. Starting fresh, Vitest is better due to ESM support and speed. |
| Image processing | sharp | Jimp | If native compilation is impossible (Jimp is pure JS). Jimp is ~10x slower for thumbnail generation. Docker build already handles sharp's native deps. |
| Migrations | Manual SQL files | drizzle-kit | If working in a team with multiple developers making schema changes simultaneously. Not applicable for single-developer project. |
| Formatting | Prettier | Biome | If you want linting + formatting in one tool and are willing to migrate from ESLint. Biome is faster but has less plugin ecosystem. |

## Stack Patterns by Variant

**If deploying behind a reverse proxy (nginx/Caddy/Traefik):**
- Let the proxy handle TLS termination, rate limiting, and request size limits
- Set `HOSTNAME=0.0.0.0` (already done in Docker config)
- Trust `X-Forwarded-For` headers from the proxy only
- CSP headers can be set at proxy level instead of Next.js config

**If exposing directly to the internet (not recommended but possible):**
- Security headers in Next.js config become critical
- Consider adding basic auth via Next.js middleware (simple username/password check)
- Set explicit `Content-Security-Policy` to prevent XSS
- Restrict upload size at the Next.js level (already done via settings)

**If adding auth later (v2+):**
- Use NextAuth.js / Auth.js with credentials provider (username/password, no OAuth needed for personal use)
- Add CSRF protection at that point
- Session cookies with `httpOnly`, `secure`, `sameSite=strict`

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| zod@^4.3.6 | TypeScript ^5.0 | Zod 4 requires TS 5+. Project already uses TS 5. |
| react-dropzone@^15.0.0 | React ^18.0 \|\| ^19.0 | v15 added React 19 support. |
| file-type@^21.3.0 | Node.js ^18.0 | ESM-only. Works in Next.js server context natively. |
| vitest@^4.0.18 | Node.js ^20.0 | Project uses Node.js 24. Compatible. |
| sharp@^0.34.5 | Node.js ^18.17 | Pre-built binaries for linux-x64 (Docker Alpine), darwin-arm64/x64. |
| better-sqlite3@^12.6.0 | Node.js ^18.0 | Requires native compilation. Docker build already includes build tools. |
| sanitize-filename@^1.6.3 | Any Node.js | Pure JS, no constraints. CJS module, works everywhere. |

## Sources

- npm registry (registry.npmjs.org) -- All version numbers verified via direct registry API queries on 2026-02-28. HIGH confidence.
- Existing codebase analysis (`/Users/kenmoini/Development/tote-sonar/src/`) -- Current patterns, dependencies, and architecture examined directly. HIGH confidence.
- Zod dist-tags from npm registry -- Confirmed Zod 4.3.6 is `latest`, Zod 3 is no longer tagged as stable. HIGH confidence.
- Training data (May 2025 cutoff) -- Library recommendations, architectural patterns, and best practices. MEDIUM confidence for patterns, verified where possible via registry.
- Security header recommendations -- Based on OWASP guidelines (stable, not version-dependent). HIGH confidence.
- SQLite WAL mode, foreign keys, synchronous=FULL -- SQLite documentation (stable, not version-dependent). HIGH confidence.

### Unverified Claims (LOW confidence)

- react-dropzone v15 React 19 compatibility: Verified version exists on npm, but React 19 peer dep was not independently checked. Test during installation.
- file-type ESM-only behavior in Next.js 16 server context: Should work based on Next.js ESM support, but edge cases may exist. Test with actual import.
- heic-convert performance characteristics (~1-3s per image): Based on training data benchmarks. Actual performance depends on image size and server hardware.

---
*Stack research for: Tote Sonar (personal inventory/organization app)*
*Researched: 2026-02-28*
