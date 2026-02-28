# Codebase Concerns

**Analysis Date:** 2026-02-28

## Tech Debt

**Bloated UI Components:**
- Issue: Single-file UI components exceed 1500 lines with multiple concerns (state management, form handling, modals, sorting, deletion) mixed together
- Files: `src/app/totes/[id]/items/[itemId]/page.tsx` (1581 lines), `src/app/totes/[id]/page.tsx` (1121 lines)
- Impact: Difficult to test, maintain, and debug. High cognitive complexity. Risk of introducing bugs during modifications. Component reloading slow during development.
- Fix approach: Extract modal dialogs into separate components (DeleteConfirm, EditForm, AddItemForm), extract form logic into custom hooks (useFormValidation, usePhotoUpload), create shared state management for UI state (open/close states), separate concerns into smaller files (~300 lines max each)

**No Automated Testing:**
- Issue: No test files present in codebase
- Files: All files in `src/`
- Impact: Changes risk breaking existing functionality undetected. No confidence for refactoring. No documentation of expected behavior through tests. Regression bugs likely to be discovered in production.
- Fix approach: Establish testing framework (Jest/Vitest), start with critical path tests (API routes for CRUD operations, search/import/export), add component tests for complex UI components

**Insufficient Error Handling in Import/Export:**
- Issue: Import route clears all existing data before transaction starts. If ZIP extraction fails mid-way, database is cleared but photos may not be restored
- Files: `src/app/api/import/route.ts` (lines 265-277)
- Impact: Data loss risk if import fails during file extraction phase. Photos cleared before validation complete.
- Fix approach: Validate entire ZIP and extract files to temporary directory before touching database. Only clear old data after new data is fully validated and prepared.

**Missing Rollback on Partial Import Failure:**
- Issue: File extraction happens AFTER transaction (lines 279-295), outside database transaction atomicity. Files may be written but DB import fails, or vice versa.
- Files: `src/app/api/import/route.ts` (lines 258-295)
- Impact: Inconsistent state between database and filesystem. Photos referenced in DB may not exist on disk, or vice versa.
- Fix approach: Include file extraction in transaction scope or implement two-phase commit pattern with cleanup handlers

**Unvalidated Archive Entry Names:**
- Issue: `path.basename()` is used to extract filenames from ZIP, which provides basic protection but entries could potentially have path traversal attempts
- Files: `src/app/api/import/route.ts` (lines 285, 290)
- Impact: Theoretical path traversal vulnerability if malicious ZIP contains entries like `uploads/../../../evil.jpg`. Though mitigated by basename(), explicit validation recommended.
- Fix approach: Validate extracted filenames match expected pattern (alphanumeric with safe extensions), reject any entries with parent directory references or unusual characters

## Known Bugs

**Object URL Memory Leak on Modal Close:**
- Symptoms: Blob URLs created via `URL.createObjectURL()` may accumulate in memory if modal dismissed without cleanup
- Files: `src/app/totes/[id]/page.tsx` (lines 277, 936-937), `src/app/import-export/page.tsx` (lines 56, 72)
- Trigger: Upload photo -> dismiss modal without submitting -> repeat multiple times
- Workaround: Currently code does revoke URLs in form reset and cleanup, but dependency tracking in useEffect could miss edge cases if modal unmounts abnormally
- Fix approach: Add useEffect cleanup handler for all preview URLs, ensure revocation in modal overlay click handler

**Toast Timer Doesn't Persist Across Route Changes:**
- Symptoms: Toast notification may disappear if user navigates away while toast is showing (4-second timer continues)
- Files: `src/app/totes/[id]/page.tsx` (line 110), multiple other pages
- Trigger: Submit form, immediately navigate without waiting for toast
- Impact: User misses success/error message. Low severity but poor UX.
- Fix approach: Clear toast timeout on component unmount, or use global toast service

**Metadata Search Query Fragility:**
- Symptoms: Complex metadata search construction modifies conditions array mid-operation, parameterization order can become confused
- Files: `src/app/api/search/route.ts` (lines 48-59)
- Trigger: Search with query + metadata_key filter simultaneously
- Impact: Search results may be incomplete or incorrect when multiple filters are combined
- Fix approach: Refactor to build SQL conditions more clearly, use parameterized named placeholders or array-based approach that's easier to track

## Security Considerations

**Type Safety Gaps in API Route Parameters:**
- Risk: Route parameters assumed to be strings without runtime validation in some endpoints. Type assertions cast unknown values.
- Files: `src/app/api/items/[id]/photos/route.ts` (line 19 `Number(id)`), multiple routes assume numeric IDs
- Current mitigation: Some routes validate format (e.g., `src/app/api/totes/[id]/route.ts` lines 15-24), others don't
- Recommendations: Create shared validation middleware for all numeric ID parameters. Validate before casting with Number(). Add 'use strict' or stricter TypeScript settings.

