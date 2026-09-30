import * as React from 'react'
import { cn } from '../../lib/utils'
import { formatFullDateTime, formatRelativeTime } from '../../utils/dateFormat'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'

interface RelativeTimestampProps {
  createdAt?: Date | string | null
  updatedAt?: Date | string | null
  className?: string
  /**
   * MDT-249: fixed render for table cells — non-interactive `<span>` (C5: no
   * nested interactive element inside a clickable row). Shows the same relative
   * text; the full date-time surfaces via native `title` (the UX gate's
   * fallback path — Radix hover tooltips require a focusable trigger, and the
   * surrounding row is not focusable). Toggle mode (ticket cards) is unchanged.
   */
  fixed?: boolean
}

type TimestampMode = 'created' | 'updated'

function getDefaultMode(createdAt?: Date | string | null, updatedAt?: Date | string | null): TimestampMode | null {
  if (updatedAt) {
    return 'updated'
  }

  if (createdAt) {
    return 'created'
  }

  return null
}

export function RelativeTimestamp({ createdAt, updatedAt, className = '', fixed = false }: RelativeTimestampProps) {
  const [mode, setMode] = React.useState<TimestampMode | null>(() => getDefaultMode(createdAt, updatedAt))

  React.useEffect(() => {
    setMode(getDefaultMode(createdAt, updatedAt))
  }, [createdAt, updatedAt])

  if (!mode) {
    return null
  }

  const activeLabel = mode === 'updated' ? 'Updated' : 'Created'
  const activeDate = mode === 'updated' ? updatedAt : createdAt

  if (!activeDate) {
    return null
  }

  // Fixed mode: static span + native title (see prop docblock). No toggle,
  // no button, no interactive class — table cells inside clickable rows.
  if (fixed) {
    return (
      <span
        className={cn('relative-timestamp', 'relative-timestamp--static', className)}
        title={formatFullDateTime(activeDate)}
      >
        {formatRelativeTime(activeDate)}
      </span>
    )
  }

  const hasAlternate = Boolean(createdAt && updatedAt)

  const handleToggle = () => {
    if (!hasAlternate) {
      return
    }

    setMode(current => current === 'updated' ? 'created' : 'updated')
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleToggle}
            className={cn(
              'relative-timestamp',
              hasAlternate ? 'relative-timestamp--interactive' : 'relative-timestamp--static',
              className,
            )}
            aria-label={hasAlternate ? `Toggle timestamp display. Currently showing ${activeLabel.toLowerCase()}.` : `${activeLabel} timestamp`}
          >
            {formatRelativeTime(activeDate)}
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="end"
          sideOffset={2}
          className="relative-timestamp__tooltip"
        >
          {formatFullDateTime(activeDate)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
