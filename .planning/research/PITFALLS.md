# Pitfalls Research

**Domain:** Self-hosted personal inventory/organization app (Next.js + SQLite + photo management)
**Researched:** 2026-02-28
**Confidence:** MEDIUM (based on training data, codebase analysis, and CONCERNS.md; no live web verification available)

## Critical Pitfalls

### Pitfall 1: Non-Atomic Database + Filesystem Operations During Photo Lifecycle

**What goes wrong:**
Photo upload writes a file to disk, then inserts a database record. Photo deletion removes the database record (via CASCADE or explicit DELETE), then attempts file removal. If either step fails partway through, the database and filesystem drift out of sync. Orphaned files waste disk space silently. Missing files referenced by the database cause broken image UI and 404 errors that confuse users.

**Why it happens:**
SQLite transactions only cover database operations. The filesystem has no transactional semantics. Developers treat the two-step process as atomic because it "usually works," but crashes, permission errors, disk-full conditions, and concurrent requests all break the assumption.

**How to avoid:**
- Write files to a staging directory first, then move them into the final location only after the database INSERT succeeds. `fs.renameSync` on the same filesystem is atomic on POSIX.
- On deletion, delete the database record first (inside a transaction), then attempt file removal. Log file deletion failures to a cleanup queue table rather than swallowing errors silently.
- Implement an orphan detection routine: a background or on-demand task that scans `uploads/` and `thumbnails/` directories, compares filenames against `item_photos` records, and reports or removes files with no database reference.
- Never ignore `catch` blocks on file operations -- at minimum log the filename and error so orphans are discoverable.

**Warning signs:**
- `data/uploads/` directory grows larger than expected relative to item count.
- Users report broken thumbnail images on the dashboard or item pages.
- Photo count in database does not match file count on disk after running an export-import cycle.

**Phase to address:**
Photo feature hardening phase (before tote photo upload is added, since the same pattern will be reused).

---

### Pitfall 2: Foreign Key Disabling in Import Creates Unrecoverable Corruption Window

**What goes wrong:**
The import route runs `PRAGMA foreign_keys = OFF` inside a transaction, then re-enables it in a `finally` block. However, SQLite PRAGMAs are connection-scoped, not transaction-scoped. If the Node.js process crashes between disabling and re-enabling, the singleton database connection remains in a state where foreign keys are off for all subsequent requests until the process restarts. During that window, any INSERT or DELETE can violate referential integrity -- items can reference non-existent totes, metadata can reference non-existent items, and CASCADE deletes stop working.

**Why it happens:**
Developers assume `PRAGMA foreign_keys` behaves like a SQL statement that participates in transactions. It does not. In `better-sqlite3`, PRAGMAs take effect immediately regardless of transaction state. The `try/finally` helps for normal errors but not for process crashes or unhandled promise rejections.

**How to avoid:**
- Avoid disabling foreign keys entirely. Instead, insert data in dependency order (totes first, then items, then photos/metadata/movement history) with foreign keys enabled. This is already almost the order used -- just needs verification that all referenced IDs exist.
- If foreign keys must be disabled (e.g., for circular references, which this schema does not have), use a separate short-lived database connection specifically for the import, so the main connection is never affected.
- Add a startup health check that verifies `PRAGMA foreign_keys` is ON and logs a warning if it is not.

**Warning signs:**
- Items appear in the UI that belong to non-existent totes (clicking the tote link 404s).
- Deleting a tote does not cascade-delete its items.
- `PRAGMA foreign_key_check` returns violations when run against the database.

**Phase to address:**
Bug fix and hardening phase (this is already flagged in CONCERNS.md and should be fixed before adding tote photos, which add another table with foreign keys).

---

### Pitfall 3: No Schema Migration System Means Data Loss on Schema Changes

