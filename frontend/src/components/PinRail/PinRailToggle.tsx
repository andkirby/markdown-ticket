import { Pin, PinOff } from 'lucide-react'
import * as React from 'react'

export interface PinRailToggleProps {
  /** Rail pinned open (true) or collapsed (false). */
  pinned: boolean
  /** Toggle the rail between pinned-open and collapsed. */
  onToggle: () => void
}

/**
 * Header pin-rail toggle — an icon-only button that lives in the header chrome,
 * placed before the filter search. Filled accent = pinned open; outline =
 * collapsed. Extracted so it can be positioned independently of SecondaryHeader.
 *
 * @testid pin-rail-toggle
 */
export const PinRailToggle: React.FC<PinRailToggleProps> = ({ pinned, onToggle }) => {
  return (
    <button
      type="button"
      className={`header__pin-toggle${pinned ? ' header__pin-toggle--pinned' : ''}`}
      aria-label={pinned ? 'Unpin — collapse rail' : 'Pin — keep rail open'}
      aria-pressed={pinned}
      data-testid="pin-rail-toggle"
      onClick={onToggle}
    >
      {pinned
        ? <Pin className="header__pin-toggle-icon" aria-hidden="true" fill="currentColor" />
        : <PinOff className="header__pin-toggle-icon" aria-hidden="true" />}
    </button>
  )
}
