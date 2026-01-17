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
  // Matches status badge colors and column colors with lighter gradients
  const gradientMap: Record<string, string> = {
    gray: 'to-gray-50 via-gray-100 from-gray-300 dark:to-gray-800 dark:via-gray-750 dark:from-gray-600',
    blue: 'from-blue-50 via-blue-100 to-blue-150 dark:from-blue-800 dark:via-blue-750 dark:to-blue-700',
    yellow: 'from-yellow-50 via-yellow-100 to-yellow-150 dark:from-yellow-800 dark:via-yellow-750 dark:to-yellow-700',
    green: 'from-green-50 via-green-100 to-green-150 dark:from-green-800 dark:via-green-750 dark:to-green-700',
    red: 'from-red-50 via-red-100 to-red-150 dark:from-red-800 dark:via-red-750 dark:to-red-700',
    teal: 'from-teal-50 via-teal-100 to-teal-150 dark:from-teal-800 dark:via-teal-750 dark:to-teal-700',
    indigo: 'from-indigo-50 via-indigo-100 to-indigo-150 dark:from-indigo-800 dark:via-indigo-750 dark:to-indigo-700',
    orange: 'from-orange-50 via-orange-100 to-orange-150 dark:from-orange-800 dark:via-orange-750 dark:to-orange-700',
    purple: 'from-purple-50 via-purple-100 to-purple-150 dark:from-purple-800 dark:via-purple-750 dark:to-purple-700',
    pink: 'from-pink-50 via-pink-100 to-pink-150 dark:from-pink-800 dark:via-pink-750 dark:to-pink-700',
  }

  // Return the gradient classes or a default gray gradient if color not found
  return gradientMap[colorName] || gradientMap.gray
}