**Settings SQL Injection Risk:**
- Risk: Setting keys read from query params without type checking in some places
- Files: `src/app/api/settings/route.ts`, `src/app/api/items/[id]/photos/route.ts` (line 35)
- Current mitigation: Prepared statements used for queries, but key names should be validated against whitelist
- Recommendations: Create constants for valid setting keys, validate against whitelist before database access

**File Upload MIME Type Spoofing:**
- Risk: File type validation relies on `file.type` which is provided by client and can be spoofed
- Files: `src/app/api/items/[id]/photos/route.ts` (line 47), `src/app/totes/[id]/page.tsx` (line 261)
- Current mitigation: File is written to disk and processed by sharp, which validates magic bytes for thumbnails
- Recommendations: Add magic byte verification before saving files. Use file-type library to validate actual file content, not just MIME type

**Path Traversal in Photo Retrieval:**
- Risk: Photo ID used directly in file path without validation
- Files: `src/app/api/photos/[id]/route.ts`, `src/app/api/photos/[id]/thumbnail/route.ts`
- Current mitigation: Checking database for photo record before serving should prevent direct path access
- Recommendations: Verify full path is within allowed directories, never allow symlinks

## Performance Bottlenecks

**Export Loads Entire Database Into Memory:**
- Problem: All tables loaded with `SELECT *` and JSON stringified before streaming
- Files: `src/app/api/export/route.ts` (lines 13-19, 66)
- Cause: No pagination or streaming of large result sets
- Improvement path: Stream export file generation, fetch data in chunks, write directly to archive without intermediate JSON object. Use database query streaming if supported.
- Scalability limit: Expected to fail or be very slow with >100k items or >1GB of photos

**Search Queries Use Multiple Subqueries for Metadata:**
- Problem: Metadata filtering uses nested SELECT for each filter condition
- Files: `src/app/api/search/route.ts` (lines 43, 55)
- Cause: IN (SELECT...) pattern repeated for metadata checks
- Improvement path: Use single JOIN to item_metadata with GROUP BY or use FTS (Full Text Search) index for better performance
- Scalability limit: Search may slow down significantly with 10k+ items and complex metadata

**Dashboard Loads All Recently Added Items:**
- Problem: Fetches "most recently added items" without limit in some scenarios
- Files: `src/app/api/dashboard/route.ts` (lines 23-25)
- Impact: Loading all recent items, then sorting in memory
- Improvement path: Add LIMIT clause, use indexed queries, implement pagination

**Full Table Scans on Settings Queries:**
- Problem: Settings loaded with `SELECT *` or entire settings table each time
- Files: `src/app/api/settings/route.ts` (lines 8, 58)
- Impact: Adds overhead for every settings read. Should be cached.
- Improvement path: Cache settings in-memory singleton, invalidate on updates

## Fragile Areas

**Import Transaction Assumes Clean State:**
- Files: `src/app/api/import/route.ts` (lines 121-260)
- Why fragile: Transaction disables foreign keys temporarily (line 123), relies on correct order of DELETE statements (lines 127-133). If schema changes, deletion order becomes critical and easy to break. No cascade validation.
- Safe modification: Document exact deletion order as schema constraint, add schema migration tests, consider soft-delete pattern instead
- Test coverage: No tests for import rollback scenario or partial failure

**Tote ID Generation Using Weak Randomness:**
- Files: `src/lib/db.ts` (lines 128-135)
- Why fragile: Simple Math.random() approach for ID generation. While IDs are 6-char alphanumeric (36^6 = 2.1B combinations), no collision detection or retry logic
- Safe modification: Add uniqueness check and retry loop, consider UUID or cryptographically stronger randomness
- Test coverage: No collision tests

**Photo Thumbnail Generation Failure Silent:**
- Files: `src/app/api/items/[id]/photos/route.ts` (lines 84-87)
- Why fragile: If sharp fails during thumbnail generation (corrupted image, unsupported format), original file already written to disk. Error handling doesn't clean up partial files.
- Safe modification: Generate thumbnail first or in temporary location, validate before committing original file
- Test coverage: No error case tests for corrupted images

**Metadata Search Parameter Order Fragile:**
- Files: `src/app/api/search/route.ts` (lines 48-59)
- Why fragile: Complex manipulation of conditions array and params array with splice() operations. Adding new filters could break parameter ordering
- Safe modification: Use object-based condition builder pattern instead of arrays
- Test coverage: No tests for complex filter combinations

**Event Listener Cleanup Incomplete in Large Components:**
- Files: `src/app/totes/[id]/page.tsx` (lines 223-254), similar in other pages
- Why fragile: Multiple useEffect hooks add/remove event listeners. If dependency array is incorrect or component unmounts unexpectedly, listeners could remain attached
- Safe modification: Consolidate event listener logic, extract to custom hook, ensure all cleanup functions properly registered
- Test coverage: No cleanup verification tests

## Scaling Limits

