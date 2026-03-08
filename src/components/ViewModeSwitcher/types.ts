/**
 * ViewMode type-safe enum following MDT pattern
 * Provides BOARD, LIST, and DOCUMENTS view modes
 */

// 1. Const object with named keys (single source of truth)
const ViewModeEnum = {
  BOARD: 'board',
  LIST: 'list',
  DOCUMENTS: 'documents',
} as const

// Export as ViewMode for value access
export { ViewModeEnum as ViewMode }

// 2. Explicit type (inferred from const object)
export type ViewMode = typeof ViewModeEnum[keyof typeof ViewModeEnum]

// 3. Explicit array (derives values from const object)
export const ViewModes = [
  ViewModeEnum.BOARD,
  ViewModeEnum.LIST,
  ViewModeEnum.DOCUMENTS,
] as const
