export type TocView = 'document' | 'ticket'

export interface TocState {
  isExpanded: boolean
}

const DEFAULT_TOC_STATE: TocState = {
  isExpanded: true,
}

// Storage key pattern following project convention
const getStorageKey = (view: TocView): string => `markdown-ticket-toc-${view}`

export function getTocState(view: TocView): TocState {
  try {
    const stored = localStorage.getItem(getStorageKey(view))
    if (stored) {
      return { ...DEFAULT_TOC_STATE, ...JSON.parse(stored) }
    }
  }
  catch (error) {
    console.warn('Failed to load ToC state:', error)
  }
  return DEFAULT_TOC_STATE
}

export function setTocState(view: TocView, state: TocState): void {
  try {
    localStorage.setItem(getStorageKey(view), JSON.stringify(state))
  }
  catch (error) {
    console.warn('Failed to save ToC state:', error)
  }
}
