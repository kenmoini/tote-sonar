# Feature Research

**Domain:** Personal inventory/organization app (container/tote tracking with photos)
**Researched:** 2026-02-28
**Confidence:** MEDIUM (based on training data analysis of competitor apps: Sortly, Memento Database, Home Inventory, Encircle, Homey, Snipe-IT, InvenTree, Grocy; no live web search available)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Container CRUD (name, location, metadata) | Core organizing unit; every inventory app has this | LOW | Already implemented. Totes with name, location, size, color, owner. |
| Item CRUD within containers | Users need to track what's inside containers | LOW | Already implemented. Items with name, description, quantity, metadata. |
| Photo upload for items | Visual identification is the primary value prop ("find it without opening it") | MEDIUM | Already implemented. Max 3 photos/item, auto-thumbnails via sharp. |
| Photo upload for containers | Users need to visually identify containers from outside; every competitor supports container images | MEDIUM | NOT YET IMPLEMENTED. Listed as "Active" in PROJECT.md. Must mirror item photo pattern. Schema needs `tote_photos` table. |
| Search across all containers and items | Finding things is the core use case; without search, users revert to opening boxes | MEDIUM | Already implemented but fragile (CONCERNS.md: metadata search bug, 100-result hard limit, no pagination). Needs hardening. |
| QR code / barcode label generation | Physical-to-digital bridge; expected in any app that tracks physical containers | MEDIUM | Already implemented. Single and bulk QR printing for totes. |
| Import/Export (backup & restore) | Users will not trust an app with their data if they cannot extract it | HIGH | Already implemented but buggy (CONCERNS.md: foreign key re-enable bug, orphaned photos). Needs hardening. |
| Responsive/mobile-friendly UI | Users catalog items from their garage/attic/storage unit on phones | LOW | Already implemented via Park UI components. |
| Container-level photo (cover image) | Users scan shelves of totes and need visual matching, not just text | MEDIUM | NOT YET IMPLEMENTED. This is the most critical missing table-stakes feature. Every competitor (Sortly, Home Inventory, Encircle) shows container thumbnails on list views. |
| Input validation and error handling | Bad data silently corrupting the database makes users lose trust | MEDIUM | Partially implemented but inconsistent (CONCERNS.md: unsafe JSON parsing, unvalidated settings, MIME type issues). Needs systematic pass. |
| Data integrity on delete | Deleting a tote must cleanly remove items, photos, metadata, and files | MEDIUM | Partially working but photo files can be orphaned (CONCERNS.md). Cascade works in DB but filesystem cleanup is unreliable. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Self-hosted / zero-cloud dependency | Privacy-conscious users and homelab enthusiasts strongly prefer local-only; Sortly/Encircle are cloud-locked | LOW | Already the architecture. SQLite + local filesystem. This is the differentiator to lean into. |
| QR code scanning to jump to tote | Walk up to a tote, scan with phone camera, see contents instantly. Most competitors require their own app. | LOW | Partially there: QR codes generated with tote URLs. Works if hostname setting is correct. No in-app scanner needed (phone camera handles it). |
| Bulk QR label printing | Print labels for all totes at once on standard label sheets. Sortly charges for this. | LOW | Already implemented. |
| Item movement history tracking | Know where an item has been across containers over time. Unique to Tote Sonar vs most home inventory apps. | LOW | Already implemented. Movement and duplication both tracked. |
| Item duplication across totes | "I have this same thing in multiple totes" — most apps force you to create separate items | LOW | Already implemented. |
| Docker single-container deployment | One command to run the entire app. Competitors require cloud accounts or complex setup. | LOW | Already implemented. Node.js 24 Alpine image. |
| Flexible metadata (key-value pairs) with autocomplete | Custom fields without rigid schema. Better than competitors' fixed category systems. | LOW | Already implemented. Metadata keys autocomplete is a nice touch. |
| Full-text search with metadata value matching | Search across item names, descriptions, AND custom metadata values | MEDIUM | Partially implemented but the metadata search has a fragile condition-splicing bug (CONCERNS.md). Fix would make this a strong differentiator. |
| Search result pagination | Large inventories (500+ items) become usable. Currently hard-capped at 100. | MEDIUM | Not implemented. Current 100-result limit is a release-blocking quality issue for serious users. |
| Background thumbnail processing | Upload responds immediately, thumbnail generates async. Improves perceived performance on mobile. | MEDIUM | Not implemented. Current synchronous sharp processing blocks the upload response. Would improve UX for users photographing items in sequence. |
| Orphaned file cleanup utility | Settings page button to scan for and remove orphaned photo files not linked to any DB record. | LOW | Not implemented. Addresses the known orphaned photo bug (CONCERNS.md). Quality-of-life for long-running instances. |
| Container nesting / hierarchy | Totes inside totes (e.g., a shelf holds multiple bins). Some competitors support this. | HIGH | Not implemented. Would require schema changes (parent_tote_id), recursive queries, and UI tree views. Defer to v2+. |
| Tags / categories for containers | Group totes by purpose (holiday, tools, kitchen) beyond just location/owner. | MEDIUM | Not implemented. Could be done as tote metadata (same pattern as items) or dedicated tags table. |
| Dashboard statistics and insights | "You have 47 items with no photos" or "3 totes have no items." Actionable data. | LOW | Partially implemented (tote/item counts, recent items). Could add data quality nudges. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems. Deliberately NOT building these.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Multi-user authentication | "My family should each have their own login" | Adds massive complexity (session management, RBAC, data segregation) for a personal app. Every auth system is a security surface. PROJECT.md explicitly scopes this out. | Use the `owner` field on totes for household identification. Defer auth to v2 if demand materializes. |
| Cloud photo storage (S3/GCS) | "I want photos backed up to the cloud" | Introduces cloud dependency, credentials management, cost, and network latency. Defeats self-hosted value prop. | Local filesystem + export ZIP for backup. Users can mount NAS/network storage if they want redundancy. |
| Real-time sync / multi-device | "I want to edit from my phone and see changes on desktop" | Single SQLite database already handles this via web access. Real-time sync requires WebSocket infrastructure, conflict resolution. Massive complexity. | Access the same web URL from any device. SQLite WAL handles concurrent reads. |
| Mobile native app | "I want an app store app" | Maintaining iOS + Android + web triples development surface. PWA capabilities cover offline use. | Ensure responsive web UI works well on mobile browsers. Consider PWA manifest for "add to home screen" later. |
| AI-powered item recognition | "Auto-detect what's in the photo" | Requires ML model hosting or cloud API, adds latency and cost, accuracy is poor for household items in boxes. | Good metadata and search are more reliable than auto-categorization. |
| Barcode/UPC scanning for items | "Scan an item's barcode to auto-fill details" | Requires barcode database API (cloud dependency), many household items lack barcodes, product databases are incomplete. | Manual entry with metadata autocomplete is more reliable and works for any item. |
| Complex reporting / analytics | "Show me depreciation, insurance values, purchase history" | Turns a simple inventory tool into an asset management system. Different product entirely. | Keep it simple: what's where, with photos. Users needing insurance tracking should use Encircle or similar. |
| Unlimited photos per item | "3 photos isn't enough" | Storage grows rapidly, thumbnail generation slows, UI becomes unwieldy. Most items are identifiable in 1-3 photos. | Keep max 3 per item. Consider max 3-5 per tote. If users consistently need more, raise the limit, don't remove it. |

