interface SortAttribute {
  name: string;
  label: string;
  defaultDirection: 'asc' | 'desc';
  system: boolean;
}

export interface SortPreferences {
  selectedAttribute: string;
  selectedDirection: 'asc' | 'desc';
}

export const DEFAULT_SORT_ATTRIBUTES: SortAttribute[] = [
  { name: 'code', label: 'Key', defaultDirection: 'desc', system: true },
  { name: 'title', label: 'Title', defaultDirection: 'asc', system: true },
  { name: 'dateCreated', label: 'Created Date', defaultDirection: 'desc', system: true },
  { name: 'lastModified', label: 'Update Date', defaultDirection: 'desc', system: true },
];

const DEFAULT_SORT_PREFERENCES: SortPreferences = {
  selectedAttribute: 'code',
  selectedDirection: 'desc',
};

// Local storage keys
const SORT_PREFERENCES_KEY = 'markdown-ticket-sort-preferences';

export function getSortPreferences(): SortPreferences {
  try {
    const stored = localStorage.getItem(SORT_PREFERENCES_KEY);
    if (stored) {
      return { ...DEFAULT_SORT_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.warn('Failed to load sort preferences:', error);
  }
  return DEFAULT_SORT_PREFERENCES;
}

export function setSortPreferences(preferences: SortPreferences): void {
  try {
    localStorage.setItem(SORT_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn('Failed to save sort preferences:', error);
  }
}
