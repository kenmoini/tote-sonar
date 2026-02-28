# Codebase Concerns

**Analysis Date:** 2026-02-28

## Tech Debt

**Weak Tote ID Generation:**
- Issue: Tote ID generation uses `Math.random()` which is not cryptographically secure
- Files: `src/lib/db.ts` (lines 127-135)
- Impact: IDs are predictable and could theoretically be guessed or brute-forced to discover other users' totes if exposed to multiple parties
- Fix approach: Replace `Math.random()` with `crypto.randomBytes()` for cryptographic randomness, similar to photo ID generation in `src/app/api/items/[id]/photos/route.ts` (line 65)

**Duplicate Tote ID Collision Check:**
- Issue: Collision checking uses synchronous loop that could theoretically generate many IDs if storage grows
- Files: `src/app/api/totes/route.ts` (lines 107-111)
- Impact: Unlikely in practice but collision probability increases as table grows; no collision detection strategy at scale
- Fix approach: Use proper UUID v4 or implement exponential backoff with max retries; add index on tote_id for faster lookups

**Weak File Path Security in Photo Routes:**
- Issue: Photo paths are stored in database and reconstructed with `path.basename()` to prevent traversal, but stored paths should never be trusted input
- Files: `src/app/api/photos/[id]/route.ts` (lines 22), `src/app/api/photos/[id]/thumbnail/route.ts` (line 22)
- Impact: If database is corrupted or compromised, path traversal is still possible; relies on basename safety rather than strict path validation
- Fix approach: Store only filename (not path) in database; validate that reconstructed path stays within upload/thumbnail directories using `path.resolve()` and directory containment checks

**Hard-coded Default Upload Limit:**
- Issue: Default max upload size (5MB) is hard-coded in multiple places and stored in settings
- Files: `src/app/api/items/[id]/photos/route.ts` (line 36), `src/lib/db.ts` (line 119)
- Impact: Changing the default requires database migration; inconsistent defaults if one location is updated
- Fix approach: Define max upload size as constant in `src/lib/db.ts` and always reference it; remove from default settings or keep only for override

**Unsafe JSON Parsing in Move/Duplicate Routes:**
- Issue: Some routes silently ignore JSON parse failures while others handle them with error responses
- Files: `src/app/api/items/[id]/move/route.ts` (line 23), `src/app/api/items/[id]/duplicate/route.ts` (lines 32-48)
- Impact: Inconsistent error handling; move route doesn't catch `request.json()` errors, could crash; duplicate route silently defaults to same tote
- Fix approach: Standardize JSON parsing with try-catch and explicit error handling in all routes

---

## Known Bugs

**Import Transaction Foreign Key Re-enable Not Guaranteed:**
- Symptoms: If import transaction fails after disabling foreign keys, they remain disabled for that database session
- Files: `src/app/api/import/route.ts` (lines 121-256)
- Trigger: Unhandled error during import (e.g., disk full, malformed data) that escapes try-catch at line 257
- Workaround: Database will re-enable foreign keys on next connection; graceful for multi-process but dangerous in single-process dev

**Photo Files Can Become Orphaned After DB Deletion:**
- Symptoms: Delete item/tote, then database query for photos fails; files remain on disk
- Files: `src/app/api/items/[id]/route.ts` (lines 187-200), `src/app/api/totes/[id]/route.ts` (lines 251-264)
- Trigger: File deletion fails silently (permissions, concurrent access) or database record deleted but file deletion throws unhandled error
- Workaround: None; requires manual disk cleanup; database record is already deleted via CASCADE

**Search Metadata Condition Construction Error:**
- Symptoms: Complex metadata search condition may build incorrect SQL when both name/description and metadata filters are used
- Files: `src/app/api/search/route.ts` (lines 48-59)
- Trigger: Query with both search term AND metadata key filter; condition splice logic (line 57) may insert at wrong index if conditions array structure changes
- Workaround: Use only name search OR metadata filter, not both; logic is fragile

---

## Security Considerations

**Missing Input Validation on Some User Inputs:**
- Risk: Settings API accepts arbitrary key-value pairs without validation
- Files: `src/app/api/settings/route.ts` (lines 31-55)
- Current mitigation: Settings are only read back on client; no code execution on setting values
- Recommendations: Whitelist allowed setting keys; validate max_upload_size is numeric and within reasonable bounds; sanitize hostname setting

**No Rate Limiting on Upload Endpoint:**
- Risk: Users can upload unlimited photos or repeatedly upload large files
- Files: `src/app/api/items/[id]/photos/route.ts` (lines 13-117)
- Current mitigation: Hard limit of 3 photos per item; max 5MB default size
- Recommendations: Add per-IP rate limiting; log upload attempts; consider per-user upload quotas

