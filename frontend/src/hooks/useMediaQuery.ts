import { useEffect, useState } from 'react'

/**
 * React hook that tracks whether a CSS media query matches the current viewport.
 *
 * @param query - CSS media query string (e.g., '(max-width: 767px)', '(prefers-color-scheme: dark)')
 * @returns Boolean indicating if the media query currently matches
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isMobile = useMediaQuery('(max-width: 767px)')
 *   const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
 *   const isPrint = useMediaQuery('print')
 *
 *   if (isMobile) {
 *     return <MobileLayout />
 *   }
 *   return <DesktopLayout />
 * }
 * ```
 */
export function useMediaQuery(query: string): boolean {
  // Initialize with false to avoid hydration mismatch
  // The useEffect will update this with the actual match status on mount
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    // Handle SSR case (window not defined)
    if (typeof window === 'undefined') {
      return
    }

    // Create media query list and get initial match status
    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)

    // Define change handler
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)

    // Add event listener for changes
    mediaQuery.addEventListener('change', handler)

    // Cleanup: remove event listener on unmount
    return () => mediaQuery.removeEventListener('change', handler)
  }, [query])

  return matches
}
