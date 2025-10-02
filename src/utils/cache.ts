/**
 * Cache management utilities for development
 */

export const clearAllCache = () => {
  if (typeof window !== 'undefined') {
    // Clear ALL localStorage items
    if (window.localStorage) {
      const localKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) localKeys.push(key);
      }
      localKeys.forEach(key => localStorage.removeItem(key));
      console.log('🧹 Cleared localStorage:', localKeys);
    }
    
    // Clear ALL sessionStorage items
    if (window.sessionStorage) {
      const sessionKeys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) sessionKeys.push(key);
      }
      sessionKeys.forEach(key => sessionStorage.removeItem(key));
      console.log('🧹 Cleared sessionStorage:', sessionKeys);
    }
    
    // Clear any IndexedDB if present
    if ('indexedDB' in window) {
      try {
        indexedDB.databases?.().then(databases => {
          databases.forEach(db => {
            if (db.name) {
              indexedDB.deleteDatabase(db.name);
              console.log('🧹 Cleared IndexedDB:', db.name);
            }
          });
        });
      } catch (e) {
        console.log('IndexedDB clear failed:', e);
      }
    }
    
    console.log('🧹 Cache clearing complete');
  }
};

export const clearProjectCache = (projectId?: string) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem('md-tickets');
    if (projectId) {
      localStorage.removeItem(`tickets-${projectId}`);
    }
    console.log('🧹 Cleared project cache');
  }
};

export const nuclearCacheClear = () => {
  if (typeof window !== 'undefined') {
    // Clear all storage
    clearAllCache();
    
    // Clear browser cache if possible (limited by security)
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
          console.log('🧹 Cleared cache:', name);
        });
      });
    }
    
    // Force reload with cache bypass
    window.location.href = window.location.href + '?cache-bust=' + Date.now();
  }
};
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).clearCache = clearAllCache;
  (window as any).clearProjectCache = clearProjectCache;
}
