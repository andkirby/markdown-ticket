import type { SortMenuVariant } from './index'
import * as React from 'react'

/**
 * Container-driven variant selection for the Documents navigation toolbar.
 * The panel is user-resizable (18–45% of the window), so the variant must
 * track the *container* width, not the viewport. Thresholds per
 * docs/design/surfaces/sort-menu.spec.md: A ≥ 300px, B 220–299px, C < 220px.
 *
 * @returns ref callback to attach to the measured element, and the variant
 *          for the current container width.
 */
export function useSortVariantByContainer(): {
  ref: (node: HTMLDivElement | null) => void
  variant: SortMenuVariant
} {
  const [node, setNode] = React.useState<HTMLDivElement | null>(null)
  const [variant, setVariant] = React.useState<SortMenuVariant>('b')

  React.useEffect(() => {
    if (!node || typeof ResizeObserver === 'undefined')
      return
    const measure = () => {
      const w = node.offsetWidth
      setVariant(w >= 300 ? 'a' : w >= 220 ? 'b' : 'c')
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [node])

  return { ref: setNode, variant }
}
