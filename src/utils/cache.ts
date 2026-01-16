/**
 * Cache management utilities for development
 */

/* eslint-disable node/prefer-global/process -- Using import.meta.env for browser compatibility */

export function clearAllCache() {
  if (typeof window !== 'undefined') {
    // Clear ALL localStorage items
    if (window.localStorage) {
      const localKeys = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key)
          localKeys.push(key)
      }
      localKeys.forEach(key => localStorage.removeItem(key))
      console.warn('🧹 Cleared localStorage:', localKeys)
    }

    // Clear ALL sessionStorage items
    if (window.sessionStorage) {
      const sessionKeys = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key)
          sessionKeys.push(key)
      }
      sessionKeys.forEach(key => sessionStorage.removeItem(key))
      console.warn('🧹 Cleared sessionStorage:', sessionKeys)
    }

    // Clear any IndexedDB if present
    if ('indexedDB' in window) {
      try {
        indexedDB.databases?.().then((databases) => {
          databases.forEach((db) => {
            if (db.name) {
              indexedDB.deleteDatabase(db.name)
              console.warn('🧹 Cleared IndexedDB:', db.name)
            }
          })
        })
      }
      catch (e) {
        console.warn('IndexedDB clear failed:', e)
      }
    }

    console.warn('🧹 Cache clearing complete')
  }
}

function clearProjectCache(projectId?: string) {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem('md-tickets')
    if (projectId) {
      localStorage.removeItem(`tickets-${projectId}`)
    }
    console.warn('🧹 Cleared project cache')
  }
}

async function clearBackendCache() {
  try {
    const response = await fetch('/api/cache/clear', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const result = await response.json()
      console.warn('🧹 Backend cache cleared:', result.message)
      return result
    }
    else {
      console.error('Failed to clear backend cache:', response.statusText)
    }
  }
  catch (error) {
    console.error('Error clearing backend cache:', error)
  }
}

export async function nuclearCacheClear() {
  if (typeof window !== 'undefined') {
    // Clear backend cache first
    await clearBackendCache()

    // Clear all frontend storage
    clearAllCache()

    // Clear browser cache if possible (limited by security)
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name)
          console.warn('🧹 Cleared cache:', name)
        })
      })
    }

    // Force reload with cache bypass
    const url = new URL(window.location.href)
    url.searchParams.set('cache-bust', Date.now().toString())
    window.location.href = url.toString()
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).clearCache = clearAllCache;
  (window as any).clearProjectCache = clearProjectCache;
  (window as any).clearBackendCache = clearBackendCache
}
