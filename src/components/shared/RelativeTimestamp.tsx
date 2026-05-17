import * as React from 'react'
import { cn } from '../../lib/utils'
import { formatFullDateTime, formatRelativeTime } from '../../utils/dateFormat'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'

interface RelativeTimestampProps {
  createdAt?: Date | string | null
  updatedAt?: Date | string | null
  className?: string
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

export function RelativeTimestamp({ createdAt, updatedAt, className = '' }: RelativeTimestampProps) {
  const [mode, setMode] = React.useState<TimestampMode | null>(() => getDefaultMode(createdAt, updatedAt))

  React.useEffect(() => {
    setMode(getDefaultMode(createdAt, updatedAt))
  }, [createdAt, updatedAt])

  if (!mode) {
    return null
  }

  const hasAlternate = Boolean(createdAt && updatedAt)
  const activeLabel = mode === 'updated' ? 'Updated' : 'Created'
  const activeDate = mode === 'updated' ? updatedAt : createdAt

  if (!activeDate) {
    return null
  }

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
            {activeLabel}
            {' '}
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
