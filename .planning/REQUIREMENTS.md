# Requirements: Tote Sonar

**Defined:** 2026-02-28
**Core Value:** Users can quickly find what's in any tote without opening it — search, browse, or scan a QR code to see contents and photos.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Tote Photos

- [ ] **PHOTO-01**: User can upload multiple photos per tote (same pattern as item photos, max 3)
- [ ] **PHOTO-02**: Tote list views display the first uploaded photo as a cover thumbnail
- [ ] **PHOTO-03**: Dashboard displays tote cover thumbnails alongside recent items
- [ ] **PHOTO-04**: User can delete individual tote photos
- [ ] **PHOTO-05**: Deleting a tote cascades to remove tote photos from database and filesystem
- [ ] **PHOTO-06**: Export includes tote photos in ZIP archive
- [ ] **PHOTO-07**: Import restores tote photos from ZIP archive

### Bug Fixes

- [ ] **BUGS-01**: Search with both name/description and metadata filters produces correct SQL
- [ ] **BUGS-02**: Import failure re-enables foreign keys regardless of error state
- [ ] **BUGS-03**: Photo file deletion failures are handled gracefully (no orphaned files on item/tote delete)

### Input Validation

- [ ] **VALID-01**: All API routes validate input with Zod schemas before processing
- [ ] **VALID-02**: Photo uploads verify file type via magic bytes, not just MIME header
- [ ] **VALID-03**: Uploaded filenames are sanitized to prevent path traversal
- [ ] **VALID-04**: JSON parse errors return consistent 400 responses across all routes

### Performance

- [ ] **PERF-01**: Search supports pagination with offset/limit parameters (no 100-result hard cap)
- [ ] **PERF-02**: Database has indexes on foreign key columns and frequently filtered columns (location, owner)
- [ ] **PERF-03**: Dashboard queries are optimized (limited scope, first photo only per item)

### Code Quality

- [ ] **QUAL-01**: Item detail page decomposed from monolithic component into focused sub-components
- [ ] **QUAL-02**: Tote detail page decomposed into focused sub-components
- [ ] **QUAL-03**: Shared PhotoUpload component extracted and reused for both items and totes
- [ ] **QUAL-04**: Shared PhotoGallery component extracted and reused for both items and totes
- [ ] **QUAL-05**: Error boundaries (error.tsx) added at app root and critical route segments

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Hardening

- **HARD-01**: Settings API whitelist for allowed keys with type validation
- **HARD-02**: Security headers (X-Content-Type-Options: nosniff, CSP)
- **HARD-03**: Tote ID generation uses crypto.randomBytes instead of Math.random
- **HARD-04**: Background thumbnail processing (async after upload response)

### Features

- **FEAT-01**: Orphaned file cleanup utility in settings page
- **FEAT-02**: Dashboard data quality nudges (items without photos, empty totes)
- **FEAT-03**: Tags/categories for totes beyond location/owner
- **FEAT-04**: Photo reorder / set-as-cover for tote and item photos

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Authentication/authorization | Personal use only — not needed for v1 |
| Multi-user support | Single-user deployment |
| Cloud photo storage (S3/GCS) | Defeats self-hosted value proposition |
| Real-time sync | Single instance, accessed via web URL from any device |
| Mobile native app | Responsive web UI is sufficient |
| Container nesting/hierarchy | High complexity, niche use case — defer to v2+ |
| AI-powered item recognition | Cloud dependency, poor accuracy for household items |
| Barcode/UPC scanning | Requires cloud database API, many items lack barcodes |
| Unlimited photos per item/tote | Storage/performance concerns, 3 is sufficient |
| Full-text search engine | SQLite LIKE is sufficient for personal scale |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PHOTO-01 | — | Pending |
| PHOTO-02 | — | Pending |
| PHOTO-03 | — | Pending |
| PHOTO-04 | — | Pending |
| PHOTO-05 | — | Pending |
| PHOTO-06 | — | Pending |
| PHOTO-07 | — | Pending |
| BUGS-01 | — | Pending |
| BUGS-02 | — | Pending |
| BUGS-03 | — | Pending |
| VALID-01 | — | Pending |
| VALID-02 | — | Pending |
| VALID-03 | — | Pending |
| VALID-04 | — | Pending |
| PERF-01 | — | Pending |
| PERF-02 | — | Pending |
| PERF-03 | — | Pending |
| QUAL-01 | — | Pending |
| QUAL-02 | — | Pending |
| QUAL-03 | — | Pending |
| QUAL-04 | — | Pending |
| QUAL-05 | — | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 0
- Unmapped: 22

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-02-28 after initial definition*