**What goes wrong:**
The schema is initialized with `CREATE TABLE IF NOT EXISTS`. Adding new columns (like tote_photos), renaming columns, or changing constraints requires either manual `ALTER TABLE` statements or dropping and recreating tables. Without a versioned migration system, there is no way to upgrade an existing database safely. Users who update their Docker image lose data or get runtime errors because the code expects columns that do not exist.

**Why it happens:**
`CREATE TABLE IF NOT EXISTS` feels like it handles schema evolution because it does not crash on existing tables. But it silently ignores differences between the defined schema and the actual table structure. A table created in v1 missing a column added in v2 will not be altered.

**How to avoid:**
- Add a `schema_version` table (single row, integer version).
- Write numbered migration functions: `migration_001_add_tote_photos()`, etc.
- On startup, check current version and run all pending migrations in order inside a transaction.
- Each migration uses `ALTER TABLE ... ADD COLUMN` (SQLite supports this) or creates new tables.
- Never use `DROP TABLE` in migrations for tables with user data.
- Test migrations against a copy of production data before releasing.

**Warning signs:**
- Any PR that modifies `initializeSchema()` in `db.ts` to add columns or tables.
- Users reporting "no such column" errors after updating to a new version.
- Export files from old versions failing to import into new versions.

**Phase to address:**
Must be implemented before any schema change ships (before tote photos feature, which requires a new `tote_photos` table or modifications to `item_photos`).

---

### Pitfall 4: Sharp Memory Exhaustion on Large or Malicious Image Uploads

**What goes wrong:**
Sharp loads the entire image buffer into memory for processing. A user uploading a 5MB JPEG that decompresses to a 100+ megapixel image (e.g., panoramic photos, screenshots of high-DPI displays) can cause Sharp to allocate hundreds of megabytes of RAM for the pixel buffer. In a Docker container with limited memory, this causes OOM kills. Repeated uploads can cause memory pressure even with normal images because Sharp's libvips allocates memory outside the V8 heap, invisible to Node.js garbage collection.

**Why it happens:**
File size limits (5MB) control compressed size, not decompressed pixel dimensions. A 5MB JPEG can contain far more pixel data than a 5MB PNG because JPEG compresses more aggressively. Developers test with normal phone photos (12-16 megapixels) and never encounter the issue.

**How to avoid:**
- Before processing with Sharp, use `sharp(buffer).metadata()` to read image dimensions without fully decoding. Reject images exceeding a reasonable pixel limit (e.g., 50 megapixels or 8192x8192).
- Set Sharp's `limitInputPixels` option: `sharp(buffer, { limitInputPixels: 50000000 })`.
- Process thumbnails sequentially or with a concurrency limit to avoid parallel memory spikes.
- In Docker, set memory limits and ensure the container restarts gracefully (health check endpoint already exists at `/api/health`).
- Consider streaming Sharp operations with `sharp().pipe()` instead of loading entire buffers, though this is more complex with the current `writeFileSync` approach.

**Warning signs:**
- Docker container restarts without clear error logs (OOM kill).
- `sharp` errors mentioning "Input image exceeds pixel limit" or memory allocation failures.
- Thumbnail generation succeeding for small images but failing for large ones.

**Phase to address:**
Photo handling hardening phase, before tote photo upload is added (doubles the upload surface area).

---

### Pitfall 5: Serving User-Uploaded Content with Trusted MIME Types Enables XSS

**What goes wrong:**
The photo serving endpoint (`/api/photos/[id]`) reads `mime_type` from the database (originally provided by the browser during upload) and serves it as the `Content-Type` header. If a user uploads an SVG file (which can contain JavaScript) or a file with a spoofed MIME type, the browser will execute embedded scripts when the image is viewed. Even with the current `ALLOWED_TYPES` whitelist, the browser-provided MIME type is not verified against actual file content.

**Why it happens:**
The `File.type` property in the browser is derived from the file extension, not file content. A renamed `.html` file with a `.jpg` extension will have `type: "image/jpeg"`. The server trusts this value because validation only checks the allowlist, not the actual bytes.

