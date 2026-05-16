---
code: MDT-166
status: Done
type: Technical Debt
priority: Medium
---

# Standardize modal components to base Modal pattern

## What was done

### Phase 1 — Migration to `<Modal>` component
All 5 hand-rolled modals migrated to base `<Modal>` from `ui/Modal.tsx`:

| Modal | Pattern | Before |
|-------|---------|--------|
| RouteErrorModal | C (alert) | Hand-rolled overlay |
| FolderBrowserModal | A (form) | Hand-rolled overlay |
| QuickSearchModal | B (content) | Manual `createPortal` + escape/click-outside hooks |
| ProjectBrowserPanel | B (content) | Manual escape + body scroll lock |
| AddProjectModal | A + 3×C | 5 separate hand-rolled overlays |

Base Modal backdrop fixed: `bg-black bg-opacity-50` → `bg-black/50`.

### Phase 2 — Tight spacing standard
All modals now follow TicketViewer's compact layout (`px-4 py-3`):

| Component | Before | After |
|-----------|--------|-------|
| `ModalHeader` | `p-6` | `px-4 py-3` |
| `ModalBody` | `p-6` | `p-4` |
| `ModalFooter` | `p-6` | `px-4 py-3` |

Border colors normalized to `border-gray-200 dark:border-gray-700`.

### Phase 3 — CSS class extraction (STYLING.md BEM)
Extracted repeated inline Tailwind patterns to CSS classes:

- `.modal__header` / `.modal__body` / `.modal__footer` — layout
- `.modal__close--absolute` — single close button pattern (SVG sizing in CSS `.modal__close--absolute svg`)
- `.modal__title` / `.modal__description` — header text
- `.modal__section` / `.modal__section--sm` / `.modal__section--content` — content bars

Fixed `ModalHeader`/`ModalFooter` rendering `undefined` in className by switching to `cn()`.

### Phase 4 — Tab unification
Settings and TicketViewer tabs shared Radix Tabs primitives but had completely different styling.
Extracted shared CSS classes per STYLING.md:

- `.tab` — base trigger (font, colors, active `border-b-2 border-primary`)
- `.tab--fill` — modifier for equal-width triggers (settings)
- `.tab__list` — `Tabs.List` container (replaces `modal__section` for tabs)
- `.tab__content` — `Tabs.Content` container

TicketViewer: inline 200-char className → `tab mr-3 last:mr-0`.
Settings: `settings-tab-trigger` → `tab tab--fill`.

### Phase 5 — Close button unification
Eliminated `modal__close` (inline flex) in favor of single `modal__close--absolute` pattern:

- `ModalHeader` renders close button as `modal__close--absolute` (like ticket viewer)
- `modal__header` uses `modal__section pr-14` base — same height as ticket sections
- `ProjectBrowserPanel` converted to use `ModalHeader`
- Extracted `modal__container` for overlay flex layout

### Build fix
PostCSS `insertAfter` crash caused by malformed `.modal__title` block (missing closing brace).
Also inlined all `@apply` custom-class chains — Tailwind 3 cannot resolve custom classes
in `@apply` within the same `@layer components` block.

## Verification

- [x] `grep -r "fixed inset-0" src/components --include="*.tsx"` returns only `ui/Modal.tsx`
- [x] `grep -r "createPortal" src/components --include="*.tsx"` returns only `ui/Modal.tsx`
- [x] `grep -r "p-6" src/components/{ui/Modal,RouteError,Settings,AddProject,FolderBrowser,QuickSearch,ProjectSelector}*` returns 0 results
- [x] All modals render correctly (visual check via Playwright)
- [x] Settings modal tabs use `.tab` classes
- [x] Ticket viewer tabs use `.tab` classes
- [x] Single close button pattern (`modal__close--absolute`) across all modals
- [x] `bun run build` passes
- [x] No regressions in escape-to-close, click-outside-to-close, body scroll lock
- [x] `MODALS.md` updated with canonical patterns and tight spacing standard
