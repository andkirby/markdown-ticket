/**
 * MDT-135: TypeBadge Component
 *
 * Displays a badge for ticket type with gradient styling.
 * Uses data attributes for color mapping (see badge.css).
 *
 * Obligations: OBL-type-badge
 * Coverage: BR-5, BR-7
 */

import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import type { TypeVariantProps } from './types'

export interface TypeBadgeProps extends TypeVariantProps {
  /** Additional CSS classes */
  className?: string
}

/**
 * Converts type string to data attribute format.
 * "Feature Enhancement" -> "feature-enhancement" (lowercase with hyphens)
 */
function formatDataAttr(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '-')
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
