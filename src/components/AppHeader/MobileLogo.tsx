import { useEffect, useState } from 'react'

export function MobileLogo() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 768)
    }

    // Initial check
    checkViewport()

    // Listen for resize events
    const mediaQuery = window.matchMedia('(min-width: 768px)')
    mediaQuery.addEventListener('change', checkViewport)

    return () => {
      mediaQuery.removeEventListener('change', checkViewport)
    }
  }, [])

  const logoSrc = isMobile ? '/designs/logo-mdt-m-dark_64x64.png' : '/logo.jpeg'

  return (
    <img
      src={logoSrc}
      alt="Logo"
      className="h-14 w-auto dark:invert"
      data-testid="app-logo"
    />
  )
}
