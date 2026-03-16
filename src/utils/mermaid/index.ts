// Public API - most common imports
export { processMermaidBlocks } from './core'
export { useMermaid, type UseMermaidReturn } from './hooks'

// Internal exports for advanced usage
export { initMermaid } from './core'
export { addFullscreenButtons, updateFullscreenButtons, enterFullscreen, exitFullscreen } from './fullscreen'
export { enableZoom, disableZoom, type ZoomHandlers, type HTMLElementWithZoomHandlers } from './zoom'

// Re-export constants for convenience
export { ADAPTIVE_SCALE, SCALE_FACTORS, THEME_CONFIG, ZOOM_LIMITS } from './constants'