**How to avoid:**
- Use Sharp's `metadata()` to verify the actual image format matches the claimed MIME type before storing. Sharp will throw on non-image files.
- When serving photos, always add `Content-Disposition: inline` with a safe filename and `X-Content-Type-Options: nosniff` to prevent MIME sniffing.
- Re-derive the MIME type from the stored file extension (which was set by the server, not the client) rather than trusting the database `mime_type` field.
- Consider re-encoding all uploads through Sharp (even at full quality) to strip any embedded non-image content.

**Warning signs:**
- `item_photos` table contains MIME types that do not match file extensions.
- Files in `uploads/` that are not valid images (can be detected by running `sharp.metadata()` against all stored files).
- Browser developer console showing unexpected content types for photo requests.

**Phase to address:**
Security hardening phase (before release/production deployment).

---

### Pitfall 6: SQLite Performance Cliff Without Indexes at Inventory Scale

**What goes wrong:**
The database has no indexes beyond primary keys. Every search query, every filter by location/owner, every metadata lookup, and every "items in tote" query performs a full table scan. At small scale (hundreds of items) this is imperceptible. At thousands of items with photos and metadata, search response times degrade from milliseconds to seconds. The dashboard query joins items with photos on every page load, compounding the problem.

**Why it happens:**
SQLite is fast enough at small scale that missing indexes do not produce noticeable latency. Developers test with 10-50 items and never see the problem. The performance cliff is not gradual -- it is sudden when data crosses a threshold (roughly 5,000-10,000 rows for simple queries, lower for JOIN queries).

**How to avoid:**
- Add indexes on all foreign key columns: `items.tote_id`, `item_photos.item_id`, `item_metadata.item_id`, `item_movement_history.item_id`.
- Add indexes on frequently filtered columns: `totes.location`, `totes.owner`.
- Add a composite index on `item_metadata(item_id, key)` for metadata searches.
- Use `EXPLAIN QUERY PLAN` on all search/dashboard queries to verify index usage.
- Add these indexes in the initial migration (not retroactively) since `CREATE INDEX IF NOT EXISTS` is safe and fast on empty tables.

**Warning signs:**
- Search taking more than 200ms (visible in browser network tab).
- Dashboard load time increasing as users add more items.
- SQLite WAL file growing large (indicates long-running read transactions from slow queries).

**Phase to address:**
Performance optimization phase, but index creation should be included in the migration system as migration #1.

---

### Pitfall 7: Export/Import Round-Trip Data Loss

**What goes wrong:**
The export creates a ZIP with `tote-sonar-data.json` and photo files. The import deletes ALL existing data before inserting from the ZIP. If the import fails partway through (malformed JSON, missing photo files, disk full), the user has lost their existing data AND failed to restore the backup. The export also loads all data into memory simultaneously (`SELECT * FROM` every table), which can exhaust memory for large inventories with many photos.

**Why it happens:**
The "delete everything, then insert everything" import strategy is simpler to implement than merge/upsert logic. Developers test with small datasets where memory is not a concern and imports always succeed.

**How to avoid:**
- Before destructive import, create an automatic backup of the current database file (`tote-sonar.db` -> `tote-sonar.db.pre-import-backup`). SQLite's `VACUUM INTO` creates a clean backup while the database is in use.
- Validate the entire ZIP contents BEFORE deleting any data: parse JSON, verify all referenced photo files exist in the ZIP, check for schema compatibility.
- For export, stream data in chunks rather than loading everything into memory. Use `SELECT * FROM items LIMIT 1000 OFFSET ?` pagination or SQLite's cursor-based iteration.
- Consider supporting incremental/merge import rather than only destructive replace.

**Warning signs:**
- Users afraid to use import because they might lose data.
- Export files growing beyond available RAM (roughly at 10,000+ items with full photo data).
- Import endpoint returning 500 errors with partially deleted data.

