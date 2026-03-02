# Phase 3: Page Decomposition - Research

**Researched:** 2026-03-01
**Domain:** React component decomposition, Next.js error boundaries
**Confidence:** HIGH

## Summary

This phase is a structural refactoring of two monolithic page components (tote detail: 1168 lines, item detail: 1280 lines) into focused sub-components, plus adding Next.js error boundaries at every route segment. No new features or visual changes are involved.

The codebase uses Next.js 16 (App Router) with React 19, all client components with `'use client'`, and a straightforward `useState`/`useCallback` state management pattern. The existing shared component extractions (PhotoGallery, PhotoUpload, PhotoDeleteConfirm, Breadcrumb, ErrorDisplay) provide a proven pattern to follow. The error.tsx convention is stable and well-documented since Next.js 13, requiring only a client component with `error` and `reset` props.

**Primary recommendation:** Extract sub-components into co-located `_components/` folders using the props-down/callbacks-up pattern already established in the codebase. Reuse ErrorDisplay in error.tsx files, wrapping it with the `reset()` function from the error boundary.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- error.tsx at every route segment: app root, totes/[id]/, totes/[id]/items/[itemId]/, search/, import-export/, settings/
- A crash in one route doesn't take down others
- Friendly message + retry button that resets the error boundary
- Reuse the existing ErrorDisplay component -- wrap it in the error.tsx reset boundary
- Console.error only for logging -- no external error tracking
- Consistent look with existing error handling patterns
- Co-located with pages using _components/ folders (e.g., src/app/totes/[id]/_components/ToteHeader.tsx)
- Underscore prefix tells Next.js to ignore the folder for routing
- No barrel files -- import each component directly
- Components used by multiple pages get promoted to src/components/
- Flat structure within _components/ folders (no nested subfolders)
- Tote detail page decomposition (~6 components): ToteHeader, TotePhotos, EditToteForm, AddItemForm, ItemsList, QrLabel
- Item detail page decomposition (~6-7 components): ItemHeader, ItemPhotos, EditItemForm, MetadataSection, MoveItemForm, CopyItemForm, MovementHistory
- Each sub-component ~100-200 lines
- Parent page.tsx fetches data, passes to sub-components via props
- Sub-components are presentational + manage their own local form state
- Parent page.tsx should be under 200 lines -- thin orchestrator with imports, data fetching, and sub-component rendering
- Props + callbacks for shared state (data down, events up)
- Parent owns shared state (tote/item data, loading, error)
- Sub-components receive data via props, report mutations via callback props (onEdit, onDelete, onRefresh)
- Each sub-component manages its own local form state (edit fields, validation, etc.)
- Parent page.tsx owns toast state
- Sub-components receive a showToast(message, type) callback prop
- Toast rendering stays in the parent
- Inline prop interfaces defined in each sub-component file
- Self-contained: interface ToteHeaderProps { tote: ToteDetail; onEdit: () => void; }
- Refs move with their sub-component (e.g., actionsRef stays with the actions dropdown component)
- Each sub-component manages its own refs and event handlers internally

### Claude's Discretion
- Exact component naming beyond the suggested names
- How to handle the actions dropdown extraction (inline vs separate component)
- Whether delete confirmation modals should be shared or per-page
- Loading skeleton or spinner patterns during data fetch

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| QUAL-01 | Item detail page decomposed from monolithic component into focused sub-components | Architecture patterns section provides component breakdown with line budgets; code examples show prop interface and extraction patterns derived from actual codebase analysis |
| QUAL-02 | Tote detail page decomposed into focused sub-components | Same architecture patterns apply; tote page analysis identifies 6 sub-components with clear state ownership boundaries |
| QUAL-05 | Error boundaries (error.tsx) added at app root and critical route segments | Error boundary section documents exact file locations, Next.js error.tsx API (props: error + reset), reuse of existing ErrorDisplay component, and global-error.tsx for root layout errors |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | ^16.0.0 | App Router framework with error.tsx convention | Already in use; error.tsx is a built-in file convention since v13 |
| React | ^19.2.0 | Component model, hooks, error boundaries | Already in use; error.tsx uses React Error Boundary under the hood |
| lucide-react | ^0.575.0 | Icons for error UIs | Already in use project-wide |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | - | - | No new libraries needed -- this is pure refactoring |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| error.tsx convention | Manual React ErrorBoundary class components | error.tsx is simpler, automatic, and handles both server and client errors; manual boundaries are only needed for within-page granularity (not required here) |

