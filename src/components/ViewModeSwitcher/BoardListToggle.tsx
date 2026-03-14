/**
 * MDT-131: BoardListToggle Component
 *
 * Toggle button for switching between board and list views.
 * Features hover overlay showing alternate view icon.
 */

interface BoardListToggleProps {
  currentMode: 'board' | 'list' // Always board or list, never documents
  onModeChange: (mode: 'board' | 'list' | 'documents') => void
  isDocumentsView: boolean // Whether currently in documents view
}

export function BoardListToggle({
  currentMode,
  onModeChange,
  isDocumentsView,
}: BoardListToggleProps) {
  // Determine icon paths for current and overlay modes
  const currentIconSrc = currentMode === 'board' ? '/icon_board_col_64.webp' : '/icon_list_64.webp'
  const overlayIconSrc = currentMode === 'board' ? '/icon_list_64.webp' : '/icon_board_col_64.webp'

  // Determine target mode when clicked
  const targetMode: 'board' | 'list' = currentMode === 'board' ? 'list' : 'board'

  const handleClick = () => {
    // If in documents view, return to the current mode (exit documents)
    // If in board/list, toggle to the alternate mode
    onModeChange(isDocumentsView ? currentMode : targetMode)
  }

  return (
    <button
      data-testid="board-list-toggle"
      data-current-mode={currentMode}
      onClick={handleClick}
      className={`h-12 w-12 rounded-md transition-all border ${
        isDocumentsView
          ? 'border-transparent opacity-60 hover:border-muted-foreground/30'
          : 'border-primary hover:border-muted-foreground/30'
      }`}
      type="button"
    >
      {/* Current mode icon */}
      <img
        data-testid={
          currentMode === 'board' ? 'board-icon' : 'list-icon'
        }
        src={currentIconSrc}
        alt={currentMode === 'board' ? 'Board view' : 'List view'}
        className="w-8 h-8 mx-auto dark:invert"
      />

      {/* Hover overlay - hidden in documents view, shown with hover in board/list view */}
      <div
        data-testid="board-list-toggle-overlay"
        className={`absolute inset-0 bg-background/95 rounded-md border border-primary flex items-center justify-center transition-opacity animate-in fade-in duration-150 pointer-events-none ${
          isDocumentsView
            ? 'hidden'
            : 'opacity-0 hover:opacity-100'
        }`}
      >
        <img
          data-testid={
            currentMode === 'board' ? 'list-icon' : 'board-icon'
          }
          src={overlayIconSrc}
          alt={currentMode === 'board' ? 'Switch to list view' : 'Switch to board view'}
          className="w-8 h-8 mx-auto dark:invert"
        />
      </div>
    </button>
  )
}
