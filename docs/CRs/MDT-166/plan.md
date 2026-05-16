# MDT-166 Implementation Plan: Standardize Modal Components

## Current State Audit

### Already using `<Modal>` (no changes needed)
| Modal | Pattern | Notes |
|-------|---------|-------|
| TicketViewer | B (content) | Reference pattern. `ModalBody p-0`, own close btn |
| SettingsModal | A (form) | `ModalHeader` + `ModalBody p-0` with tabs |
| ResolutionDialog | A (form) | Full `ModalHeader` + `ModalBody` + `ModalFooter` |
| DirectTicketAccess | — | Delegates to RouteErrorModal |

### Hand-rolled (need migration) — 5 modals, 8 overlay instances
| Modal | Lines | Pattern to use | Complexity | Risk |
|-------|-------|----------------|------------|------|
| RouteErrorModal | 49 | C (alert) | **Low** | None |
| FolderBrowserModal | 260 | A (form) | **Low** | Low — simple header/body/footer |
| QuickSearchModal | 200 | B (content) | **Medium** | Medium — has its own escape/click-outside hooks that must be removed |
| ProjectBrowserPanel | 280 | B (content) | **Medium** | Low — straightforward panel layout |
| AddProjectModal | 450 | A (form) + C (alert) ×4 | **High** | Highest — 4 sub-dialogs (confirm-close, confirm-create, success), complex form state |

## Migration Order (easiest → hardest)

### Step 1: RouteErrorModal → Pattern C
**File**: `src/components/RouteErrorModal.tsx`
**What changes**:
-  Remove: outer `<div className="fixed inset-0 ...">`
-  Remove: `<div className="bg-card border rounded-lg p-6 max-w-md mx-4">`
-  Replace with: `<Modal isOpen={true} onClose={onClose ?? handleGoHome} size="sm">`
-  Wrap content in `<ModalBody>`
-  Use `<ModalFooter>` for the buttons
-  Add `import { Modal, ModalBody, ModalFooter } from './ui/Modal'`
-  The modal is always rendered (no `isOpen` prop currently), so the parent must control visibility OR we add an `isOpen` wrapper

**Gotcha**: `RouteErrorModal` has no `isOpen` prop — it always renders when mounted. The parent (`DirectTicketAccess`) mounts it conditionally. We can either:
  - (a) Keep the current pattern: always-open Modal with `isOpen={true}`, OR
  - (b) Add `isOpen` prop and have parent control it. **Prefer (a)** to minimize parent changes.

**Verification**: Error page still shows centered alert with icon + Go Home button.

- --

### Step 2: FolderBrowserModal → Pattern A
**File**: `src/components/AddProjectModal/components/FolderBrowserModal.tsx`
**What changes**:
-  Remove: outer `<div className="fixed inset-0 ...">`
-  Remove: `<div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl ...">`
-  Replace with: `<Modal isOpen={isOpen} onClose={onClose} size="lg">`
-  Header section → `<ModalHeader title={title} description={pathDisplay} onClose={onClose} />`
  - The "Current: /path" subtitle goes in `description`
-  Content (ScrollArea) → `<ModalBody>` (keep `p-0` for the ScrollArea)
-  Footer → `<ModalFooter justify="between">` with selected path + Cancel/Select buttons
-  Add `import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal'`

**Gotcha**: The close button is currently a `×` text in a ghost Button. `ModalHeader` provides a proper SVG X icon — this is an improvement.
**Gotcha 2**: Dark mode uses `bg-gray-800` but base Modal uses `bg-white dark:bg-slate-900`. This is fine — it's the standard.

**Verification**: Folder browsing works, double-click navigation, parent directory, select folder.

- --

### Step 3: QuickSearchModal → Pattern B
**File**: `src/components/QuickSearch/QuickSearchModal.tsx`
**What changes**:
-  Remove: `createPortal` import and call
-  Remove: escape key handler useEffect (base Modal handles)
-  Remove: click-outside handler useEffect (base Modal handles)
-  Remove: `document.body.style.overflow = 'hidden'` (base Modal handles)
-  Remove: `modalRef` (base Modal handles click-outside internally)
-  Remove: outer `<div className="fixed inset-0 z-50">` and backdrop div
-  Replace with: `<Modal isOpen={isOpen} onClose={onClose} size="xl">`
-  Content: `<ModalBody className="p-0">`
-  Keep: the search input section with `border-b`, results section
-  Keep: all the query mode logic, keyboard navigation, cross-project search

