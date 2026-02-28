# Project Research Summary

**Project:** Tote Sonar
**Domain:** Self-hosted personal inventory/organization app (container/tote tracking with photos)
**Researched:** 2026-02-28
**Confidence:** MEDIUM-HIGH

## Executive Summary

Tote Sonar is a working MVP that needs hardening to become a release-quality v1, not a ground-up build. The existing stack (Next.js 16, React 19, better-sqlite3, sharp, Park UI) is well-chosen and should be kept. Research across all four areas converges on a consistent finding: the app has sound foundations but several interconnected correctness issues — a missing table-stakes feature (tote photos), bugs in search and import/export, no schema migration system, and inconsistent input validation — that must be resolved before the project can be confidently shared or relied upon. The recommended path is to fix these issues in a deliberate order driven by their dependencies rather than tackling them opportunistically.

The most critical missing feature is tote photo upload. Every competitor (Sortly, Home Inventory, InvenTree) shows container thumbnails in list views; a tote listing with no visual identification is incomplete for the stated use case of "find it without opening it." The implementation is straightforward because it exactly mirrors the already-working item photo pattern. However, before adding tote photos, the schema migration system must be in place (the new `tote_photos` table is the first real schema change), and the non-atomic photo lifecycle bug should be fixed (so the new feature does not inherit the same orphaned-file problem). This sequencing constraint — infrastructure before feature, correctness before expansion — should drive the roadmap phase structure.

The key risks are data integrity and user trust. The import's foreign key disabling bug can silently corrupt referential integrity. Destructive import with no pre-import backup means a failed restore loses all data. Missing indexes will cause a sudden performance cliff when inventories grow beyond ~5,000 items. Sharp will exhaust container memory on unexpectedly large images without pixel dimension limits. These are not hypothetical — several are already documented in the project's own CONCERNS.md. Addressing them systematically (rather than piecemeal) is the clearest path to a trustworthy, durable v1.

## Key Findings

### Recommended Stack

