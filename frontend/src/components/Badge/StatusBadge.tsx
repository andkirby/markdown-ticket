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
import { StatusIcon } from './StatusIcon'
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
 * <StatusBadge status="Approved" className="custom-class" />
 */
export function StatusBadge({ status, className, isInvalid = false, ...props }: StatusBadgeProps & React.HTMLAttributes<HTMLDivElement>) {
  // MDT-247: leading glyph with PriorityBadge parity (icon before label,
  // badge__icon sizing, aria-hidden). An invalid status shows the REJECTED
  // glyph while the badge itself keeps data-status="invalid" colors (BR-1.10);
  // unmapped statuses render no glyph — the label alone (BR-1.9). No title:
  // the label sits right next to the glyph.
  const glyphStatus = isInvalid ? 'Rejected' : status
  return (
    <Badge
      className={cn('badge', className)}
      data-status={isInvalid ? 'invalid' : formatDataAttr(status)}
      {...props}
    >
      <StatusIcon status={glyphStatus} className="badge__icon" />
      {status}
    </Badge>
  )
}