**Installation:**
```bash
# No new packages required
```

## Architecture Patterns

### Recommended Project Structure
```
src/app/
├── error.tsx                              # Root-level error boundary
├── global-error.tsx                       # Catches errors in root layout
├── layout.tsx                             # Root layout (existing)
├── page.tsx                               # Dashboard (existing)
├── not-found.tsx                          # 404 page (existing)
├── totes/
│   └── [id]/
│       ├── error.tsx                      # Tote detail error boundary
│       ├── page.tsx                       # Tote detail (refactored ~150-200 lines)
│       ├── _components/
│       │   ├── ToteHeader.tsx             # Title, ID, metadata grid, actions dropdown
│       │   ├── TotePhotos.tsx             # Photo gallery + upload wrapper
│       │   ├── EditToteForm.tsx           # Edit tote modal with form state
│       │   ├── AddItemForm.tsx            # Add item modal with photo attachment
│       │   ├── ItemsList.tsx              # Sorted items list with delete prompt
│       │   └── QrLabel.tsx               # QR code display + print label
│       └── items/
│           └── [itemId]/
│               ├── error.tsx              # Item detail error boundary
│               ├── page.tsx              # Item detail (refactored ~150-200 lines)
│               └── _components/
│                   ├── ItemHeader.tsx      # Title, tote link, metadata grid, actions
│                   ├── ItemPhotos.tsx      # Photo gallery + upload wrapper
│                   ├── EditItemForm.tsx    # Edit item modal
│                   ├── MetadataSection.tsx # Add/edit/delete metadata with autocomplete
│                   ├── MoveItemForm.tsx    # Move item modal
│                   ├── CopyItemForm.tsx    # Copy/duplicate item modal
│                   └── MovementHistory.tsx # Movement history timeline
├── search/
│   └── error.tsx                          # Search error boundary
├── import-export/
│   └── error.tsx                          # Import/export error boundary
└── settings/
    └── error.tsx                          # Settings error boundary
```

### Pattern 1: Parent Page as Thin Orchestrator
**What:** The parent page.tsx handles data fetching, top-level loading/error states, toast state, and renders sub-components with data and callbacks.
**When to use:** Every refactored page.tsx file.
**Example:**
```typescript
// Source: Derived from existing codebase patterns
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Check, X, AlertTriangle } from 'lucide-react';
import { Tote, Item, TotePhoto } from '@/types';
import Breadcrumb from '@/components/Breadcrumb';
import ErrorDisplay from '@/components/ErrorDisplay';
import ToteHeader from './_components/ToteHeader';
import TotePhotos from './_components/TotePhotos';
import EditToteForm from './_components/EditToteForm';
import AddItemForm from './_components/AddItemForm';
import ItemsList from './_components/ItemsList';
import QrLabel from './_components/QrLabel';

interface ToteDetail extends Tote {
  items: Item[];
  item_count: number;
}

export default function ToteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toteId = params.id as string;
  const [tote, setTote] = useState<ToteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totePhotos, setTotePhotos] = useState<TotePhoto[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [maxUploadSize, setMaxUploadSize] = useState<number>(5242880);

  // Modal visibility state (parent controls which modal is open)
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAddItemForm, setShowAddItemForm] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchTote = useCallback(async () => { /* ... */ }, [toteId]);
  const fetchTotePhotos = useCallback(async () => { /* ... */ }, [toteId]);

  useEffect(() => { /* fetch on mount */ }, [toteId, fetchTote, fetchTotePhotos]);
  useEffect(() => { /* fetch max upload size */ }, []);

  if (loading) { /* loading spinner */ }
  if (error || !tote) { /* error/not-found states */ }

  return (
    <main className="page-container">
      {/* Toast notification */}
      {toast && ( /* toast JSX stays in parent */ )}

      <Breadcrumb items={[...]} />
      <ToteHeader tote={tote} onEdit={() => setShowEditForm(true)} onDelete={...} />
      <TotePhotos photos={totePhotos} tote={tote} toteId={toteId}
        onPhotosChanged={fetchTotePhotos} maxUploadSize={maxUploadSize} />
      <ItemsList items={tote.items} toteId={toteId} itemCount={tote.item_count}
        onAddItem={() => setShowAddItemForm(true)} onItemDeleted={fetchTote} showToast={showToast} />
      <QrLabel toteId={toteId} tote={tote} />

      {/* Modals rendered conditionally */}
      {showEditForm && <EditToteForm tote={tote} toteId={toteId}
        onClose={() => setShowEditForm(false)} onSaved={() => { fetchTote(); showToast('...', 'success'); }} showToast={showToast} />}
      {showAddItemForm && <AddItemForm toteId={toteId} maxUploadSize={maxUploadSize}
        onClose={() => setShowAddItemForm(false)} onAdded={fetchTote} showToast={showToast} />}
    </main>
  );
}
```

