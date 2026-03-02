# Phase 1: Correctness and Safety - Research

**Researched:** 2026-02-28
**Domain:** Bug fixes (SQL, foreign keys, file cleanup) and systematic input validation for Next.js API routes
**Confidence:** HIGH

## Summary

Phase 1 addresses three bugs and four validation requirements across a Next.js 16 App Router application with better-sqlite3 and local filesystem photo storage. The bugs range from a fragile SQL query builder in search (BUGS-01), a fundamentally broken foreign key pragma toggle in import (BUGS-02), and incomplete photo file cleanup on delete (BUGS-03). The validation work introduces Zod v4 schema validation on all 22 API route handlers, magic bytes file type verification, path traversal prevention, and consistent JSON error responses.

The most critical technical finding is that **SQLite's `PRAGMA foreign_keys` is a no-op inside a transaction**. The current import route wraps the pragma toggle inside `db.transaction()`, meaning foreign keys are never actually disabled or re-enabled -- the pragma calls silently do nothing. This must be restructured to toggle pragmas outside the transaction boundary.

**Primary recommendation:** Fix the three bugs with targeted, well-understood changes, then introduce Zod v4 as a single new dependency for systematic validation across all routes. Use manual magic bytes checking (3 signatures only) rather than adding a `file-type` dependency.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Error Response Format**: Use field-level validation errors: `{ error: string, errors?: { field: string, message: string }[] }`. Strict consistent error shape across ALL API routes. Photo upload rejections include specific reason.
- **Zod for validation**: Introduce Zod for schema validation on all API routes (VALID-01 requirement) with automatic field-level error extraction.
- **Delete Cleanup Behavior**: Log and continue strategy -- delete DB records even if file cleanup fails. Silent success to user; log failures server-side. Clean up BOTH original uploads and thumbnails. Query-first approach: fetch photo paths BEFORE deleting DB records via CASCADE.
- **Import Failure Recovery**: All-or-nothing rollback via database transaction. Foreign keys re-enabled in a `finally` block. Validate upfront before touching the database. Detailed progress in error messages. Clean up written files on rollback.
- **Search Filter Logic**: AND logic combining text search with filters. Text search matches all words (AND). Case-insensitive using COLLATE NOCASE or LOWER(). Metadata filter uses partial matching (LIKE).

### Claude's Discretion
- Exact Zod schema structure and helper utilities
- How to organize shared validation logic (middleware vs per-route)
- Search query builder refactoring approach (parameterized builder vs manual fix)
- Specific magic bytes to check for JPEG/PNG/WebP validation (VALID-02)
- Path sanitization implementation details (VALID-03)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BUGS-01 | Search with both name/description and metadata filters produces correct SQL | Search query builder analysis (see Architecture Patterns: Search Query Builder Rewrite) identifies dead code, fragile splice logic, and missing word-level AND matching |
| BUGS-02 | Import failure re-enables foreign keys regardless of error state | SQLite documentation confirms PRAGMA foreign_keys is a no-op inside transactions (see Common Pitfalls: PRAGMA in Transaction). Restructuring pattern documented. |
| BUGS-03 | Photo file deletion failures are handled gracefully (no orphaned files on item/tote delete) | Current code already uses query-first pattern but item delete and tote delete routes need consistent error handling. Photo delete route (`/api/photos/[id]`) also needs try-catch around fs operations. |
| VALID-01 | All API routes validate input with Zod schemas before processing | Zod v4 API documented with safeParse, field-level error extraction, and coercion. 22 route handlers catalogued with validation needs. |
| VALID-02 | Photo uploads verify file type via magic bytes, not just MIME header | Magic byte signatures documented for JPEG (FF D8 FF), PNG (89 50 4E 47 0D 0A 1A 0A), WebP (52 49 46 46 xx xx xx xx 57 45 42 50). Manual implementation recommended over file-type dependency. |
| VALID-03 | Uploaded filenames are sanitized to prevent path traversal | The app already generates random filenames via crypto.randomBytes(16) for uploads, so original filenames never reach the filesystem. Path traversal risk exists in import route (ZIP entry names) and photo serving routes (DB-stored paths joined with DATA_DIR). |
| VALID-04 | JSON parse errors return consistent 400 responses across all routes | 7 of 13 routes with JSON bodies already catch parse errors; 6 routes need wrapping. Consistent error shape defined in user decisions. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | ^4.0.0 (latest 4.3.6) | Schema validation for all API inputs | User-decided. TypeScript-first, 14.7x faster string parsing than v3, built-in safeParse with field-level errors, z.file() for upload validation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| better-sqlite3 | ^12.0.0 (existing) | Database access, transactions | Already in stack -- transaction API used for import fix |
| sharp | ^0.34.0 (existing) | Image processing | Already in stack -- no changes needed |
| crypto (Node.js built-in) | N/A | Secure random filenames | Already used in photo upload route |
| path (Node.js built-in) | N/A | Path resolution and traversal prevention | Used for path.resolve() + startsWith() validation pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual magic bytes check | npm `file-type` v21 | file-type is ESM-only, requires dynamic import() in route handlers, adds dependency for 3 simple byte checks |
| Zod v4 | Zod v3 | v3 works but v4 is 14.7x faster, has native z.file(), and 2.3x smaller bundle. v4 is stable (4.3.6). |
| Per-route Zod schemas | Centralized middleware | Next.js App Router has no middleware for route handlers (middleware.ts only intercepts before routing). Per-route is the only option. |

