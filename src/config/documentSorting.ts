import { readLocalStoragePreference, writeLocalStoragePreference } from './localStoragePreferences'

export interface DocumentSortPreferences {
  sortBy: 'name' | 'title' | 'created' | 'modified'
  sortDirection: 'asc' | 'desc'
}

const DEFAULT_DOCUMENT_SORT_PREFERENCES: DocumentSortPreferences = {
  sortBy: 'name',
  sortDirection: 'asc',
}

// Local storage key pattern: documents-sort-{projectId}
function getStorageKey(projectId: string): string {
  return `documents-sort-${projectId}`
}

export function getDocumentSortPreferences(projectId: string): DocumentSortPreferences {
  return readLocalStoragePreference(getStorageKey(projectId), DEFAULT_DOCUMENT_SORT_PREFERENCES, {
    merge: (storedValue, defaultValue) => ({ ...defaultValue, ...storedValue as Partial<DocumentSortPreferences> }),
  })
}

export function setDocumentSortPreferences(projectId: string, preferences: DocumentSortPreferences): void {
  writeLocalStoragePreference(getStorageKey(projectId), preferences)
}
