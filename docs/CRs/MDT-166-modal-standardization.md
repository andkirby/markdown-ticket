---
code: MDT-166
status: Proposed
type: Technical Debt
priority: Medium
---

# Standardize modal components to base Modal pattern

## Problem

- 5 of 9 modal surfaces hand-roll their own `fixed inset-0` overlays instead of using the existing `<Modal>` component from `ui/Modal.tsx`
- Inconsistent gap/spacing patterns: AddProjectModal uses `p-6 border-b`, TicketViewer uses `p-0` with section-managed padding, SettingsModal uses `p-6` ModalBody, RouteErrorModal uses `p-6` raw
- ModalHeader is only used by SettingsModal — all others either skip it or build their own header
- Close button styles vary: ModalHeader has `h-8 w-8`, TicketViewer has `absolute right-3 top-3 z-20 h-8 w-8`, AddProjectModal uses a ghost Button
- Backdrop inconsistency: some use `bg-black bg-opacity-50`, others use `bg-black/50`, one uses `backdrop-blur-sm`

## Affected Areas

- `src/components/ui/Modal.tsx` — base component may need tweaks
- `src/components/AddProjectModal/AddProjectModal.tsx` — worst offender (5 hand-built overlays)
- `src/components/AddProjectModal/components/FolderBrowserModal.tsx`
- `src/components/QuickSearch/QuickSearchModal.tsx`
- `src/components/RouteErrorModal.tsx`
- `src/components/ProjectSelector/ProjectBrowserPanel.tsx`
- `src/MODALS.md` — updated canonical patterns

## Desired Outcome

### Success Conditions

- All modal surfaces use `<Modal>` from `ui/Modal.tsx` (no hand-rolled `fixed inset-0` anywhere in components)
- Consistent gap style matching TicketViewer's tight layout: `ModalBody p-0`, sections manage own padding with `border-b` separators
- One close button pattern: `absolute right-3 top-3 z-20 h-8 w-8 rounded-md` for content modals, built into ModalHeader for form modals
- Uniform backdrop: `bg-black/50` (handled by base Modal)
- `MODALS.md` documents three canonical patterns (A: form, B: content, C: alert) with examples

### Scope

**In scope:**
- Migrate all 5 hand-rolled modals to use `<Modal>`
- Standardize gap/spacing to TicketViewer's tight style
- Unify close button styling
- Update `MODALS.md`

**Out of scope:**
- Redesigning any modal's content or UX flow
- Adding new modals
- Changing TicketViewer (it's already the reference pattern)

## Verification

- [ ] `grep -r "fixed inset-0" src/components --include="*.tsx"` returns only `ui/Modal.tsx`
- [ ] All modals render correctly (visual check)
- [ ] No regressions in escape-to-close, click-outside-to-close, body scroll lock
- [ ] `MODALS.md` updated with canonical patterns
