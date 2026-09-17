import * as React from 'react'

import { cn } from '../../lib/utils'

// Shell-free primitive: a plain forwarding div. ALL badge chrome — display,
// padding, typography, radius, colors — is owned by `.badge` in
// Badge/badge.css (@layer components), keyed off data attributes
// (data-status/priority/type/context/relationship). The wrapper ships ZERO
// utility classes: utilities outrank @layer components regardless of
// specificity, so any utility here silently defeats badge.css and forks
// badge metrics (MDT-246 F1 stripped the shadcn chrome — this completes it;
// BADGE_ARCHITECTURE.md documents the CVA → data-attribute migration).
type BadgeProps = React.HTMLAttributes<HTMLDivElement>

function Badge({ className, ...props }: BadgeProps) {
  return <div className={cn(className)} {...props} />
}

export { Badge }
