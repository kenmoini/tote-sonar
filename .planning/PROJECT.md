# Tote Sonar

## What This Is

A personal organization tool for tracking the contents of boxes, bins, and totes. Users can catalog items with photos and metadata, search across all containers, generate QR labels for physical totes, and import/export their inventory. Built as a Next.js full-stack app with SQLite for single-user, self-hosted use.

## Core Value

Users can quickly find what's in any tote without opening it — search, browse, or scan a QR code to see contents and photos.

## Requirements

### Validated

- ✓ Tote CRUD with name, location, size, color, owner — v1.0
- ✓ Unique 6-character tote IDs — v1.0
- ✓ Item CRUD linked to totes with name, description, quantity — v1.0
- ✓ Item metadata (key-value pairs) with autocomplete keys — v1.0
- ✓ Item photo upload with auto-generated thumbnails (max 3 per item) — v1.0
- ✓ Item movement history between totes — v1.0
- ✓ Item duplication across totes — v1.0
- ✓ Dashboard with tote/item counts and recently added items — v1.0
- ✓ Global search across items by name, description, metadata — v1.0
- ✓ Search filtering by location, owner, metadata key — v1.0
- ✓ QR code generation for individual totes — v1.0
- ✓ Bulk QR code printing for multiple totes — v1.0
- ✓ Application settings (hostname, upload size, default fields, theme) — v1.0
- ✓ JSON/ZIP import and export of all data — v1.0
- ✓ Breadcrumb navigation — v1.0
- ✓ Responsive UI with Park UI components — v1.0
- ✓ Tote photo upload (multiple images per tote, max 3) — v1.0
- ✓ Search bug fixes (SQL, import FK, orphaned photos) — v1.0
- ✓ Input validation (Zod schemas, magic bytes, path safety, JSON errors) — v1.0
- ✓ Search pagination with offset/limit — v1.0
- ✓ Database indexes on FK and filter columns — v1.0
- ✓ Dashboard query optimization — v1.0
- ✓ Page decomposition (item detail: 7 sub-components, tote detail: 6 sub-components) — v1.0
- ✓ Error boundaries at all route segments — v1.0
- ✓ Shared photo components (PhotoGallery, PhotoUpload) — v1.0

### Active

<!-- Current scope. Building toward these. -->

(None — planning next milestone)

### Out of Scope

- Authentication/authorization — personal use, not needed for v1
- Multi-user support — single-user deployment
- Cloud storage for photos — local filesystem is fine, self-hosted value proposition
- Real-time sync — single instance only
- Mobile app — responsive web UI is sufficient
- PostgreSQL/MySQL — SQLite is appropriate for personal scale
- Container nesting/hierarchy — high complexity, niche use case
- AI-powered item recognition — cloud dependency, poor accuracy for household items
- Barcode/UPC scanning — requires cloud database API, many items lack barcodes
- Unlimited photos per item/tote — storage/performance concerns, 3 is sufficient
- Full-text search engine — SQLite LIKE is sufficient for personal scale

## Context

Shipped v1.0 with 13,483 LOC TypeScript/CSS across 96 files.

**Tech stack:** Next.js 16 (App Router), React 19, TypeScript, SQLite (better-sqlite3), sharp for image processing, Zod v4 for validation.
**Deployment:** Docker (Node.js 24 Alpine).
**Architecture:** 11 API route handlers with Zod validation; shared photo utilities (`src/lib/photos.ts`); shared photo components (`src/components/photos/`); decomposed detail pages with `_components/` sub-component pattern; error boundaries at all route segments; 12 database indexes for query performance; search pagination with offset/limit.
**No test framework configured** — all verification done via code review and manual testing.

## Constraints

- **Storage**: Local filesystem for photos and SQLite DB — must stay self-contained
- **Architecture**: Next.js App Router patterns — server components, route handlers, client boundaries
- **Compatibility**: Existing data must not be lost — schema changes need migration support
- **Dependencies**: Minimize new dependencies — leverage what's already in the stack

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SQLite for storage | Self-contained, zero-config, sufficient for personal use | ✓ Good — handles personal scale well, 12 indexes added for performance |
| No auth for v1 | Personal/household use only, simplifies development | ✓ Good — kept scope manageable |
| Local file storage | Avoids cloud dependencies, keeps deployment simple | ✓ Good — works well with Docker volumes |
| Multiple tote images | Consistent with item photos pattern, more useful than single image | ✓ Good — shared components eliminated code duplication |
| Zod v4 for validation | Runtime type safety, consistent error responses | ✓ Good — all 11 API routes validated, no raw request.json() calls |
| Magic bytes over MIME headers | Client-side MIME headers can be spoofed | ✓ Good — defense in depth for photo uploads |
| DB record before file cleanup | Authoritative action succeeds even if file ops fail | ✓ Good — per-file try-catch prevents partial failures from blocking |
| Shared photo components | Extract during tote photo phase (natural extraction point) | ✓ Good — PhotoGallery/PhotoUpload reused across items and totes |
| `_components/` sub-component pattern | Co-located with page, not shared globally | ✓ Good — item detail 1581→194 lines, tote detail 1168→199 lines |
| Pagination as additive SearchResult fields | Non-breaking change to existing search consumers | ✓ Good — backwards compatible |
| formatDate/formatDateShort shared utility | Eliminates per-page date formatting duplication | ✓ Good — used across 5 components |

---
*Last updated: 2026-03-02 after v1.0 milestone*
