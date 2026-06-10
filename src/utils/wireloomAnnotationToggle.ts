/**
 * Wireloom annotation view toggle.
 *
 * Adds a compact-annotation mode to rendered Wireloom blocks. In compact mode,
 * always-visible callout boxes are hidden and replaced with numbered markers.
 * Markers expose annotation text on hover, focus, and click via a tooltip.
 *
 * Operates purely on the rendered DOM — no source Markdown or Wireloom
 * source is modified.
 */
import type { AnnotationNode, Document as WireloomDocument } from 'wireloom'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnnotationMode = 'callout' | 'compact'

export interface ExtractedAnnotation {
  /** 1-based index within the block */
  index: number
  /** Wireloom annotation target element ID */
  target: string
  /** Annotation side */
  side: string
  /** Annotation label text */
  body: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ANNOTATION_MODE_ATTR = 'data-annotation-mode'
const TOGGLE_CLASS = 'wireloom__annotation-toggle'
const TOGGLE_ACTIVE_CLASS = 'wireloom__annotation-toggle--active'
const MARKER_CLASS = 'wireloom__compact-marker'
const MARKER_ACTIVE_CLASS = 'wireloom__compact-marker--active'
const TOOLTIP_CLASS = 'wireloom__annotation-tooltip'
const TOOLTIP_VISIBLE_CLASS = 'wireloom__annotation-tooltip--visible'
const CALLOUT_HIDDEN_CLASS = 'wireloom__callouts-hidden'
const TOOLTIP_ID_PREFIX = 'wireloom-tooltip-'

// ---------------------------------------------------------------------------
// Annotation extraction
// ---------------------------------------------------------------------------

/**
 * Parse Wireloom source and extract annotation metadata.
 * Returns an empty array when annotations are absent or parsing fails.
 */
export function extractAnnotations(
  source: string,
  parseFn: (source: string) => WireloomDocument,
): ExtractedAnnotation[] {
  let doc: WireloomDocument
  try {
    doc = parseFn(source)
  }
  catch {
    return []
  }

  if (!doc.annotations || doc.annotations.length === 0)
    return []

  return doc.annotations.map((ann: AnnotationNode, i: number) => ({
    index: i + 1,
    target: ann.target,
    side: ann.side,
    body: ann.body,
  }))
}

// ---------------------------------------------------------------------------
// Marker position helpers
// ---------------------------------------------------------------------------

/**
 * Auto-detect Wireloom callout colors from the rendered SVG.
 *
 * Wireloom emits a consistent structural pattern for each annotation:
 *   <line stroke="COLOR" ...>    — connector
 *   <circle fill="COLOR" ...>   — target dot
 *   <rect fill="FILL" stroke="STROKE" ...> — callout box
 *   <text fill="TEXT_COLOR" ...> — callout label (one or more)
 *
 * The callout rects are the last rects in the SVG and have rounded corners
 * (rx > 0). We find one, extract its colors, then find the corresponding
 * line/circle just before it to get the dot color.
 */
function detectCalloutColors(svgRoot: SVGSVGElement): {
  dotColor: string
  boxFill: string
  boxStroke: string
} | null {
  const children = Array.from(svgRoot.children)

  // Walk backward from end — callout rects are always the last rects
  for (let i = children.length - 1; i >= 0; i--) {
    const el = children[i]
    if (el.tagName !== 'rect')
      continue
    const rx = el.getAttribute('rx')
    if (!rx || Number.parseFloat(rx) <= 0)
      continue

    const boxFill = el.getAttribute('fill')
    const boxStroke = el.getAttribute('stroke')
    if (!boxFill || !boxStroke)
      continue

    // Walk further back to find the line/circle that share the dot color
    let dotColor = ''
    for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
      const sib = children[j]
      if (sib.tagName === 'circle') {
        dotColor = sib.getAttribute('fill') || ''
        break
      }
      if (sib.tagName === 'line') {
        dotColor = sib.getAttribute('stroke') || ''
      }
    }
    if (!dotColor)
      continue

    return { dotColor, boxFill, boxStroke }
  }

  return null
}

