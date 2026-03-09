/**
 * MDT-135: PriorityBadge Component
 *
 * Displays a badge for ticket priority with gradient styling.
 * Uses centralized color mappings from badgeVariants.ts.
 *
 * Obligations: OBL-priority-badge
 * Coverage: BR-4, BR-6
 */

import { cn } from '../../lib/utils'
import { Badge } from '../UI/badge'
import { priorityVariants } from './badgeVariants'
import type { PriorityVariantProps } from './types'

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
      className={cn(priorityVariants({ priority }), className)}
      {...props}
    >
      {priority}
    </Badge>
  )
}