**Installation:**
```bash
npm install zod@^4.0.0
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── db.ts                    # Existing database singleton
│   ├── validation.ts            # NEW: Shared Zod schemas and validation helpers
│   └── magic-bytes.ts           # NEW: File type detection by magic bytes
├── app/api/
│   ├── items/[id]/route.ts      # Existing routes -- add Zod validation
│   ├── totes/[id]/route.ts      # ...
│   └── ...
└── types/
    └── index.ts                 # Existing TypeScript interfaces
```

### Pattern 1: Zod Validation Helper with Consistent Error Response
**What:** A shared helper that runs Zod safeParse and returns the standardized error response format.
**When to use:** Every route handler that accepts JSON body or query parameters.
**Example:**
```typescript
// src/lib/validation.ts
import { z } from 'zod';
import { NextResponse } from 'next/server';

/**
 * Parse and validate request JSON body against a Zod schema.
 * Returns { data } on success or { response } with 400 error on failure.
 */
export function validateBody<T extends z.ZodType>(
  body: unknown,
  schema: T
): { data: z.infer<T>; response?: never } | { data?: never; response: NextResponse } {
  const result = schema.safeParse(body);
  if (result.success) {
    return { data: result.data };
  }
  const fieldErrors = result.error.issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
  return {
    response: NextResponse.json(
      {
        error: 'Validation failed',
        errors: fieldErrors,
      },
      { status: 400 }
    ),
  };
}
```

### Pattern 2: Safe JSON Parse Wrapper
**What:** A wrapper that catches JSON parse errors and returns the consistent 400 format.
**When to use:** Every route handler that calls `request.json()`.
**Example:**
```typescript
// src/lib/validation.ts
export async function parseJsonBody(
  request: Request
): Promise<{ data: unknown; response?: never } | { data?: never; response: NextResponse }> {
  try {
    const data = await request.json();
    return { data };
  } catch {
    return {
      response: NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      ),
    };
  }
}
```

