import {
  DOCUMENT_FAV_STATE_DEFAULTS,
  DocumentFavItemSchema,
  DocumentFavStateSchema,
  GlobalConfigSchema,
  SELECTOR_ACCENT_HEX_PATTERN,
  SelectorPreferencesSchema,
  SelectorStateEntrySchema,
  SelectorStateSchema,
  UserConfigSchema,
} from './schema'

export function validateGlobalConfig(data: unknown) {
  return GlobalConfigSchema.parse(data)
}

export function safeValidateGlobalConfig(data: unknown) {
  return GlobalConfigSchema.safeParse(data)
}

export function validateUserConfig(data: unknown) {
  return UserConfigSchema.parse(data)
}

export function safeValidateUserConfig(data: unknown) {
  return UserConfigSchema.safeParse(data)
}

export function validateSelectorPreferences(data: unknown) {
  return SelectorPreferencesSchema.parse(data)
}

export function safeValidateSelectorPreferences(data: unknown) {
  return SelectorPreferencesSchema.safeParse(data)
}

export function validateSelectorStateEntry(data: unknown) {
  return SelectorStateEntrySchema.parse(data)
}

export function safeValidateSelectorStateEntry(data: unknown) {
  return SelectorStateEntrySchema.safeParse(data)
}

export function validateSelectorState(data: unknown) {
  return SelectorStateSchema.parse(data)
}

export function safeValidateSelectorState(data: unknown) {
  return SelectorStateSchema.safeParse(data)
}

export function isValidSelectorAccentHex(value: unknown): value is string {
  return typeof value === 'string' && SELECTOR_ACCENT_HEX_PATTERN.test(value)
}

export function normalizeSelectorAccentHex(value: string): string {
  return value.toLowerCase()
}

export function sanitizeSelectorStateEntry(data: unknown) {
  if (typeof data !== 'object' || data === null) {
    return null
  }

  const entry = data as Record<string, unknown>
  const sanitizedEntry: Record<string, unknown> = {
    favorite: entry.favorite,
    lastUsedAt: entry.lastUsedAt,
    count: entry.count,
  }

  if (isValidSelectorAccentHex(entry.accent)) {
    sanitizedEntry.accent = normalizeSelectorAccentHex(entry.accent)
  }

  return validateSelectorStateEntry(sanitizedEntry)
}

export function sanitizeSelectorState(data: unknown) {
  if (typeof data !== 'object' || data === null) {
    return {}
  }

  const sanitizedState: Record<string, ReturnType<typeof validateSelectorStateEntry>> = {}

  for (const [projectKey, entry] of Object.entries(data)) {
    const sanitizedEntry = sanitizeSelectorStateEntry(entry)
    if (sanitizedEntry) {
      sanitizedState[projectKey] = sanitizedEntry
    }
  }

  return sanitizedState
}

export function validateDocumentFavItem(data: unknown) {
  return DocumentFavItemSchema.parse(data)
}

export function safeValidateDocumentFavItem(data: unknown) {
  return DocumentFavItemSchema.safeParse(data)
}

export function validateDocumentFavState(data: unknown) {
  return DocumentFavStateSchema.parse(data)
}

export function safeValidateDocumentFavState(data: unknown) {
  return DocumentFavStateSchema.safeParse(data)
}

export function parseDocumentFavStateOrDefault(data: unknown) {
  const result = safeValidateDocumentFavState(data)

  if (!result.success) {
    return { favItems: [...DOCUMENT_FAV_STATE_DEFAULTS.favItems] }
  }

  return result.data
}
