/**
 * MDT-135: TypeBadge Component
 *
 * Displays a badge for ticket type with gradient styling.
 * Uses centralized color mappings from badgeVariants.ts.
 *
 * Obligations: OBL-type-badge
 * Coverage: BR-5, BR-7
 */

import { cn } from '../../lib/utils'
import { Badge } from '../UI/badge'
import { typeVariants } from './badgeVariants'
import type { TypeVariantProps } from './types'

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
export function TypeBadge({ type, className }: TypeBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(typeVariants({ type }), className)}
    >
      {type}
    </Badge>
  )
}
