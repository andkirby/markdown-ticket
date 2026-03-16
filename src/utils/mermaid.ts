import mermaid from 'mermaid'
import { useEffect, useRef, useCallback } from 'react'
import { ADAPTIVE_SCALE, SCALE_FACTORS, THEME_CONFIG, ZOOM_LIMITS } from './mermaid/constants'

// Vendor-prefixed Fullscreen API extensions
interface HTMLElementWithFullscreen extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>
  msRequestFullscreen?: () => Promise<void>
}

interface DocumentWithFullscreen extends Document {
  webkitExitFullscreen?: () => Promise<void>
  msExitFullscreen?: () => Promise<void>
  webkitFullscreenElement?: Element | null
  msFullscreenElement?: Element | null
}

// Zoom handlers interface for cleanup
interface ZoomHandlers {
  wheel: (e: WheelEvent) => void
  mouseDown: (e: MouseEvent) => void
  mouseMove: (e: MouseEvent) => void
  mouseUp: () => void
  touchStart: (e: TouchEvent) => void
  touchMove: (e: TouchEvent) => void
  touchEnd: () => void
  doubleClick: () => void
}

interface HTMLElementWithZoomHandlers extends HTMLElement {
  _zoomHandlers?: ZoomHandlers
}

/**
 * Initialize mermaid with theme-aware configuration
 * @param isDark - Whether dark mode is active
 */
function initMermaid(isDark: boolean) {
  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? 'dark' : 'default',
    themeVariables: {
      ...THEME_CONFIG,
      primaryColor: isDark ? '#1f2937' : '#f9fafb',
      primaryTextColor: isDark ? '#f9fafb' : '#1f2937',
    },
  })
}

/**
 * Process HTML to transform mermaid code blocks into renderable containers
 */
export function processMermaidBlocks(html: string): string {
  let counter = 0
  return html
    .replace(
      /<pre><code class="mermaid language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
      (_match, content) => {
        const decoded = content.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&')
        const id = `mermaid-diagram-${++counter}`
        return `<div class="mermaid-container" data-mermaid-id="${id}"><code class="mermaid" id="${id}">${decoded}</code></div>`
      },
    )
    .replace(
      /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
      (_match, content) => {
        const decoded = content.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&')
        const id = `mermaid-diagram-${++counter}`
        return `<div class="mermaid-container" data-mermaid-id="${id}"><code class="mermaid" id="${id}">${decoded}</code></div>`
      },
    )
}

/**
 * Add fullscreen buttons to all mermaid containers
 */
