/**
 * Mermaid diagram utility constants
 * Extracted from src/utils/mermaid.ts for better maintainability
 */

/**
 * Zoom boundary values for different diagram sizes
 */
export const ZOOM_LIMITS = {
  /** Minimum zoom level (10% of original size) */
  MIN: 0.1,
  /** Default maximum zoom for standard diagrams */
  DEFAULT_MAX: 10,
  /** Maximum zoom for wide/tall diagrams (> 800x600) */
  WIDE_MAX: 15,
  /** Maximum zoom for ultra-wide diagrams (> 1200x800) */
  ULTRA_WIDE_MAX: 20,
  /** Width threshold to consider diagram as "wide" */
  WIDTH_THRESHOLD: 800,
  /** Height threshold to consider diagram as "tall" */
  HEIGHT_THRESHOLD: 600,
  /** Width threshold to consider diagram as "ultra-wide" */
  ULTRA_WIDTH_THRESHOLD: 1200,
  /** Height threshold to consider diagram as "ultra-tall" */
  ULTRA_HEIGHT_THRESHOLD: 800,
} as const

/**
 * Scaling multipliers for different zoom interactions
 */
export const SCALE_FACTORS = {
  /** Percentage of current scale for wheel zoom (10%) */
  WHEEL_STEP: 0.1,
  /** Percentage of current scale for pinch zoom (15%) */
  PINCH_STEP: 0.15,
  /** Percentage of viewport to use for fullscreen fit (90%) */
  FULLSCREEN_FIT: 0.9,
} as const

/**
 * Mermaid theme configuration
 */
export const THEME_CONFIG = {
  /** Font family for mermaid diagrams */
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  /** Font size for mermaid text */
  fontSize: '14px',
  /** Background color for diagrams */
  background: 'transparent',
} as const

/**
 * Adaptive scaling bounds for fullscreen mode
 */
export const ADAPTIVE_SCALE = {
  /** Minimum adaptive scale factor */
  MIN: 0.5,
  /** Maximum adaptive scale factor */
  MAX: 8,
  /** Default fallback scale when calculation fails */
  DEFAULT: 2.3,
  /** Fallback scale for documents view context */
  DOCUMENTS_VIEW: 3.0,
} as const
