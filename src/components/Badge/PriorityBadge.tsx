/**
 * MDT-135: PriorityBadge Component
 *
 * Displays a badge for ticket priority with gradient styling.
 * Uses data attributes for color mapping (see badge.css).
 *
 * Obligations: OBL-priority-badge
 * Coverage: BR-4, BR-6
 */

import type { PriorityVariantProps } from './types'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { formatDataAttr } from './utils'

export interface PriorityBadgeProps extends PriorityVariantProps {
  /** Additional CSS classes */
  className?: string
}

/**
 * Renders a priority badge with gradient styling.
 *
 * @example
 * <PriorityBadge priority="High" />
 * <PriorityBadge priority="Critical" className="ml-2" />
 */
export function PriorityBadge({ priority, className, ...props }: PriorityBadgeProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Badge
      variant="outline"
      className={cn('badge', className)}
      data-priority={formatDataAttr(priority)}
      {...props}
    >
      {priority}
    </Badge>
  )
}