/**
 * Find the callout target-dot circles rendered by Wireloom.
 *
 * Wireloom renders each annotation as a triplet in the SVG:
 *   1. <line>  — connector from target to callout box
 *   2. <circle> — small dot on the target element
 *   3. <rect> + <text> — callout box with annotation text
 *
 * The circles appear in source-order matching the annotations array.
 * We use their cx/cy as the marker position.
 */
function findCalloutCircles(svgRoot: SVGSVGElement, dotColor: string): SVGCircleElement[] {
  return Array.from(svgRoot.querySelectorAll('circle'))
    .filter(c => c.getAttribute('fill') === dotColor)
}

/**
 * Tag all callout-related SVG elements with data-wireloom-callout
 * so CSS can hide them in compact mode.
 *
 * Strategy: find each callout box rect, then walk backward to find the
 * associated circle and line. All text elements after a callout rect
 * (until the next non-text element) are callout labels.
 */
function tagCalloutElements(svgRoot: SVGSVGElement): {
  dotColor: string
  boxFill: string
  boxStroke: string
  textColor: string
} | null {
  // Already tagged?
  if (svgRoot.querySelector('[data-wireloom-callout]')) {
    const stored = svgRoot.getAttribute('data-callout-dot-color')
    const storedBoxFill = svgRoot.getAttribute('data-callout-box-fill')
    const storedBoxStroke = svgRoot.getAttribute('data-callout-box-stroke')
    const storedTextColor = svgRoot.getAttribute('data-callout-text-color')
    if (stored && storedBoxFill && storedBoxStroke && storedTextColor) {
      return { dotColor: stored, boxFill: storedBoxFill, boxStroke: storedBoxStroke, textColor: storedTextColor }
    }
    return null
  }

  const colors = detectCalloutColors(svgRoot)
  if (!colors)
    return null

  // Remember for subsequent calls
  svgRoot.setAttribute('data-callout-dot-color', colors.dotColor)
  svgRoot.setAttribute('data-callout-box-fill', colors.boxFill)
  svgRoot.setAttribute('data-callout-box-stroke', colors.boxStroke)

  const children = Array.from(svgRoot.children)

  // Find all callout box rects
  const calloutRects = children.filter(
    c => c.tagName === 'rect'
      && c.getAttribute('fill') === colors.boxFill
      && c.getAttribute('stroke') === colors.boxStroke,
  )

  // Detect text color from the first text element after the first callout rect
  let textColor = ''
  if (calloutRects.length > 0) {
    const firstRectIdx = children.indexOf(calloutRects[0])
    const nextSibling = children[firstRectIdx + 1]
    if (nextSibling?.tagName === 'text') {
      textColor = nextSibling.getAttribute('fill') || ''
    }
  }
  svgRoot.setAttribute('data-callout-text-color', textColor)

  for (const rect of calloutRects) {
    const rectIdx = children.indexOf(rect)

    // Walk backward to find the circle and line for this annotation
    for (let i = rectIdx - 1; i >= 0; i--) {
      const sibling = children[i]
      if (sibling.tagName === 'circle' && sibling.getAttribute('fill') === colors.dotColor) {
        sibling.setAttribute('data-wireloom-callout', '')
        break
      }
    }
    for (let i = rectIdx - 1; i >= 0; i--) {
      const sibling = children[i]
      if (sibling.tagName === 'line' && sibling.getAttribute('stroke') === colors.dotColor) {
        sibling.setAttribute('data-wireloom-callout', '')
        break
      }
    }

    // Tag the callout rect itself
    rect.setAttribute('data-wireloom-callout', '')

    // Tag ALL text elements after the callout rect until we hit a non-text
    // element (these are the annotation text lines belonging to this callout)
    for (let i = rectIdx + 1; i < children.length; i++) {
      const sibling = children[i]
      if (sibling.tagName === 'text') {
        sibling.setAttribute('data-wireloom-callout', '')
      }
      else {
        break
      }
    }
  }

  return { dotColor: colors.dotColor, boxFill: colors.boxFill, boxStroke: colors.boxStroke, textColor }
}

/**
 * Derive marker positions from the rendered callout circles in the SVG.
 *
 * Wireloom emits one circle per annotation in source order.
 * Each circle's (cx, cy) marks where the annotation target sits.
 * We convert those to viewport-relative fractions (0–1).
 */