### Pattern 3: Search Query Builder (Parameterized)
**What:** Replace the fragile splice-based condition builder with a clean parameterized builder that handles word-level AND matching.
**When to use:** Search route rewrite (BUGS-01).
**Example:**
```typescript
// Conceptual approach for search route rewrite
interface SearchQuery {
  conditions: string[];
  params: (string | number)[];
}

function buildSearchQuery(
  query: string,
  location: string,
  owner: string,
  metadataKey: string
): SearchQuery {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  // Word-level AND matching for text search
  if (query.trim()) {
    const words = query.trim().split(/\s+/);
    const wordConditions = words.map(() =>
      `(i.name LIKE ? COLLATE NOCASE OR i.description LIKE ? COLLATE NOCASE OR i.id IN (SELECT im.item_id FROM item_metadata im WHERE im.value LIKE ? COLLATE NOCASE))`
    );
    conditions.push(`(${wordConditions.join(' AND ')})`);
    for (const word of words) {
      const term = `%${word}%`;
      params.push(term, term, term); // name, description, metadata value
    }
  }

  // Location filter (partial match)
  if (location.trim()) {
    conditions.push('t.location LIKE ? COLLATE NOCASE');
    params.push(`%${location.trim()}%`);
  }

  // Owner filter (exact match from dropdown)
  if (owner.trim()) {
    conditions.push('t.owner = ?');
    params.push(owner.trim());
  }

  // Metadata key filter (exact key match)
  if (metadataKey.trim()) {
    conditions.push('i.id IN (SELECT im.item_id FROM item_metadata im WHERE im.key = ?)');
    params.push(metadataKey.trim());
  }

  return { conditions, params };
}
```

### Pattern 4: Import Transaction with External PRAGMA Toggle
**What:** Move PRAGMA foreign_keys OFF/ON outside the transaction boundary, since SQLite ignores pragma changes inside transactions.
**When to use:** Import route rewrite (BUGS-02).
**Example:**
```typescript
// CORRECT: pragma outside transaction
const db = getDb();
const writtenFiles: string[] = []; // Track files for rollback cleanup

try {
  // Validate entire import data upfront BEFORE touching DB or filesystem
  // ... validation logic ...

  // Disable FK checks BEFORE starting transaction
  db.pragma('foreign_keys = OFF');

  try {
    const importTransaction = db.transaction(() => {
      // Clear existing data + insert new data
      // Track written files in writtenFiles array
    });
    importTransaction();
  } finally {
    // ALWAYS re-enable FK checks, regardless of success/failure
    db.pragma('foreign_keys = ON');
  }

  // Extract photo files AFTER successful transaction
  // ...
} catch (error) {
  // Clean up any files written during failed attempt
  for (const filePath of writtenFiles) {
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
  }
  throw error;
}
```

### Pattern 5: Magic Bytes Validation
**What:** Check first N bytes of uploaded file buffer against known file signatures.
**When to use:** Photo upload route (VALID-02).
**Example:**
```typescript
// src/lib/magic-bytes.ts
const MAGIC_SIGNATURES: Record<string, { bytes: number[]; offset?: number }[]> = {
  'image/jpeg': [{ bytes: [0xFF, 0xD8, 0xFF] }],
  'image/png':  [{ bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }],
  'image/webp': [{ bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 }],
};

export function detectMimeType(buffer: Buffer): string | null {
  for (const [mime, signatures] of Object.entries(MAGIC_SIGNATURES)) {
    const matches = signatures.every(sig => {
      const offset = sig.offset ?? 0;
      return sig.bytes.every((byte, i) => buffer[offset + i] === byte);
    });
    if (matches) return mime;
  }
  return null;
}

export function validateMagicBytes(buffer: Buffer, claimedMime: string): boolean {
  const detectedMime = detectMimeType(buffer);
  return detectedMime === claimedMime;
}
```

### Anti-Patterns to Avoid
- **Splicing into parallel arrays:** The current search route modifies `conditions[]` and `params[]` with splice based on index lookups. This is fragile and order-dependent. Use a builder that constructs conditions and params together.
- **PRAGMA inside transaction:** SQLite silently ignores PRAGMA changes inside transactions. Always set connection-level pragmas outside transaction boundaries.
- **Trusting MIME headers:** The `file.type` from FormData reflects what the browser claims. A renamed `.exe` with a fake Content-Type header will pass MIME-only checks.
- **Deleting DB records before fetching file paths:** CASCADE deletes will remove photo records, making it impossible to find which files to clean up. Always query file paths first.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema validation | Custom if/typeof chains per route | Zod v4 `safeParse()` | Current routes have 20+ lines of manual type checking each; Zod reduces to 3-5 lines with better coverage |
| Field-level error extraction | Custom error message builders | Zod `error.issues` with path/message | Automatic field paths, consistent format, handles nested objects |
| Type coercion (query params) | `Number(id)` with manual NaN checks | `z.coerce.number().int().positive()` | Handles edge cases (empty string, undefined, "NaN") consistently |

