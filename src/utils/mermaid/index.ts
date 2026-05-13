// Re-export constants for convenience
export { ADAPTIVE_SCALE, SCALE_FACTORS, THEME_CONFIG, ZOOM_LIMITS } from './constants'
// Public API - most common imports
export { processMermaidBlocks } from './core'

// Internal exports for advanced usage
export { initMermaid } from './core'
export { addFullscreenButtons, updateFullscreenButtons } from './fullscreen'
export { useMermaid, type UseMermaidReturn } from './hooks'

export { disableZoom, enableZoom, type HTMLElementWithZoomHandlers, type ZoomHandlers } from './zoom'
