# Modals & Overlays

## Base Component

**All modals MUST use `<Modal>` from `src/components/ui/Modal.tsx`.**

```tsx
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal'
```tsx

Do NOT hand-roll `fixed inset-0` overlays. The base Modal handles:
- Portal rendering via `createPortal`
- Backdrop (`bg-black/50`)
- Escape to close
- Click-outside to close
- Body scroll lock
- Focus management

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
| `md` | `sm:max-w-xl` | Settings, simple forms |
| `lg` | `sm:max-w-3xl` | Project forms |
| `xl` | `sm:max-w-5xl` | Ticket viewer, search |

## Layout Patterns

### Pattern A: Standard Form Modal (header + body + footer)

For: forms with actions, settings with tabs.

```tsx
<Modal isOpen={show} onClose={close} size="md">
  <ModalHeader title="Title" onClose={close} />
  <ModalBody>
    {/* Form content */}
  </ModalBody>
  <ModalFooter>
    <Button onClick={close}>Cancel</Button>
    <Button onClick={submit}>Save</Button>
  </ModalFooter>
</Modal>
```tsx

- ModalHeader: `p-6 border-b` with title + close button
- ModalBody: `p-6` padding
- ModalFooter: `p-6 border-t` with action buttons

### Pattern B: Content Modal (no header, own close button)

For: ticket viewer, search — content-rich modals that manage their own chrome.

```tsx
<Modal isOpen={show} onClose={close} size="xl">
  <ModalBody className="p-0">
    {/* Content owns its sections with border-b separators */}
    {/* Close button: absolute right-3 top-3 z-20 */}
  </ModalBody>
</Modal>
```tsx

- ModalBody: `className="p-0"` — no padding, content manages its own
- Close button: absolutely positioned `right-3 top-3 z-20`, 8×8 rounded button
- Content sections separated by `border-b border-gray-200 dark:border-gray-700`
- Each section manages its own padding (`px-4 py-3` etc.)

### Pattern C: Alert / Confirmation (small, centered)

For: error pages, confirm dialogs, one-prompt modals.

```tsx
<Modal isOpen={show} onClose={close} size="sm">
  <ModalBody>
    <div className="flex items-center space-x-3 mb-4">
      <AlertTriangle className="h-6 w-6 text-destructive" />
      <h3 className="text-lg font-semibold">Confirm Action</h3>
    </div>
    <p className="text-muted-foreground mb-6">{message}</p>
    <ModalFooter justify="end">
      <Button onClick={close}>Cancel</Button>
      <Button onClick={confirm}>Confirm</Button>
    </ModalFooter>
  </ModalBody>
</Modal>
```tsx

- Uses ModalBody with standard `p-6` padding
- Icon + title on one line, description below, actions at bottom
- No ModalHeader — the icon+title pair replaces it for small modals

## Close Button Styles

| Pattern | Style | Position |
|---------|-------|----------|
| Pattern A (ModalHeader) | Built into ModalHeader, `h-8 w-8` | Top-right of header |
| Pattern B (content) | `absolute right-3 top-3 z-20 h-8 w-8` | Overlays content |
| Pattern C (alert) | None (use footer Cancel button) | — |

## Content Section Rules

When using Pattern B (content modal), sections follow the ticket viewer style:

```tsx
┌─────────────────────────────────┐
│ Section 1 (border-b)       [×]  │  ← title/header bar
├─────────────────────────────────┤
│ Section 2 (border-b)            │  ← badges/metadata
├─────────────────────────────────┤
│ Section 3                       │  ← tabs
├─────────────────────────────────┤
│ Content area                    │  ← main content, no border-b
│                                 │
└─────────────────────────────────┘
```tsx

- Separators: `border-b border-gray-200 dark:border-gray-700`
- Section padding: `px-4 py-3` for compact bars, `px-4 py-4 sm:px-5` for content
- Last section has no bottom border

## Backdrop

**ALL modals MUST use `bg-black/50`** — handled by the base Modal component.

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
❌ **Forgetting click-outside-to-close** — base Modal handles this
❌ **Manual `createPortal`** — base Modal handles this
❌ **Arbitrary z-index values** — base Modal uses `z-50`
❌ **Hardcoded `bg-white dark:bg-gray-800`** — use `bg-white dark:bg-slate-900` or just let Modal handle it

## Quick Checklist

- [ ] Uses `<Modal>` from `ui/Modal.tsx` (no hand-rolled overlay)
- [ ] Correct pattern selected (A, B, or C)
- [ ] `bg-black/50` backdrop (handled by Modal)
- [ ] Escape to close (handled by Modal)
- [ ] Click outside to close (handled by Modal)
- [ ] Body scroll prevention (handled by Modal)
- [ ] `data-testid` on Modal root
