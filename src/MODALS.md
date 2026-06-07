# Modals & Overlays

## Base Component

**All modals MUST use `<Modal>` from `src/components/ui/Modal.tsx`.**

```tsx
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal'
```text

Do NOT hand-roll `fixed inset-0` overlays. The base Modal handles:
- Portal rendering via `createPortal`
- Backdrop (`bg-black/50`)
- Escape to close
- Click-outside to close
- Body scroll lock
- Focus management

## Vertical Positioning — No-Jump Architecture

Modals are **top-anchored** by default. The modal starts at a fixed offset from the top of the viewport (`10dvh`) and grows downward. When content shrinks (search filtering, tab switching), only the bottom edge retracts — the top never moves.

This prevents the "jump" that occurs with vertically-centered modals when their height changes dynamically.

### When content modals resize

Content modals have two layout modes:

**1. Free-growing (long documents)** — Ticket Viewer

The modal extends below the viewport. The outer overlay (`.modal`) scrolls the whole dialog.
- Use `className="p-0"` on ModalBody
- No `flex-1` or `overflow-y-auto` on inner content — let it grow naturally
- No-jump guarantee: top-anchoring means only the bottom edge retracts when content shrinks

**2. Constrained (fixed chrome + scrollable list)** — Project Browser, Quick Search

The modal body is capped at 80dvh. Header stays pinned, inner content scrolls.

```tsx
<ModalBody className="modal__body--constrained">
  {/* Fixed header — stays pinned */}
  <ModalHeader title="..." onClose={close} />

  {/* Scrollable content — see STYLING.md "Scrollable Regions" for recipe */}
  <ScrollArea type="hover" scrollHideDelay={600}
    className="flex-1 min-h-0 overflow-hidden">
    <div className="p-4">...</div>
  </ScrollArea>
</ModalBody>
```

`.modal__body--constrained` sets `display: flex; flex-direction: column; height: 80dvh; overflow: hidden`. The ScrollArea fills the remaining space after the header.

Do NOT use for forms or long-document modals (settings, ticket viewer) — those should grow freely.

### Opt-in centering for static modals

Small static-content modals (alerts, confirms — Pattern C) can opt into vertical centering since their content never changes and won't jump:

```tsx
<Modal size="sm" overlayClassName="modal--center">
```

**Do NOT use `modal--center`** on modals whose content changes after opening.

## Required Behaviors

1. **Close on Escape** key
2. **Close on backdrop click** (click-outside)
3. **Prevent body scroll** when open
4. **Restore body scroll** when closed
5. **Trap focus** within modal (accessibility)
6. **Return focus** to trigger element on close (accessibility)
7. **ARIA attributes**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`

## z-Index

- Modals: `z-50`
- Toast notifications: `z-[100]`

## Sizes

| Size | Max width | Use for |
|------|-----------|---------|
| `sm` | `sm:max-w-lg` | Confirmations, alerts |
| `md` | `sm:max-w-xl` | Simple forms |
| `lg` | `sm:max-w-3xl` | Project forms |
| `xl` | `sm:max-w-5xl` | Default modal width, ticket viewer, search, settings |

The default modal width is `xl`. Use `sm`, `md`, or `lg` explicitly for dialogs that should stay narrower.

## Spacing Standard

All modals follow the **tight layout** (ticket viewer style):

| Component | Default padding | Border |
|-----------|----------------|--------|
| `ModalHeader` | `px-4 py-3` | `border-b border-gray-200 dark:border-gray-700` |
| `ModalBody` | `p-4` | none |
| `ModalFooter` | `px-4 py-3` | `border-t border-gray-200 dark:border-gray-700` |

**Do NOT** use `p-6` in any modal component. The tight layout keeps modals compact and visually consistent.

For content modals (Pattern B), use `className="modal__body--constrained"` which sets `p-0 flex flex-col` — header and tabs stay pinned, inner content scrolls. Sections manage their own padding:
- Compact bars: `px-4 py-3`
- Content areas: `px-4 py-4 sm:px-5`

## Layout Patterns

### Pattern A: Standard Form Modal (header + body + footer)

For: forms with actions, settings with tabs.

```tsx
<Modal isOpen={show} onClose={close}>
  <ModalHeader title="Title" onClose={close} />
  <ModalBody>
    {/* Form content — padded by default p-4 */}
  </ModalBody>
  <ModalFooter>
    <Button onClick={close}>Cancel</Button>
    <Button onClick={submit}>Save</Button>
  </ModalFooter>
</Modal>
```text

### Pattern B: Content Modal (no header, own close button)

For: ticket viewer, search — content-rich modals that manage their own chrome.

```tsx
<Modal isOpen={show} onClose={close} size="xl">
  <ModalBody className="p-0">
    {/* Long-document modal: grows freely, outer overlay scrolls */}
    {/* Close button: absolute right-3 top-3 z-20 */}
  </ModalBody>
</Modal>
```

For constrained modals with fixed chrome + scrollable content, use `modal__body--constrained`:

```tsx
<Modal isOpen={show} onClose={close} size="xl">
  <ModalBody className="modal__body--constrained">
    <ModalHeader title="..." onClose={close} />
    <div className="flex-1 overflow-y-auto">...</div>
  </ModalBody>