**Gotcha**: QuickSearch uses `backdrop-blur-sm` on the backdrop. Base Modal uses plain `bg-black bg-opacity-50`. We should either:
  - (a) Accept losing backdrop-blur for consistency, OR
  - (b) Add `overlayClassName` support to base Modal (it already has this prop!). Use `overlayClassName="backdrop-blur-sm"` to keep the blur.
  **Prefer (b)** — `overlayClassName` already exists on Modal, just not used.

**Gotcha 2**: QuickSearch positions content at `pt-[15vh]` (top-biased), not centered. Base Modal uses `items-center`. We can override with `overlayClassName` to add a custom class, OR accept centering. The search UX actually benefits from top-positioning (like Spotlight). We should add an `align` prop to Modal, or use `overlayClassName` to override. **Simplest: use `overlayClassName="backdrop-blur-sm"` and accept centering for now.** The content max-height will keep it from being too far down.

**Actually** — looking at the base Modal layout:

```html
<div className="flex min-h-[100dvh] items-center justify-center p-4">
```

This centers vertically. For QuickSearch, we want `items-start pt-[15vh]`. We'd need to either:
-  Override via a className on the inner flex, OR
-  Accept the centered layout (it still looks fine for a search dialog)

**Decision**: Accept centered layout. The visual difference is minor and consistency wins.

**Verification**: Cmd+K opens search, type query, arrow keys navigate, Enter selects, Escape closes, click outside closes.

- --

### Step 4: ProjectBrowserPanel → Pattern B
**File**: `src/components/ProjectSelector/ProjectBrowserPanel.tsx`
**What changes**:
-  Remove: escape key handler useEffect
-  Remove: body scroll lock useEffect
-  Remove: outer `<div className="fixed inset-0 z-50">` and backdrop div
-  Remove: `<div className="relative flex items-start justify-center pt-20 ...">`
-  Replace with: `<Modal isOpen={isOpen} onClose={onClose} size="xl">`
-  Content: `<ModalBody className="p-0">`
-  Header: keep the existing header block (title + search input) as a `border-b` section inside ModalBody
-  Close button: keep existing SVG close button (Pattern B style)
-  Grid of project cards stays as-is

**Gotcha**: Uses `backdrop-blur-sm` — same as QuickSearch. Use `overlayClassName="backdrop-blur-sm"`.
**Gotcha 2**: Has custom `handleBackdropClick` that checks `closest('[data-testid="project-panel-content"]')`. Base Modal's click-outside uses `modalRef.contains()`. The behavior is equivalent — clicking outside the modal content closes it.

**Verification**: Project launcher opens panel, search filters projects, click selects, favorites shown first, escape closes.

- --

### Step 5: AddProjectModal → Pattern A (main) + Pattern C ×3 (sub-dialogs)
**File**: `src/components/AddProjectModal/AddProjectModal.tsx`
**What changes**:

#### 5a. Main form modal
-  Remove: outer `<div className="fixed inset-0 ...">`
-  Remove: `<div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl ...">`
-  Replace with: `<Modal isOpen={isOpen} onClose={handleSmartClose} size="lg">`
-  Header section → `<ModalHeader title={editMode ? 'Edit Project' : 'Add New Project'} onClose={handleSmartClose} />`
-  ScrollArea content → `<ModalBody>` (keep ScrollArea)
-  Footer → `<ModalFooter>` with Cancel/Submit buttons
-  Remove the manual close button (ModalHeader provides it)
-  Create `handleSmartClose` that checks `hasFormData()` to decide between direct close and confirm dialog

**Gotcha**: The overlay click handler currently does nothing (`handleOverlayClick` is a no-op). The base Modal will close on overlay click by default. We need `closeOnOverlayClick={false}` to preserve this behavior — users shouldn't accidentally lose form data.

