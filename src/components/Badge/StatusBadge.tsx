/**
 * MDT-135: StatusBadge Component
 *
 * Displays a badge for ticket status with consistent styling.
 * Uses data attributes for color mapping (see badge.css).
 *
 * Obligations: OBL-single-owner
 * Coverage: BR-1, BR-2, BR-3
 */

import type { StatusVariantProps } from './types'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { formatDataAttr } from './utils'

export interface StatusBadgeProps extends StatusVariantProps {
  /** Additional CSS classes */
  className?: string
  /** Status is invalid - applies warning styling */
  isInvalid?: boolean
}

/**
 * Renders a status badge with appropriate color styling.
 *
 * @example
 * <StatusBadge status="In Progress" />
 * <StatusBadge status="Approved" className="ml-2" />
 */
export function StatusBadge({ status, className, isInvalid = false, ...props }: StatusBadgeProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Badge
      variant={isInvalid ? 'solid' : 'outline'}
      className={cn('badge', isInvalid && 'badge--invalid', className)}
      data-status={isInvalid ? 'invalid' : formatDataAttr(status)}
      {...props}
    >
      {status}
    </Badge>
  )
}