export interface MarkerPositionResult {
  positions: Map<number, { x: number, y: number }>
  colors: {
    dotColor: string
    boxFill: string
    boxStroke: string
    textColor: string
  } | null
}

export function computeMarkerPositions(
  svgRoot: SVGSVGElement,
  _annotations: ExtractedAnnotation[],
): MarkerPositionResult {
  const result = tagCalloutElements(svgRoot)
  if (!result)
    return { positions: new Map(), colors: null }

  const positions = new Map<number, { x: number, y: number }>()
  const viewBox = svgRoot.viewBox.baseVal
  const vbW = viewBox.width || Number.parseFloat(svgRoot.getAttribute('width') || '') || 1
  const vbH = viewBox.height || Number.parseFloat(svgRoot.getAttribute('height') || '') || 1

  const circles = findCalloutCircles(svgRoot, result.dotColor)
  circles.forEach((circle, i) => {
    const cx = Number.parseFloat(circle.getAttribute('cx') || '0')
    const cy = Number.parseFloat(circle.getAttribute('cy') || '0')
    positions.set(i + 1, { x: cx / vbW, y: cy / vbH })
  })

  return { positions, colors: result }
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

function createToggleButton(): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.className = TOGGLE_CLASS
  btn.type = 'button'
  btn.title = 'Toggle annotation view'
  btn.setAttribute('aria-label', 'Toggle between callout and compact annotation views')
  btn.textContent = '#'
  return btn
}

function createMarker(
  annotation: ExtractedAnnotation,
  tooltipId: string,
): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.className = MARKER_CLASS
  btn.type = 'button'
  btn.textContent = String(annotation.index)
  btn.setAttribute('aria-label', `Annotation ${annotation.index}: ${annotation.body}`)
  btn.setAttribute('aria-describedby', tooltipId)
  btn.dataset.annotationIndex = String(annotation.index)
  return btn
}

function createTooltip(id: string): HTMLDivElement {
  const div = document.createElement('div')
  div.className = TOOLTIP_CLASS
  div.id = id
  div.setAttribute('role', 'tooltip')
  div.setAttribute('aria-hidden', 'true')
  div.style.position = 'fixed'
  div.style.zIndex = '50'
  div.style.pointerEvents = 'none'
  return div
}

function getOrCreateTooltip(_diagram: HTMLElement): HTMLDivElement {
  // Tooltip lives on document.body to escape overflow clipping
  let tooltip = document.getElementById(`${TOOLTIP_ID_PREFIX}portal`) as HTMLDivElement | null
  if (!tooltip) {
    tooltip = createTooltip(`${TOOLTIP_ID_PREFIX}portal`)
    document.body.appendChild(tooltip)
  }
  return tooltip
}

// ---------------------------------------------------------------------------
// Event listener cleanup
// ---------------------------------------------------------------------------

interface CompactListeners {
  dismiss: (e: Event) => void
  escape: (e: KeyboardEvent) => void
  scroll: () => void
}

const listenerMap = new WeakMap<HTMLElement, CompactListeners>()

function removeCompactListeners(wrapper: HTMLElement): void {
  const listeners = listenerMap.get(wrapper)
  if (!listeners)
    return

  document.removeEventListener('click', listeners.dismiss)
  document.removeEventListener('keydown', listeners.escape, true)
  document.removeEventListener('scroll', listeners.scroll, true)
  listenerMap.delete(wrapper)
}

// ---------------------------------------------------------------------------
// Mode switching
// ---------------------------------------------------------------------------

function setMode(wrapper: HTMLElement, mode: AnnotationMode): void {
  wrapper.setAttribute(ANNOTATION_MODE_ATTR, mode)
}

function getMode(wrapper: HTMLElement): AnnotationMode {
  return (wrapper.getAttribute(ANNOTATION_MODE_ATTR) as AnnotationMode) || 'callout'
}

function hideCallouts(wrapper: HTMLElement): void {
  wrapper.classList.add(CALLOUT_HIDDEN_CLASS)
}

function showCallouts(wrapper: HTMLElement): void {
  wrapper.classList.remove(CALLOUT_HIDDEN_CLASS)
}

function removeMarkers(wrapper: HTMLElement): void {
  wrapper.querySelectorAll(`.${MARKER_CLASS}`).forEach(el => el.remove())
}

