import {
  DOCUMENT_FAV_STATE_DEFAULTS,
  DocumentFavItemSchema,
  DocumentFavStateSchema,
  GlobalConfigSchema,
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
