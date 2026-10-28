import type { RefObject } from 'react'
import { useCallback, useEffect, useLayoutEffect } from 'react'

interface SearchKeyboardOptions {
  isOpen: boolean
  container: RefObject<HTMLDivElement>
  selectedIndex: number
  setSelectedIndex: (index: number) => void
  total: number
  resultIdentity: string
  onOpen: () => void
}

/** Preserve native traversal inside the boundary and leave portalled popovers to Radix. */
function wrapTabBoundary(event: React.KeyboardEvent, container: HTMLElement | null) {
  if (!container?.contains(event.target as Node))
    return
  const controls = [...container.querySelectorAll<HTMLElement>('input, button, a[href], select, textarea, summary, [tabindex]')]
    .filter(control => control.tabIndex >= 0 && !control.matches(':disabled') && control.getClientRects().length > 0)
  const first = controls[0]
  const last = controls[controls.length - 1]
  const boundary = event.shiftKey ? first : last
  const target = event.shiftKey ? last : first
  if (target && document.activeElement === boundary) {
    event.preventDefault()
    target.focus({ preventScroll: true })
  }
}

export function useQuickSearchKeyboard({ isOpen, container, selectedIndex, setSelectedIndex, total, resultIdentity, onOpen }: SearchKeyboardOptions) {
  useLayoutEffect(() => {
    if (!isOpen)
      return
    // Layout runs before the input's passive autofocus, preserving the real opener.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    return () => {
      if (opener?.isConnected)
        opener.focus({ preventScroll: true })
    }
  }, [isOpen])

  useEffect(() => {
    container.current?.querySelector<HTMLElement>('.search-result[data-selected="true"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [container, selectedIndex, resultIdentity])

  const onInputKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.nativeEvent.isComposing)
      return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setSelectedIndex(Math.max(0, Math.min(selectedIndex + step, total - 1)))
    }
    else if (event.key === 'Enter') {
      event.preventDefault()
      onOpen()
    }
  }, [selectedIndex, setSelectedIndex, total, onOpen])

  const onActionKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Tab') {
      wrapTabBoundary(event, container.current)
      return
    }
    if (event.key !== 'F6')
      return
    event.preventDefault()
    event.stopPropagation()
    const input = container.current?.querySelector<HTMLInputElement>('[data-testid="quick-search-input"]')
    const selected = container.current?.querySelector<HTMLElement>('.search-result[data-selected="true"]')
    const primary = selected?.matches('button') ? selected : selected?.querySelector<HTMLButtonElement>('.search-result__select')
    ;(event.shiftKey ? input : primary ?? input)?.focus()
  }, [container])

  return { onInputKeyDown, onActionKeyDown }
}
