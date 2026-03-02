# Phase 3: Page Decomposition - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Break the two monolithic page components (tote detail: 1168 lines, item detail: 1280 lines) into focused sub-components with no single file over 400 lines. Add error boundaries at route segments so runtime errors show a user-friendly recovery UI instead of a blank page. No new features or capabilities — purely structural refactoring and error handling.

</domain>

<decisions>
## Implementation Decisions

### Error boundary placement
- error.tsx at every route segment: app root, totes/[id]/, totes/[id]/items/[itemId]/, search/, import-export/, settings/
- A crash in one route doesn't take down others

### Error boundary UX
- Friendly message + retry button that resets the error boundary
- Reuse the existing ErrorDisplay component — wrap it in the error.tsx reset boundary
- Console.error only for logging — no external error tracking
- Consistent look with existing error handling patterns

### Component file organization
- Co-located with pages using _components/ folders (e.g., src/app/totes/[id]/_components/ToteHeader.tsx)
- Underscore prefix tells Next.js to ignore the folder for routing
- No barrel files — import each component directly
- Components used by multiple pages get promoted to src/components/
- Flat structure within _components/ folders (no nested subfolders)

### Tote detail page decomposition (~6 components)
- Split by feature area: ToteHeader (info+actions), TotePhotos (gallery+upload), EditToteForm, AddItemForm, ItemsList (with sort+delete), QrLabel
- Each sub-component ~100-200 lines

### Item detail page decomposition (~6-7 components)
- Split by feature area: ItemHeader (info+actions), ItemPhotos, EditItemForm, MetadataSection (add/edit/delete/autocomplete), MoveItemForm, CopyItemForm, MovementHistory
- Each sub-component ~100-200 lines
- Match tote detail granularity level for consistency

### Data flow after split
- Parent page.tsx fetches data, passes to sub-components via props
- Sub-components are presentational + manage their own local form state
- Parent page.tsx should be under 200 lines — thin orchestrator with imports, data fetching, and sub-component rendering

### State management
- Props + callbacks for shared state (data down, events up)
- Parent owns shared state (tote/item data, loading, error)
- Sub-components receive data via props, report mutations via callback props (onEdit, onDelete, onRefresh)
- Each sub-component manages its own local form state (edit fields, validation, etc.)

### Toast notifications
- Parent page.tsx owns toast state
- Sub-components receive a showToast(message, type) callback prop
- Toast rendering stays in the parent

### Prop types
- Inline prop interfaces defined in each sub-component file
- Self-contained: interface ToteHeaderProps { tote: ToteDetail; onEdit: () => void; }

### Refs
- Refs move with their sub-component (e.g., actionsRef stays with the actions dropdown component)
- Each sub-component manages its own refs and event handlers internally

### Claude's Discretion
- Exact component naming beyond the suggested names
- How to handle the actions dropdown extraction (inline vs separate component)
- Whether delete confirmation modals should be shared or per-page
- Loading skeleton or spinner patterns during data fetch

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ErrorDisplay` (src/components/ErrorDisplay.tsx): Already handles error messages, retry buttons, network error detection — reuse for error boundaries
- `PhotoGallery` + `PhotoUpload` (src/components/photos/): Already extracted and shared between item and tote pages
- `Breadcrumb` (src/components/Breadcrumb.tsx): Used by both detail pages, no changes needed
- `Navigation` (src/components/Navigation.tsx): App-wide nav, no changes needed

### Established Patterns
- `useState` for all state management — no context or state libraries
- `useCallback` + `useEffect` for data fetching with dependency arrays
- `useRef` for imperative DOM interactions (click-outside, file inputs)
- Default exports for all React components
- Path alias `@/components/` and `@/types` for imports
- Toast state pattern: `useState<{ message: string; type: 'success' | 'error' } | null>(null)`

### Integration Points
- Both detail pages import from `@/types` (Tote, Item, TotePhoto, ItemPhoto, etc.)
- Both pages use `useParams()` and `useRouter()` from next/navigation
- Both pages use `fetch()` to call API routes
- QR_SIZES constant and QrLabelSize type are tote-page-specific (co-locate)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The goal is structural improvement, not visual changes.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-page-decomposition*
*Context gathered: 2026-03-01*
