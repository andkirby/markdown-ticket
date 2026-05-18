import { readLocalStoragePreference, writeLocalStoragePreference } from './localStoragePreferences'

export interface DocumentNavigationPreferences {
  recentDocuments: string[]
  favsExpanded: boolean
  favsShowAll: boolean
  recentExpanded: boolean
}

const MAX_RECENT_DOCUMENTS = 5
const TICKET_AREA_PATH = 'docs/CRs'

const DEFAULT_DOCUMENT_NAVIGATION_PREFERENCES: DocumentNavigationPreferences = {
  recentDocuments: [],
  favsExpanded: true,
  favsShowAll: false,
  recentExpanded: true,
}

const STORAGE_KEY = 'markdown-ticket:documents-navigation'

function getStorageKey(projectId: string): string {
  return `${STORAGE_KEY}:${projectId}`
}

function normalizePath(path: string): string {
  return path.replace(/\/+/g, '/').replace(/\/$/, '')
}

export function isTicketAreaPath(path: string): boolean {
  const normalized = normalizePath(path)
  return normalized === TICKET_AREA_PATH || normalized.startsWith(`${TICKET_AREA_PATH}/`)
}

function uniqueValidPaths(paths: string[]): string[] {
  return Array.from(new Set(paths.map(normalizePath).filter(path => path && !isTicketAreaPath(path))))
}

function normalizeDocumentNavigationPreferences(value: unknown): DocumentNavigationPreferences {
  const candidate = value && typeof value === 'object'
    ? value as Partial<DocumentNavigationPreferences>
    : {}

  return {
    recentDocuments: uniqueValidPaths(Array.isArray(candidate.recentDocuments) ? candidate.recentDocuments : [])
      .slice(0, MAX_RECENT_DOCUMENTS),
    favsExpanded: typeof candidate.favsExpanded === 'boolean'
      ? candidate.favsExpanded
      : DEFAULT_DOCUMENT_NAVIGATION_PREFERENCES.favsExpanded,
    favsShowAll: typeof candidate.favsShowAll === 'boolean'
      ? candidate.favsShowAll
      : DEFAULT_DOCUMENT_NAVIGATION_PREFERENCES.favsShowAll,
    recentExpanded: typeof candidate.recentExpanded === 'boolean'
      ? candidate.recentExpanded
      : DEFAULT_DOCUMENT_NAVIGATION_PREFERENCES.recentExpanded,
  }
}

export function sanitizeDocumentNavigationPreferences(
  preferences: DocumentNavigationPreferences,
  eligiblePaths: string[],
): DocumentNavigationPreferences {
  const normalizedPreferences = normalizeDocumentNavigationPreferences(preferences)
  const eligible = new Set(eligiblePaths.map(normalizePath))
  const isEligible = (path: string) => eligible.has(normalizePath(path))

  const recentDocuments = normalizedPreferences.recentDocuments.filter(isEligible).slice(0, MAX_RECENT_DOCUMENTS)

  return {
    ...normalizedPreferences,
    recentDocuments,
  }
}

export function getDocumentNavigationPreferences(projectId: string): DocumentNavigationPreferences {
  const stored = readLocalStoragePreference<DocumentNavigationPreferences>(
    getStorageKey(projectId),
    DEFAULT_DOCUMENT_NAVIGATION_PREFERENCES,
    {
      merge: storedValue => normalizeDocumentNavigationPreferences(storedValue),
    },
  )

  return normalizeDocumentNavigationPreferences(stored)
}

export function setDocumentNavigationPreferences(
  projectId: string,
  preferences: DocumentNavigationPreferences,
): void {
  writeLocalStoragePreference(getStorageKey(projectId), normalizeDocumentNavigationPreferences(preferences))
}

export function addRecentDocument(projectId: string, documentPath: string): void {
  if (isTicketAreaPath(documentPath))
    return

  const preferences = getDocumentNavigationPreferences(projectId)
  const normalized = normalizePath(documentPath)
  const recentDocuments = [
    normalized,
    ...preferences.recentDocuments.filter(path => normalizePath(path) !== normalized),
  ].slice(0, MAX_RECENT_DOCUMENTS)

  setDocumentNavigationPreferences(projectId, {
    ...preferences,
    recentDocuments,
  })
}