**No Authentication/Authorization:**
- Risk: All endpoints are public; anyone with network access can read/modify/delete all totes and items
- Files: All files in `src/app/api/`
- Current mitigation: None
- Recommendations: Implement authentication (session/JWT) before production use; add role-based access control; consider encrypted local-only mode for single-user

**Unvalidated Photo MIME Type Storage:**
- Risk: MIME type from File object (browser-controlled) is stored and served back as Content-Type header
- Files: `src/app/api/items/[id]/photos/route.ts` (line 100), `src/app/api/photos/[id]/route.ts` (line 30)
- Current mitigation: MIME type validation only checks whitelist of allowed types on upload; browser can lie
- Recommendations: Re-validate MIME type when serving; use file magic bytes to confirm actual file type

**Export Contains All Data Without Access Control:**
- Risk: Full database export including all totes/items available to anyone
- Files: `src/app/api/export/route.ts` (lines 8-40)
- Current mitigation: No selective export; all or nothing
- Recommendations: Add per-user data segregation; consider encryption in export file; require authentication

---

## Performance Bottlenecks

**Search Limited to 100 Results Hard-Coded:**
- Problem: Search results are truncated at 100 items with no pagination
- Files: `src/app/api/search/route.ts` (line 69)
- Cause: Fixed LIMIT 100 with no offset/pagination parameters
- Improvement path: Implement pagination (LIMIT + OFFSET); expose page size as query param; add total count in response

**Dashboard Query Fetches All Item Photos:**
- Problem: Dashboard may load slowly if many items with many photos
- Files: `src/app/api/dashboard/route.ts` (likely fetching all items; not fully reviewed)
- Cause: No limit on scope of items/photos loaded for recent items display
- Improvement path: Fetch only recent N items; fetch only first photo per item; implement lazy loading

**Photo Generation Creates Both Original and Thumbnail Sequentially:**
- Problem: Sharp image processing blocks request while generating thumbnail
- Files: `src/app/api/items/[id]/photos/route.ts` (lines 79-87)
- Cause: Synchronous sharp operations in request handler
- Improvement path: Queue thumbnail generation as background job; store original immediately; notify client when thumbnail ready

**Database WAL Checkpoint on Every Connection:**
- Problem: Every new database connection runs WAL checkpoint which can lock database
- Files: `src/lib/db.ts` (lines 28-32)
- Cause: WAL checkpoint called to recover from crashes; appropriate for reliability but may cause latency spikes
- Improvement path: Checkpoint only on startup; add configurable checkpoint interval; monitor lock contention

**Full Table Scan in Import for Photo File Extraction:**
- Problem: Import iterates all zip entries multiple times (once for uploads, once for thumbnails)
- Files: `src/app/api/import/route.ts` (lines 280-295)
- Cause: Zip entries iterated twice with string matching; no batching
- Improvement path: Single pass through zip entries with type-based routing; pre-allocate file write buffers

---

## Fragile Areas

**Item Detail Page Component:**
- Files: `src/app/totes/[id]/items/[itemId]/page.tsx` (1581 lines)
- Why fragile: Monolithic component with 40+ state variables managing forms, modals, uploads, metadata, movement, copying; complex conditional rendering
- Safe modification: Refactor into sub-components (ItemForm, PhotoUpload, MetadataManager, MoveModal, CopyModal); extract state management logic; add comprehensive error boundaries
- Test coverage: Needs unit tests for each modal flow; integration tests for item update/delete/move interactions; photo upload error handling

**Import/Export Transaction Logic:**
- Files: `src/app/api/import/route.ts` (318 lines), `src/app/api/export/route.ts` (105 lines)
- Why fragile: Import disables foreign keys during transaction; if any operation fails, state is inconsistent; export has no error recovery for archive streaming
- Safe modification: Wrap entire import in try-finally to re-enable foreign keys; add rollback on error; test with corrupted ZIP files; add pre-import validation
- Test coverage: Test import with missing tables; test with constraint violations; test ZIP file with missing entries; test disk full scenarios

**Search Query Builder:**
- Files: `src/app/api/search/route.ts` (97 lines)
- Why fragile: Manual conditions array and params array splicing (line 57); easy to lose sync between conditions and params; metadata search logic is complex
- Safe modification: Use parameterized query builder library; refactor to build objects that validate structure; add unit tests for SQL output
- Test coverage: Test search with all filter combinations; test with special characters in search terms; test empty results; test boundary cases (name vs metadata)

**Photo File Cleanup on Cascade Delete:**
- Files: `src/app/api/items/[id]/route.ts` (lines 187-200), `src/app/api/totes/[id]/route.ts` (lines 251-264), `src/app/api/items/[id]/photos/route.ts` (implied)
- Why fragile: Database and filesystem operations are not atomic; file deletion errors are silently ignored; photos can be orphaned
- Safe modification: Implement transactional file cleanup using a cleanup queue; add background job to detect orphaned files; log all file deletion errors; test failure scenarios
- Test coverage: Test item delete with missing photo files; test tote delete with permission errors; test concurrent deletes; verify no orphaned files remain

