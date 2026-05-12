import { readLocalStoragePreference, writeLocalStoragePreference } from './localStoragePreferences'

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
  return readLocalStoragePreference(getStorageKey(view), DEFAULT_TOC_STATE, {
    merge: (storedValue, defaultValue) => ({ ...defaultValue, ...storedValue as Partial<TocState> }),
  })
}

export function setTocState(view: TocView, state: TocState): void {
  writeLocalStoragePreference(getStorageKey(view), state)
}
