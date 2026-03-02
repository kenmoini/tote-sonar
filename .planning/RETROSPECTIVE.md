# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-02
**Phases:** 5 | **Plans:** 11 | **Tasks:** 24

### What Was Built
- Bug fixes for search SQL, import FK safety, and photo cleanup on delete
- Zod validation with magic bytes verification across all 11 API routes
- Complete tote photo system with shared PhotoGallery/PhotoUpload components
- Page decomposition: item detail (1581 → 194 lines), tote detail (1168 → 199 lines) into 13 sub-components
- Error boundaries at all route segments with shared ErrorDisplay
- Search pagination with offset/limit, 12 database indexes, optimized dashboard
- Tech debt cleanup: shared utility consolidation, import UI display fix

### What Worked
- Dependency-ordered phases: fixing bugs before adding features prevented propagating issues into tote photos
- Extracting shared photo components during the tote photos phase (natural extraction point) — resulted in zero duplicated photo UI code
- The audit → gap closure loop: milestone audit identified 3 tech debt items, Phase 5 closed all of them cleanly
- Verification reports catching specific wiring issues (e.g., import UI missing tote_photos count) that could have been missed
- Sub-component decomposition with `_components/` pattern — clean separation without over-abstracting

### What Was Inefficient
- Phase 1 created inline deletePhotoFiles code that Phase 2 then extracted to a shared utility — if the shared utility had been created first, the inline code wouldn't have been needed
- Multiple audit passes (3 audits total) — first audit at Phase 2 completion was premature, should have waited for all phases
- SUMMARY.md frontmatter `one_liner` field not populated, making automated accomplishment extraction fail

### Patterns Established
- `parseJsonBody` + `validateBody` two-step validation pattern for all JSON API routes
- `?source=tote` query param to reuse existing photo serving routes for different photo tables
- `_components/` directory pattern for page-local sub-components (not shared globally)
- Error boundary with shared `ErrorDisplay` component and `reset` callback pattern
- `formatDate` / `formatDateShort` shared utility for consistent date formatting
- Database indexes in separate `database.exec()` block after schema creation
- Pagination as additive fields to existing response types (non-breaking)

### Key Lessons
1. Fix existing bugs before adding new features — dependency ordering pays off
2. Extract shared components at the natural point where duplication would occur, not before
3. Run milestone audit once, after all phases are complete — intermediate audits waste context
4. Populate all SUMMARY.md frontmatter fields (including one_liner) for downstream tooling

### Cost Observations
- Model mix: ~60% sonnet (execution, verification), ~30% sonnet (research, planning), ~10% haiku (quick checks)
- Sessions: ~6 sessions across 3 days
- Notable: Plans averaged ~4 minutes each with 2-3 tasks per plan — very efficient execution

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~6 | 5 | First milestone — established patterns |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 0 (manual) | N/A | 2 (Zod v4, no others) |

### Top Lessons (Verified Across Milestones)

1. Dependency-ordered phases prevent bug propagation to new features
2. Shared component extraction is best done at the natural duplication point
