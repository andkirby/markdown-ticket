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
import { useTicketKeyOptions } from '../../config/ticketKeyConfig'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { TypeIcon } from './TypeIcon'
import { formatDataAttr } from './utils'

export interface TypeBadgeProps extends TypeVariantProps {
  /** Additional CSS classes */
  className?: string
}

/**
 * Renders a type badge with gradient styling. When the
 * `ui.ticketKey.typeIconInBadge` option is on (MDT-244), a leading type glyph
 * precedes the label; the glyph inherits the badge's own tinted color.
 *
 * @example
 * <TypeBadge type="Feature Enhancement" />
 * <TypeBadge type="Bug Fix" className="custom-class" />
 */
export function TypeBadge({ type, className, ...props }: TypeBadgeProps & React.HTMLAttributes<HTMLDivElement>) {
  const { typeIconInBadge } = useTicketKeyOptions()
  return (
    <Badge
      variant="outline"
      className={cn('badge', className)}
      data-type={formatDataAttr(type)}
      {...props}
    >
      {typeIconInBadge && <TypeIcon type={type} className="badge__icon" />}
      {type}
    </Badge>
  )
}