The existing stack is appropriate and should not be replaced. Research identified four targeted additions for runtime safety and UX, plus three development tooling additions. The most important runtime addition is `zod@^4` for systematic API input validation — this is the single highest-impact hardening change across all routes. For photo uploads, `file-type@^21` adds magic-byte verification (the browser's claimed MIME type cannot be trusted), and `sanitize-filename@^1.6` prevents path traversal from user-provided filenames. `react-dropzone@^15` replaces any custom drag-and-drop logic with a battle-tested implementation that handles accessibility and browser edge cases. For development, `vitest@^4` and `@testing-library/react@^16` provide a modern testing setup appropriate for the ESM/React 19 environment. Avoid ORMs (raw SQL with prepared statements is already safe and readable at this scale), cloud image services (violates self-hosted constraint), and client-side state management libraries (no cross-component state management need exists).

**Core technologies (keep as-is):**
- Next.js 16 App Router — full-stack framework; server components handle database/filesystem access without a separate API server
- better-sqlite3 — embedded SQLite; correct for single-user, single-file backup, no server process
- sharp — thumbnail generation and EXIF auto-rotation; prebuilt binaries work in Docker Alpine
- Park UI / Panda CSS — accessible component library; do not add Tailwind alongside it

**New additions (add now):**
- zod@^4.3.6 — API input validation, runtime type safety TypeScript cannot provide
- file-type@^21.3.0 — magic-byte file format verification on upload (ESM-only; use dynamic import if needed)
- sanitize-filename@^1.6.3 — path traversal prevention for uploaded filenames
- react-dropzone@^15.0.0 — accessible drag-and-drop file upload widget

### Expected Features

The app already has most table-stakes features implemented. The critical gap is tote photos — a feature every competitor provides, required for the core use case of visual container identification. Beyond that, three existing features have known bugs that make them unreliable: search (metadata condition-splicing bug, 100-result hard cap with no pagination), import/export (foreign key re-enable bug, orphaned photo cleanup on delete, no pre-import backup), and input validation (browser MIME types trusted, settings accept arbitrary input, inconsistent JSON error handling). These bugs are more important to fix than adding new features because they undermine trust in the data the app holds.

**Must have for release-quality v1 (P1):**
- Tote photo upload — critical missing table-stakes feature; mirrors existing item photo pattern
- Search metadata bug fix — fragile condition-splicing produces incorrect SQL; blocks reliable search
- Search pagination — 100-result hard cap is release-blocking for inventories above ~100 items
- Import foreign key re-enable fix — can silently leave FK enforcement disabled after failed import
- Orphaned photo cleanup on delete — silent file deletion failures cause disk usage to grow invisibly
- Input validation pass — Zod schemas across all API routes; MIME type verification via file-type

**Should have after v1 stabilizes (P2, add in v1.x):**
- Background thumbnail processing — upload responds immediately; thumbnail generates async
- Orphaned file cleanup utility in settings — on-demand scan for files without DB records
- Dashboard data quality nudges — "5 items have no photos", actionable completeness indicators
- Tags/categories for totes — grouping beyond location/owner fields

**Defer to v2+ (P3):**
- Container nesting/hierarchy — requires recursive queries, schema changes, tree UI; high complexity
- Authentication/authorization — only if multi-user demand materializes; avoid until then
- PWA manifest — convenience, not essential; add to home screen works without it for now
- Full-text search engine (Meilisearch) — only if SQLite LIKE becomes noticeably slow at scale

### Architecture Approach

The App Router pattern (server-rendered pages, client components for interactivity, REST route handlers for mutations) is sound and should be maintained. The two structural issues to address are: (1) monolithic page components — the item detail page is 1,581 lines with 30+ useState calls, making it untestable and fragile to change; (2) duplicated photo processing logic — the same sharp pipeline, path management, and file validation will need to exist in both item and tote photo routes unless extracted to `src/lib/photos.ts`. Component decomposition should precede adding tote photos to the tote detail page, because adding photo upload to a 1,121-line component makes the problem worse.

**Major components:**
1. Page Components (SSR shells) — server-render data, delegate to client components for interactivity
2. API Route Handlers — REST endpoints for all CRUD, photo upload/serve, search, import/export
3. Data Access Layer (`src/lib/db.ts`) — SQLite singleton with WAL mode, FK enforcement, FULL sync
4. Photo Pipeline (`src/lib/photos.ts`, to be created) — shared validation, sharp processing, path management
5. Shared UI Components — PhotoUpload, PhotoGallery, ConfirmDialog, Toast (currently these are inlined in monolithic pages; extract before expanding)

**Key patterns to follow:**
- Resource-mirrored photo upload: tote photos must use the identical API shape, DB schema pattern, and file storage layout as item photos
- Transactional database-then-filesystem: insert DB record in transaction, then write files; clean up on failure; never reverse this order
- Component decomposition: extract sub-components with encapsulated state before adding more features to existing pages

### Critical Pitfalls

1. **Non-atomic database + filesystem photo operations** — Write files to a staging path, move atomically after DB INSERT succeeds. On deletion, delete the DB record first, then attempt file removal; log failures to a cleanup queue rather than swallowing them silently. Address this before adding tote photos.

2. **Foreign key disabling in import** — The `PRAGMA foreign_keys = OFF` pattern in the import route does not participate in SQLite transactions; a crash leaves FK enforcement off for all subsequent requests. Fix: insert data in dependency order (totes → items → photos/metadata) with FKs always on. This has no dependency on circular references in the current schema.

3. **No schema migration system** — `CREATE TABLE IF NOT EXISTS` silently ignores schema differences between code and an existing database. Users who update their Docker image get runtime errors ("no such column") with no recovery path. Must be implemented before any schema change ships (i.e., before tote photos, which require a new `tote_photos` table).

4. **Sharp memory exhaustion on large images** — File size limits (5MB) control compressed size, not decompressed pixel dimensions. A 5MB JPEG panorama can decompress to hundreds of megapixels, causing container OOM kills. Add `sharp(buffer).metadata()` pixel dimension check and `limitInputPixels` option before processing.

5. **Destructive import with no backup** — Import deletes all existing data before inserting from the ZIP. A failed import midway through loses all data with no recovery path. Add automatic pre-import backup using SQLite's `VACUUM INTO` before any delete operation begins.

## Implications for Roadmap

Based on research, the dependency chain from ARCHITECTURE.md and PITFALLS.md suggests a 5-phase structure that respects infrastructure-before-feature and correctness-before-expansion ordering.

### Phase 1: Infrastructure and Safety Foundation

**Rationale:** Three issues block safe schema changes and reliable data operations. The schema migration system must come first because Phase 2 (tote photos) requires adding a new table. The import FK bug and pre-import backup must be fixed before any new data relationships are added. Error boundaries and structured logging improve all subsequent debugging. These are not features users see, but they are prerequisites for everything else.
**Delivers:** Schema migration runner (with `schema_version` table), versioned SQL migration files, import FK fix (insert in dependency order, FKs always on), pre-import backup via `VACUUM INTO`, Next.js error boundary files (`error.tsx`) at app and route-segment levels.
**Addresses:** Pitfall 2 (FK disabling), Pitfall 3 (no migration system), Pitfall 7 (destructive import data loss).
**Stack additions:** Zod schema validation setup (`src/lib/validation.ts`) — establish the pattern here, use it in subsequent phases.
**Research flag:** Standard patterns — no additional research needed. SQLite migration approach documented in STACK.md. better-sqlite3 transaction API is well-documented.

### Phase 2: Photo Pipeline Hardening and Tote Photos

**Rationale:** Tote photos are the highest-priority missing feature (P1), but they should not be built until the photo infrastructure is correct. Extract shared photo logic to `src/lib/photos.ts` first (eliminates duplication), fix the non-atomic lifecycle bug (prevents tote photos inheriting the same orphaned-file problem), add pixel dimension validation (prevents Sharp OOM), and add MIME type verification via `file-type` (security). Then implement tote photos by mirroring the hardened item photo pattern.
**Delivers:** `src/lib/photos.ts` (shared photo processing utilities), non-atomic lifecycle fix (staging-then-move pattern or DB-first ordering), pixel dimension limits in Sharp processing, `file-type` magic-byte verification on all uploads, `sanitize-filename` on all upload paths, `tote_photos` table (as migration 002), `/api/totes/[id]/photos/` route handler, tote cover thumbnail in list views and dashboard, import/export updated to include tote photos.
**Addresses:** Pitfall 1 (non-atomic photo lifecycle), Pitfall 4 (Sharp OOM), Pitfall 5 (MIME type trust on serving).
**Stack additions:** `file-type@^21`, `sanitize-filename@^1.6`, `react-dropzone@^15` for upload UX.
**Research flag:** Standard patterns — item photo pattern is documented in codebase; tote photos mirror it exactly. No external research needed.

### Phase 3: Bug Fixes and Input Validation

**Rationale:** Search and validation bugs undermine core reliability. The search metadata condition-splicing bug produces incorrect results silently. The 100-result hard cap makes the app unusable for serious inventories. Input validation is cross-cutting and should be applied systematically after the infrastructure (Zod, `src/lib/validation.ts`) from Phase 1 is established. Orphaned photo cleanup (both the silent-failure fix from Phase 2 and a user-facing utility) belongs here since tote photos are now in place and both entity types need coverage.
**Delivers:** Search metadata bug fix (rebuild dynamic WHERE clause correctly), search pagination (cursor-based with total count in response, "showing X of Y results" UI), Zod validation schemas for all API routes (settings whitelist, item/tote CRUD, upload metadata), consistent API error responses via `apiHandler` wrapper, orphaned file cleanup utility in settings UI, `X-Content-Type-Options: nosniff` and `Content-Disposition: inline` on all photo serving responses, security headers in `next.config.mjs`.
**Addresses:** CONCERNS.md search bug, CONCERNS.md unsafe JSON parsing, Pitfall 5 (MIME type serving), FEATURES.md P1 validation items.
**Stack additions:** Zod schemas fully deployed; security headers configured.
**Research flag:** Standard patterns — Zod 4 API documented in STACK.md; search pagination is standard SQL offset/limit; security header values documented in STACK.md. No additional research needed.

### Phase 4: Component Decomposition and Code Quality

**Rationale:** The monolithic page components (item detail: 1,581 lines, tote detail: 1,121 lines) are the primary blocker for maintainability and testability. They must be decomposed before any significant new UI work in v1.x, because adding features to them (tags, dashboard nudges, bulk operations) compounds the problem. This phase also establishes the testing infrastructure (Vitest, @testing-library/react) and creates shared UI components that all subsequent work will use.
**Delivers:** `src/components/PhotoUpload.tsx` (encapsulated upload state and UX), `src/components/PhotoGallery.tsx` (viewer with delete confirmation), `src/components/ConfirmDialog.tsx` (reusable modal), `src/components/Toast.tsx` (notification system), item detail page decomposed to under 400 lines, tote detail page decomposed to under 400 lines, Vitest setup with component test coverage for extracted components, Prettier configuration.
**Addresses:** Pitfall (monolithic pages in PITFALLS.md tech debt table), ARCHITECTURE.md anti-pattern 1.
**Stack additions:** `vitest@^4`, `@testing-library/react@^16`, `prettier@^3`.
**Research flag:** Standard patterns — component decomposition is well-understood React practice. Vitest configuration for Next.js is documented. No additional research needed.

### Phase 5: Performance and Operational Hardening

**Rationale:** Once correctness and code quality are in place, address performance and operational concerns that matter for long-running self-hosted instances. These are lower priority than correctness but important for users with large inventories or slow storage. Database indexes are the highest-impact single change; they prevent the sudden performance cliff at ~5,000 items. Streaming photo responses and async file I/O prevent event loop blocking. Structured logging makes Docker deployments debuggable.
**Delivers:** Database indexes on all foreign key columns and frequently-filtered fields (in the migration system as migration 003), streaming photo responses via `fs.createReadStream()`, async file I/O (`fs.promises.writeFile`) in upload handlers, SQLite `PRAGMA integrity_check` on startup, structured logging (JSON format with timestamp and level), Sharp `limitInputPixels` hardening (if not done in Phase 2), background thumbnail processing exploration (or explicit deferral with rationale).
**Addresses:** Pitfall 6 (SQLite performance cliff), ARCHITECTURE.md anti-pattern 4 (synchronous file reads), PITFALLS.md performance traps section.
**Research flag:** May benefit from brief research-phase on async Sharp processing patterns (worker threads vs. job queue vs. async response) if background thumbnail processing is included. Standard patterns otherwise.

### Phase Ordering Rationale

- Phase 1 before Phase 2: You cannot safely ship a new DB table (`tote_photos`) without a migration system; any existing user who updates loses the ability to run the app cleanly.
- Phase 1 before Phase 3: Zod infrastructure established in Phase 1 enables systematic validation rollout in Phase 3 without rewriting the setup.
- Phase 2 before Phase 4: Component decomposition of the tote detail page should happen after tote photos exist, so the photo upload component is extracted from a page that already has photo upload, not added to a decomposed page afterward.
- Phase 3 before Phase 4: Bug fixes should precede refactoring so the refactored components are built on correct behavior, not bugged behavior.
- Phase 5 last: Performance and operational hardening are lower priority than correctness. Current performance is adequate for personal use; fixing correctness issues benefits users immediately.

### Research Flags

Phases needing deeper research during planning:
- **Phase 5 (if background thumbnails included):** Async Sharp processing in Next.js route handlers is nuanced — worker threads vs. job queue vs. deferred background task. A brief research-phase during planning would clarify the correct approach for a single-process Node.js deployment.

Phases with standard, well-documented patterns (skip research-phase):
- **Phase 1:** SQLite migration patterns are established and documented in STACK.md with code examples.
- **Phase 2:** Tote photos mirror item photos exactly; the pattern is in the existing codebase.
- **Phase 3:** Zod validation, search pagination, and security headers are all well-documented in STACK.md.
- **Phase 4:** React component decomposition and Vitest setup are standard patterns with extensive documentation.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions verified against npm registry on 2026-02-28. Existing stack analyzed directly from codebase. New additions are ecosystem standards with verified version compatibility. |
| Features | MEDIUM | Competitor analysis based on training data (cutoff May 2025); live feature sets may have changed. Core patterns (container photos as table stakes, self-hosted as differentiator) are stable. Existing codebase bugs verified via direct CONCERNS.md inspection. |
| Architecture | HIGH | Based on direct codebase inspection and Next.js 16.1.6 official documentation (verified via WebFetch). SQLite/better-sqlite3 patterns based on stable, well-documented APIs. |
| Pitfalls | MEDIUM | Critical pitfalls (FK bug, no migrations, orphaned files) verified via direct codebase inspection. Performance cliff timing estimates (5,000+ items) and Sharp memory behavior are training-data estimates; actual thresholds depend on hardware. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **react-dropzone v15 / React 19 compatibility:** Version exists on npm but peer dependency was not independently verified. Test during Phase 2 installation; fallback is a lightweight custom drag-drop implementation.
- **file-type ESM-only in Next.js 16 server context:** Should work natively, but edge cases in standalone build or specific route handler contexts may require dynamic import (`await import('file-type')`). Test early in Phase 2.
- **Sharp OOM threshold:** The "50 megapixel" recommendation is a reasonable heuristic based on training data; actual threshold depends on Docker memory limit and concurrent upload load. Validate with pixel limit set and a test panoramic image.
- **Background thumbnail processing approach:** If Phase 5 includes async thumbnail generation, the correct implementation pattern (worker threads vs. job queue) for a single-process Next.js deployment needs validation. Flag for research-phase during Phase 5 planning.
- **kemo-archiver replacement:** PITFALLS.md flags this as unmaintained with an ESLint suppression hiding the import pattern. Replacing it with `archiver` (standard npm package) or `adm-zip` (already a dependency) is low-risk but should be scoped explicitly in roadmap — likely Phase 3 alongside import/export hardening.

## Sources

### Primary (HIGH confidence)
- npm registry (registry.npmjs.org) — all version numbers verified 2026-02-28
- Next.js 16.1.6 official documentation — Route Handlers, error.tsx boundaries, Server Functions (verified via WebFetch, 2026-02-27)
- Codebase direct inspection — `src/lib/db.ts`, `src/app/api/`, `src/app/totes/[id]/items/[itemId]/page.tsx`, `Dockerfile`, `.planning/codebase/CONCERNS.md`
- OWASP security header recommendations (stable guidelines)
- SQLite WAL mode and PRAGMA documentation (stable, well-established)
- better-sqlite3 transaction API documentation

### Secondary (MEDIUM confidence)
- Competitor feature analysis (Sortly, Home Inventory, InvenTree, Snipe-IT, Encircle) — training data, cutoff May 2025; core patterns stable
- Sharp `limitInputPixels` and memory behavior — training data benchmarks; validate with actual hardware
- Vitest/Next.js 16 integration patterns — training data; verified to be compatible based on Node.js version requirements

### Tertiary (LOW confidence)
- Background thumbnail processing patterns (worker threads vs. job queue) — training data; needs live verification for the specific Next.js 16 App Router context
- kemo-archiver replacement options — based on npm ecosystem knowledge; replacement candidates (archiver, adm-zip) are well-known but specific migration path needs testing

---
*Research completed: 2026-02-28*
*Ready for roadmap: yes*
