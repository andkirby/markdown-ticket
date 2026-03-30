import { useEffect, useRef, useState } from 'react'

const COOKIE_NAME = 'theme'
const COOKIE_EXPIRES_DAYS = 365

type ThemeMode = 'light' | 'dark' | 'system'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined')
    return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    // Check if we're on the client side
    if (typeof window === 'undefined')
      return 'system'

    // Check for saved theme preference
    const savedTheme = getCookie(COOKIE_NAME)
    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
      return savedTheme
    }

    // Default to system
    return 'system'
  })

  // Track the actual applied theme (resolves 'system' to 'light' or 'dark')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (themeMode === 'system') {
      return getSystemTheme()
    }
    return themeMode
  })

  // Track mount status using a ref
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
  }, [])

  // Update resolved theme when mode changes or system preference changes
  useEffect(() => {
    if (!mountedRef.current)
      return

    const updateResolvedTheme = () => {
      if (themeMode === 'system') {
        setResolvedTheme(getSystemTheme())
      }
      else {
        setResolvedTheme(themeMode)
      }
    }

    updateResolvedTheme()

    // Listen for system preference changes when in system mode
    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => updateResolvedTheme()
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    }
  }, [themeMode])

  // Apply theme to DOM
  useEffect(() => {
    if (!mountedRef.current)
      return

    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(resolvedTheme)

    // Save to cookie
    setCookie(COOKIE_NAME, themeMode, COOKIE_EXPIRES_DAYS)
  }, [resolvedTheme, themeMode])

  const toggleTheme = () => {
    setThemeMode((prevMode) => {
      if (prevMode === 'light')
        return 'dark'
      if (prevMode === 'dark')
        return 'system'
      return 'light'
    })
  }

  return {
    theme: resolvedTheme,
    themeMode,
    toggleTheme,
    setTheme: setThemeMode,
    mounted: mountedRef.current,
  }
}

// Cookie utility functions
function getCookie(name: string): string | null {
  if (typeof window === 'undefined')
    return null

  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null
  }
  return null
}

function setCookie(name: string, value: string, days: number) {
  if (typeof window === 'undefined')
    return

  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`
}