</Modal>
```

- Free-growing: `className="p-0"` — content grows, outer overlay scrolls
- Constrained: `className="modal__body--constrained"` — fixed chrome, internal scrolling, capped at 80dvh
- Close button: absolutely positioned `right-3 top-3 z-20`, 8×8 rounded button
- Content sections separated by `border-b border-gray-200 dark:border-gray-700`
- Each section manages its own padding (`px-4 py-3` etc.)

### Pattern C: Alert / Confirmation (small, centered)

For: error pages, confirm dialogs, one-prompt modals.

```tsx
<Modal isOpen={show} onClose={close} size="sm" overlayClassName="modal--center">
  <ModalBody>
    <div className="flex items-center space-x-3 mb-4">
      <AlertTriangle className="h-6 w-6 text-destructive" />
      <h1 className="modal__headline">Confirm Action</h1>
    </div>
    <p className="text-muted-foreground mb-4">{message}</p>
    <ModalFooter justify="end">
      <Button onClick={close}>Cancel</Button>
      <Button onClick={confirm}>Confirm</Button>
    </ModalFooter>
  </ModalBody>
</Modal>
```text

- Uses ModalBody with default `p-4` padding
- Icon + title on one line, description below, actions at bottom
- No ModalHeader — the icon+title pair replaces it for small modals
- `overlayClassName="modal--center"` for vertical centering (safe because content is static)

## Headline — `.modal__headline`

Every modal title uses `<h1 className="modal__headline">` for consistent typography:

- **Element**: `<h1>` — semantic top-level heading inside the dialog
- **Class**: `.modal__headline` — `text-lg font-semibold leading-6 text-gray-900 dark:text-white` (18px)
- **Never** write inline font classes on modal titles — always use `.modal__headline`

### Via ModalHeader (Pattern A)

`ModalHeader` renders the `<h1>` automatically:

```tsx
<ModalHeader title="Settings" onClose={close} />
// → <h1 class="modal__headline">Settings</h1>
```

### Manual (Patterns B, C)

When composing headers manually, use the same class:

```tsx
<h1 className="modal__headline">Discard Changes?</h1>
```

Never use `<h2>`, `<h3>`, or inline font classes for modal titles.

## Close Button Styles

| Pattern | Style | Position |
|---------|-------|----------|
| Pattern A (ModalHeader) | Built into ModalHeader, `h-8 w-8` | Top-right of header |
| Pattern B (content) | `absolute right-3 top-3 z-20 h-8 w-8` | Overlays content |
| Pattern C (alert) | None (use footer Cancel button) | — |

## Content Section Rules

When using Pattern B (content modal), sections follow the ticket viewer style:

```text
┌─────────────────────────────────┐
│ Section 1 (border-b)       [×]  │  ← px-4 py-3 compact bar
├─────────────────────────────────┤
│ Section 2 (border-b)            │  ← px-4 py-2.5 secondary bar
├─────────────────────────────────┤
│ Section 3                       │  ← px-4 tab bar
├─────────────────────────────────┤
│ Content area                    │  ← px-4 py-4 sm:px-5
│                                 │  ← no border-b on last section
└─────────────────────────────────┘
```text

- Separators: `border-b border-gray-200 dark:border-gray-700`
- Compact bars: `px-4 py-3`
- Secondary bars: `px-4 py-2.5`
- Content areas: `px-4 py-4 sm:px-5`
- Last section has no bottom border

## Backdrop

**ALL modals MUST use `bg-black/50`** — handled by the base Modal component.

For backdrop blur (QuickSearch, ProjectBrowser), pass `overlayClassName="backdrop-blur-sm"`.

## Migration Guide

If you find a hand-rolled modal (`fixed inset-0` in component JSX):

1. Replace with `<Modal isOpen={...} onClose={...} size="...">`
2. Move content into `<ModalBody>` (or ModalHeader + ModalBody)
3. Remove manual backdrop, escape handler, body scroll lock
4. Remove manual `createPortal` call
5. Pick the right pattern (A, B, or C) for the modal's content

## Anti-Patterns

❌ **Hand-rolling `fixed inset-0 bg-black/50`** — use `<Modal>`
❌ **Different backdrop opacities** — always `bg-black/50`
❌ **Using `p-6` padding** — always use tight `px-4 py-3` / `p-4`
❌ **Forgetting click-outside-to-close** — base Modal handles this
❌ **Manual `createPortal`** — base Modal handles this
❌ **Arbitrary z-index values** — base Modal uses `z-50`
❌ **Hardcoded `bg-white dark:bg-gray-800`** — use `bg-white dark:bg-slate-900` or just let Modal handle it
❌ **Inconsistent border colors** — always `border-gray-200 dark:border-gray-700`
❌ **Using `<h2>`, `<h3>` or inline font classes for modal titles** — always `<h1 className="modal__headline">`

## Quick Checklist

- [ ] Uses `<Modal>` from `ui/Modal.tsx` (no hand-rolled overlay)
- [ ] Correct pattern selected (A, B, or C)
- [ ] Tight spacing: `px-4 py-3` header/footer, `p-4` body (or `p-0` for content modals)
- [ ] `bg-black/50` backdrop (handled by Modal)
- [ ] Escape to close (handled by Modal)
- [ ] Click outside to close (handled by Modal)
- [ ] Body scroll prevention (handled by Modal)
- [ ] `data-testid` on Modal root
- [ ] Border color: `border-gray-200 dark:border-gray-700`
