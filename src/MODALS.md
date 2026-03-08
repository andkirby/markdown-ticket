# Modals & Overlays

## Standards

### Backdrop Opacity
**ALL modals MUST use `bg-black/50`**

```tsx
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
```

### Required Behaviors
1. **Close on Escape** key
2. **Close on backdrop click** (click-outside)
3. **Prevent body scroll** when open
4. **Restore body scroll** when closed
5. **Trap focus** within modal (accessibility)
6. **Return focus** to trigger element on close (accessibility)
7. **ARIA attributes**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`

### z-Index
- Modals: `z-50`
- Toast notifications: `z-[100]`

## Patterns

### Full-Screen Overlay (Panels/Selectors)

```tsx
const handleBackdropClick = (e: React.MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('[data-testid="modal-content"]')) {
    onClose()
  }
}

return (
  <div className="fixed inset-0 z-50" onClick={handleBackdropClick}>
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
    <div className="relative flex items-center justify-center min-h-screen pointer-events-none">
      <div
        data-testid="modal-content"
        onClick={e => e.stopPropagation()}
        className="pointer-events-auto relative max-w-4xl w-full mx-4 bg-white dark:bg-slate-900 rounded-2xl"
      >
        {/* Content */}
      </div>
    </div>
  </div>
)
```

### Centered Modal (Forms/Confirmations)

```tsx
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
  <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md mx-4">
    {/* Content */}
  </div>
</div>
```

### Reusable Component

```tsx
import { Modal } from '@/components/UI/Modal'

<Modal isOpen={show} onClose={() => setShow(false)} size="lg">
  <ModalHeader>Title</ModalHeader>
  <ModalBody>Content</ModalBody>
  <ModalFooter>Actions</ModalFooter>
</Modal>
```

## Examples

| Component | Location |
|-----------|----------|
| UI/Modal | `src/components/UI/Modal.tsx` |
| RouteErrorModal | `src/components/RouteErrorModal.tsx` |
| AddProjectModal | `src/components/AddProjectModal/` |
| ProjectBrowserPanel | `src/components/ProjectSelector/` |

## Anti-Patterns

❌ **Different backdrop opacities:** Always use `bg-black/50`
❌ **Forgetting click-outside-to-close**
❌ **Blocking scroll without restoring it**
❌ **Arbitrary z-index values:** Use `z-50` for modals

## Quick Checklist

- [ ] `bg-black/50` backdrop
- [ ] Escape to close
- [ ] Click outside to close
- [ ] `pointer-events-none` on container
- [ ] `pointer-events-auto` on content
- [ ] Body scroll prevention
