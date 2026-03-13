/**
 * Icon Component
 *
 * SVG sprite-based icon system for reusable icons.
 * Uses browser caching and provides cleaner JSX.
 *
 * Usage:
 *   <Icon name="fav-star" className="fav-star active" />
 *
 * Adding new icons:
 *   1. Add <symbol> to public/icons/sprite.svg
 *   2. Use <Icon name="your-icon-id" />
 */

interface IconProps {
  /** Icon name (matches symbol id in sprite.svg) */
  name: string
  /** CSS classes for styling/theming */
  className?: string
  /** Accessible label (defaults to icon name) */
  'aria-label'?: string
}

/**
 * Icon component that references SVG symbols from sprite
 */
export function Icon({ name, className, 'aria-label': ariaLabel }: IconProps) {
  return (
    <svg
      className={className}
      aria-label={ariaLabel ?? name}
      aria-hidden={!ariaLabel}
      role="img"
    >
      <use href={`/icons/sprite.svg#${name}`} />
    </svg>
  )
}

export default Icon
