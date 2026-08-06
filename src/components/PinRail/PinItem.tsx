/**
 * MDT-197: PinItem — a single icon-only pinned ticket in the rail.
 *
 * Shows the numeric part of the ticket code on a 32px square. On hover:
 * - a portaled Tooltip (Radix) with project code + ticket code + title + status
 * - a top-right × to unpin (hidden in read-only)
 *
 * The numeric code alone is intentionally ambiguous across projects (MDT-042
 * vs OTHER-042); the tooltip is the disambiguator. Clicking opens the viewer.
 */
import type { PinItem as PinItemData } from '@mdt/domain-contracts'
import { StatusBadge } from '../Badge/StatusBadge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'

/** Metadata needed for the tooltip; resolved by the rail from live ticket data. */
export interface PinMetadata {
  title: string
  status: string
}

export interface PinItemProps {
  pin: PinItemData
  metadata: PinMetadata | null
  canWrite: boolean
  onOpen: (pin: PinItemData) => void
  onUnpin: (pin: PinItemData) => void
}

/** Extract the numeric part of a ticket code (e.g. "MDT-042" -> "042"). */
function numericPart(ticketCode: string): string {
  const dashIndex = ticketCode.lastIndexOf('-')
  return dashIndex >= 0 ? ticketCode.slice(dashIndex + 1) : ticketCode
}

export function PinItem({ pin, metadata, canWrite, onOpen, onUnpin }: PinItemProps) {
  const { projectCode, ticketCode } = pin
  const ariaLabel = metadata
    ? `${projectCode}-${ticketCode.slice(projectCode.length + 1)}: ${metadata.title} (${metadata.status})`
    : `${projectCode}-${ticketCode.slice(projectCode.length + 1)}`

  const handleClick = () => onOpen(pin)
  const handleUnpin = (e: React.MouseEvent) => {
    e.stopPropagation()
    onUnpin(pin)
  }
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (canWrite) {
        e.preventDefault()
        onUnpin(pin)
      }
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="pin-item ticket-key"
            data-testid="pin-item"
            data-pin-key={`${projectCode}/${ticketCode}`}
            aria-label={ariaLabel}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
          >
            <span className="pin-item__code">{numericPart(ticketCode)}</span>
            {canWrite && (
              <span
                role="button"
                tabIndex={-1}
                className="pin-item__unpin"
                aria-label={`Unpin ${projectCode}-${ticketCode.slice(projectCode.length + 1)}`}
                data-testid="pin-item-unpin"
                onClick={handleUnpin}
              >
                ×
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="pin-tooltip">
          <div className="pin-tooltip__code ticket-key">
            {projectCode}
            -
            {ticketCode.slice(projectCode.length + 1)}
          </div>
          <div className="pin-tooltip__title">
            {metadata?.title ?? '(ticket not loaded)'}
          </div>
          {metadata && (
            <div className="pin-tooltip__status">
              <StatusBadge status={metadata.status} />
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
