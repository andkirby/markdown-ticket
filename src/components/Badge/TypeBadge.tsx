/**
 * MDT-135: TypeBadge Component
 *
 * Displays a badge for ticket type with gradient styling.
 * Uses data attributes for color mapping (see badge.css).
 *
 * Obligations: OBL-type-badge
 * Coverage: BR-5, BR-7
 */

import type { TypeVariantProps } from './types'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { formatDataAttr } from './utils'

export interface TypeBadgeProps extends TypeVariantProps {
  /** Additional CSS classes */
  className?: string
}

/**
 * Renders a type badge with gradient styling.
 *
 * @example
 * <TypeBadge type="Feature Enhancement" />
 * <TypeBadge type="Bug Fix" className="ml-2" />
 */
export function TypeBadge({ type, className, ...props }: TypeBadgeProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Badge
      variant="outline"
      className={cn('badge', className)}
      data-type={formatDataAttr(type)}
      {...props}
    >
      {type}
    </Badge>
  )
}
