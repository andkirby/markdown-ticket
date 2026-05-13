import { ADAPTIVE_SCALE, SCALE_FACTORS, ZOOM_LIMITS } from './constants'

/**
 * Zoom event handlers for cleanup
 */
export interface ZoomHandlers {
  wheel: (e: WheelEvent) => void
  mouseDown: (e: MouseEvent) => void
  mouseMove: (e: MouseEvent) => void
  mouseUp: () => void
  touchStart: (e: TouchEvent) => void
  touchMove: (e: TouchEvent) => void
  touchEnd: () => void
  doubleClick: () => void
}

/**
 * HTMLElement extension to store zoom handlers
 */
export interface HTMLElementWithZoomHandlers extends HTMLElement {
  _zoomHandlers?: ZoomHandlers
}

/**
 * Enable zoom and pan interactions on a mermaid container
 */
export function enableZoom(container: HTMLElement): void {
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
  diagram.style.display = 'inline-block'
  diagram.style.userSelect = 'none'
  diagram.style.touchAction = 'none'

  // Wheel zoom handler
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()

    const maxZoom = getMaxZoom(diagram)
    const scaleStep = scale * SCALE_FACTORS.WHEEL_STEP
    const pinchScaleStep = scale * SCALE_FACTORS.PINCH_STEP

    if (e.ctrlKey) {
      // Pinch-to-zoom on trackpads
      const delta = e.deltaY > 0 ? -pinchScaleStep : pinchScaleStep
      scale = clampScale(scale + delta, maxZoom)
    }
    else {
      // Regular scroll wheel zoom
      const delta = e.deltaY > 0 ? -scaleStep : scaleStep
      scale = clampScale(scale + delta, maxZoom)
    }

    diagram.style.transform = `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`
  }

  // Mouse drag handlers
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
      translate.x = (e.clientX - dragStart.x) / scale
      translate.y = (e.clientY - dragStart.y) / scale
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

  // Touch handlers
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
        const maxZoom = getMaxZoom(diagram)
        const touchScaleStep = scale * SCALE_FACTORS.WHEEL_STEP
        const delta = (distance - lastTouchDistance) > 0 ? touchScaleStep : -touchScaleStep
        scale = clampScale(scale + delta, maxZoom)
        diagram.style.transform = `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`
      }

      lastTouchDistance = distance
    }
    else if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0]
      translate.x = (touch.clientX - dragStart.x) / scale
      translate.y = (touch.clientY - dragStart.y) / scale
      diagram.style.transform = `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`
    }
  }

  const handleTouchEnd = () => {
    isDragging = false
    lastTouchDistance = 0
  }

  // Double-click to reset
  const handleDoubleClick = () => {
    scale = adaptiveScale
    translate = { x: 0, y: 0 }
    diagram.style.transition = 'transform 0.3s ease-out'
    diagram.style.transform = `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`
    setTimeout(() => {
      diagram.style.transition = 'transform 0.1s ease-out'
    }, 300)
  }

  // Add event listeners
  container.addEventListener('wheel', handleWheel, { passive: false })
  diagram.addEventListener('mousedown', handleMouseDown)
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  diagram.addEventListener('touchstart', handleTouchStart, { passive: false })
  diagram.addEventListener('touchmove', handleTouchMove, { passive: false })
  diagram.addEventListener('touchend', handleTouchEnd)
  diagram.addEventListener('dblclick', handleDoubleClick)

  // Store handlers for cleanup
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

/**
 * Disable zoom and pan interactions on a mermaid container
 */
export function disableZoom(container: HTMLElement): void {
  if (container.getAttribute('data-zoom-enabled') === 'false')
    return

  const diagram = container.querySelector('.mermaid') as HTMLElement
  if (!diagram)
    return

  // Reset styles
  diagram.style.transform = ''
  diagram.style.transformOrigin = ''
  diagram.style.transition = ''
  diagram.style.cursor = ''
  diagram.style.display = ''
  diagram.style.userSelect = ''
  diagram.style.touchAction = ''

  // Remove event listeners
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
 * Get max zoom based on diagram dimensions
 */
function getMaxZoom(diagram: HTMLElement): number {
  const rect = diagram.getBoundingClientRect()

  if (rect.width > ZOOM_LIMITS.ULTRA_WIDTH_THRESHOLD || rect.height > ZOOM_LIMITS.ULTRA_HEIGHT_THRESHOLD) {
    return ZOOM_LIMITS.ULTRA_WIDE_MAX
  }
  if (rect.width > ZOOM_LIMITS.WIDTH_THRESHOLD || rect.height > ZOOM_LIMITS.HEIGHT_THRESHOLD) {
    return ZOOM_LIMITS.WIDE_MAX
  }
  return ZOOM_LIMITS.DEFAULT_MAX
}

/**
 * Clamp scale to valid range
 */
function clampScale(value: number, maxZoom: number): number {
  return Math.max(ZOOM_LIMITS.MIN, Math.min(maxZoom, value))
}
