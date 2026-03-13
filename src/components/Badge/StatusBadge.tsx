/**
 * MDT-135: StatusBadge Component
 *
 * Displays a badge for ticket status with consistent styling.
 * Uses data attributes for color mapping (see badge.css).
 *
 * Obligations: OBL-single-owner
 * Coverage: BR-1, BR-2, BR-3
 */

import { cn } from '../../lib/utils'
import { Badge } from '../UI/badge'
import type { StatusVariantProps } from './types'

export interface StatusBadgeProps extends StatusVariantProps {
  /** Additional CSS classes */
  className?: string
}

/**
 * Converts status string to data attribute format.
 * "In Progress" -> "in-progress", "On Hold" -> "on-hold"
 */
function formatDataAttr(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '-')
}

/**
 * Renders a status badge with appropriate color styling.
 *
 * @example
 * <StatusBadge status="In Progress" />
 * <StatusBadge status="Approved" className="ml-2" />
 */
export function StatusBadge({ status, className, ...props }: StatusBadgeProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Badge
      variant="outline"
      className={cn('badge', className)}
      data-status={formatDataAttr(status)}
      {...props}
    >
      {status}
    </Badge>
  )
}
