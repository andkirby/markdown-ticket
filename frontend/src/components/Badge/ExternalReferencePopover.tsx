import type { KeyboardEvent, ReactElement, ReactNode } from 'react'
import { useRef } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'

function isolate(event: { stopPropagation: () => void }) {
  event.stopPropagation()
}

function isolateKeyboard(event: KeyboardEvent) {
  if (['Enter', ' ', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key))
    event.stopPropagation()
}

export function ExternalReferencePopover({ trigger, label, children }: {
  trigger: ReactElement
  label: string
  children: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  return (
    <Popover>
      <PopoverTrigger asChild onClick={isolate} onPointerDown={isolate} onMouseDown={isolate} onKeyDown={isolateKeyboard}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        ref={panelRef}
        className="external-reference__panel"
        data-external-references
        data-testid="external-reference-details"
        tabIndex={-1}
        aria-label={label}
        align="start"
        onClick={isolate}
        onPointerDown={isolate}
        onEscapeKeyDown={isolate}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          const target = panelRef.current?.querySelector<HTMLAnchorElement>('a[href]') ?? panelRef.current
          target?.focus()
        }}
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}