### Pattern 2: Sub-Component with Inline Props Interface
**What:** Each sub-component defines its own props interface, uses default export, manages local form state internally.
**When to use:** Every extracted sub-component.
**Example:**
```typescript
// Source: Derived from existing codebase patterns
'use client';

import { useState, useRef, useEffect } from 'react';
import { Box, MapPin, User, Calendar, Package, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { Tote, Item } from '@/types';

interface ToteDetail extends Tote {
  items: Item[];
  item_count: number;
}

interface ToteHeaderProps {
  tote: ToteDetail;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ToteHeader({ tote, onEdit, onDelete }: ToteHeaderProps) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  // Close actions dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setActionsOpen(false);
      }
    };
    if (actionsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [actionsOpen]);

  const formatDate = (dateStr: string) => { /* ... */ };

  return (
    <>
      <div className="tote-detail-header">
        {/* Title row + actions dropdown */}
      </div>
      <div className="tote-detail-meta-grid">
        {/* Metadata cards + show more toggle */}
      </div>
    </>
  );
}
```

### Pattern 3: Error Boundary (error.tsx)
**What:** Next.js error.tsx file that wraps ErrorDisplay with the boundary reset function.
**When to use:** Every route segment listed in the decisions.
**Example:**
```typescript
// Source: Next.js official docs (https://nextjs.org/docs/app/api-reference/file-conventions/error)
'use client';

import { useEffect } from 'react';
import ErrorDisplay from '@/components/ErrorDisplay';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="page-container">
      <ErrorDisplay
        error={error.message || 'An unexpected error occurred'}
        onRetry={reset}
        retryLabel="Try Again"
      />
    </main>
  );
}
```

### Pattern 4: Global Error Boundary (global-error.tsx)
**What:** Catches errors in the root layout itself. Must include its own `<html>` and `<body>` tags because it replaces the root layout.
**When to use:** Once, at `src/app/global-error.tsx`.
**Example:**
```typescript
// Source: Next.js official docs (https://nextjs.org/docs/app/api-reference/file-conventions/error)
'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <main className="page-container">
          <div className="error-state" role="alert">
            <h2>Something Went Wrong</h2>
            <p>An unexpected error occurred. Please try again.</p>
            <button className="btn btn-primary" onClick={reset}>
              Try Again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
```

### Anti-Patterns to Avoid
- **Prop drilling through many levels:** This project has only one level of sub-components below page.tsx, so this is not a concern. Keep it flat.
- **Barrel files (index.ts) in _components/:** The user explicitly decided against barrel files. Import each component directly by name.
- **Shared state via Context or state libraries:** The project uses useState only. Keep it that way -- props + callbacks are sufficient for one-level-deep components.
- **Moving data fetching into sub-components:** Parent page.tsx owns all data fetching. Sub-components are presentational + local form state only. They call parent callbacks (onSaved, onDeleted) to trigger re-fetches.
- **Putting delete confirmation modals inside the component that triggers them:** Delete confirmation modals involve state that should be co-located with the action. For the tote page, the tote delete confirm can live in ToteHeader (or be a separate inline component). For item delete from the list, it should stay with ItemsList since that component owns the delete-item flow.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Route-level error boundaries | Custom React ErrorBoundary class components | Next.js error.tsx file convention | Built-in, automatic, handles server+client errors, provides reset() |
| Global error catching | try/catch in layout | global-error.tsx | Only way to catch root layout errors; replaces layout when active |
| Error display UI | New error components | Existing ErrorDisplay component | Already handles network detection, retry buttons, consistent styling |

