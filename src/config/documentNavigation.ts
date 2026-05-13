export interface DocumentNavigationPreferences {
  recentDocuments: string[]
}

const MAX_RECENT_DOCUMENTS = 5
const TICKET_AREA_PATH = 'docs/CRs'

const DEFAULT_DOCUMENT_NAVIGATION_PREFERENCES: DocumentNavigationPreferences = {
  recentDocuments: [],
}

function getStorageKey(projectId: string): string {
  return `documents-navigation-${projectId}`
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

export function sanitizeDocumentNavigationPreferences(
  preferences: DocumentNavigationPreferences,
  eligiblePaths: string[],
): DocumentNavigationPreferences {
  const eligible = new Set(eligiblePaths.map(normalizePath))
  const isEligible = (path: string) => eligible.has(normalizePath(path))

  const recentDocuments = uniqueValidPaths(preferences.recentDocuments).filter(isEligible).slice(0, MAX_RECENT_DOCUMENTS)

  return { recentDocuments }
}

export function getDocumentNavigationPreferences(projectId: string): DocumentNavigationPreferences {
  try {
    const stored = localStorage.getItem(getStorageKey(projectId))
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<DocumentNavigationPreferences>
      return {
        recentDocuments: uniqueValidPaths(parsed.recentDocuments ?? []).slice(0, MAX_RECENT_DOCUMENTS),
      }
    }
  }
  catch (error) {
    console.warn('Failed to load document navigation preferences:', error)
  }
  return DEFAULT_DOCUMENT_NAVIGATION_PREFERENCES
}

export function setDocumentNavigationPreferences(
  projectId: string,
  preferences: DocumentNavigationPreferences,
): void {
  try {
    const sanitized = {
      recentDocuments: uniqueValidPaths(preferences.recentDocuments).slice(0, MAX_RECENT_DOCUMENTS),
    }
    localStorage.setItem(getStorageKey(projectId), JSON.stringify(sanitized))
  }
  catch (error) {
    console.warn('Failed to save document navigation preferences:', error)
  }
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
