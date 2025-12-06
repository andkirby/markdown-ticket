/**
 * Button mode styling utilities for consistent orange theme across components
 * Used by StatusToggle and other button components
 */

// Orange theme color palette
export const ORANGE_THEME = {
  // Light mode colors
  light: {
    background: {
      default: 'rgb(249, 115, 22)',   // orange-500
      hover: 'rgb(249, 125, 35)',     // lighter orange
      active: 'rgb(234, 88, 12)',      // orange-600
    },
    border: {
      default: 'rgb(249, 115, 22)',   // orange-500
      hover: 'rgb(249, 125, 35)',     // lighter orange
    },
    text: {
      primary: 'white',
      secondary: 'rgb(234, 88, 12)',   // orange-600 for number badges
    },
  },
  // Dark mode colors
  dark: {
    background: {
      default: 'rgb(217, 119, 6)',     // orange-600 (darker for dark mode)
      hover: 'rgb(234, 88, 12)',       // orange-500
      active: 'rgb(194, 65, 12)',      // orange-700
    },
    border: {
      default: 'rgb(217, 119, 6)',     // orange-600
      hover: 'rgb(234, 88, 12)',       // orange-500
    },
    text: {
      primary: 'white',
      secondary: 'rgb(251, 146, 60)',  // orange-400 for number badges
    },
  },
} as const;

// Button mode to CSS class mappings
const MODE_CLASSES = {
  // Orange button modes
  orange: {
    base: 'bg-orange-500 hover:bg-orange-400 active:bg-orange-600 border-orange-500 hover:border-orange-400 text-white',
    dark: 'dark:bg-orange-600 dark:hover:bg-orange-500 dark:active:bg-orange-700 dark:border-orange-600 dark:hover:border-orange-500',
  },
  'orange-outline': {
    base: 'bg-transparent hover:bg-orange-50 active:bg-orange-100 border-orange-500 text-orange-600',
    dark: 'dark:bg-transparent dark:hover:bg-orange-950 dark:active:bg-orange-900 dark:border-orange-500 dark:text-orange-400',
  },
  'orange-number-badge': {
    base: 'bg-orange-500 text-white border-2 border-white shadow-sm',
    dark: 'dark:bg-orange-600 dark:border-gray-800',
  },

  // Status modes
  status: {
    base: 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300 border-gray-300 text-gray-700',
    dark: 'dark:bg-gray-700 dark:hover:bg-gray-600 dark:active:bg-gray-500 dark:border-gray-500 dark:text-gray-200',
  },
  'status-on-hold': {
    base: 'bg-yellow-100 hover:bg-yellow-200 active:bg-yellow-300 border-yellow-300 text-yellow-700',
    dark: 'dark:bg-yellow-900 dark:hover:bg-yellow-800 dark:active:bg-yellow-700 dark:border-yellow-700 dark:text-yellow-200',
  },
  'status-reject': {
    base: 'bg-red-100 hover:bg-red-200 active:bg-red-300 border-red-300 text-red-700',
    dark: 'dark:bg-red-900 dark:hover:bg-red-800 dark:active:bg-red-700 dark:border-red-700 dark:text-red-200',
  },
} as const;

/**
 * Get CSS classes for a button mode
 * @param mode - The button mode
 * @returns Combined CSS classes with light and dark mode support
 */
export function getButtonModeClasses(mode: keyof typeof MODE_CLASSES): string {
  const modeConfig = MODE_CLASSES[mode];
  if (!modeConfig) {
    console.warn(`Unknown button mode: ${mode}`);
    return '';
  }
  return `${modeConfig.base} ${modeConfig.dark}`.trim();
}

/**
 * Get theme colors for a specific mode and color type
 * @param mode - Button mode
 * @param colorType - Type of color (background, border, text)
 * @param isDark - Whether dark mode is active
 * @returns CSS color value
 */
export function getThemeColor(
  mode: string,
  colorType: 'background' | 'border' | 'text',
  isDark: boolean = false
): string {
  if (mode.startsWith('orange')) {
    const theme = isDark ? ORANGE_THEME.dark : ORANGE_THEME.light;

    // Handle text color type differently as it has primary/secondary structure
    if (colorType === 'text') {
      return theme.text.primary;
    }

    return theme[colorType].default;
  }

  // Fallback for non-orange modes
  return '';
}

/**
 * Check if a mode is an orange-themed mode
 * @param mode - Button mode to check
 * @returns True if mode uses orange theme
 */
export function isOrangeMode(mode: string): mode is keyof typeof MODE_CLASSES {
  return mode.startsWith('orange') || mode === 'status-on-hold' || mode === 'status-reject';
}