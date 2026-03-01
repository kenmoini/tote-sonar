# Roadmap: Tote Sonar

## Overview

Tote Sonar is a working MVP that needs hardening to become a release-quality v1. The roadmap addresses four delivery boundaries in dependency order: first fix correctness and safety issues in existing features, then add tote photos (the critical missing feature) alongside shared component extraction, then decompose monolithic pages now that they contain their full feature set, and finally optimize for performance at scale. Every phase delivers a coherent, verifiable capability that unblocks the next.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Correctness and Safety** - Fix bugs in search/import/photos and add systematic input validation across all API routes
- [ ] **Phase 2: Tote Photos** - Add photo upload to totes with shared photo components extracted for reuse
- [ ] **Phase 3: Page Decomposition** - Break monolithic page components into focused sub-components with error boundaries
- [ ] **Phase 4: Performance** - Add search pagination, database indexes, and dashboard query optimization

## Phase Details

### Phase 1: Correctness and Safety
**Goal**: All existing features produce correct results and all API inputs are validated before processing
**Depends on**: Nothing (first phase)
**Requirements**: BUGS-01, BUGS-02, BUGS-03, VALID-01, VALID-02, VALID-03, VALID-04
**Success Criteria** (what must be TRUE):
  1. Searching with both name/description text and metadata filters returns the correct matching items (not incorrect SQL results)
  2. A failed import leaves foreign key enforcement enabled for all subsequent requests (no silent corruption)
  3. Deleting an item or tote removes all associated photo files from disk (no orphaned files remain)
  4. Uploading a file with a fake MIME header but wrong magic bytes is rejected before processing
  5. Malformed JSON payloads to any API route return a consistent 400 error response
**Plans**: 2 plans

Plans:
- [ ] 01-01-PLAN.md -- Fix bugs: search SQL, import FK pragma, photo cleanup on delete
- [ ] 01-02-PLAN.md -- Systematic validation: Zod schemas, magic bytes, path safety, JSON error consistency

### Phase 2: Tote Photos
**Goal**: Users can photograph their totes and see cover thumbnails everywhere totes appear, powered by shared photo components reused across items and totes
**Depends on**: Phase 1
**Requirements**: PHOTO-01, PHOTO-02, PHOTO-03, PHOTO-04, PHOTO-05, PHOTO-06, PHOTO-07, QUAL-03, QUAL-04
**Success Criteria** (what must be TRUE):
  1. User can upload up to 3 photos per tote and see them in a gallery on the tote detail page
  2. Tote list views and dashboard show the first uploaded photo as a cover thumbnail
  3. User can delete individual tote photos and deleting a tote removes all its photos from database and filesystem
  4. Export ZIP includes tote photos and importing that ZIP restores them correctly
  5. Both item and tote photo upload/gallery use the same shared components (no duplicated photo UI code)
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md -- Backend: shared photo utility, tote_photos table, tote photo API, update serving/export/import/cascade delete
- [x] 02-02-PLAN.md -- Shared components: extract PhotoGallery/PhotoUpload from item detail page, refactor item page to use them
- [x] 02-03-PLAN.md -- Tote photo UI: wire gallery/upload to tote detail page, cover thumbnails on tote list and dashboard

### Phase 3: Page Decomposition
**Goal**: Monolithic page components are broken into focused, maintainable sub-components and errors are handled gracefully at route boundaries
**Depends on**: Phase 2
**Requirements**: QUAL-01, QUAL-02, QUAL-05
**Success Criteria** (what must be TRUE):
  1. Item detail page is composed of focused sub-components (no single file over 400 lines)
  2. Tote detail page is composed of focused sub-components (no single file over 400 lines)
  3. A runtime error in any route segment shows a user-friendly error boundary instead of a blank page or unhandled crash
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md -- Error boundaries at all route segments + shared formatDate utility
- [ ] 03-02-PLAN.md -- Tote detail page decomposition into 6 focused sub-components
- [ ] 03-03-PLAN.md -- Item detail page decomposition into 7 focused sub-components

### Phase 4: Performance
**Goal**: App handles large inventories without degradation in search, browsing, or dashboard loading
**Depends on**: Phase 1
**Requirements**: PERF-01, PERF-02, PERF-03
**Success Criteria** (what must be TRUE):
  1. Search results are paginated with offset/limit controls and the UI shows total result count (no hard cap at 100)
  2. Database queries on foreign key columns and location/owner filters use indexes (verified via EXPLAIN QUERY PLAN)
  3. Dashboard loads efficiently by querying only what it displays (limited scope, first photo per item/tote)
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Correctness and Safety | 2/2 | Complete | 2026-02-28 |
| 2. Tote Photos | 3/3 | Complete | 2026-02-28 |
| 3. Page Decomposition | 0/3 | Planned | - |
| 4. Performance | 0/0 | Not started | - |
