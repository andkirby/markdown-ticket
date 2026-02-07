import { useEffect, useRef, useState } from 'react'

const COOKIE_NAME = 'theme'
const COOKIE_EXPIRES_DAYS = 365

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // Check if we're on the client side
    if (typeof window === 'undefined')
      return 'light'

    // Check for saved theme preference or default to light mode
    const savedTheme = getCookie(COOKIE_NAME)
    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme
    }

    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? 'dark' : 'light'
  })

  // Track mount status using a ref
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
  }, [])

  useEffect(() => {
    if (!mountedRef.current)
      return

    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)

    // Save to cookie
    setCookie(COOKIE_NAME, theme, COOKIE_EXPIRES_DAYS)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light')
  }

  return {
    theme,
    toggleTheme,
    setTheme,
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