function addFullscreenButtons() {
  const mermaidContainers = document.querySelectorAll('.mermaid-container')

  mermaidContainers.forEach((container) => {
    if (container.querySelector('.mermaid-fullscreen-btn'))
      return

    const button = document.createElement('button')
    button.className = 'mermaid-fullscreen-btn absolute top-2 left-2 z-10 px-2 py-1 bg-black/20 hover:bg-black/30 text-white text-xs rounded transition-colors duration-200 backdrop-blur-sm'
    button.title = 'Enter fullscreen'
    button.type = 'button'

    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
      </svg>
    `

    button.addEventListener('click', () => toggleMermaidFullscreen(container as HTMLElement))

    ;(container as HTMLElement).style.position = 'relative'
    container.appendChild(button)
    container.setAttribute('data-zoom-enabled', 'false')
  })
}

async function toggleMermaidFullscreen(container: HTMLElement) {
  const isCurrentlyFullscreen = document.fullscreenElement === container

  try {
    if (isCurrentlyFullscreen) {
      await exitFullscreen()
      disableZoom(container)
    }
    else {
      await enterFullscreen(container)
      setTimeout(() => {
        enableZoom(container)
      }, 100)
    }
  }
  catch (err) {
    console.error('Error toggling fullscreen:', err)
  }
}

async function enterFullscreen(element: HTMLElement) {
  const elementWithFullscreen = element as HTMLElementWithFullscreen
  if (element.requestFullscreen) {
    await element.requestFullscreen()
  }
  else if (elementWithFullscreen.webkitRequestFullscreen) {
    await elementWithFullscreen.webkitRequestFullscreen()
  }
  else if (elementWithFullscreen.msRequestFullscreen) {
    await elementWithFullscreen.msRequestFullscreen()
  }
}

async function exitFullscreen() {
  const doc = document as DocumentWithFullscreen
  if (document.exitFullscreen) {
    await document.exitFullscreen()
  }
  else if (doc.webkitExitFullscreen) {
    await doc.webkitExitFullscreen()
  }
  else if (doc.msExitFullscreen) {
    await doc.msExitFullscreen()
  }
}

function updateFullscreenButtons() {
  const mermaidContainers = document.querySelectorAll('.mermaid-container')
  const doc = document as DocumentWithFullscreen
  const fullscreenElement = document.fullscreenElement
    || doc.webkitFullscreenElement
    || doc.msFullscreenElement

  mermaidContainers.forEach((container) => {
    const button = container.querySelector('.mermaid-fullscreen-btn') as HTMLButtonElement
    if (!button)
      return

    const isFullscreen = fullscreenElement === container

    button.title = isFullscreen ? 'Exit fullscreen (Scroll to zoom)' : 'Enter fullscreen'
    button.innerHTML = isFullscreen
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
         <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3M3 16h3a2 2 0 0 0 2 2v3" />
       </svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
         <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
       </svg>`

    if (isFullscreen) {
      const isDarkMode = document.documentElement.classList.contains('dark')
      ;(container as HTMLElement).style.backgroundColor = isDarkMode ? '#111827' : 'white'
      ;(container as HTMLElement).style.padding = '2rem'
      ;(container as HTMLElement).style.display = 'flex'
      ;(container as HTMLElement).style.alignItems = 'center'
      ;(container as HTMLElement).style.justifyContent = 'center'
      ;(container as HTMLElement).style.minHeight = '100vh'
      ;(container as HTMLElement).style.boxSizing = 'border-box'
      ;(container as HTMLElement).style.overflow = 'hidden'

      const diagram = container.querySelector('.mermaid') as HTMLElement
      if (diagram) {
        const svg = diagram.querySelector('svg')
        if (svg) {
          svg.style.backgroundColor = 'transparent'
        }

        const parentContainer = diagram.closest('.prose')
        const isInModal = !!diagram.closest('[role="dialog"]') || !!diagram.closest('.modal')

        let adaptiveScale: number = ADAPTIVE_SCALE.DEFAULT

        const containerRect = container.getBoundingClientRect()
        const diagramRect = diagram.getBoundingClientRect()

        if (containerRect.width > 0 && containerRect.height > 0 && diagramRect.width > 0 && diagramRect.height > 0) {
          const maxWidth = window.innerWidth * SCALE_FACTORS.FULLSCREEN_FIT
          const maxHeight = window.innerHeight * SCALE_FACTORS.FULLSCREEN_FIT

          const scaleX = maxWidth / diagramRect.width
          const scaleY = maxHeight / diagramRect.height

          const calculatedScale = Math.min(scaleX, scaleY)

          adaptiveScale = Math.max(ADAPTIVE_SCALE.MIN, Math.min(ADAPTIVE_SCALE.MAX, calculatedScale))
        }
        else {
          if (parentContainer && !isInModal) {
            adaptiveScale = ADAPTIVE_SCALE.DOCUMENTS_VIEW
          }
        }

        diagram.style.transform = `scale(${adaptiveScale})`
        diagram.style.transformOrigin = 'center center'
        diagram.dataset.fullscreenScale = adaptiveScale.toString()
      }

      enableZoom(container as HTMLElement)
    }
    else {
      ;(container as HTMLElement).style.backgroundColor = ''
      ;(container as HTMLElement).style.padding = ''
      ;(container as HTMLElement).style.display = ''
      ;(container as HTMLElement).style.alignItems = ''
      ;(container as HTMLElement).style.justifyContent = ''
      ;(container as HTMLElement).style.minHeight = ''
      ;(container as HTMLElement).style.boxSizing = ''
      ;(container as HTMLElement).style.overflow = ''

      const diagram = container.querySelector('.mermaid') as HTMLElement
      if (diagram) {
        diagram.style.transform = ''
        diagram.style.transformOrigin = ''
        delete diagram.dataset.fullscreenScale
      }

      disableZoom(container as HTMLElement)
    }
  })
}

