/**
 * MDT-135: RelationshipBadge Component
 *
 * Displays relationship badges for related, depends, and blocks links.
 * Uses centralized color mappings from badgeVariants.ts.
 *
 * Obligations: OBL-relationship-badges
 * Coverage: BR-8
 */

import { useParams } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { classifyLink } from '../../utils/linkProcessor'
import { Badge } from '../UI/badge'
import SmartLink from '../SmartLink'
import { relationshipVariants } from './badgeVariants'
import type { RelationshipVariant } from './types'

export interface RelationshipBadgeProps {
  /** Badge variant type */
  variant: RelationshipVariant
  /** Array of ticket codes to display */
  links: string[]
  /** Additional CSS classes */
  className?: string
}

/**
 * Icon mapping for relationship types
 */
const RELATIONSHIP_ICONS: Record<RelationshipVariant, string> = {
  related: '🔗',
  depends: '⬅️',
  blocks: '➡️',
}

/**
 * Renders a relationship badge with appropriate styling.
 *
 * @example
 * <RelationshipBadge variant="related" links={['MDT-100', 'MDT-101']} />
 * <RelationshipBadge variant="depends" links={['MDT-050']} />
 * <RelationshipBadge variant="blocks" links={['MDT-200']} />
 */
export function RelationshipBadge({ variant, links, className }: RelationshipBadgeProps) {
  const { projectCode } = useParams<{ projectCode: string }>()
  const icon = RELATIONSHIP_ICONS[variant]
  const title = links.join(', ')

  return (
    <Badge
      variant="outline"
      className={cn(relationshipVariants({ variant }), className)}
      title={title}
    >
      <span className="mr-1">{icon}</span>
      {links.map((link, index) => (
        <span key={link}>
          <SmartLink
            link={classifyLink(link, projectCode || '')}
            currentProject={projectCode || ''}
            showIcon={false}
            className="hover:underline"
          >
            {link}
          </SmartLink>
          {index < links.length - 1 && <span className="mx-1">,</span>}
        </span>
      ))}
    </Badge>
  )
}
