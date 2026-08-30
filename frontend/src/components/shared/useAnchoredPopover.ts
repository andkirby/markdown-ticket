import * as React from 'react'

/**
 * useAnchoredPopover — shared trigger-anchored popover behavior for header
 * controls (SortMenu, DensityMenu). Portaled-to-body popover positioned fixed
 * under the trigger's right edge (flips to left alignment on viewport
 * overflow); repositions on scroll/resize; closes on outside pointerdown and
 * Escape.
 *
 * @returns refs for the trigger button and popover element, open state with
 *          toggle/close setters, and the computed fixed position.
 */
export function useAnchoredPopover() {
  const [open, setOpen] = React.useState(false)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const popoverRef = React.useRef<HTMLDivElement>(null)

  const place = React.useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect)
      return
    const width = popoverRef.current?.offsetWidth ?? 220
    // Right-align the popover's right edge to the trigger's. This can never
    // overflow the viewport (rect.right <= innerWidth, width << innerWidth);
    // clamp to 4px for degenerate narrow viewports. (An earlier "flip to
    // left-align" branch here fired whenever the trigger sat in the right
    // half of the viewport and pushed wide panels past the right edge.)
    const left = Math.max(4, rect.right - width)
    setPosition({ top: rect.bottom + 4, left })
  }, [])

  const close = React.useCallback(() => setOpen(false), [])

  const toggle = React.useCallback(() => {
    setOpen((was) => {
      const next = !was
      if (next)
        queueMicrotask(place)
      return next
    })
  }, [place])

  React.useEffect(() => {
    if (!open)
      return
    place()
    const onDocChange = () => place()
    window.addEventListener('resize', onDocChange)
    window.addEventListener('scroll', onDocChange, true)
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !popoverRef.current?.contains(t))
        close()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape')
        close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('resize', onDocChange)
      window.removeEventListener('scroll', onDocChange, true)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, place, close])

  return { open, setOpen, toggle, close, position, place, triggerRef, popoverRef }
}
