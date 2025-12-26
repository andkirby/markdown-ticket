# "Clear Cache" Button Investigation

## Overview

Investigation of what the "Clear Cache" button in the hamburger menu actually does.

## Flow Summary

```
User clicks "Clear Cache" (HamburgerMenu.tsx:96)
        ↓
handleClearCache() → nuclearCacheClear() (cache.ts:80)
        ↓
┌─────────────────────────────────────────────────────────┐
│ 1. POST /api/cache/clear (backend)                      │
│    → fileInvoker.clearCache()                           │
│    → Clears: ExtractMetadataCommand + ReadFileCommand   │
└─────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Clear frontend storage:                              │
│    • localStorage (all keys)                            │
│    • sessionStorage (all keys)                           │
│    • IndexedDB (all databases)                          │
│    • Cache API (service worker caches)                  │
└─────────────────────────────────────────────────────────┘
        ↓
Force reload page with ?cache-bust={timestamp}
```

## Code References

### Frontend

**Hamburger Menu Component** (`src/components/HamburgerMenu.tsx:96-101`):
```tsx
<button
  onClick={handleClearCache}
  className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
>
  <Trash2 className="h-4 w-4 mr-2" />
  Clear Cache
</button>
```

**Handler** (`src/components/HamburgerMenu.tsx:50-54`):
```tsx
const handleClearCache = () => {
  console.log('🔧 Cache clear button clicked');
  setIsOpen(false);
  nuclearCacheClear();
};
```

**Nuclear Cache Clear Function** (`src/utils/cache.ts:80-103`):
```tsx
export const nuclearCacheClear = async () => {
  if (typeof window !== 'undefined') {
    // Clear backend cache first
    await clearBackendCache();

    // Clear all frontend storage
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
    const url = new URL(window.location.href);
    url.searchParams.set('cache-bust', Date.now().toString());
    window.location.href = url.toString();
  }
};
```

### Backend

**API Endpoint** (`server/routes/system.ts:287-300`):
```tsx
router.post('/cache/clear', async (req: Request, res: Response) => {
  try {
    console.log('🗑️  Clearing file operation cache');
    fileInvoker.clearCache();
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});
```

**File Operation Invoker** (`server/invokers/FileOperationInvoker.ts:78-86`):
```tsx
async clearCache(): Promise<void> {
  await this._ensureInitialized();
  if (this.metadataCommand) {
    this.metadataCommand.clearCache();
  }
  if (this.readCommand) {
    this.readCommand.clearCache();
  }
}
```

## What IS Cleared

| Cache | Location | Method | TTL |
|-------|----------|--------|-----|
| File metadata cache (title, dates) | `ExtractMetadataCommand` | `clearCache()` | 3600s |
| File content cache | `ReadFileCommand` | `clearCache()` | 3600s |
| localStorage (all keys) | Browser | `clearAllCache()` | Session |
| sessionStorage (all keys) | Browser | `clearAllCache()` | Session |
| IndexedDB (all databases) | Browser | `clearAllCache()` | Persistent |
| Service worker caches | Browser | `caches.delete()` | Configurable |

## What is NOT Cleared

| Cache | Location | TTL | Impact |
|-------|----------|-----|--------|
| Project discovery (shared) | `ProjectCacheService.ts` | 30s | ❌ Not cleared |
| Project discovery (MCP) | `projectDiscovery.ts` | 300s | ❌ Not cleared |
| Title extraction | `TitleExtractionService.ts` | 3600s | ❌ Not cleared |
| Link processing | `useSmartLinkProcessor.ts` | 300s | ❌ Not cleared |

## Key Findings

### Gap Identified

The "Clear Cache" button is **incomplete**:

1. **Project discovery caches are NOT cleared**
   - Shared `ProjectCacheService` has `clearCache()` method (line 88)
   - MCP `ProjectDiscoveryService` has `invalidateCache()` method (line 337)
   - Neither is called by the nuclear cache clear function

2. **Title extraction cache is NOT cleared**
   - `TitleExtractionService.clearCache()` exists (line 240)
   - Has longest TTL (1 hour) - most impactful to miss

3. **Link processing cache is NOT cleared**
   - `useSmartLinkProcessor` has `clearCache()` capability
   - Frontend-only, but not called by nuclear clear

### Development Tools

In development mode, these are exposed globally (`src/utils/cache.ts:104-108`):
```tsx
(window as any).clearCache = clearAllCache;
(window as any).clearProjectCache = clearProjectCache;
(window as any).clearBackendCache = clearBackendCache;
```

## Implications for Cache Unification (MDT-105)

### Requirements for Shared Cache Module

1. **Global Cache Clearing Method**
   - `clearAllBackendCaches()` that clears ALL backend caches
   - Should include: project discovery, file operations, title extraction

2. **API Integration**
   - Extend `/api/cache/clear` to accept cache type parameter
   - New `/api/cache/clear/all` endpoint for complete clear

3. **Frontend Integration**
   - Update `nuclearCacheClear()` to call new global endpoint
   - Ensure all backend caches are cleared on button click

4. **Per-Cache Type Clearing**
   - Support selective cache clearing (e.g., only project discovery)
   - Useful for debugging and testing

### Recommendation

This investigation strengthens **Option 3** (Split CRs with test CR first):

1. Tests will document current `clearCache()` behavior for each cache
2. Unification can add proper global cache clearing
3. Reduces risk of breaking existing clear functionality
4. Ensures ALL caches are properly cleared, not just file operations
