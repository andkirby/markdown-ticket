/**
 * Color utilities for mapping color names to Tailwind CSS gradient classes
 * Supports both light and dark mode
 */

/**
 * Maps a color name to the appropriate Tailwind gradient classes
 * Matches the status badge colors from TicketAttributeTags and column colors
 * @param colorName - The color name (e.g., 'gray', 'green', 'blue', 'yellow', 'red', 'teal', 'indigo', 'orange', 'purple', 'pink')
 * @returns Tailwind gradient className string
 */
export function getColumnGradient(colorName: string): string {
  // Original gradient directions preserved — only invalid Tailwind shades fixed:
  //   *-150 → *-200  (no 150 shade in Tailwind)
  //   *-750 → spread to valid *-900 / *-800 / *-700 stops
  const gradientMap: Record<string, string> = {
    gray: 'to-gray-50 via-gray-100 from-gray-300 dark:to-gray-800 dark:via-gray-700 dark:from-gray-600',
    blue: 'from-blue-50 via-blue-100 to-blue-200 dark:from-blue-900 dark:via-blue-800 dark:to-blue-700',
    yellow: 'from-yellow-50 via-yellow-100 to-yellow-200 dark:from-yellow-900 dark:via-yellow-800 dark:to-yellow-700',
    green: 'from-green-50 via-green-100 to-green-200 dark:from-green-900 dark:via-green-800 dark:to-green-700',
    red: 'from-red-50 via-red-100 to-red-200 dark:from-red-900 dark:via-red-800 dark:to-red-700',
    teal: 'from-teal-50 via-teal-100 to-teal-200 dark:from-teal-900 dark:via-teal-800 dark:to-teal-700',
    indigo: 'from-indigo-50 via-indigo-100 to-indigo-200 dark:from-indigo-900 dark:via-indigo-800 dark:to-indigo-700',
    orange: 'from-orange-50 via-orange-100 to-orange-200 dark:from-orange-900 dark:via-orange-800 dark:to-orange-700',
    purple: 'from-purple-50 via-purple-100 to-purple-200 dark:from-purple-900 dark:via-purple-800 dark:to-purple-700',
    pink: 'from-pink-50 via-pink-100 to-pink-200 dark:from-pink-900 dark:via-pink-800 dark:to-pink-700',
  }

  // Return the gradient classes or a default gray gradient if color not found
  return gradientMap[colorName] || gradientMap.gray
}