**SQLite Single-File Database:**
- Current capacity: File-based SQLite adequate for single-user/small team. WAL mode handles concurrent writes better.
- Limit: Degradation expected with >1 million items or sustained concurrent access from many users. Single writer bottleneck.
- Scaling path: Migrate to PostgreSQL/MySQL if multi-user concurrent writes needed. Consider read replicas. Implement connection pooling.

**File System Storage for Photos:**
- Current capacity: All photos stored as individual files on disk. Works fine for <10k photos.
- Limit: Directory operations slow down with large numbers of files. No deduplication. Manual cleanup needed for orphaned files.
- Scaling path: Migrate to blob storage (S3, Cloud Storage), implement object deduplication by hash, add cleanup job for orphaned files

**In-Memory QR Code Generation:**
- Current capacity: QR codes generated per-request, cached only in HTTP response
- Limit: No caching, re-generates for every view
- Scaling path: Cache rendered QR codes, use CDN, generate at write-time instead of read-time

**Export Archive Held in Memory:**
- Current capacity: Works for typical databases (<100MB)
- Limit: Large databases will exhaust Node.js heap memory during export
- Scaling path: Stream archive to disk first, then serve; implement incremental export chunks

## Dependencies at Risk

**better-sqlite3 Native Binding:**
- Risk: Requires compilation at install time. Version compatibility with Node.js/OS matters. Breaking changes in major versions.
- Current: ^12.0.0
- Impact: Build failures on new OS/Node versions, difficult upgrades
- Migration plan: Monitor for updates, test major version upgrades in CI before deploying. Consider migration to pure-JS SQLite library (sql.js) if native binding becomes problematic

**sharp Image Processing:**
- Risk: Complex native dependency. HEIC/AVIF support varies by OS. Breaking API changes.
- Current: ^0.34.0
- Impact: Image processing failures on some systems, thumbnail generation hangs
- Migration plan: Add timeout for sharp operations, implement fallback image server, test with variety of image formats in CI

**kemo-archiver Custom Package:**
- Risk: Custom archiver package with fewer users and less maintenance than industry-standard archiver library
- Current: ^7.0.0
- Impact: Bugs may not be discovered, no security patches guaranteed, limited community support
- Migration plan: Consider switching to npm `archiver` package (more popular), verify export/import still works

## Missing Critical Features

**No Audit Logging:**
- Problem: No record of who did what when. Import/export happens silently. Item modifications don't track who changed it.
- Blocks: Compliance requirements, security investigation, undo functionality
- Solution: Add audit table with user ID (once auth added), action type, timestamp, before/after snapshots

**No Concurrent User Session Management:**
- Problem: If multiple users/tabs access same tote, last-write-wins on updates. No locking, no conflict resolution.
- Blocks: Multi-user collaboration, data consistency
- Solution: Add optimistic locking with version numbers, or pessimistic locking with transaction coordination

**No Data Validation on Import:**
- Problem: Foreign keys disabled during import (line 123), so invalid references could be imported
- Blocks: Data integrity, referential consistency
- Solution: Add pre-import validation that checks all FKs resolve before committing

**No Rate Limiting on API:**
- Problem: No throttling on API endpoints. Bulk operations (import) unbounded.
- Blocks: DOS protection, fair resource usage
- Solution: Implement rate limiting middleware per endpoint, especially import/export/upload

## Test Coverage Gaps

**API Route Error Handling Not Tested:**
- What's not tested: What happens when database connection fails mid-transaction, when file system is full, when uploaded file is corrupted
- Files: All files in `src/app/api/**/*.ts`
- Risk: Error paths untested, unhandled exceptions could crash server, error messages to users may not be informative
- Priority: High - critical paths (CRUD, import/export) should have error case tests

**Import/Export Round-trip Integrity:**
- What's not tested: Export data, modify database, re-import, verify data identical. Partial file corruption scenarios. Large dataset export.
- Files: `src/app/api/export/route.ts`, `src/app/api/import/route.ts`
- Risk: Data corruption undetected until customer tries to use exported backup. File extraction failures silent.
- Priority: High - data integrity is critical

**UI Component State Transitions:**
- What's not tested: Modal dialogs, form validation, async operation sequences (upload then submit form)
- Files: `src/app/totes/[id]/page.tsx`, `src/app/totes/[id]/items/[itemId]/page.tsx`
- Risk: UI bugs, broken workflows, race conditions in async operations
- Priority: Medium - affects user experience

**Search Query Combinations:**
- What's not tested: Different combinations of search filters (metadata + owner + location), boundary conditions (empty results, special characters), SQL injection attempts
- Files: `src/app/api/search/route.ts`
- Risk: Incorrect results, potential injection vulnerabilities
- Priority: Medium - search accuracy critical for usability

**Database Transaction Rollback Scenarios:**
- What's not tested: What happens when transaction fails mid-way, constraint violations, locking scenarios
- Files: `src/lib/db.ts`, all API routes with transactions
- Risk: Data inconsistency, orphaned records
- Priority: High - affects data integrity

---

*Concerns audit: 2026-02-28*
