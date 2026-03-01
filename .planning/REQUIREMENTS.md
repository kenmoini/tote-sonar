# Requirements: Tote Sonar

**Defined:** 2026-02-28
**Core Value:** Users can quickly find what's in any tote without opening it — search, browse, or scan a QR code to see contents and photos.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Tote Photos

- [x] **PHOTO-01**: User can upload multiple photos per tote (same pattern as item photos, max 3)
- [ ] **PHOTO-02**: Tote list views display the first uploaded photo as a cover thumbnail
- [ ] **PHOTO-03**: Dashboard displays tote cover thumbnails alongside recent items
- [x] **PHOTO-04**: User can delete individual tote photos
- [x] **PHOTO-05**: Deleting a tote cascades to remove tote photos from database and filesystem
- [x] **PHOTO-06**: Export includes tote photos in ZIP archive
- [x] **PHOTO-07**: Import restores tote photos from ZIP archive

### Bug Fixes

- [x] **BUGS-01**: Search with both name/description and metadata filters produces correct SQL
- [x] **BUGS-02**: Import failure re-enables foreign keys regardless of error state
- [x] **BUGS-03**: Photo file deletion failures are handled gracefully (no orphaned files on item/tote delete)

### Input Validation

- [x] **VALID-01**: All API routes validate input with Zod schemas before processing
- [x] **VALID-02**: Photo uploads verify file type via magic bytes, not just MIME header
- [x] **VALID-03**: Uploaded filenames are sanitized to prevent path traversal
- [x] **VALID-04**: JSON parse errors return consistent 400 responses across all routes

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
| BUGS-01 | Phase 1 | Complete |
| BUGS-02 | Phase 1 | Complete |
| BUGS-03 | Phase 1 | Complete |
| VALID-01 | Phase 1 | Complete |
| VALID-02 | Phase 1 | Complete |
| VALID-03 | Phase 1 | Complete |
| VALID-04 | Phase 1 | Complete |
| PHOTO-01 | Phase 2 | Complete |
| PHOTO-02 | Phase 2 | Pending |
| PHOTO-03 | Phase 2 | Pending |
| PHOTO-04 | Phase 2 | Complete |
| PHOTO-05 | Phase 2 | Complete |
| PHOTO-06 | Phase 2 | Complete |
| PHOTO-07 | Phase 2 | Complete |
| QUAL-03 | Phase 2 | Pending |
| QUAL-04 | Phase 2 | Pending |
| QUAL-01 | Phase 3 | Pending |
| QUAL-02 | Phase 3 | Pending |
| QUAL-05 | Phase 3 | Pending |
| PERF-01 | Phase 4 | Pending |
| PERF-02 | Phase 4 | Pending |
| PERF-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-02-28 after roadmap creation*
