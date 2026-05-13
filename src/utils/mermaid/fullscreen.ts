import { ADAPTIVE_SCALE, SCALE_FACTORS } from './constants'
import { disableZoom, enableZoom } from './zoom'

let activeOverlayContainer: HTMLElement | null = null
let previousBodyOverflow = ''

/**
 * Toggle fullscreen mode for a mermaid container
 */
function toggleMermaidFullscreen(container: HTMLElement): void {
  if (container.dataset.overlayEnabled === 'true') {
    exitMermaidOverlay(container)

    return
  }

  enterMermaidOverlay(container)
}

function enterMermaidOverlay(container: HTMLElement): void {
  if (activeOverlayContainer && activeOverlayContainer !== container) {
    exitMermaidOverlay(activeOverlayContainer)
  }

  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'

  applyFullscreenStyles(container)
  enableZoom(container)
  container.dataset.overlayEnabled = 'true'
  activeOverlayContainer = container
  updateFullscreenButton(container, true)
  document.addEventListener('keydown', handleOverlayKeydown, true)
}

function exitMermaidOverlay(container: HTMLElement): void {
  disableZoom(container)
  clearFullscreenStyles(container)
  container.dataset.overlayEnabled = 'false'
  updateFullscreenButton(container, false)

  if (activeOverlayContainer === container) {
    activeOverlayContainer = null
    document.body.style.overflow = previousBodyOverflow
    document.removeEventListener('keydown', handleOverlayKeydown, true)
  }
}

function handleOverlayKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && activeOverlayContainer) {
    event.preventDefault()
    event.stopImmediatePropagation()
    exitMermaidOverlay(activeOverlayContainer)
  }
}

/**
 * Add fullscreen buttons to all mermaid containers
 */
export function addFullscreenButtons(): void {
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
    ;(container as HTMLElement).dataset.overlayEnabled = 'false'
  })
}

/**
 * Update fullscreen button icons and container styles based on fullscreen state
 */
export function updateFullscreenButtons(): void {
  const mermaidContainers = document.querySelectorAll('.mermaid-container')

  mermaidContainers.forEach((container) => {
    updateFullscreenButton(container as HTMLElement, (container as HTMLElement).dataset.overlayEnabled === 'true')
  })
}

function updateFullscreenButton(container: HTMLElement, isFullscreen: boolean): void {
  const button = container.querySelector('.mermaid-fullscreen-btn') as HTMLButtonElement
  if (!button)
    return

  button.title = isFullscreen ? 'Exit fullscreen (Scroll to zoom)' : 'Enter fullscreen'
  button.innerHTML = isFullscreen
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
       <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3M3 16h3a2 2 0 0 0 2 2v3" />
     </svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
       <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
     </svg>`
}

/**
 * Apply fullscreen container styles
 */
function applyFullscreenStyles(container: HTMLElement): void {
  const isDarkMode = document.documentElement.classList.contains('dark')
  container.style.position = 'fixed'
  container.style.inset = '0'
  container.style.zIndex = '9999'
  container.style.width = '100vw'
  container.style.height = '100vh'
  container.style.backgroundColor = isDarkMode ? '#111827' : 'white'
  container.style.padding = '2rem'
  container.style.display = 'flex'
  container.style.alignItems = 'center'
  container.style.justifyContent = 'center'
  container.style.boxSizing = 'border-box'
  container.style.overflow = 'hidden'

  const diagram = container.querySelector('.mermaid') as HTMLElement
  if (diagram) {
    const svg = diagram.querySelector('svg')
    if (svg) {
      svg.style.backgroundColor = 'transparent'
    }

    const adaptiveScale = calculateAdaptiveScale(container, diagram)
    diagram.style.transform = `scale(${adaptiveScale})`
    diagram.style.transformOrigin = 'center center'
    diagram.dataset.fullscreenScale = adaptiveScale.toString()
  }
}

/**
 * Clear fullscreen container styles
 */
function clearFullscreenStyles(container: HTMLElement): void {
  container.style.position = 'relative'
  container.style.inset = ''
  container.style.zIndex = ''
  container.style.width = ''
  container.style.height = ''
  container.style.backgroundColor = ''
  container.style.padding = ''
  container.style.display = ''
  container.style.alignItems = ''
  container.style.justifyContent = ''
  container.style.boxSizing = ''
  container.style.overflow = ''

  const diagram = container.querySelector('.mermaid') as HTMLElement
  if (diagram) {
    diagram.style.transform = ''
    diagram.style.transformOrigin = ''
    delete diagram.dataset.fullscreenScale
  }
}

/**
 * Calculate adaptive scale based on container and diagram dimensions
 */
function calculateAdaptiveScale(container: HTMLElement, diagram: HTMLElement): number {
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
  else if (parentContainer && !isInModal) {
    adaptiveScale = ADAPTIVE_SCALE.DOCUMENTS_VIEW
  }

  return adaptiveScale
}
