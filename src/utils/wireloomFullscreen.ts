import { ADAPTIVE_SCALE, SCALE_FACTORS } from './mermaid/constants'
import { disableZoom, enableZoom } from './mermaid/zoom'

const WIRELOOM_DIAGRAM_SELECTOR = '.wireloom__diagram'

let activeOverlayContainer: HTMLElement | null = null
let previousBodyOverflow = ''

function toggleWireloomFullscreen(container: HTMLElement): void {
  if (container.dataset.overlayEnabled === 'true') {
    exitWireloomOverlay(container)

    return
  }

  enterWireloomOverlay(container)
}

function enterWireloomOverlay(container: HTMLElement): void {
  if (activeOverlayContainer && activeOverlayContainer !== container) {
    exitWireloomOverlay(activeOverlayContainer)
  }

  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'

  applyFullscreenStyles(container)
  enableZoom(container, { diagramSelector: WIRELOOM_DIAGRAM_SELECTOR })
  container.dataset.overlayEnabled = 'true'
  activeOverlayContainer = container
  updateFullscreenButton(container, true)
  document.addEventListener('keydown', handleOverlayKeydown, true)
}

function exitWireloomOverlay(container: HTMLElement): void {
  disableZoom(container, { diagramSelector: WIRELOOM_DIAGRAM_SELECTOR })
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
    exitWireloomOverlay(activeOverlayContainer)
  }
}

export function addWireloomFullscreenButtons(container: ParentNode = document): void {
  const wireloomContainers = container.querySelectorAll('.wireloom')

  wireloomContainers.forEach((wireloomContainer) => {
    if (wireloomContainer.querySelector('.wireloom__fullscreen-btn'))
      return

    const button = document.createElement('button')
    button.className = 'wireloom__fullscreen-btn diagram-fullscreen-btn'
    button.title = 'Enter fullscreen'
    button.type = 'button'
    button.innerHTML = getFullscreenIcon(false)
    button.addEventListener('click', () => toggleWireloomFullscreen(wireloomContainer as HTMLElement))

    ;(wireloomContainer as HTMLElement).style.position = 'relative'
    wireloomContainer.appendChild(button)
    wireloomContainer.setAttribute('data-zoom-enabled', 'false')
    ;(wireloomContainer as HTMLElement).dataset.overlayEnabled = 'false'
  })
}

function updateFullscreenButton(container: HTMLElement, isFullscreen: boolean): void {
  const button = container.querySelector('.wireloom__fullscreen-btn') as HTMLButtonElement | null
  if (!button)
    return

  button.title = isFullscreen ? 'Exit fullscreen (Scroll to zoom)' : 'Enter fullscreen'
  button.innerHTML = getFullscreenIcon(isFullscreen)
}

function getFullscreenIcon(isFullscreen: boolean): string {
  return isFullscreen
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
       <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3M3 16h3a2 2 0 0 0 2 2v3" />
     </svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
       <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
     </svg>`
}

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

  const diagram = container.querySelector(WIRELOOM_DIAGRAM_SELECTOR) as HTMLElement | null
  if (!diagram)
    return

  const adaptiveScale = calculateAdaptiveScale(container, diagram)
  diagram.style.transform = `scale(${adaptiveScale})`
  diagram.style.transformOrigin = 'center center'
  diagram.dataset.fullscreenScale = adaptiveScale.toString()
}

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

  const diagram = container.querySelector(WIRELOOM_DIAGRAM_SELECTOR) as HTMLElement | null
  if (!diagram)
    return

  diagram.style.transform = ''
  diagram.style.transformOrigin = ''
  delete diagram.dataset.fullscreenScale
}

function calculateAdaptiveScale(container: HTMLElement, diagram: HTMLElement): number {
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

  return adaptiveScale
}