---

## Scaling Limits

**SQLite Single-Writer Limit:**
- Current capacity: Single concurrent write due to WAL mode locking
- Limit: Application will become unresponsive under heavy concurrent write load (multiple uploads, edits, deletes simultaneously)
- Scaling path: Consider PostgreSQL or MySQL for multi-user deployments; add connection pooling; implement queue for write operations

**In-Memory Database Connection Singleton:**
- Current capacity: Single global database connection per Node process
- Limit: All requests share one connection; statement queue will grow under load; no connection pooling
- Scaling path: Implement connection pool; consider dedicated database server; add metrics for connection queue depth

**Local File Storage for Photos:**
- Current capacity: Limited by disk space and file descriptor limits
- Limit: Cannot scale beyond single machine; no backup strategy; photo files not replicated
- Scaling path: Move to cloud storage (S3, GCS, Azure Blob); implement backup policy; add CDN for photo delivery

**Fixed 100-Item Search Result Limit:**
- Current capacity: 100 items per search query
- Limit: Large inventory (10k+ items) cannot be fully searched; must use exact filters to narrow results
- Scaling path: Implement pagination; add search result refinement; consider full-text search engine (Meilisearch, Elasticsearch)

**No Database Indexes Beyond Primary Keys:**
- Current capacity: Acceptable for <10k items
- Limit: Queries on tote_location, owner, metadata_key will full-table scan
- Scaling path: Add indexes on frequently filtered columns; add composite indexes for common search patterns

---

## Dependencies at Risk

**kemo-archiver Package:**
- Risk: Custom/fork of archiver library; may not receive security updates; require import suppression
- Files: `src/app/api/export/route.ts` (line 4 - eslint-disable for require)
- Impact: ZIP export fails or corrupts if package has bugs; security issues in compression won't be patched
- Migration plan: Switch to community-maintained `archiver` package; remove require suppression; use import instead

**No Version Locking on Non-Pinned Dependencies:**
- Risk: package.json uses `^` caret ranges (e.g., `^16.0.0` for Next.js); minor version updates could introduce breaking changes
- Files: `package.json` (all dependencies)
- Impact: Unexpected behavior after install; builds may fail silently
- Migration plan: Evaluate each dependency update before upgrading; consider using `yarn --exact` or npm lockfile only; add test coverage to catch regressions

**better-sqlite3 Requires Native Compilation:**
- Risk: Requires build tools; may fail in CI/CD or different architectures
- Files: `src/lib/db.ts` (import), `package.json` (dependency)
- Impact: Deployment fails on platforms without build tools; Docker builds must include compiler
- Migration plan: Use pre-built binaries or Docker base images with build tools; consider SQL.js (pure JS) for browser support

---

## Test Coverage Gaps

**Untested Area: Photo Upload Validation:**
- What's not tested: File type validation, file size validation, MIME type handling, corrupt file handling
- Files: `src/app/api/items/[id]/photos/route.ts` (lines 46-61)
- Risk: Invalid files could cause crashes; malformed images could break thumbnail generation
- Priority: **High** - directly handles user input

**Untested Area: Import/Export Data Integrity:**
- What's not tested: Round-trip export->import preserves all data; ZIP file corruption handling; partial import failure scenarios
- Files: `src/app/api/export/route.ts`, `src/app/api/import/route.ts`
- Risk: Data loss on export/import cycle; corrupted backups not detected
- Priority: **High** - core backup functionality

**Untested Area: Database Schema Validation:**
- What's not tested: Schema check endpoint accuracy; missing table handling; schema version migration
- Files: `src/app/api/schema-check/route.ts` (not fully reviewed)
- Risk: Schema mismatches not detected; migrations could fail silently
- Priority: **Medium** - affects data consistency

**Untested Area: Search Query Generation:**
- What's not tested: SQL injection resistance; complex filter combinations; special characters in search terms
- Files: `src/app/api/search/route.ts` (lines 6-97)
- Risk: Malformed queries could expose data or cause crashes
- Priority: **High** - public search endpoint

**Untested Area: Concurrent Operations:**
- What's not tested: Simultaneous photo uploads to same item; concurrent item edits; concurrent exports
- Files: All API routes
- Risk: Race conditions, data corruption, WAL lock contention
- Priority: **High** - multi-user scenarios

**Untested Area: Error Recovery:**
- What's not tested: Handling of corrupted database; recovery from disk full; permission denied on file operations
- Files: All API routes and `src/lib/db.ts`
- Risk: Silent failures, orphaned data, inconsistent state
- Priority: **Medium** - operational resilience

---

*Concerns audit: 2026-02-28*
