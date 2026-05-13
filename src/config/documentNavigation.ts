import { readLocalStoragePreference, writeLocalStoragePreference } from './localStoragePreferences'

export interface DocumentNavigationPreferences {
  recentDocuments: string[]
}

const MAX_RECENT_DOCUMENTS = 5
const TICKET_AREA_PATH = 'docs/CRs'

const DEFAULT_DOCUMENT_NAVIGATION_PREFERENCES: DocumentNavigationPreferences = {
  recentDocuments: [],
}

const STORAGE_KEY = 'markdown-ticket:documents-navigation'

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

export function sanitizeDocumentNavigationPreferences(
  preferences: DocumentNavigationPreferences,
  eligiblePaths: string[],
): DocumentNavigationPreferences {
  const eligible = new Set(eligiblePaths.map(normalizePath))
  const isEligible = (path: string) => eligible.has(normalizePath(path))

  const recentDocuments = uniqueValidPaths(preferences.recentDocuments).filter(isEligible).slice(0, MAX_RECENT_DOCUMENTS)

  return { recentDocuments }
}

export function getDocumentNavigationPreferences(): DocumentNavigationPreferences {
  const stored = readLocalStoragePreference<DocumentNavigationPreferences>(
    STORAGE_KEY,
    DEFAULT_DOCUMENT_NAVIGATION_PREFERENCES,
  )
  return {
    recentDocuments: uniqueValidPaths(stored.recentDocuments).slice(0, MAX_RECENT_DOCUMENTS),
  }
}

export function setDocumentNavigationPreferences(
  preferences: DocumentNavigationPreferences,
): void {
  writeLocalStoragePreference(STORAGE_KEY, {
    recentDocuments: uniqueValidPaths(preferences.recentDocuments).slice(0, MAX_RECENT_DOCUMENTS),
  })
}

export function addRecentDocument(documentPath: string): void {
  if (isTicketAreaPath(documentPath))
    return

  const preferences = getDocumentNavigationPreferences()
  const normalized = normalizePath(documentPath)
  const recentDocuments = [
    normalized,
    ...preferences.recentDocuments.filter(path => normalizePath(path) !== normalized),
  ].slice(0, MAX_RECENT_DOCUMENTS)

  setDocumentNavigationPreferences({
    ...preferences,
    recentDocuments,
  })
}
