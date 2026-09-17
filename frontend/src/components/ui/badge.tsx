import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '../../lib/utils'

// Chrome (padding/typography) is owned by `.badge` in Badge/badge.css
// (@layer components) — utility classes here would outrank it in the cascade
// and silently fork the metrics (MDT-246: py-0.5 defeated the split chip's
// padding: 0, and font-semibold overrode the curated font-medium).
const badgeVariants = cva(
  'inline-flex items-center rounded transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring/50',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        solid: 'text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge }
