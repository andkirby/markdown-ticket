export interface DocumentSortPreferences {
  sortBy: 'name' | 'title' | 'created' | 'modified';
  sortDirection: 'asc' | 'desc';
}

export const DEFAULT_DOCUMENT_SORT_PREFERENCES: DocumentSortPreferences = {
  sortBy: 'name',
  sortDirection: 'asc',
};

// Local storage key pattern: documents-sort-{projectId}
const getStorageKey = (projectId: string): string => {
  return `documents-sort-${projectId}`;
};

export function getDocumentSortPreferences(projectId: string): DocumentSortPreferences {
  try {
    const stored = localStorage.getItem(getStorageKey(projectId));
    if (stored) {
      return { ...DEFAULT_DOCUMENT_SORT_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.warn('Failed to load document sort preferences:', error);
  }
  return DEFAULT_DOCUMENT_SORT_PREFERENCES;
}

export function setDocumentSortPreferences(projectId: string, preferences: DocumentSortPreferences): void {
  try {
    localStorage.setItem(getStorageKey(projectId), JSON.stringify(preferences));
  } catch (error) {
    console.warn('Failed to save document sort preferences:', error);
  }
}