## Feature Dependencies

```
[Tote CRUD]
    └──requires──> (none, foundation)
    └──enables──> [Item CRUD]
                      └──enables──> [Item Photos]
                      └──enables──> [Item Metadata]
                      └──enables──> [Item Movement/Duplication]
    └──enables──> [Tote Photos] *** NOT YET BUILT ***
    └──enables──> [QR Code Generation]
    └──enables──> [Search]
                      └──enhanced-by──> [Search Pagination] *** NOT YET BUILT ***

[Item Photos]
    └──requires──> [Item CRUD]
    └──requires──> [File Storage (uploads/ + thumbnails/)]
    └──pattern-for──> [Tote Photos] (mirror the same upload/thumbnail/DB pattern)

[Tote Photos] *** NOT YET BUILT ***
    └──requires──> [Tote CRUD]
    └──requires──> [File Storage]
    └──mirrors──> [Item Photos] (same pattern: upload route, thumbnail generation, DB table)
    └──enhances──> [Dashboard] (tote cover images in recent/listing views)
    └──enhances──> [Search Results] (visual context for container matches)
    └──impacts──> [Import/Export] (must include tote photos in ZIP, same as item photos)
    └──impacts──> [Tote Delete] (must clean up tote photo files, same pattern as item delete)

[Import/Export]
    └──requires──> [All CRUD operations]
    └──requires──> [File Storage]
    └──impacted-by──> [Tote Photos] (new table to include in export/import)

[Input Validation Hardening]
    └──enhances──> [All API routes]
    └──independent──> (can be done in parallel with feature work)

[Search Pagination]
    └──requires──> [Search]
    └──enhances──> [Search UX]

[Orphan Cleanup]
    └──requires──> [Item Photos]
    └──requires──> [Tote Photos] (should handle both)
    └──independent──> (utility feature, can ship anytime after photo support complete)
```

### Dependency Notes

