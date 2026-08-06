/**
 * MDT-197: PinRail — collapsible vertical left rail of icon-only pinned tickets.
 *
 * Sibling of the content area in App.tsx. Owns the left rail zone; never a
 * tenant of the header (board-filter-bar.spec.md owns the header).
 *
 * Three render states (gated by the browser-only `enabled` + `pinned` prefs):
 * - !enabled → renders nothing (0px; feature fully disabled in Settings).
 * - enabled && collapsed → a thin (~28px) strip with a Pin icon button. Always
 *   present when enabled, so content never "jumps" — it smoothly trades width.
 *   The strip is ALSO a drop target, so drag-to-pin works from collapsed.
 * - enabled && open → full 48px rail: pin-icon toggle + label + items + drop
 *   affordance.
 *
 * "Open" is true when: pinned (user toggled the pin icon on) OR a drag is in
 * progress (drag-reveal) OR the rail is hovered/focused. When unpinned and the
 * pointer leaves / focus moves away, it auto-collapses back to the strip.
 *
 * Drop target: reuses the board's 'ticket' drag type. On drop, onPin(ticket)
 * builds a PinItem using the current project code (provided by App, since the
 * Ticket model has no projectCode field). Read-only: drop is a no-op;
 * click-to-open still works.
 */
import type { PinItem as PinItemData } from '@mdt/domain-contracts'
import type { Ticket } from '../../types'
import type { PinMetadata } from './PinItem'
import { Pin, PinOff } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useDragLayer, useDrop } from 'react-dnd'
import { PinItem } from './PinItem'

export interface PinRailProps {
  pins: PinItemData[]
  canWrite: boolean
  /** Feature enabled (Settings → Board → Pin rail). When false, renders null. */
  enabled: boolean
  /** Pinned open (stays at 48px). When false, auto-collapses on blur/leave. */
  pinned: boolean
  /** Current project code — attached to dropped tickets (Ticket has no projectCode). */
  currentProjectCode: string | null
  /** Resolve metadata (title/status) for a pin, from live ticket data. */
  resolveMetadata: (pin: PinItemData) => PinMetadata | null
  onPin: (projectCode: string, ticketCode: string) => void
  onUnpin: (pin: PinItemData) => void
  onOpen: (pin: PinItemData) => void
  onTogglePinned: () => void
}

export function PinRail({
  pins,
  canWrite,
  enabled,
  pinned,
  currentProjectCode,
  resolveMetadata,
  onPin,
  onUnpin,
  onOpen,
  onTogglePinned,
}: PinRailProps) {
  // Hover/focus keeps an unpinned rail open; pointer leave collapses it again.
  const [hovered, setHovered] = useState(false)

  // Whether any drag is in progress. Reveals the rail from collapsed (drag-to-pin
  // works even when the rail is collapsed to the strip). Non-ticket drags are
  // rejected by accept:'ticket'.
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

  const dropActive = isOver && canDrop

  // Stable metadata map; recomputed only when pins change.
  const metadataMap = useMemo(() => {
    const m = new Map<string, PinMetadata | null>()
    for (const pin of pins) {
      m.set(`${pin.projectCode}\u{0000}${pin.ticketCode}`, resolveMetadata(pin))
    }
    return m
  }, [pins, resolveMetadata])

  // Feature fully disabled → no rail, no strip, 0px.
  if (!enabled) {
    return null
  }

  // Open when pinned (user toggle), hovered/focused, or a drag is in progress.
  const open = pinned || hovered || (isDragging && canWrite)

  // Collapsed strip: thin rail with just the pin-icon toggle. Still a drop target
  // (dropRef attached) so drag-to-pin works from collapsed.
  if (!open) {
    return (
      <nav
        ref={dropRef}
        className={`pin-rail pin-rail--collapsed${dropActive ? ' pin-rail--drop-active' : ''}`}
        aria-label="Pinned tickets (collapsed)"
        data-testid="pin-rail"
        data-state="collapsed"
      >
        <button
          type="button"
          className="pin-rail__toggle pin-rail__toggle--collapsed"
          aria-label="Show pinned tickets"
          aria-pressed={false}
          data-testid="pin-rail-toggle"
          onClick={onTogglePinned}
          onMouseEnter={() => setHovered(true)}
          onFocus={() => setHovered(true)}
        >
          <Pin className="pin-rail__toggle-icon" aria-hidden="true" />
        </button>
      </nav>
    )
  }

  // Open rail: toggle (filled, pinned) + label + items + drop affordance.
  return (
    <nav
      ref={dropRef}
      className={`pin-rail pin-rail--open${dropActive ? ' pin-rail--drop-active' : ''}`}
      aria-label="Pinned tickets"
      data-testid="pin-rail"
      data-state="open"
      onMouseLeave={() => {
        if (!pinned)
          setHovered(false)
      }}
    >
      <button
        type="button"
        className={`pin-rail__toggle pin-rail__toggle--open${pinned ? ' pin-rail__toggle--pinned' : ''}`}
        aria-label={pinned ? 'Unpin — collapse rail to strip' : 'Pin — keep rail open'}
        aria-pressed={pinned}
        data-testid="pin-rail-toggle"
        onClick={onTogglePinned}
      >
        {pinned ? <Pin className="pin-rail__toggle-icon" aria-hidden="true" fill="currentColor" /> : <PinOff className="pin-rail__toggle-icon" aria-hidden="true" />}
      </button>

      <div className="pin-rail__label">Pinned</div>
      <div className="pin-rail__divider" />

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
