/**
 * MDT-135: StatusBadge Component
 *
 * Displays a badge for ticket status with consistent styling.
 * Uses centralized color mappings from badgeVariants.ts.
 *
 * Obligations: OBL-single-owner
 * Coverage: BR-1, BR-2, BR-3
 */

import { cn } from '../../lib/utils'
import { Badge } from '../UI/badge'
import { statusVariants } from './badgeVariants'
import type { StatusVariantProps } from './types'

export interface StatusBadgeProps extends StatusVariantProps {
  /** Additional CSS classes */
  className?: string
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
      className={cn(statusVariants({ status }), className)}
      {...props}
    >
      {status}
    </Badge>
  )
}
