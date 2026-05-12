export interface LocalStoragePreferenceReadOptions<T> {
  legacyKeys?: readonly string[]
  merge?: (storedValue: unknown, defaultValue: T) => T
}

function getBrowserLocalStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  }
  catch {
    return null
  }
}

export function readLocalStoragePreference<T>(
  key: string,
  defaultValue: T,
  options: LocalStoragePreferenceReadOptions<T> = {},
): T {
  const storage = getBrowserLocalStorage()

  if (!storage)
    return defaultValue

  for (const storageKey of [key, ...(options.legacyKeys ?? [])]) {
    try {
      const storedValue = storage.getItem(storageKey)

      if (storedValue === null)
        continue

      const parsedValue = JSON.parse(storedValue) as unknown
      return options.merge ? options.merge(parsedValue, defaultValue) : parsedValue as T
    }
    catch (error) {
      console.warn(`Failed to load localStorage preference "${storageKey}":`, error)
      return defaultValue
    }
  }

  return defaultValue
}

export function writeLocalStoragePreference<T>(key: string, value: T): void {
  const storage = getBrowserLocalStorage()

  if (!storage)
    return

  try {
    storage.setItem(key, JSON.stringify(value))
  }
  catch (error) {
    console.warn(`Failed to save localStorage preference "${key}":`, error)
  }
}