**Key insight:** This phase requires zero new libraries. All patterns are already established in the codebase (component extraction was done in Phase 2 for photos). The work is mechanical extraction with disciplined state boundary management.

## Common Pitfalls

### Pitfall 1: Breaking the Toast Flow
**What goes wrong:** After extraction, toast notifications stop working because the sub-component tries to manage its own toast state, or the callback isn't wired correctly.
**Why it happens:** Toast state must be owned by the parent (renders the toast UI), but mutations happen in sub-components.
**How to avoid:** Every sub-component that can trigger success/error messages receives `showToast: (message: string, type: 'success' | 'error') => void` as a prop. The parent's `showToast` callback sets the toast state and auto-dismisses.
**Warning signs:** Toast notification not appearing after editing/deleting in a sub-component.

### Pitfall 2: Escape Key Handler Conflicts
**What goes wrong:** Multiple sub-components register their own Escape key handlers, causing conflicts or closing the wrong modal.
**Why it happens:** The current monolithic pages have a single useEffect that handles Escape for all modals. After splitting, each component may duplicate this.
**How to avoid:** Each modal sub-component should manage its own Escape handler internally, guarded by its own visibility state. Since modals are conditionally rendered (`{showEditForm && <EditToteForm />}`), only one modal's Escape handler will be active at a time.
**Warning signs:** Pressing Escape closes a background modal or does nothing.

### Pitfall 3: error.tsx Cannot Catch Layout Errors
**What goes wrong:** An error in layout.tsx is not caught by error.tsx in the same segment.
**Why it happens:** error.tsx wraps the page, not the layout. Layout errors bubble to the parent segment's error boundary.
**How to avoid:** For the root layout, use global-error.tsx (which replaces the entire layout). For nested layouts (this project has none beyond root), the parent segment's error.tsx handles it. This project only has `src/app/layout.tsx`, so `src/app/global-error.tsx` + `src/app/error.tsx` covers everything.
**Warning signs:** Error in root layout shows a blank white page instead of error UI.

### Pitfall 4: Forgetting 'use client' on error.tsx
**What goes wrong:** Build error or runtime crash because error.tsx must be a Client Component.
**Why it happens:** Easy to forget since it's a convention file, not a regular component.
**How to avoid:** Always include `'use client'` as the very first line of every error.tsx file.
**Warning signs:** Build error mentioning "Error components must be Client Components".

### Pitfall 5: Duplicating the ToteDetail/ItemDetail Interface
**What goes wrong:** Each sub-component redefines `interface ToteDetail extends Tote { items: Item[]; item_count: number; }`, creating maintenance burden and potential drift.
**Why it happens:** The interface is currently defined in the page file and not exported from types.
**How to avoid:** Either: (a) define the extended interface in the parent page.tsx and export it (sub-components import from the parent), or (b) define it in `@/types` alongside the base Tote/Item types. Option (b) is cleaner since multiple components need it. However, since the user decided on self-contained inline interfaces, sub-components can import just `Tote` from `@/types` and either accept `ToteDetail` as a generic or only accept the fields they actually need via their own narrower interface.
**Warning signs:** Changing a field name requires updates in 6+ files.

### Pitfall 6: State Ownership Ambiguity for Delete Confirmations
**What goes wrong:** The delete confirmation modal's "show" state is in the parent, but the delete handler and loading state are in the sub-component, creating split ownership.
**Why it happens:** Delete confirmations sit between the triggering action (in header/list) and the parent's data refresh.
**How to avoid:** Keep delete confirmation fully within the sub-component that triggers it. ToteHeader owns tote delete (show confirm, handle delete, call onDelete callback on success). ItemsList owns item delete (show confirm per item, handle delete, call onItemDeleted callback on success). The parent only passes callbacks for what happens AFTER the delete succeeds (refresh data, show toast).
**Warning signs:** Delete works but the confirmation modal doesn't close, or data doesn't refresh.

## Code Examples

Verified patterns from the existing codebase:

### Existing Component Pattern (PhotoUpload)
```typescript
// Source: src/components/photos/PhotoUpload.tsx (178 lines)
// Demonstrates the established pattern for extracted components:
// - 'use client' directive
// - Inline interface (PhotoUploadProps)
// - Named export (not default -- but page sub-components use default per codebase convention)
// - Self-contained local state (uploading, dragActive, error)
// - Callbacks to parent (onUploadComplete)
// - No barrel file re-export (though photos/ has an index.ts -- user decided no barrels for _components)
```

