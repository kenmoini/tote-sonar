# Tote Sonar

## What This Is

A personal organization tool for tracking the contents of boxes, bins, and totes. Users can catalog items with photos and metadata, search across all containers, generate QR labels for physical totes, and import/export their inventory. Built as a Next.js full-stack app with SQLite for single-user, self-hosted use.

## Core Value

Users can quickly find what's in any tote without opening it — search, browse, or scan a QR code to see contents and photos.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- Tote CRUD with name, location, size, color, owner
- Unique 6-character tote IDs
- Item CRUD linked to totes with name, description, quantity
- Item metadata (key-value pairs) with autocomplete keys
- Item photo upload with auto-generated thumbnails (max 3 per item)
- Item movement history between totes
- Item duplication across totes
- Dashboard with tote/item counts and recently added items
- Global search across items by name, description, metadata
- Search filtering by location, owner, metadata key
- QR code generation for individual totes
- Bulk QR code printing for multiple totes
- Application settings (hostname, upload size, default fields, theme)
- JSON/ZIP import and export of all data
- Breadcrumb navigation
- Responsive UI with Park UI components

### Active

<!-- Current scope. Building toward these. -->

- [ ] Tote photo upload (multiple images per tote, same pattern as items)
- [ ] Fix known bugs (import foreign keys, orphaned photos, search metadata)
- [ ] Harden input validation and error handling consistency
- [ ] Improve performance (search pagination, dashboard optimization, thumbnail processing)
- [ ] Code quality cleanup (refactor monolithic components, standardize patterns)

### Out of Scope

- Authentication/authorization — personal use, not needed for v1
- Multi-user support — single-user deployment
- Cloud storage for photos — local filesystem is fine
- Real-time sync — single instance only
- Mobile app — web UI is sufficient
- PostgreSQL/MySQL — SQLite is appropriate for personal scale

## Context

- Brownfield project with working base application
- Next.js 16 with App Router, React 19, TypeScript
- SQLite via better-sqlite3, sharp for image processing
- Docker deployment (Node.js 24 Alpine)
- No test framework configured yet
- Item detail page is 1581 lines — primary refactoring target
- Import/export and search query builder identified as fragile areas
- Photo upload pattern already established for items — tote photos should mirror it

## Constraints

- **Storage**: Local filesystem for photos and SQLite DB — must stay self-contained
- **Architecture**: Next.js App Router patterns — server components, route handlers, client boundaries
- **Compatibility**: Existing data must not be lost — schema changes need migration support
- **Dependencies**: Minimize new dependencies — leverage what's already in the stack

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SQLite for storage | Self-contained, zero-config, sufficient for personal use | -- Pending |
| No auth for v1 | Personal/household use only, simplifies development | -- Pending |
| Local file storage | Avoids cloud dependencies, keeps deployment simple | -- Pending |
| Multiple tote images | Consistent with item photos pattern, more useful than single image | -- Pending |

---
*Last updated: 2026-02-28 after initialization*