**Phase to address:**
Import/export hardening phase (before release -- this is a data safety issue).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Monolithic 1581-line item detail page | Faster initial development, all logic in one place | Every change risks breaking unrelated functionality; impossible to test individual behaviors; merge conflicts on every PR touching items | Never in production -- refactor before adding tote photos (same pattern will be needed) |
| `console.error` as only error reporting | No logging infrastructure to set up | Errors in production Docker containers are invisible unless someone reads `docker logs`; no alerting, no structured data for debugging | Acceptable in active development only; replace with structured logging before release |
| Hardcoded 100-item search limit with no pagination | Simple implementation, works for small inventories | Users with 500+ items cannot find things beyond the first 100 matches; no way to know results were truncated | Acceptable in MVP; must be addressed before release to users with real inventories |
| `Math.random()` for tote ID generation | Works, produces 6-char IDs | Predictable IDs (not a security concern for single-user, but prevents future multi-user); collision probability increases with scale | Acceptable for personal use; replace if multi-user is ever considered |
| `kemo-archiver` custom fork requiring `require()` | Solved a specific packaging issue | Unmaintained dependency; ESLint suppression hides the import smell; no security updates | Never -- replace with standard `archiver` package or `adm-zip` (already a dependency) before release |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Sharp in Docker Alpine | Missing `vips-dev` runtime dependency causes "libvips not found" at startup | Install `vips-dev` in BOTH build and runtime stages (current Dockerfile does this correctly, but if stages are refactored, easy to lose the runtime install) |
| better-sqlite3 in Docker | Native addon compiled for build architecture does not work on different runtime architecture (e.g., building on ARM Mac, running on x86 server) | Use multi-platform Docker builds (`--platform linux/amd64`) or rebuild native modules in the runtime stage |
| Next.js standalone output with better-sqlite3 | `next build` standalone mode may not include native `.node` addon files in the output | Verify `.next/standalone/node_modules/better-sqlite3/build/Release/better_sqlite3.node` exists after build; add to `serverExternalPackages` in `next.config` |
| SQLite WAL mode in Docker volumes | WAL mode creates `-wal` and `-shm` sidecar files next to the database; if volume mount only maps the `.db` file, sidecar files are lost on container restart, causing data loss | Always mount the entire `data/` directory as a volume, never individual files; current Dockerfile `VOLUME ["/app/data"]` is correct |
| AdmZip with large files | `adm-zip` loads entire ZIP into memory; large exports (many photos) cause OOM | For export, already using streaming `kemo-archiver`; for import, `adm-zip` is acceptable because import files are user-provided and typically smaller than available RAM, but add a file size check before processing |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Dashboard N+1 query for photos | Dashboard slows as item count grows; each recent item triggers subquery for first photo | Current implementation uses correlated subquery which is acceptable; but if dashboard is expanded to show more items or all photos, switch to a single JOIN query | Over 1,000 items with photos |
| Synchronous Sharp thumbnail generation in request handler | Photo upload response time is 2-5 seconds for large images; blocks the single-threaded event loop | Move Sharp processing to a worker thread or process thumbnails after responding with a "processing" status | When users upload multiple photos quickly; when photos are large panoramas |
| `fs.writeFileSync` in request handlers | Blocks event loop during file writes; all other requests queue behind a slow disk write | Replace with `fs.promises.writeFile` (async); the current code already uses `await` elsewhere so the handler is async-compatible | On slow storage (network-attached, SD card, USB drive -- common in self-hosted setups) |
| Reading entire photo buffer into memory for serving | Each photo request loads the full file into a Node.js Buffer | Use `fs.createReadStream()` and pipe to the response; Next.js `NextResponse` supports ReadableStream | When serving multiple concurrent photo requests for large images (>5MB originals) |
| WAL checkpoint on every connection | First request after startup or reconnection runs `PRAGMA wal_checkpoint(TRUNCATE)` which locks the database for the duration | Move checkpoint to a startup hook or scheduled interval; do not run on every `getDb()` call (currently mitigated by singleton pattern, but HMR in dev creates new connections) | During development with frequent HMR reloads; after unclean shutdown with large WAL file |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Settings API accepts arbitrary keys without validation | Attacker (or bug) can write unexpected settings that alter application behavior; no sanitization on values | Whitelist allowed setting keys (`hostname`, `max_upload_size`, `default_fields`, `theme`); validate value types and ranges |
| Photo path reconstruction trusts database-stored paths | If database is corrupted or manually edited, `path.join(DATA_DIR, photo.original_path)` could resolve outside the data directory | Use `path.resolve()` and verify the result starts with the expected directory prefix; strip `../` sequences; use `path.basename()` on both path components |
| No Content-Security-Policy headers on photo responses | Served photos execute in the application origin context | Add `Content-Security-Policy: default-src 'none'` header on all photo/thumbnail responses to prevent any scripts from executing if a file is not actually an image |
| Import accepts any ZIP without size limits | A malicious or accidentally huge ZIP file (hundreds of megabytes) is loaded entirely into memory via `request.formData()` | Add a file size check before processing (`file.size > MAX_IMPORT_SIZE`); set Next.js route segment config `export const maxDuration` and body size limit |
| No CSRF protection on mutating endpoints | Any page the user visits can make POST/PUT/DELETE requests to the API | For self-hosted single-user this is low risk, but adding `SameSite=Strict` cookies and origin checking before release is good practice |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Photo upload gives no progress feedback | User uploads a large photo, sees nothing happening for 5+ seconds, clicks upload again, gets duplicate or error | Show upload progress bar; disable upload button during processing; display thumbnail preview immediately from client-side File API before server processing completes |
| Destructive import with no confirmation or preview | User clicks "import" and all existing data is silently replaced; no undo | Show a preview of what will be imported (counts: "X totes, Y items, Z photos"); require explicit confirmation ("This will replace all existing data"); create automatic backup before import |
| Search truncation without user awareness | Search returns 100 results but user has 500 matching items; no indication that results were truncated | Show "Showing 100 of 347 results" count; add pagination or "load more" button; sort by relevance rather than just `updated_at` |
| No bulk operations for items | User wants to move 20 items from one tote to another; must do it one at a time | Add multi-select with checkbox UI and bulk move/delete actions; this is a table-stakes feature for inventory apps that is often overlooked |
| Item detail page is overwhelming | 1581-line page tries to do everything: view, edit, upload photos, manage metadata, move, copy, delete; modal stacking confuses state | Break into tabbed interface or separate pages; group related actions; use progressive disclosure (advanced actions in a menu, not all visible) |
| No offline capability or graceful degradation | Self-hosted app accessed over local network; WiFi drops and user loses unsaved edits with no warning | At minimum: save form state to localStorage on input; show connection status indicator; queue failed requests for retry |

