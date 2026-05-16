# MDT-166 Phase 2: Standardize Modal Spacing to Tight Style

## Problem

The Phase 1 migration moved all modals to `<Modal>` component, but spacing is inconsistent:

| Component | Header padding | Body padding | Border color |
|-----------|:---:|:---:|---|
| **TicketViewer** (reference) | `px-4 py-3 pr-14` (own header) | `p-0` | `border-gray-200 dark:border-gray-700` |
| ModalHeader (base) | `p-6` | — | `border-gray-200 dark:border-gray-700` |
| ModalBody (base) | — | `p-6` | — |
| ModalFooter (base) | — | — | `p-6 border-gray-200 dark:border-gray-700` |
| SettingsModal | `p-6` (ModalHeader) | `p-0` (override) | tabs: `border-gray-200 dark:border-gray-700` |
| AddProjectModal | `p-6` (ModalHeader) | `p-6` (ModalBody) + ScrollArea | footer: `p-6 border-gray-200 dark:border-gray-700` |
| FolderBrowserModal | `p-6` (ModalHeader) | `p-4` | footer: `p-6 border-gray-200 dark:border-gray-700` |
| ProjectBrowserPanel | `px-6 py-4` (own header) | `p-0` (override) | `border-slate-700` (inconsistent!) |
| QuickSearchModal | `p-0` (no header) | `p-0` | `border-gray-200 dark:border-gray-700` |

**Core issue**: The `ModalHeader`/`ModalBody`/`ModalFooter` components hardcode `p-6` padding. The TicketViewer tight style uses `px-4 py-3`. All modals should follow the tight style.

## Reference Style: TicketViewer Tight Layout

From `CompactTicketHeader.tsx` and `TicketDocumentTabs.tsx`:
- Header bar: `border-b border-gray-200 px-4 py-3 dark:border-gray-700`
- Secondary bar: `border-b border-gray-200 px-4 py-2.5 dark:border-gray-700`
- Tab bar: `border-b border-gray-200 px-4 dark:border-gray-700`
- Content: `px-4 py-4 sm:px-5`
- Close button: `absolute right-3 top-3 z-20`

## Plan

### Step 1: Update base Modal components to tight style

Change padding in `ui/Modal.tsx`:

| Component | Before | After |
|-----------|--------|-------|
| `ModalHeader` | `p-6 border-b` | `px-4 py-3 border-b` |
| `ModalBody` | `p-6` | `p-4` |
| `ModalFooter` | `p-6 border-t` | `px-4 py-3 border-t` |

This single change propagates to ALL modals that use these components.

### Step 2: Update consumers that override padding

| Modal | Current override | New override |
|-------|-----------------|-------------|
| TicketViewer | `ModalBody p-0` (sections own padding) | Keep `p-0` — already correct |
| SettingsModal | `ModalBody p-0` (tabs own padding) | Keep `p-0` — already correct |
| QuickSearchModal | `ModalBody p-0` (sections own padding) | Keep `p-0` — already correct |
| ProjectBrowserPanel | `ModalBody p-0` (own header `px-6 py-4`) | Change to `px-4 py-3` to match tight |
| AddProjectModal | `ModalBody p-6` via ScrollArea | Change inner `p-6` → `p-4` |
| FolderBrowserModal | `ModalBody p-4` | Now default, remove override |

### Step 3: Normalize border colors

Standardize to `border-gray-200 dark:border-gray-700` everywhere:

| Modal | Current | Fix |
|-------|---------|-----|
| ProjectBrowserPanel header | `border-slate-700` (dark) | `border-gray-700` |
| FolderBrowserModal content | `border-gray-200 dark:border-gray-600` | `border-gray-200 dark:border-gray-700` |

### Step 4: Update `.modal-*` CSS classes in `index.css`

The CSS classes should match the component defaults for consistency:

```css
.modal-header { @apply px-4 py-3 border-b; }
.modal-body   { @apply p-4; }
.modal-footer { @apply px-4 py-3 border-t; }
```

### Step 5: Update MODALS.md

Update Pattern A/B/C examples to reflect new tight spacing:
- ModalHeader: `px-4 py-3` (was `p-6`)
- ModalBody: `p-4` (was `p-6`), content modals still use `p-0`
- ModalFooter: `px-4 py-3` (was `p-6`)
- Section padding: `px-4 py-3` for compact bars, `px-4 py-4 sm:px-5` for content

### Step 6: Verify all modals render correctly

Visual check for each modal — spacing should be tighter but consistent.

## Files Changed

| File | Change |
|------|--------|
| `src/components/ui/Modal.tsx` | ModalHeader/Body/Footer padding → tight |
| `src/components/AddProjectModal/AddProjectModal.tsx` | Inner `p-6` → `p-4` |
| `src/components/ProjectSelector/ProjectBrowserPanel.tsx` | Header `px-6 py-4` → `px-4 py-3`, border color |
| `src/components/AddProjectModal/components/FolderBrowserModal.tsx` | Content border color |
| `src/index.css` | `.modal-header/body/footer` classes |
| `src/MODALS.md` | Update spacing examples |