**Key insight:** The project already has ~150 lines of manual validation scattered across routes (typeof checks, trim checks, Number() casts, Array.isArray guards). Zod replaces all of this with declarative schemas that also generate TypeScript types.

## Common Pitfalls

### Pitfall 1: PRAGMA foreign_keys Is a No-Op Inside Transactions
**What goes wrong:** Setting `PRAGMA foreign_keys = OFF` inside a `db.transaction()` callback has zero effect. Foreign key enforcement is unchanged.
**Why it happens:** SQLite specification: "It is not possible to enable or disable foreign key constraints in the middle of a multi-statement transaction (when SQLite is not in autocommit mode). Attempting to do so does not return an error; it simply has no effect." (Source: [SQLite Foreign Keys documentation](https://sqlite.org/foreignkeys.html))
**How to avoid:** Toggle the pragma OUTSIDE the transaction. Use a try/finally to guarantee re-enabling.
**Warning signs:** The schema-check route (`/api/schema-check`) checks `PRAGMA foreign_keys` status -- if it ever returns false after a failed import, this bug has been triggered. Currently the pragma calls are no-ops, so FK enforcement was never actually disabled during import.
**Current impact:** In the existing code, since the pragma is never actually disabled, the import works only because data is inserted in correct dependency order (totes before items). If import data had orphaned references, they would cause FK violations even though the code "disabled" FK checks.

### Pitfall 2: Zod safeParse vs parse
**What goes wrong:** Using `schema.parse()` throws a ZodError on validation failure, which gets caught by the generic catch block and returns a 500 error instead of a structured 400.
**Why it happens:** Habit from other validation libraries where throwing is the norm.
**How to avoid:** Always use `schema.safeParse()` which returns `{ success, data, error }` without throwing.
**Warning signs:** Validation failures returning 500 status codes instead of 400.

### Pitfall 3: request.json() Double-Read
**What goes wrong:** Calling `request.json()` twice throws because the body stream is consumed.
**Why it happens:** If you add a validation layer that reads the body, then the route handler tries to read it again.
**How to avoid:** Parse JSON once, pass the parsed object to Zod validation.
**Warning signs:** "Body has already been consumed" errors in development.

### Pitfall 4: WebP Magic Bytes Are Split
**What goes wrong:** WebP files have magic bytes at two locations: `RIFF` at offset 0 and `WEBP` at offset 8 (with 4 bytes of file size in between). Checking only the first 4 bytes matches any RIFF-based format (WAV, AVI, etc.).
**Why it happens:** WebP is a RIFF container format, so the container header comes first.
**How to avoid:** Check BOTH `RIFF` at bytes 0-3 AND `WEBP` at bytes 8-11.
**Warning signs:** WAV or AVI files passing WebP validation.

### Pitfall 5: Import File Cleanup on Rollback
**What goes wrong:** If the DB transaction succeeds but photo file extraction fails, or vice versa, the database and filesystem become inconsistent.
**Why it happens:** Filesystem operations are not transactional. Files written before a DB rollback remain on disk.
**How to avoid:** Track all written file paths during import. On any error, iterate and delete them. Order operations: DB transaction first (can roll back cleanly), then filesystem writes (can be cleaned up manually).
**Warning signs:** Orphaned photo files in data/uploads/ with no matching DB records after a failed import.

### Pitfall 6: Path Traversal via ZIP Entry Names
**What goes wrong:** A malicious ZIP file could contain entries like `../../etc/passwd` or `uploads/../../../etc/shadow`, and `path.join(uploadsDir, entry.entryName)` would write outside the intended directory.
**Why it happens:** ZIP entry names are attacker-controlled strings.
**How to avoid:** After resolving the full path with `path.resolve()`, verify it starts with the intended directory using `resolvedPath.startsWith(targetDir + path.sep)`.
**Warning signs:** File paths in the data directory that contain `..` segments.

## Code Examples

Verified patterns from official sources:

### Zod v4 Object Schema with safeParse
```typescript
// Source: https://zod.dev/api
import { z } from 'zod';

const CreateToteSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  location: z.string().min(1, 'Location is required').max(255),
  size: z.string().max(100).optional(),
  color: z.string().max(100).optional(),
  owner: z.string().max(255).optional(),
});

// Usage in route handler:
const result = CreateToteSchema.safeParse(body);
if (!result.success) {
  const errors = result.error.issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
  return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 });
}
const { name, location, size, color, owner } = result.data;
```

### Zod Coercion for URL Params
```typescript
// Source: https://zod.dev/api (z.coerce section)
const IdParam = z.coerce.number().int().positive();

// Usage:
const parsed = IdParam.safeParse(id); // id from URL params is a string
if (!parsed.success) {
  return NextResponse.json({ error: 'Invalid ID parameter' }, { status: 400 });
}
const itemId = parsed.data; // number, guaranteed integer > 0
```

### better-sqlite3 Transaction with External Pragma
```typescript
// Source: https://sqlite.org/foreignkeys.html + better-sqlite3 API
const db = getDb();

// Pragma MUST be set outside transaction (autocommit mode)
db.pragma('foreign_keys = OFF');
try {
  const importTx = db.transaction(() => {
    db.prepare('DELETE FROM items').run();
    db.prepare('DELETE FROM totes').run();
    // ... insert new data ...
  });
  importTx();
} finally {
  db.pragma('foreign_keys = ON');
}
```

### Path Traversal Prevention
```typescript
// Source: Node.js security best practices
import path from 'path';

function safePath(baseDir: string, userInput: string): string | null {
  const resolved = path.resolve(baseDir, userInput);
  // Ensure resolved path is within baseDir
  if (!resolved.startsWith(baseDir + path.sep) && resolved !== baseDir) {
    return null; // Path traversal attempt
  }
  return resolved;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Zod v3 with `z.instanceof(File)` | Zod v4 with native `z.file().mime().max()` | Zod v4 (2025) | No more custom refinements for file validation |
| Manual typeof chains | Zod safeParse with automatic field errors | Standard practice | 80% less validation boilerplate |
| npm `file-type` for magic bytes | Manual check for small signature sets | Always valid for <5 types | Avoids ESM-only dependency complexity |

**Deprecated/outdated:**
- Zod v3's `z.instanceof(File)` pattern for file validation: replaced by native `z.file()` in v4

## Open Questions

1. **Zod string length limits**
   - What we know: Zod supports `.max(n)` for string length validation
   - What's unclear: What reasonable max lengths to set for tote name, location, description, etc. (DB is TEXT with no limit)
   - Recommendation: Use generous limits (255 for names, 1000 for descriptions) to prevent abuse without breaking legitimate use. These can be tightened later.

2. **Settings route key whitelist**
   - What we know: HARD-01 (v2) defers settings key whitelisting, but the current settings PUT accepts any key
   - What's unclear: Whether to add basic key validation now or defer entirely
   - Recommendation: Defer per requirements -- HARD-01 is explicitly v2. Only add Zod shape validation for the request structure (must be `{ settings: object }`), not key whitelisting.

3. **Import route: validate all records before inserting?**
   - What we know: User decided "Validate upfront: parse and validate the entire JSON/ZIP structure before touching the database"
   - What's unclear: How deep to validate (just structure? or also FK reference integrity?)
   - Recommendation: Validate structure (required fields, types) upfront. FK integrity is handled by the database itself once foreign keys are properly re-enabled.

## API Route Catalog (for VALID-01 planning)

Complete inventory of routes requiring validation work:

| Route | Methods | Accepts Body | Current Validation | Zod Needed |
|-------|---------|-------------|-------------------|------------|
| `/api/totes` | GET, POST | POST: JSON | POST has manual checks | POST: Zod schema |
| `/api/totes/[id]` | GET, PUT, DELETE | PUT: JSON | PUT has manual checks + JSON catch | PUT: Zod schema, GET/DELETE: ID param |
| `/api/totes/[id]/items` | GET, POST | POST: JSON | POST has manual checks + JSON catch | POST: Zod schema |
| `/api/totes/[id]/qr` | GET | No | Minimal | ID param validation |
| `/api/totes/qr/bulk` | POST | JSON | Partial (array check) | Zod schema |
| `/api/items/[id]` | GET, PUT, DELETE | PUT: JSON | PUT has manual checks + JSON catch | PUT: Zod schema, GET/DELETE: ID param |
| `/api/items/[id]/photos` | GET, POST | POST: FormData | Type + size check | Add magic bytes, Zod for metadata |
| `/api/items/[id]/metadata` | GET, POST | POST: JSON | POST has basic checks, no JSON catch | POST: Zod schema + JSON catch |
| `/api/items/[id]/metadata/[metadataId]` | PUT, DELETE | PUT: JSON | PUT has basic checks, no JSON catch | PUT: Zod schema + JSON catch |
| `/api/items/[id]/move` | POST | JSON | Has checks, no JSON catch | Zod schema + JSON catch |
| `/api/items/[id]/duplicate` | POST | JSON (optional) | Catches parse error | Zod schema |
| `/api/photos/[id]` | GET, DELETE | No | ID only | ID param validation |
| `/api/photos/[id]/thumbnail` | GET | No | ID only | ID param validation |
| `/api/search` | GET | Query params | Minimal | Query param validation |
| `/api/search/filters` | GET | No | None needed | None (no user input) |
| `/api/import` | POST | FormData (ZIP) | Struct validation | Enhance structure validation |
| `/api/export` | GET | No | None needed | None (no user input) |
| `/api/settings` | GET, PUT | PUT: JSON | PUT has basic check, no JSON catch | PUT: Zod schema + JSON catch |
| `/api/dashboard` | GET | No | None needed | None (no user input) |
| `/api/health` | GET | No | None needed | None (no user input) |
| `/api/metadata-keys` | GET | No | None needed | None (no user input) |
| `/api/schema-check` | GET | No | None needed | None (no user input) |

**Routes needing JSON parse error handling (VALID-04):** settings PUT, items/[id]/metadata POST, items/[id]/metadata/[metadataId] PUT, items/[id]/move POST, totes/qr/bulk POST, items/[id]/duplicate POST (already has it but needs consistency)

**Routes needing Zod schemas (VALID-01):** 13 route handler methods need new Zod schemas.

**Read-only routes (no validation needed):** dashboard GET, export GET, health GET, metadata-keys GET, search/filters GET, schema-check GET.

## Sources

### Primary (HIGH confidence)
- [SQLite Foreign Keys documentation](https://sqlite.org/foreignkeys.html) - Verified PRAGMA foreign_keys transaction behavior: "not possible to enable or disable foreign key constraints in the middle of a multi-statement transaction"
- [Zod v4 API reference](https://zod.dev/api) - z.object, z.string, z.file, safeParse, error.issues structure
- [Zod v4 release notes](https://zod.dev/v4) - Performance improvements, z.file() API, import path
- [Wikipedia: List of file signatures](https://en.wikipedia.org/wiki/List_of_file_signatures) - JPEG, PNG, WebP magic bytes

### Secondary (MEDIUM confidence)
- [npm: zod](https://www.npmjs.com/package/zod) - Latest version 4.3.6 confirmed
- [npm: file-type](https://www.npmjs.com/package/file-type) - ESM-only confirmed for v21, justifying manual magic bytes approach
- [StackHawk: Node.js Path Traversal Guide](https://www.stackhawk.com/blog/node-js-path-traversal-guide-examples-and-prevention/) - path.resolve() + startsWith() pattern
- Direct codebase analysis of all 22 API route files in `src/app/api/`

### Tertiary (LOW confidence)
- None -- all findings verified against primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Zod v4 is stable (4.3.6), well-documented, user-decided
- Architecture: HIGH - Patterns derived from direct codebase analysis and official SQLite/Zod documentation
- Pitfalls: HIGH - PRAGMA behavior confirmed by SQLite official documentation; magic bytes verified against Wikipedia file signature list

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (stable domain, no fast-moving dependencies)
