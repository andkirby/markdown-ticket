/**
 * MDT-237: Document existence cache.
 *
 * Per-project, deduplicated document index fed by GET /api/documents.
 * Enables SmartLink to visibly flag converted inline-code .md references
 * that target non-existent documents (BR-2.1) with at most one fetch per
 * project per session (C5) — never one request per rendered span.
 *
 * Contract: docs/CRs/MDT-237/architecture.md (D5).
 */

import { authFetch } from '../auth/authFetch'

interface DocumentTreeNode {
  name?: string
  path?: string
  type?: 'file' | 'folder'
  children?: DocumentTreeNode[]
}

export interface DocumentIndex {
  has: (filePath: string) => boolean
  /** True when the index contains any path under the given directory prefix. */
  coversPrefix: (dirPrefix: string) => boolean
  /**
   * MDT-237 follow-up: all indexed file paths sharing a basename.
   * Powers unique-name disambiguation (e.g. bare `THEME.md` -> src/THEME.md)
   * with zero extra network cost — the map is built once per index load.
   */
  findByBasename: (basename: string) => string[]
}

function makeIndex(filePaths: Set<string>, allPaths: Set<string>): DocumentIndex {
  const byBasename = new Map<string, string[]>()
  for (const p of filePaths) {
    const name = p.slice(p.lastIndexOf('/') + 1)
    const entries = byBasename.get(name)
    if (entries) {
      entries.push(p)
    }
    else {
      byBasename.set(name, [p])
    }
  }
  return {
    has: path => filePaths.has(path),
    coversPrefix: (prefix) => {
      for (const p of allPaths) {
        if (p.startsWith(prefix)) {
          return true
        }
      }
      return false
    },
    findByBasename: name => byBasename.get(name) ?? [],
  }
}

interface ProjectEntry {
  index: DocumentIndex | null
  subscribers: Set<() => void>
  loading: boolean
  /** Terminal state after a completed (successful or failed) load. */
  settled: boolean
  /** Timestamp of the last completed load; entries older than the TTL refresh in background. */
  loadedAt: number
}

/** Max age of a settled index before a background refresh is triggered (ms). */
const INDEX_TTL_MS = 60_000

const projects = new Map<string, ProjectEntry>()

function makeEntry(): ProjectEntry {
  return { index: null, subscribers: new Set(), loading: false, settled: false, loadedAt: 0 }
}

function flattenPaths(nodes: DocumentTreeNode[], files: Set<string>, all: Set<string>): void {
  for (const node of nodes) {
    if (node.path) {
      all.add(node.path)
      if (node.type === 'file') {
        files.add(node.path)
      }
    }
    if (node.children) {
      flattenPaths(node.children, files, all)
    }
  }
}

function notify(entry: ProjectEntry): void {
  for (const cb of entry.subscribers) {
    cb()
  }
}

/**
 * Loads the document index for a project (deduplicated: concurrent callers
 * share one in-flight request). Safe to call from render-affecting code —
 * it only starts the fetch; results arrive via subscription.
 */
export function ensureDocumentIndex(projectId: string): void {
  const entry = projects.get(projectId) ?? makeEntry()
  projects.set(projectId, entry)
  if (entry.loading) {
    return
  }
  // Stale settled entries refresh in the background; the current index stays
  // serveable until the refresh lands (PV-2: no permanent staleness).
  if (entry.settled && Date.now() - entry.loadedAt < INDEX_TTL_MS) {
    return
  }
  entry.loading = true

  void authFetch(`/api/documents?projectId=${encodeURIComponent(projectId)}`)
    .then(async (response) => {
      const current = projects.get(projectId)
      if (current) {
        current.loading = false
        current.settled = true
        current.loadedAt = Date.now()
      }
      // 404 (no document paths configured) or error => no signal, index stays null
      if (!response.ok || !current) {
        return
      }
      const data = (await response.json()) as DocumentTreeNode[]
      const files = new Set<string>()
      const all = new Set<string>()
      flattenPaths(Array.isArray(data) ? data : [], files, all)
      current.index = makeIndex(files, all)
      notify(current)
    })
    .catch((error) => {
      console.warn('MDT-237: document index load failed', error)
      const current = projects.get(projectId)
      if (current) {
        current.loading = false
        current.settled = true
        current.loadedAt = Date.now()
      }
    })
}

/**
 * Synchronous lookup. Returns null while the index is unknown (loading or
 * failed) — callers must treat null as "no signal", not "missing".
 */
export function getCachedDocumentIndex(projectId: string): DocumentIndex | null {
  return projects.get(projectId)?.index ?? null
}

/**
 * Subscribe to index changes for a project. Returns an unsubscribe function.
 */
export function subscribeDocumentIndex(projectId: string, cb: () => void): () => void {
  const entry = projects.get(projectId) ?? makeEntry()
  projects.set(projectId, entry)
  entry.subscribers.add(cb)
  return () => {
    entry!.subscribers.delete(cb)
  }
}

// ── Test-only helpers ────────────────────────────────────────────────────

/** Test hook: seed an index without network. */
export function __testSeed(projectId: string, paths: string[]): void {
  const files = new Set(paths)
  const all = new Set(paths)
  const entry = projects.get(projectId) ?? makeEntry()
  projects.set(projectId, entry)
  entry.index = makeIndex(files, all)
  entry.loading = false
  entry.settled = true
  entry.loadedAt = Date.now()
  notify(entry)
}

/** Test hook: clear all cached state. */
export function __testReset(): void {
  projects.clear()
}