### Toast Callback Pattern
```typescript
// Source: Both existing detail pages
// Parent:
const showToast = (message: string, type: 'success' | 'error') => {
  setToast({ message, type });
  setTimeout(() => setToast(null), 4000);
};
// Usage: <EditToteForm ... showToast={showToast} />

// Sub-component:
interface EditToteFormProps {
  tote: ToteDetail;
  toteId: string;
  onClose: () => void;
  onSaved: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}
```

### Actions Dropdown with Ref
```typescript
// Source: Both existing detail pages
// The actionsRef and click-outside handler stay with the header sub-component:
const [actionsOpen, setActionsOpen] = useState(false);
const actionsRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
      setActionsOpen(false);
    }
  };
  if (actionsOpen) {
    document.addEventListener('mousedown', handleClickOutside);
  }
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [actionsOpen]);
```

### formatDate Utility
```typescript
// Source: Both existing detail pages (identical implementation)
// This helper is duplicated in both pages. During decomposition, it will be used
// by multiple sub-components within each page. Options:
// (a) Define in parent, pass as prop (unnecessary coupling)
// (b) Define in a shared utility file (e.g., src/lib/utils.ts or src/utils/formatDate.ts)
// (c) Duplicate in each sub-component that needs it
// Recommendation: Option (b) -- extract to a shared utility since it's identical
// across both pages and will be needed by 3+ sub-components each.
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr + 'Z');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| React class component ErrorBoundary | Next.js error.tsx file convention | Next.js 13 (2022) | No need for class components; file-based, automatic |
| global-error only in production | global-error renders in dev too | Next.js 15.2 | Easier to test error boundaries during development |
| Pages Router _error.js | App Router error.tsx per segment | Next.js 13 (2022) | Granular per-route error handling |

**Deprecated/outdated:**
- `_error.js` / `_error.tsx` (Pages Router): Not applicable -- this project uses App Router exclusively

## Open Questions

1. **Shared formatDate utility location**
   - What we know: Both pages have identical `formatDate` implementations. After decomposition, 3+ sub-components per page need it.
   - What's unclear: Whether to use `src/lib/utils.ts`, `src/utils/formatDate.ts`, or another location.
   - Recommendation: Extract to `src/lib/formatDate.ts` (simple named export). The planner can decide the exact path. This is within Claude's discretion.

2. **Delete confirmation modal sharing**
   - What we know: The tote page has two delete confirmation modals (delete tote, delete item from list). The item page has one. All use identical modal markup patterns.
   - What's unclear: Whether to create a shared `ConfirmDialog` component in `src/components/` or keep them inline in each sub-component.
   - Recommendation: Keep inline for now (matches user's "no new features" constraint). A shared ConfirmDialog could be a follow-up improvement. This is within Claude's discretion per CONTEXT.md.

3. **QR_SIZES constant and QrLabelSize type location**
   - What we know: These are tote-page-specific (per CONTEXT.md code_context). After extraction, they belong in QrLabel.tsx.
   - What's unclear: Nothing -- this is straightforward.
   - Recommendation: Co-locate in `_components/QrLabel.tsx`.

## Sources

### Primary (HIGH confidence)
- Next.js official docs: error.tsx file convention - https://nextjs.org/docs/app/api-reference/file-conventions/error (verified version 16.1.6, last updated 2026-02-27)
- Codebase analysis: Direct reading of all source files (tote detail: 1168 lines, item detail: 1280 lines, ErrorDisplay: 85 lines, PhotoUpload: 178 lines, all route directories, types, layout, package.json)

### Secondary (MEDIUM confidence)
- Next.js error handling guide - https://nextjs.org/docs/app/getting-started/error-handling

### Tertiary (LOW confidence)
- None -- all findings verified against primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries; all based on existing codebase analysis and Next.js built-in conventions
- Architecture: HIGH - Decomposition plan derived from direct analysis of both page files (read every line); patterns match Phase 2's successful photo component extraction
- Pitfalls: HIGH - Identified from actual code patterns (toast flow, escape handlers, state ownership) by reading the existing implementations

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable -- no fast-moving dependencies)
