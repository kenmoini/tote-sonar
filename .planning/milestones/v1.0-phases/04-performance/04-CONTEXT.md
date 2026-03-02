# Phase 4: Performance - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

App handles large inventories without degradation in search, browsing, or dashboard loading. Add search pagination, database indexes, and dashboard query optimization. No new features — purely performance and scalability of existing functionality.

</domain>

<decisions>
## Implementation Decisions

### Search Pagination UX
- Page number navigation (1-2-3 style) at the bottom of search results
- Full URL state — page number, query, and all filters preserved in URL params for shareability/bookmarkability
- When any filter changes (location, owner, metadata key), reset to page 1
- Claude decides results per page based on UI density

### Dashboard Loading
- Keep single-load pattern — one API call, one loading spinner
- Keep item counts per tote in the recent totes query (GROUP BY with index will be fast)
- Optimize queries with indexes and limited scope rather than changing the loading architecture

### Result Count & Feedback
- Show exact count with range: "Showing 1-20 of 347 results"
- Show total page count: "Page 2 of 18"
- Requires a COUNT query alongside the data query

### Scale Expectations
- Proactive optimization — no specific pain points today, preparing for growth
- Target: handles hundreds of totes and thousands of items without degradation
- No monitoring infrastructure needed — just make it fast

### Claude's Discretion
- Results per page (20 vs 50 — pick based on UI density and item card size)
- Loading state between page transitions (subtle inline vs full spinner — match existing app patterns)
- Whether tote list view also gets pagination (roadmap says "search pagination" but tote list may benefit too)
- Dashboard recents limit (keep at 10 or adjust)
- Empty state improvements for zero search results (keep current or add suggestions)
- Query logging / monitoring (not needed unless implementation reveals issues)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The emphasis is on proactive optimization before data grows, not fixing existing bottlenecks.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/search/page.tsx`: Already has URL search params handling (`useSearchParams`) — extend with `page` param
- `src/app/api/search/route.ts`: Currently `LIMIT 100` with no offset — add `OFFSET` and parameterize `LIMIT`
- `src/app/api/dashboard/route.ts`: 4 queries (2 counts + 2 recents) — already efficient pattern, just needs indexes
- Search filter options already loaded via `/api/search/filters` — no changes needed there

### Established Patterns
- Client-side data fetching with `useState`/`useEffect`/`useCallback` — pagination fits this pattern
- URL params already used for search query and filters — add `page` param consistently
- Loading states use `loading` boolean with spinner — extend for page transitions
- better-sqlite3 with WAL mode — synchronous queries, no async complexity for pagination

### Integration Points
- `src/lib/db.ts` `initializeSchema()` — add CREATE INDEX statements here
- Search API route — add offset/limit params, add COUNT query
- Dashboard API route — optimize with indexes on foreign keys
- Search page component — add pagination controls below results list

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-performance*
*Context gathered: 2026-03-01*