function enableZoom(container: HTMLElement) {
  if (container.getAttribute('data-zoom-enabled') === 'true')
    return

  const diagram = container.querySelector('.mermaid') as HTMLElement
  if (!diagram)
    return

  const adaptiveScale = Number.parseFloat(diagram.dataset.fullscreenScale || String(ADAPTIVE_SCALE.DEFAULT))
  let scale = adaptiveScale
  let isDragging = false
  let dragStart = { x: 0, y: 0 }
  let translate = { x: 0, y: 0 }

  diagram.style.transformOrigin = 'center center'
  diagram.style.transition = 'transform 0.1s ease-out'
  diagram.style.cursor = 'grab'

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()

    const diagramRect = diagram.getBoundingClientRect()
    let maxZoom: number = ZOOM_LIMITS.DEFAULT_MAX

    if (diagramRect.width > ZOOM_LIMITS.WIDTH_THRESHOLD || diagramRect.height > ZOOM_LIMITS.HEIGHT_THRESHOLD) {
      maxZoom = ZOOM_LIMITS.WIDE_MAX
    }
    if (diagramRect.width > ZOOM_LIMITS.ULTRA_WIDTH_THRESHOLD || diagramRect.height > ZOOM_LIMITS.ULTRA_HEIGHT_THRESHOLD) {
      maxZoom = ZOOM_LIMITS.ULTRA_WIDE_MAX
    }

    const scaleStep = scale * SCALE_FACTORS.WHEEL_STEP
    const pinchScaleStep = scale * SCALE_FACTORS.PINCH_STEP

    if (e.ctrlKey) {
      const delta = e.deltaY > 0 ? -pinchScaleStep : pinchScaleStep
      const newScale = Math.max(ZOOM_LIMITS.MIN, Math.min(maxZoom, scale + delta))

      if (newScale !== scale) {
        scale = newScale
        diagram.style.transform = `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`
      }
    }
    else {
      const delta = e.deltaY > 0 ? -scaleStep : scaleStep
      const newScale = Math.max(ZOOM_LIMITS.MIN, Math.min(maxZoom, scale + delta))

      if (newScale !== scale) {
        scale = newScale
        diagram.style.transform = `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`
      }
    }
  }

  const handleMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      isDragging = true
      diagram.style.cursor = 'grabbing'
      diagram.style.transition = ''
      dragStart = { x: e.clientX - translate.x * scale, y: e.clientY - translate.y * scale }
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const scaledDeltaX = (e.clientX - dragStart.x) / scale
      const scaledDeltaY = (e.clientY - dragStart.y) / scale
      translate.x = scaledDeltaX
      translate.y = scaledDeltaY
      diagram.style.transform = `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`
    }
  }

  const handleMouseUp = () => {
    if (isDragging) {
      isDragging = false
      diagram.style.cursor = 'grab'
      diagram.style.transition = 'transform 0.1s ease-out'
    }
  }

  let lastTouchDistance = 0
  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      lastTouchDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY,
      )
    }
    else if (e.touches.length === 1) {
      isDragging = true
      const touch = e.touches[0]
      dragStart = { x: touch.clientX - translate.x * scale, y: touch.clientY - translate.y * scale }
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault()

    if (e.touches.length === 2) {
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY,
      )

      if (lastTouchDistance > 0) {
        const diagramRect = diagram.getBoundingClientRect()
        let maxZoom: number = ZOOM_LIMITS.DEFAULT_MAX

        if (diagramRect.width > ZOOM_LIMITS.WIDTH_THRESHOLD || diagramRect.height > ZOOM_LIMITS.HEIGHT_THRESHOLD) {
          maxZoom = ZOOM_LIMITS.WIDE_MAX
        }
        if (diagramRect.width > ZOOM_LIMITS.ULTRA_WIDTH_THRESHOLD || diagramRect.height > ZOOM_LIMITS.ULTRA_HEIGHT_THRESHOLD) {
          maxZoom = ZOOM_LIMITS.ULTRA_WIDE_MAX
        }

        const touchScaleStep = scale * SCALE_FACTORS.WHEEL_STEP
        const delta = (distance - lastTouchDistance) > 0 ? touchScaleStep : -touchScaleStep
        const newScale = Math.max(ZOOM_LIMITS.MIN, Math.min(maxZoom, scale + delta))

        if (newScale !== scale) {
          scale = newScale
          diagram.style.transform = `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`
        }
      }

      lastTouchDistance = distance
    }
    else if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0]
      const scaledDeltaX = (touch.clientX - dragStart.x) / scale
      const scaledDeltaY = (touch.clientY - dragStart.y) / scale
      translate.x = scaledDeltaX
      translate.y = scaledDeltaY
      diagram.style.transform = `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`
    }
  }

  const handleTouchEnd = () => {
    isDragging = false
    lastTouchDistance = 0
  }

  const handleDoubleClick = () => {
    scale = adaptiveScale
    translate = { x: 0, y: 0 }
    diagram.style.transition = 'transform 0.3s ease-out'
    diagram.style.transform = `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`
    setTimeout(() => {
      diagram.style.transition = 'transform 0.1s ease-out'
    }, 300)
  }

  container.addEventListener('wheel', handleWheel, { passive: false })
  diagram.addEventListener('mousedown', handleMouseDown)
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  diagram.addEventListener('touchstart', handleTouchStart, { passive: false })
  diagram.addEventListener('touchmove', handleTouchMove, { passive: false })
  diagram.addEventListener('touchend', handleTouchEnd)
  diagram.addEventListener('dblclick', handleDoubleClick)

  const containerWithHandlers = container as HTMLElementWithZoomHandlers
  container.setAttribute('data-zoom-enabled', 'true')
  containerWithHandlers._zoomHandlers = {
    wheel: handleWheel,
    mouseDown: handleMouseDown,
    mouseMove: handleMouseMove,
    mouseUp: handleMouseUp,
    touchStart: handleTouchStart,
    touchMove: handleTouchMove,
    touchEnd: handleTouchEnd,
    doubleClick: handleDoubleClick,
  }
}