#### 5b. Confirm Close dialog → Pattern C
-  Remove: `<div className="fixed inset-0 ...">`
-  Replace with: `<Modal isOpen={showConfirmClose} onClose={() => setShowConfirmClose(false)} size="sm">`
-  Wrap in `<ModalBody>` + `<ModalFooter>`

#### 5c. Confirm Creation dialog → Pattern C
-  Same pattern as 5b

#### 5d. Success dialog → Pattern C
-  Same pattern as 5b

**Note**: All 4 dialogs currently stack on top of each other using separate `fixed inset-0` divs. After migration, only one `<Modal>` is visible at a time (controlled by state). The base Modal's `createPortal` ensures each renders independently.

**Verification**: Full create/edit project flow, all 4 sub-dialogs, form validation, escape doesn't lose data.

- --

## Base Modal Changes

The base `<Modal>` component needs one tweak:

### Add `backdrop-blur-sm` as default (or optional)
Currently: `<div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity">`

Options:
-  (a) Keep as-is, use `overlayClassName` per-modal when blur is desired
-  (b) Add `blur` prop to Modal

**Decision**: (a) — `overlayClassName` already exists. QuickSearch and ProjectBrowser will pass `overlayClassName="backdrop-blur-sm"`. No base Modal changes needed.

### Actually — fix the backdrop class
Currently uses `bg-black bg-opacity-50` (Tailwind v3 syntax). Ticket says standardize to `bg-black/50`. Let's fix this in the base Modal for consistency:

```diff
-  className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
+  className="fixed inset-0 bg-black/50 transition-opacity"
```

- --

## Files Changed Summary

| File | Change |
|------|--------|
| `src/components/ui/Modal.tsx` | Fix backdrop to `bg-black/50` |
| `src/components/RouteErrorModal.tsx` | Migrate to Pattern C |
| `src/components/AddProjectModal/components/FolderBrowserModal.tsx` | Migrate to Pattern A |
| `src/components/QuickSearch/QuickSearchModal.tsx` | Migrate to Pattern B |
| `src/components/ProjectSelector/ProjectBrowserPanel.tsx` | Migrate to Pattern B |
| `src/components/AddProjectModal/AddProjectModal.tsx` | Migrate to Pattern A + 3× Pattern C |

**Total**: 6 files modified, 0 new files.

- --

## Verification Checklist

After all migrations:

```bash
# 1. No hand-rolled fixed inset-0 outside of base Modal
grep -r "fixed inset-0" src/components --include="*.tsx"
# Should only return: src/components/ui/Modal.tsx (×1 for the overlay, ×1 for the backdrop)

# 2. No manual createPortal outside of base Modal
grep -r "createPortal" src/components --include="*.tsx"
# Should only return: src/components/ui/Modal.tsx

# 3. No manual body scroll lock outside of base Modal
grep -r "body.style.overflow" src/components --include="*.tsx"
# Should only return: src/components/ui/Modal.tsx

# 4. TypeScript compiles
bun run validate:ts:all

# 5. Manual visual checks:
# - Route error page (navigate to /invalid-route)
# - Cmd+K quick search
# - Project launcher panel
# - Add Project form + all sub-dialogs
# - Edit Project form
# - Folder browser
# - Settings modal (unchanged, regression check)
# - Ticket viewer (unchanged, regression check)
```

- --

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| AddProjectModal sub-dialogs stacking | Each uses its own `isOpen` state — only one visible at a time, same as current |
| QuickSearch loses top-positioning | Accept centered layout — consistent with all other modals |
| Overlay click closes AddProject form | Set `closeOnOverlayClick={false}` |
| Dark mode color mismatch (`bg-gray-800` vs `bg-slate-900`) | Base Modal uses `bg-white dark:bg-slate-900` — migrating TO the standard |
| Lost `backdrop-blur-sm` on QuickSearch/ProjectBrowser | Use `overlayClassName="backdrop-blur-sm"` — already supported |
| E2E test breakage | All `data-testid` attributes preserved in migrations |
