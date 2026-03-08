import { useState } from 'react'
import { useMediaQuery } from './useMediaQuery'

/**
 * Hook for managing board layout behavior, particularly mobile column switching.
 *
 * On mobile devices, only one column is visible at a time. This hook provides
 * the state and helper functions needed to implement this behavior.
 *
 * @returns Object containing layout state and helpers
 * @returns {boolean} isMobile - Whether the current viewport is mobile-sized
 * @returns {number} activeColumnIndex - Index of the currently active column (mobile only)
 * @returns {function} setActiveColumnIndex - Function to set the active column index
 * @returns {function} shouldShowColumn - Helper to determine if a column should be visible
 *
 * @example
 * ```tsx
 * function Board({ columns }: { columns: Column[] }) {
 *   const { isMobile, activeColumnIndex, setActiveColumnIndex, shouldShowColumn } = useBoardLayout()
 *
 *   return (
 *     <div>
 *       {isMobile && (
 *         <ColumnSelector
 *           columns={columns}
 *           activeIndex={activeColumnIndex}
 *           onSelect={setActiveColumnIndex}
 *         />
 *       )}
 *
 *       <div className="board">
 *         {columns
 *           .filter((_, index) => shouldShowColumn(index))
 *           .map((column) => (
 *             <Column key={column.id} {...column} />
 *           ))}
 *       </div>
 *     </div>
 *   )
 * }
 * ```
 */
export function useBoardLayout() {
  const [mobileActiveColumnIndex, setMobileActiveColumnIndex] = useState(0)
  const isMobile = useMediaQuery('(max-width: 768px)')

  /**
   * Determines if a column should be visible based on current layout state.
   * On desktop, all columns are shown. On mobile, only the active column is shown.
   *
   * @param index - The column index to check
   * @returns true if the column should be visible, false otherwise
   */
  const shouldShowColumn = (index: number): boolean => {
    return !isMobile || index === mobileActiveColumnIndex
  }

  return {
    isMobile,
    activeColumnIndex: mobileActiveColumnIndex,
    setActiveColumnIndex: setMobileActiveColumnIndex,
    shouldShowColumn,
  }
}
