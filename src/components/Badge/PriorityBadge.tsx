/**
 * MDT-135: PriorityBadge Component
 *
 * Displays a badge for ticket priority with a bold directional glyph.
 * Uses data attributes for color mapping (see badge.css); the icon inherits
 * the badge's priority color via currentColor.
 *
 * Obligations: OBL-priority-badge
 * Coverage: BR-4, BR-6
 */

import type { PriorityVariantProps } from './types'
import { Equal } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { PRIORITY_ICON } from './priorityIcons'
import { formatDataAttr } from './utils'

export interface PriorityBadgeProps extends PriorityVariantProps {
  /** Additional CSS classes */
  className?: string
}

/**
 * Renders a priority badge with a bold glyph + label.
 *
 * @example
 * <PriorityBadge priority="High" />
 * <PriorityBadge priority="Critical" className="ml-2" />
 */
export function PriorityBadge({ priority, className, ...props }: PriorityBadgeProps & React.HTMLAttributes<HTMLDivElement>) {
  const key = formatDataAttr(priority)
  const Icon = PRIORITY_ICON[key] ?? Equal
  return (
    <Badge
      variant="outline"
      className={cn('badge', className)}
      data-priority={key}
      {...props}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
      {priority}
    </Badge>
  )
}