- **Tote Photos mirrors Item Photos:** The item photo pattern (upload route, sharp thumbnails, DB table with foreign key, cascade delete, import/export inclusion) is already proven. Tote photos should copy this pattern exactly, changing only the foreign key target (`tote_id` instead of `item_id`).
- **Import/Export must evolve with Tote Photos:** Adding a `tote_photos` table means the export must include it and the import must restore it. This is a direct dependency — shipping tote photos without updating import/export creates data loss on backup/restore cycles.
- **Search Pagination is independent of Tote Photos:** These can be built in parallel. Pagination is a quality issue, not a feature dependency.
- **Input Validation is cross-cutting:** Not blocked by any feature work. Should be addressed systematically across all routes, ideally before or alongside new feature development.

## MVP Definition

The app already has a working MVP. This section defines what's needed for a **release-quality v1** (not initial MVP).

### Launch With (v1 — Release Hardening)

Minimum for a confidence-inspiring first public release.

- [x] Tote CRUD — already shipped
- [x] Item CRUD with photos, metadata, movement — already shipped
- [x] Search across items — already shipped (needs bug fixes)
- [x] QR code generation (single + bulk) — already shipped
- [x] Import/Export — already shipped (needs bug fixes)
- [x] Dashboard — already shipped
- [ ] **Tote photo upload** — critical missing table-stakes feature. A tote listing with no visual identification is incomplete.
- [ ] **Fix search metadata bug** — complex metadata search builds incorrect SQL (CONCERNS.md). Blocks reliable search.
- [ ] **Fix import foreign key re-enable** — import failure can leave foreign keys disabled (CONCERNS.md). Data integrity risk.
- [ ] **Fix orphaned photo cleanup on delete** — file deletion failures are silent (CONCERNS.md). Disk usage grows silently.
- [ ] **Input validation pass** — settings accept arbitrary input, MIME types trust the browser, JSON parse errors handled inconsistently (CONCERNS.md).
- [ ] **Search pagination** — 100-result hard cap makes the app unusable for inventories above ~100 items. Release-blocking for serious users.

### Add After Validation (v1.x)

Features to add once core is stable and release-quality.

- [ ] Background thumbnail processing — improves upload UX but not blocking
- [ ] Orphaned file cleanup utility in settings — nice-to-have maintenance tool
- [ ] Dashboard data quality nudges ("5 items have no photos") — engagement feature
- [ ] Tags/categories for totes — grouping beyond location/owner
- [ ] Tote ID generation hardening (crypto.randomBytes) — security improvement, low urgency for personal use

### Future Consideration (v2+)

Features to defer until the product proves its value and users request them.

- [ ] Container nesting/hierarchy — high complexity, niche use case
- [ ] PWA manifest for "add to home screen" — convenience, not essential
- [ ] Authentication/authorization — only if multi-user demand materializes
- [ ] Full-text search engine (Meilisearch) — only if SQLite LIKE becomes too slow at scale
- [ ] Database indexes on filter columns — only when query latency becomes noticeable (10k+ items)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Tote photo upload | HIGH | MEDIUM | P1 |
| Fix search metadata bug | HIGH | LOW | P1 |
| Fix import FK re-enable | HIGH | LOW | P1 |
| Fix orphaned photo cleanup | MEDIUM | LOW | P1 |
| Input validation hardening | MEDIUM | MEDIUM | P1 |
| Search pagination | HIGH | MEDIUM | P1 |
| Background thumbnail processing | MEDIUM | MEDIUM | P2 |
| Orphaned file cleanup utility | LOW | LOW | P2 |
| Dashboard data quality nudges | LOW | LOW | P2 |
| Tags/categories for totes | MEDIUM | MEDIUM | P2 |
| Tote ID crypto hardening | LOW | LOW | P2 |
| Container nesting/hierarchy | MEDIUM | HIGH | P3 |
| PWA manifest | LOW | LOW | P3 |
| Authentication | LOW (for personal use) | HIGH | P3 |