## "Looks Done But Isn't" Checklist

- [ ] **Photo upload:** Often missing dimension validation -- verify `sharp.metadata()` check for pixel limits exists, not just file size
- [ ] **Search:** Often missing pagination -- verify response includes total count and current page, not just truncated results
- [ ] **Import/export:** Often missing round-trip test -- verify export followed by import on a clean database produces identical data and working photo links
- [ ] **Schema changes:** Often missing migration -- verify adding a new column does not require users to delete their database
- [ ] **Docker deployment:** Often missing volume permissions -- verify data directory is writable by the non-root user (UID 1001) after `docker run`
- [ ] **Error handling:** Often missing user-visible error messages -- verify API 500 errors show a meaningful toast/alert in the UI, not just a console log
- [ ] **Photo deletion:** Often missing filesystem cleanup -- verify deleting a tote with 10 items and 30 photos leaves zero orphaned files in `uploads/` and `thumbnails/`
- [ ] **Settings:** Often missing validation -- verify setting `max_upload_size` to a negative number or a string does not break photo upload
- [ ] **QR codes:** Often missing offline scanning -- verify QR code URL works when hostname setting does not match the actual server address
- [ ] **Movement history:** Often missing in export -- verify item movement history survives an export-import cycle (it is currently exported, but verify)

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Orphaned photo files | LOW | Run a cleanup script that lists files in `uploads/` not referenced by any `item_photos.filename` row; delete after manual review |
| Foreign keys disabled after failed import | LOW | Restart the Node.js process (closes the database connection); on next connection, `PRAGMA foreign_keys = ON` will be set; then run `PRAGMA foreign_key_check` to find violations |
| Data loss from destructive import | HIGH | If no backup exists, data is unrecoverable; if the old export ZIP is available, re-import it; this is why pre-import backup is critical |
| Corrupted database from crash during WAL write | MEDIUM | SQLite WAL recovery is automatic on next open; if recovery fails, restore from most recent export ZIP; implement automated daily database backup (`VACUUM INTO`) |
| Sharp OOM crash in container | LOW | Container restarts automatically if health check is configured; reduce max upload size; add pixel dimension limits; increase container memory limit |
| Schema mismatch after update | MEDIUM | Without migration system: export all data, delete database, restart app (recreates schema), import data; WITH migration system: just restart the app |
| Search returning wrong results due to query builder bug | LOW | Simplify search to single-condition queries until bug is fixed; the fragile splice logic in the search route is the root cause |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Non-atomic photo lifecycle | Photo hardening | Run: delete a tote with photos, verify zero orphan files; upload a photo during simulated disk-full, verify no partial DB record |
| Foreign key disabling in import | Bug fix phase | Run: `PRAGMA foreign_key_check` after import returns zero violations; verify foreign keys are ON in a request immediately after import |
| No migration system | Infrastructure/tooling phase (before any schema change) | Run: start app with a v1 database, verify v2 schema is applied without data loss; check `schema_version` table shows correct version |
| Sharp memory exhaustion | Photo hardening | Upload a 50-megapixel panorama JPEG under 5MB; verify it is rejected or processed without container OOM |
| MIME type trust on serving | Security hardening | Upload a renamed HTML file with `.jpg` extension; verify it is rejected at upload or served with `nosniff` and no script execution |
| Missing database indexes | Performance phase | Run `EXPLAIN QUERY PLAN` on search and dashboard queries; verify "USING INDEX" appears for all JOIN and WHERE conditions |
| Export/import data loss | Import/export hardening | Trigger a failed import (corrupt ZIP); verify original data is still intact from automatic pre-import backup |
| Monolithic item detail page | Code quality/refactoring phase | Component file is under 300 lines; sub-components exist in separate files with individual responsibility |
| Synchronous file I/O in handlers | Performance phase | Verify `fs.promises` or streams are used for all file read/write operations in API routes |
| No structured logging | Release preparation | Verify log output is JSON-formatted with timestamp, level, and request context; verify errors include stack traces |

## Sources

- Codebase analysis: `/Users/kenmoini/Development/tote-sonar/src/` (direct inspection of all API routes, database initialization, Dockerfile)
- Known issues: `/Users/kenmoini/Development/tote-sonar/.planning/codebase/CONCERNS.md` (pre-existing concern documentation)
- SQLite documentation on PRAGMA scope and WAL behavior (training data, MEDIUM confidence)
- Sharp documentation on `limitInputPixels` and memory behavior (training data, MEDIUM confidence)
- Next.js standalone build behavior with native addons (training data, MEDIUM confidence)
- Common patterns observed in self-hosted inventory apps (Homebox, Grocy, Snipe-IT) (training data, LOW confidence -- specific version details may be stale)

---
*Pitfalls research for: Tote Sonar (self-hosted personal inventory/organization app)*
*Researched: 2026-02-28*