function disableZoom(container: HTMLElement) {
  if (container.getAttribute('data-zoom-enabled') === 'false')
    return

  const diagram = container.querySelector('.mermaid') as HTMLElement
  if (!diagram)
    return

  diagram.style.transform = ''
  diagram.style.transformOrigin = ''
  diagram.style.transition = ''
  diagram.style.cursor = ''

  const containerWithHandlers = container as HTMLElementWithZoomHandlers
  const handlers = containerWithHandlers._zoomHandlers
  if (handlers) {
    container.removeEventListener('wheel', handlers.wheel)
    diagram.removeEventListener('mousedown', handlers.mouseDown)
    document.removeEventListener('mousemove', handlers.mouseMove)
    document.removeEventListener('mouseup', handlers.mouseUp)
    diagram.removeEventListener('touchstart', handlers.touchStart)
    diagram.removeEventListener('touchmove', handlers.touchMove)
    diagram.removeEventListener('touchend', handlers.touchEnd)
    diagram.removeEventListener('dblclick', handlers.doubleClick)
  }

  container.setAttribute('data-zoom-enabled', 'false')
  delete containerWithHandlers._zoomHandlers
}

/**
 * React hook for mermaid diagram rendering
 *
 * Handles initialization, theme changes, and proper cleanup of event listeners.
 * Use this in components that render mermaid diagrams.
 *
 * @example
 * ```tsx
 * function MarkdownRenderer({ content }: { content: string }) {
 *   const { renderMermaid } = useMermaid()
 *
 *   useEffect(() => {
 *     renderMermaid()
 *   }, [content, renderMermaid])
 *
 *   return <div dangerouslySetInnerHTML={{ __html: processedHtml }} />
 * }
 * ```
 */
export function useMermaid() {
  const initializedRef = useRef(false)

  // Get current theme
  const isDark = typeof document !== 'undefined'
    && document.documentElement.classList.contains('dark')

  const renderMermaid = useCallback(async () => {
    // Re-initialize to pick up theme changes
    initMermaid(isDark)
    initializedRef.current = true

    await mermaid.run()
    addFullscreenButtons()
  }, [isDark])

  useEffect(() => {
    // Add fullscreen change listeners
    document.addEventListener('fullscreenchange', updateFullscreenButtons)
    document.addEventListener('webkitfullscreenchange', updateFullscreenButtons)
    document.addEventListener('msfullscreenchange', updateFullscreenButtons)

    return () => {
      // Cleanup fullscreen listeners
      document.removeEventListener('fullscreenchange', updateFullscreenButtons)
      document.removeEventListener('webkitfullscreenchange', updateFullscreenButtons)
      document.removeEventListener('msfullscreenchange', updateFullscreenButtons)

      // Cleanup any active zoom handlers
      const mermaidContainers = document.querySelectorAll('.mermaid-container')
      mermaidContainers.forEach((container) => {
        disableZoom(container as HTMLElement)
      })
    }
  }, [])

  return {
    /** Render all mermaid diagrams in the DOM */
    renderMermaid,
    /** Whether mermaid has been initialized */
    isInitialized: initializedRef.current,
  }
}

// Export utility functions for non-React contexts
export { initMermaid, addFullscreenButtons, updateFullscreenButtons }