function clearActiveMarker(wrapper: HTMLElement): void {
  const active = wrapper.querySelector(`.${MARKER_ACTIVE_CLASS}`)
  if (active)
    active.classList.remove(MARKER_ACTIVE_CLASS)
}

function showTooltip(tooltip: HTMLDivElement, body: string, marker: HTMLElement, wrapper: HTMLElement): void {
  tooltip.textContent = body
  tooltip.classList.add(TOOLTIP_VISIBLE_CLASS)
  tooltip.setAttribute('aria-hidden', 'false')

  // Copy CSS vars from wrapper to tooltip (tooltip lives on body, not inside wrapper)
  const vars = ['--wl-dot', '--wl-box-fill', '--wl-box-stroke', '--wl-text'] as const
  for (const v of vars) {
    tooltip.style.setProperty(v, wrapper.style.getPropertyValue(v))
  }

  // Position via fixed coordinates from the marker's bounding rect
  const markerRect = marker.getBoundingClientRect()
  tooltip.style.left = `${markerRect.left + markerRect.width / 2}px`
  tooltip.style.top = `${markerRect.top}px`
  tooltip.style.transform = 'translate(-50%, calc(-100% - 0.5rem))'
}

function hideTooltip(tooltip: HTMLDivElement): void {
  tooltip.classList.remove(TOOLTIP_VISIBLE_CLASS)
  tooltip.setAttribute('aria-hidden', 'true')
}

function removeTooltip(): void {
  const tooltip = document.getElementById(`${TOOLTIP_ID_PREFIX}portal`)
  if (tooltip)
    tooltip.remove()
}

function switchToCompact(
  wrapper: HTMLElement,
  annotations: ExtractedAnnotation[],
  positions: Map<number, { x: number, y: number }>,
  colors: MarkerPositionResult['colors'],
): void {
  setMode(wrapper, 'compact')
  hideCallouts(wrapper)

  // Set CSS custom properties so markers/tooltips match Wireloom's callout colors
  if (colors) {
    wrapper.style.setProperty('--wl-dot', colors.dotColor)
    wrapper.style.setProperty('--wl-box-fill', colors.boxFill)
    wrapper.style.setProperty('--wl-box-stroke', colors.boxStroke)
    wrapper.style.setProperty('--wl-text', colors.textColor)
  }
  // Clean up previous compact state (markers, listeners)
  removeCompactListeners(wrapper)
  removeMarkers(wrapper)

  const diagram = wrapper.querySelector('.wireloom__diagram') as HTMLElement | null
  if (!diagram)
    return

  const tooltip = getOrCreateTooltip(diagram)

  // Ensure diagram is the positioning context for markers
  if (!diagram.style.position || diagram.style.position === 'static')
    diagram.style.position = 'relative'

  for (const ann of annotations) {
    const pos = positions.get(ann.index)
    if (!pos)
      continue // Edge-3: skip unresolvable targets

    const marker = createMarker(ann, tooltip.id)
    marker.style.left = `${pos.x * 100}%`
    marker.style.top = `${pos.y * 100}%`

    // Hover — unpins any previously active marker first
    marker.addEventListener('mouseenter', () => {
      clearActiveMarker(wrapper)
      showTooltip(tooltip, ann.body, marker, wrapper)
    })
    marker.addEventListener('mouseleave', () => {
      if (!marker.classList.contains(MARKER_ACTIVE_CLASS))
        hideTooltip(tooltip)
    })

    // Focus (keyboard)
    marker.addEventListener('focus', () => {
      showTooltip(tooltip, ann.body, marker, wrapper)
    })
    marker.addEventListener('blur', () => {
      if (!marker.classList.contains(MARKER_ACTIVE_CLASS))
        hideTooltip(tooltip)
    })

    // Click / tap — pins tooltip open
    marker.addEventListener('click', (e: Event) => {
      e.stopPropagation()

      const wasActive = marker.classList.contains(MARKER_ACTIVE_CLASS)

      // Deactivate previous
      clearActiveMarker(wrapper)

      if (wasActive) {
        hideTooltip(tooltip)
      }
      else {
        marker.classList.add(MARKER_ACTIVE_CLASS)
        showTooltip(tooltip, ann.body, marker, wrapper)
      }
    })

    diagram.appendChild(marker)
  }

  // Click outside any marker dismisses (document-level to catch clicks anywhere)
  const dismissHandler = (e: Event) => {
    const target = e.target as HTMLElement
    if (!target.closest(`.${MARKER_CLASS}`)) {
      clearActiveMarker(wrapper)
      hideTooltip(tooltip)
    }
  }
  document.addEventListener('click', dismissHandler)

  // Escape dismisses
  const escapeHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && wrapper.querySelector(`.${MARKER_ACTIVE_CLASS}`)) {
      e.preventDefault()
      e.stopPropagation()
      clearActiveMarker(wrapper)
      hideTooltip(tooltip)
    }
  }
  document.addEventListener('keydown', escapeHandler, true)

  // Hide tooltip on scroll (tooltip is position:fixed, would become stale)
  const scrollHandler = () => {
    clearActiveMarker(wrapper)
    hideTooltip(tooltip)
  }
  document.addEventListener('scroll', scrollHandler, true)

  // Store for cleanup
  listenerMap.set(wrapper, { dismiss: dismissHandler, escape: escapeHandler, scroll: scrollHandler })
}

