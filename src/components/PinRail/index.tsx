/**
 * MDT-197: PinRail — vertical left rail of icon-only pinned tickets.
 *
 * Sibling of the content area in App.tsx. Owns the 48px left rail zone;
 * never a tenant of the header (board-filter-bar.spec.md owns the header).
 *
 * Visibility rules:
 * - empty pin set + no drag in progress → renders nothing (0px footprint)
 * - empty + a ticket drag in progress → reveals as a drop target (first-pin)
 * - ≥1 pin → full rail: label + divider + items + drop affordance
 *
 * Drop target: reuses the board's 'ticket' drag type. The whole rail accepts
 * drops; on drop, onPin(ticket) builds a PinItem using the current project
 * code (provided by App, since the Ticket model has no projectCode field).
 *
 * Read-only: drop is a no-op; click-to-open still works.
 */
import type { PinItem as PinItemData } from '@mdt/domain-contracts'
import type { Ticket } from '../../types'
import type { PinMetadata } from './PinItem'
import { useMemo } from 'react'
import { useDragLayer, useDrop } from 'react-dnd'
import { PinItem } from './PinItem'

export interface PinRailProps {
  pins: PinItemData[]
  canWrite: boolean
  /** Current project code — attached to dropped tickets (Ticket has no projectCode). */
  currentProjectCode: string | null
  /** Resolve metadata (title/status) for a pin, from live ticket data. */
  resolveMetadata: (pin: PinItemData) => PinMetadata | null
  onPin: (projectCode: string, ticketCode: string) => void
  onUnpin: (pin: PinItemData) => void
  onOpen: (pin: PinItemData) => void
}

export function PinRail({
  pins,
  canWrite,
  currentProjectCode,
  resolveMetadata,
  onPin,
  onUnpin,
  onOpen,
}: PinRailProps) {
  // Whether any drag is in progress. Drives the empty-rail drop-target reveal
  // (the first-pin case). Non-ticket drags are rejected by accept:'ticket'.
  const isDragging = useDragLayer(monitor => monitor.isDragging())

  const [{ isOver, canDrop }, dropRef] = useDrop(() => ({
    accept: 'ticket',
    canDrop: () => canWrite,
    drop: (item: { ticket: Ticket }) => {
      if (!canWrite || !currentProjectCode) {
        return
      }
      onPin(currentProjectCode, item.ticket.code)
    },
    collect: monitor => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }), [canWrite, currentProjectCode, onPin])

  const isEmpty = pins.length === 0
  // Render the rail when there are pins, OR when a drag is in progress (so
  // the user has a drop target for the very first pin). Otherwise: nothing.
  const visible = !isEmpty || (isDragging && canWrite)

  const dropActive = isOver && canDrop

  // Stable metadata map; recomputed only when pins change.
  const metadataMap = useMemo(() => {
    const m = new Map<string, PinMetadata | null>()
    for (const pin of pins) {
      m.set(`${pin.projectCode}\u{0000}${pin.ticketCode}`, resolveMetadata(pin))
    }
    return m
  }, [pins, resolveMetadata])

  if (!visible) {
    return null
  }

  return (
    <nav
      ref={dropRef}
      className={`pin-rail${dropActive ? ' pin-rail--drop-active' : ''}`}
      aria-label="Pinned tickets"
      data-testid="pin-rail"
      data-empty={isEmpty ? 'true' : 'false'}
    >
      {!isEmpty && (
        <>
          <div className="pin-rail__label">Pinned</div>
          <div className="pin-rail__divider" />
        </>
      )}

      <div className="pin-rail__list">
        {pins.map(pin => (
          <PinItem
            key={`${pin.projectCode}/${pin.ticketCode}`}
            pin={pin}
            metadata={metadataMap.get(`${pin.projectCode}\u{0000}${pin.ticketCode}`) ?? null}
            canWrite={canWrite}
            onOpen={onOpen}
            onUnpin={onUnpin}
          />
        ))}
        <div
          className={`pin-rail__drop-affordance${dropActive ? ' pin-rail__drop-affordance--active' : ''}`}
          aria-label="Drop a ticket here to pin it"
          data-testid="pin-drop-affordance"
        >
          +
        </div>
      </div>
    </nav>
  )
}
