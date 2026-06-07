import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  children: ReactNode
  className?: string
}

interface HeaderContentProps {
  /** Logo/branding section - always rendered with flex-shrink-0 */
  leftSection?: ReactNode
  /** Middle section items that flex with the content */
  centerSection?: ReactNode
  /** Right section items - actions and controls */
  rightSection?: ReactNode
  className?: string
}

/**
 * Header component - sticky navigation bar at the top of the app
 */
export function Header({ children, className }: HeaderProps) {
  return (
    <nav data-testid="main-nav" className={cn('header', className)}>
      <div className="header__container">
        {children}
      </div>
    </nav>
  )
}

/**
 * HeaderContent - single-row flex layout
 * 
 * Layout:
 * [ leftSection ][ centerSection ] [ rightSection ]
 */
export function HeaderContent({
  leftSection,
  centerSection,
  rightSection,
  className,
}: HeaderContentProps) {
  return (
    <div className={cn('header__content', className)}>
      <div className="header__left">
        {leftSection && (
          <div className="header__left-section">
            {leftSection}
          </div>
        )}
        {centerSection}
      </div>
      {rightSection && (
        <div className="header__right">
          {rightSection}
        </div>
      )}
    </div>
  )
}