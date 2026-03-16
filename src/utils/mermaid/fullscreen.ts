import { ADAPTIVE_SCALE, SCALE_FACTORS } from './constants'
import { disableZoom, enableZoom } from './zoom'

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

/**
 * Request fullscreen for an element with vendor prefix support
 */
export async function enterFullscreen(element: HTMLElement): Promise<void> {
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

/**
 * Exit fullscreen with vendor prefix support
 */
export async function exitFullscreen(): Promise<void> {
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

/**
 * Toggle fullscreen mode for a mermaid container
 */
async function toggleMermaidFullscreen(container: HTMLElement): Promise<void> {
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
  })
}

/**
 * Update fullscreen button icons and container styles based on fullscreen state
 */
export function updateFullscreenButtons(): void {
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
      applyFullscreenStyles(container as HTMLElement)
      enableZoom(container as HTMLElement)
    }
    else {
      clearFullscreenStyles(container as HTMLElement)
      disableZoom(container as HTMLElement)
    }
  })
}

/**
 * Apply fullscreen container styles
 */
function applyFullscreenStyles(container: HTMLElement): void {
  const isDarkMode = document.documentElement.classList.contains('dark')
  container.style.backgroundColor = isDarkMode ? '#111827' : 'white'
  container.style.padding = '2rem'
  container.style.display = 'flex'
  container.style.alignItems = 'center'
  container.style.justifyContent = 'center'
  container.style.minHeight = '100vh'
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
  container.style.backgroundColor = ''
  container.style.padding = ''
  container.style.display = ''
  container.style.alignItems = ''
  container.style.justifyContent = ''
  container.style.minHeight = ''
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