function switchToCallout(wrapper: HTMLElement): void {
  removeCompactListeners(wrapper)
  setMode(wrapper, 'callout')
  showCallouts(wrapper)
  removeMarkers(wrapper)
  removeTooltip()
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Add annotation mode toggle to a Wireloom wrapper element.
 *
 * @param wrapper - The `.wireloom` wrapper element
 * @param source  - Decoded Wireloom source text
 * @param parseFn - Wireloom parse function (injected for testability)
 */
export function addAnnotationToggle(
  wrapper: HTMLElement,
  source: string,
  parseFn: (source: string) => WireloomDocument,
): void {
  const annotations = extractAnnotations(source, parseFn)

  // No annotations → no toggle
  if (annotations.length === 0)
    return

  const svgRoot = wrapper.querySelector('.wireloom__diagram svg') as SVGSVGElement | null
  if (!svgRoot)
    return

  // Don't add duplicate toggles (re-render guard)
  if (wrapper.querySelector(`.${TOGGLE_CLASS}`))
    return

  const toggle = createToggleButton()

  // Compute positions lazily on first toggle to compact
  let cachedResult: MarkerPositionResult | null = null

  toggle.addEventListener('click', () => {
    const currentMode = getMode(wrapper)

    if (currentMode === 'callout') {
      if (!cachedResult)
        cachedResult = computeMarkerPositions(svgRoot, annotations)
      switchToCompact(wrapper, annotations, cachedResult.positions, cachedResult.colors)
      toggle.classList.add(TOGGLE_ACTIVE_CLASS)
      toggle.title = 'Show callout annotations'
    }
    else {
      switchToCallout(wrapper)
      toggle.classList.remove(TOGGLE_ACTIVE_CLASS)
      toggle.title = 'Toggle annotation view'
    }
  })

  // Auto-enter compact mode — annotated mockups default to clean marker view
  // User can toggle back to full callouts
  cachedResult = computeMarkerPositions(svgRoot, annotations)
  if (cachedResult.positions.size > 0) {
    switchToCompact(wrapper, annotations, cachedResult.positions, cachedResult.colors)
    toggle.classList.add(TOGGLE_ACTIVE_CLASS)
    toggle.title = 'Show callout annotations'
  }

  wrapper.appendChild(toggle)
}

/**
 * Re-apply compact mode to a wrapper that was already in compact mode.
 * Called after theme-change re-renders replace the SVG content.
 */
export function reapplyCompactMode(
  wrapper: HTMLElement,
  source: string,
  parseFn: (source: string) => WireloomDocument,
): void {
  if (getMode(wrapper) !== 'compact')
    return

  const annotations = extractAnnotations(source, parseFn)
  if (annotations.length === 0)
    return

  const svgRoot = wrapper.querySelector('.wireloom__diagram svg') as SVGSVGElement | null
  if (!svgRoot)
    return

  const result = computeMarkerPositions(svgRoot, annotations)
  switchToCompact(wrapper, annotations, result.positions, result.colors)
}