**Priority key:**
- P1: Must have for release-quality v1
- P2: Should have, add in v1.x releases
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Sortly (SaaS) | Home Inventory (iOS) | Snipe-IT (self-hosted) | InvenTree (self-hosted) | Tote Sonar (this app) |
|---------|---------------|----------------------|------------------------|-------------------------|----------------------|
| Container/location photos | Yes, multiple | Yes, single cover | No (asset-focused) | Yes, single | NOT YET — P1 priority |
| Item photos | Yes, unlimited (paid) | Yes, multiple | Yes, single | Yes, multiple | Yes, max 3 per item |
| Search with filters | Yes, advanced | Basic text search | Yes, advanced | Yes, advanced | Partial — metadata bug, no pagination |
| QR/barcode labels | Yes (paid tier) | No | Yes | Yes | Yes, including bulk print |
| Import/Export | CSV only | No | Yes (CSV, JSON) | Yes (multiple formats) | Yes (JSON+photos ZIP) — needs bug fixes |
| Custom fields/metadata | Yes (paid tier) | Limited categories | Yes, extensive | Yes, extensive | Yes, key-value pairs with autocomplete |
| Movement tracking | No | No | Yes (check-in/out) | Yes (stock tracking) | Yes, full history |
| Self-hosted option | No (cloud only) | No (device only) | Yes | Yes | Yes — core differentiator |
| Mobile-friendly | Native app | Native app | Responsive web | Responsive web | Responsive web |
| Docker deployment | N/A | N/A | Yes | Yes | Yes, single container |
| Free tier | Limited (100 items) | One-time purchase | Open source | Open source | Open source |

**Key takeaway:** Tote Sonar's differentiators are (1) self-hosted simplicity with Docker, (2) movement tracking not common in home inventory apps, (3) flexible metadata, and (4) full data export with photos. The critical gap is container photos — every competitor that supports containers shows images for them.

## Container Image Management — Deep Dive

Since the milestone context asks specifically about photo uploads for containers, here is a focused analysis.

### What Competitors Do

**Container/Location photos across the market:**
- **Sortly:** Multiple photos per "folder" (their container concept). First photo becomes the cover thumbnail in list views. Drag-to-reorder photos. Cloud-stored.
- **Home Inventory:** Single cover image per room/location. Taken from camera or gallery. Displayed prominently on location detail page.
- **InvenTree:** Single image per stock location. Used in location tree view. Supports URL or file upload.
- **Encircle:** Room photos with annotation. Multiple per room. Insurance-focused.

**Common pattern:** 1-5 photos per container. First photo = cover thumbnail. Shown in list views and detail pages. Same upload flow as item photos.

### What Tote Sonar Should Do

**Recommended approach:** Mirror the existing `item_photos` pattern exactly.

1. **New `tote_photos` table** — same schema as `item_photos` but with `tote_id` foreign key instead of `item_id`
2. **New API route** at `/api/totes/[id]/photos` — same implementation as `/api/items/[id]/photos/route.ts`
3. **Photo limit:** Max 3 per tote (consistent with items)
4. **Cover image:** First uploaded photo becomes cover thumbnail, shown in tote list views and dashboard
5. **Cascade delete:** Same pattern — delete tote cascades to `tote_photos` rows, with filesystem cleanup
6. **Import/Export update:** Add `tote_photos` to export JSON and ZIP file handling
7. **Thumbnail generation:** Same sharp pipeline (200x200 cover crop with EXIF auto-orient)

### Quality-of-Life Features for Release Readiness

Features that make photo management feel polished rather than bare-minimum:

| QoL Feature | What It Does | Complexity | Priority |
|-------------|-------------|------------|----------|
| Cover thumbnail in tote list | Show first tote photo as thumbnail in the totes listing page | LOW | P1 (ships with tote photos) |
| Cover thumbnail on dashboard | Show tote cover image alongside recent items that reference that tote | LOW | P1 |
| Photo reorder (drag or set-as-cover) | Let user choose which photo is the cover image | MEDIUM | P2 (nice but not blocking) |
| Photo delete confirmation | "Are you sure?" before removing a photo | LOW | P1 (prevents accidental data loss) |
| Upload progress indicator | Show upload percentage for large photos on slow connections | MEDIUM | P2 |
| EXIF auto-orient on display | Photos from phones display right-side-up regardless of rotation metadata | LOW | Already handled by sharp `.rotate()` in thumbnail generation |
| Lazy-load photos in list views | Don't load all thumbnails at once on long tote lists | LOW | P2 (performance) |
| Error recovery on failed upload | Clear error message, retry button, don't lose the selected file | LOW | P1 |

## Sources

- Analysis based on training data knowledge of: Sortly, Memento Database, Home Inventory (Apple), Encircle, Homey, Snipe-IT, InvenTree, Grocy, and general home inventory app market patterns
- Existing codebase analysis of `/Users/kenmoini/Development/tote-sonar/src/`
- Known issues from `/Users/kenmoini/Development/tote-sonar/.planning/codebase/CONCERNS.md`
- Project scope from `/Users/kenmoini/Development/tote-sonar/.planning/PROJECT.md`

**Confidence note:** Competitor feature analysis is based on training data (cutoff May 2025). Feature sets may have changed. WebSearch was unavailable for live verification. Core patterns (container photos as table stakes, self-hosted as differentiator) are stable market dynamics unlikely to have shifted.

---
*Feature research for: Tote Sonar — personal inventory/organization*
*Researched: 2026-02-28*
