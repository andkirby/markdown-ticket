export const BoardLayoutMode = {
  FLAT: 'flat',
  SWIMLANES: 'swimlanes',
} as const

export type BoardLayoutModeValue = typeof BoardLayoutMode[keyof typeof BoardLayoutMode]

export const BoardLayoutModes = [
  BoardLayoutMode.FLAT,
  BoardLayoutMode.SWIMLANES,
] as const

const BOARD_LAYOUT_MODE_STORAGE_KEY = 'mdt-board-mode'

export function getBoardLayoutModePreference(): BoardLayoutModeValue {
  if (typeof window === 'undefined')
    return BoardLayoutMode.FLAT

  return window.localStorage.getItem(BOARD_LAYOUT_MODE_STORAGE_KEY) === BoardLayoutMode.SWIMLANES
    ? BoardLayoutMode.SWIMLANES
    : BoardLayoutMode.FLAT
}

export function setBoardLayoutModePreference(mode: BoardLayoutModeValue): void {
  window.localStorage.setItem(BOARD_LAYOUT_MODE_STORAGE_KEY, mode)
}
