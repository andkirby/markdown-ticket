/**
 * Tests for Wireloom annotation view toggle.
 *
 * Covers:
 * - Toggle control is added to Wireloom wrappers with annotations
 * - Compact mode creates numbered markers at annotation target positions
 * - Tooltip shows on hover, focus, click and dismisses on Escape/outside click
 * - Toggle does not appear on Wireloom blocks without annotations
 * - State is per-block and independent
 * - Source Markdown is not modified
 * - Error/fallback paths are unaffected
 */
import type { AnnotationNode, Document as WireloomDocument } from 'wireloom'

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import {
  addAnnotationToggle,
  computeMarkerPositions,
  extractAnnotations,
  reapplyCompactMode,
} from './wireloomAnnotationToggle'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const ANNOTATED_SOURCE = [
  'window "Sign in":',
  '  button "Login" id="loginBtn"',
  '',
  'annotation "Submit credentials" target="loginBtn" position=right',
].join('\n')

const MULTI_ANNOTATION_SOURCE = [
  'window "Form":',
  '  input "Email" id="email"',
  '  button "Submit" id="submit"',
  '',
  'annotation "Enter email address" target="email" position=left',
  'annotation "Click to submit" target="submit" position=right',
].join('\n')

const NO_ANNOTATION_SOURCE = [
  'window "Simple":',
  '  text "Hello world"',
].join('\n')

const SAME_TARGET_SOURCE = [
  'window "Multi":',
  '  button "Action" id="btn"',
  '',
  'annotation "Note one" target="btn" position=left',
  'annotation "Note two" target="btn" position=right',
].join('\n')

const UNRESOLVABLE_SOURCE = [
  'window "Partial":',
  '  button "OK" id="okBtn"',
  '',
  'annotation "Visible" target="okBtn" position=left',
  'annotation "Ghost" target="nonexistent" position=right',
].join('\n')

function mockParse(source: string): WireloomDocument {
  // Simple mock: parse annotations from source lines starting with 'annotation'
  const lines = source.split('\n')
  const annotations: AnnotationNode[] = []
  let lineIdx = 0

  for (const line of lines) {
    lineIdx++
    const match = line.match(/^annotation\s+"([^"]+)"\s+target="([^"]+)"\s+position=(\w+)/)
    if (match) {
      annotations.push({
        kind: 'annotation',
        target: match[2],
        side: match[3] as AnnotationNode['side'],
        body: match[1],
        position: { line: lineIdx, column: 1 },
      })
    }
  }

  // Check if source has "window" to simulate parse failure
  if (!source.includes('window'))
    throw new Error('Expected window root')

  return {
    kind: 'document',
    sourceLines: lines.length,
    annotations: annotations.length > 0 ? annotations : undefined,
  }
}

function createSvgWithTargets(targetIds: string[]): string {
  const elements = targetIds.map(id =>
    `<g id="${id}"><rect x="10" y="10" width="80" height="30" /></g>`,
  ).join('')
  // Include Wireloom-style callout triplets: line + circle + rounded rect + texts
  // This matches the structural pattern that detectCalloutColors() looks for
  const calloutTrips = targetIds.map((_, i) => {
    const cx = 50 + i * 60
    const cy = 25 + i * 40
    const rx = 585 + i * 10
    const ry = cy - 28
    return `<line x1="${cx}" y1="${cy}" x2="${rx}" y2="${ry}" stroke="#8a7a4f" stroke-width="1"/>`
      + `<circle cx="${cx}" cy="${cy}" r="3" fill="#8a7a4f"/>`
      + `<rect x="${rx}" y="${ry}" width="100" height="20" rx="4" fill="#fefcf3" stroke="#b8a26b" stroke-width="1"/>`
      + `<text x="${rx + 10}" y="${ry + 14}" fill="#3d3526">Annotation ${i + 1}</text>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">${elements}${calloutTrips}</svg>`
}

function createWireloomWrapper(source: string, svgContent: string): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.className = 'wireloom'
  wrapper.setAttribute('data-source-encoded', btoa(unescape(encodeURIComponent(source))))

  const diagram = document.createElement('div')
  diagram.className = 'wireloom__diagram'
  diagram.innerHTML = svgContent
  wrapper.appendChild(diagram)

  return wrapper
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('extractAnnotations', () => {
  it('extracts annotations from Wireloom source', () => {
    const result = extractAnnotations(ANNOTATED_SOURCE, mockParse)
    expect(result).toHaveLength(1)
    expect(result[0].target).toBe('loginBtn')
    expect(result[0].body).toBe('Submit credentials')
    expect(result[0].index).toBe(1)
  })

  it('extracts multiple annotations', () => {
    const result = extractAnnotations(MULTI_ANNOTATION_SOURCE, mockParse)
    expect(result).toHaveLength(2)
    expect(result[0].target).toBe('email')
    expect(result[1].target).toBe('submit')
    expect(result[0].index).toBe(1)
    expect(result[1].index).toBe(2)
  })

  it('returns empty array for source without annotations', () => {
    const result = extractAnnotations(NO_ANNOTATION_SOURCE, mockParse)
    expect(result).toHaveLength(0)
  })

  it('returns empty array when parse throws', () => {
    const result = extractAnnotations('bad source', mockParse)
    expect(result).toHaveLength(0)
  })
})

describe('addAnnotationToggle', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('adds toggle button to wrappers with annotations', () => {
    const wrapper = createWireloomWrapper(
      ANNOTATED_SOURCE,
      createSvgWithTargets(['loginBtn']),
    )
    addAnnotationToggle(wrapper, ANNOTATED_SOURCE, mockParse)

    const toggle = wrapper.querySelector('.wireloom__annotation-toggle')
    expect(toggle).toBeTruthy()
    expect(toggle?.tagName).toBe('BUTTON')
  })

  it('does not add toggle when there are no annotations', () => {
    const wrapper = createWireloomWrapper(
      NO_ANNOTATION_SOURCE,
      createSvgWithTargets([]),
    )
    addAnnotationToggle(wrapper, NO_ANNOTATION_SOURCE, mockParse)

    const toggle = wrapper.querySelector('.wireloom__annotation-toggle')
    expect(toggle).toBeNull()
  })

  it('does not add toggle when SVG is missing', () => {
    const wrapper = document.createElement('div')
    wrapper.className = 'wireloom'
    const diagram = document.createElement('div')
    diagram.className = 'wireloom__diagram'
    wrapper.appendChild(diagram)

    addAnnotationToggle(wrapper, ANNOTATED_SOURCE, mockParse)
    expect(wrapper.querySelector('.wireloom__annotation-toggle')).toBeNull()
  })
})

describe('compact mode switching', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('clicking toggle switches to compact mode with numbered markers', () => {
    const wrapper = createWireloomWrapper(
      ANNOTATED_SOURCE,
      createSvgWithTargets(['loginBtn']),
    )
    document.body.appendChild(wrapper)

    addAnnotationToggle(wrapper, ANNOTATED_SOURCE, mockParse)

    // Default is compact (auto-entered)
    expect(wrapper.getAttribute('data-annotation-mode')).toBe('compact')
    const markers = wrapper.querySelectorAll('.wireloom__compact-marker')
    expect(markers.length).toBe(1)
    expect(markers[0].textContent).toBe('1')
  })

  it('compact markers are positioned at target coordinates', () => {
    const wrapper = createWireloomWrapper(
      MULTI_ANNOTATION_SOURCE,
      createSvgWithTargets(['email', 'submit']),
    )
    document.body.appendChild(wrapper)

    addAnnotationToggle(wrapper, MULTI_ANNOTATION_SOURCE, mockParse)
    // Already in compact mode (default)

    const markers = wrapper.querySelectorAll('.wireloom__compact-marker')
    expect(markers.length).toBe(2)
    // Markers should have left/top style set (percentage-based positioning)
    for (const marker of markers) {
      const style = (marker as HTMLElement).style
      expect(style.left).toBeTruthy()
      expect(style.top).toBeTruthy()
    }
  })

  it('switching back to callout removes markers and restores callouts', () => {
    const wrapper = createWireloomWrapper(
      ANNOTATED_SOURCE,
      createSvgWithTargets(['loginBtn']),
    )
    document.body.appendChild(wrapper)

    addAnnotationToggle(wrapper, ANNOTATED_SOURCE, mockParse)
    const toggle = wrapper.querySelector('.wireloom__annotation-toggle') as HTMLButtonElement

    // Already in compact mode (default)
    expect(wrapper.querySelectorAll('.wireloom__compact-marker').length).toBe(1)

    // Switch back to callout
    toggle.click()
    expect(wrapper.getAttribute('data-annotation-mode')).toBe('callout')
    expect(wrapper.querySelectorAll('.wireloom__compact-marker').length).toBe(0)
  })

  it('does not expand SVG canvas dimensions', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100"><g id="loginBtn"><rect x="10" y="10" width="80" height="30"/></g><line x1="50" y1="25" x2="100" y2="5" stroke="#8a7a4f" stroke-width="1"/><circle cx="50" cy="25" r="3" fill="#8a7a4f"/><rect x="100" y="0" width="80" height="20" rx="4" fill="#fefcf3" stroke="#b8a26b" stroke-width="1"/><text x="110" y="14" fill="#3d3526">Test</text></svg>`
    const wrapper = createWireloomWrapper(ANNOTATED_SOURCE, svg)
    document.body.appendChild(wrapper)

    const svgEl = wrapper.querySelector('svg') as SVGSVGElement
    const originalWidth = svgEl.getAttribute('width')
    const originalHeight = svgEl.getAttribute('height')

    addAnnotationToggle(wrapper, ANNOTATED_SOURCE, mockParse)
    // Already in compact mode (default)

    // SVG dimensions should be unchanged
    expect(svgEl.getAttribute('width')).toBe(originalWidth)
    expect(svgEl.getAttribute('height')).toBe(originalHeight)
  })
})

describe('tooltip interactions', () => {
  let wrapper: HTMLElement

  beforeEach(() => {
    document.body.innerHTML = ''
    wrapper = createWireloomWrapper(
      ANNOTATED_SOURCE,
      createSvgWithTargets(['loginBtn']),
    )
    document.body.appendChild(wrapper)
    addAnnotationToggle(wrapper, ANNOTATED_SOURCE, mockParse)
    // Already in compact mode (default)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('hovering a marker shows tooltip with annotation text', () => {
    const marker = wrapper.querySelector('.wireloom__compact-marker') as HTMLElement
    marker.dispatchEvent(new MouseEvent('mouseenter'))

    const tooltip = document.getElementById('wireloom-tooltip-portal') as HTMLElement
    expect(tooltip.classList.contains('wireloom__annotation-tooltip--visible')).toBe(true)
    expect(tooltip.textContent).toBe('Submit credentials')
  })

  it('focusing a marker via keyboard shows tooltip', () => {
    const marker = wrapper.querySelector('.wireloom__compact-marker') as HTMLElement
    marker.dispatchEvent(new FocusEvent('focus'))

    const tooltip = document.getElementById('wireloom-tooltip-portal') as HTMLElement
    expect(tooltip.classList.contains('wireloom__annotation-tooltip--visible')).toBe(true)
  })

  it('clicking a marker keeps tooltip visible until dismissed', () => {
    const marker = wrapper.querySelector('.wireloom__compact-marker') as HTMLElement
    const tooltip = document.getElementById('wireloom-tooltip-portal') as HTMLElement

    // Click to pin
    marker.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(marker.classList.contains('wireloom__compact-marker--active')).toBe(true)
    expect(tooltip.classList.contains('wireloom__annotation-tooltip--visible')).toBe(true)

    // Click again to dismiss
    marker.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(marker.classList.contains('wireloom__compact-marker--active')).toBe(false)
  })

  it('pressing Escape dismisses active tooltip', () => {
    const marker = wrapper.querySelector('.wireloom__compact-marker') as HTMLElement
    const tooltip = document.getElementById('wireloom-tooltip-portal') as HTMLElement

    // Pin via click
    marker.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(tooltip.classList.contains('wireloom__annotation-tooltip--visible')).toBe(true)

    // Escape
    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(tooltip.classList.contains('wireloom__annotation-tooltip--visible')).toBe(false)
    expect(marker.classList.contains('wireloom__compact-marker--active')).toBe(false)
  })
})

describe('per-block state isolation', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('multiple blocks have independent toggles', () => {
    const wrapper1 = createWireloomWrapper(
      ANNOTATED_SOURCE,
      createSvgWithTargets(['loginBtn']),
    )
    const wrapper2 = createWireloomWrapper(
      MULTI_ANNOTATION_SOURCE,
      createSvgWithTargets(['email', 'submit']),
    )
    document.body.appendChild(wrapper1)
    document.body.appendChild(wrapper2)

    addAnnotationToggle(wrapper1, ANNOTATED_SOURCE, mockParse)
    addAnnotationToggle(wrapper2, MULTI_ANNOTATION_SOURCE, mockParse)

    // Each has its own toggle
    expect(wrapper1.querySelector('.wireloom__annotation-toggle')).toBeTruthy()
    expect(wrapper2.querySelector('.wireloom__annotation-toggle')).toBeTruthy()

    // Both default to compact
    expect(wrapper1.getAttribute('data-annotation-mode')).toBe('compact')
    expect(wrapper2.getAttribute('data-annotation-mode')).toBe('compact')

    // Switch wrapper1 back to callout
    const toggle1 = wrapper1.querySelector('.wireloom__annotation-toggle') as HTMLButtonElement
    toggle1.click()

    expect(wrapper1.getAttribute('data-annotation-mode')).toBe('callout')
    expect(wrapper2.getAttribute('data-annotation-mode')).toBe('compact') // still default
  })
})

describe('source immutability', () => {
  it('toggle does not modify data-source-encoded attribute', () => {
    const wrapper = createWireloomWrapper(
      ANNOTATED_SOURCE,
      createSvgWithTargets(['loginBtn']),
    )
    document.body.appendChild(wrapper)

    const originalEncoded = wrapper.getAttribute('data-source-encoded')
    addAnnotationToggle(wrapper, ANNOTATED_SOURCE, mockParse)

    const toggle = wrapper.querySelector('.wireloom__annotation-toggle') as HTMLButtonElement
    toggle.click() // compact → callout
    toggle.click() // callout → compact

    expect(wrapper.getAttribute('data-source-encoded')).toBe(originalEncoded)
  })
})

describe('state persistence', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('reapplyCompactMode re-applies markers when mode is compact', () => {
    const wrapper = createWireloomWrapper(
      ANNOTATED_SOURCE,
      createSvgWithTargets(['loginBtn']),
    )
    document.body.appendChild(wrapper)

    // Simulate: was in compact mode (default), SVG was re-rendered
    wrapper.setAttribute('data-annotation-mode', 'compact')
    reapplyCompactMode(wrapper, ANNOTATED_SOURCE, mockParse)

    const markers = wrapper.querySelectorAll('.wireloom__compact-marker')
    expect(markers.length).toBe(1)
  })

  it('reapplyCompactMode is no-op when mode is callout', () => {
    const wrapper = createWireloomWrapper(
      ANNOTATED_SOURCE,
      createSvgWithTargets(['loginBtn']),
    )
    document.body.appendChild(wrapper)

    wrapper.setAttribute('data-annotation-mode', 'callout')
    reapplyCompactMode(wrapper, ANNOTATED_SOURCE, mockParse)

    expect(wrapper.querySelectorAll('.wireloom__compact-marker').length).toBe(0)
  })
})

describe('accessibility', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('compact markers are focusable buttons with ARIA labels', () => {
    const wrapper = createWireloomWrapper(
      ANNOTATED_SOURCE,
      createSvgWithTargets(['loginBtn']),
    )
    document.body.appendChild(wrapper)

    addAnnotationToggle(wrapper, ANNOTATED_SOURCE, mockParse)
    // Already in compact mode (default)

    const marker = wrapper.querySelector('.wireloom__compact-marker') as HTMLButtonElement
    expect(marker.tagName).toBe('BUTTON')
    expect(marker.getAttribute('aria-label')).toContain('Submit credentials')
    expect(marker.getAttribute('aria-describedby')).toBeTruthy()
  })

  it('tooltip has role=tooltip', () => {
    const wrapper = createWireloomWrapper(
      ANNOTATED_SOURCE,
      createSvgWithTargets(['loginBtn']),
    )
    document.body.appendChild(wrapper)

    addAnnotationToggle(wrapper, ANNOTATED_SOURCE, mockParse)
    // Already in compact mode (default)

    const tooltip = document.getElementById('wireloom-tooltip-portal') as HTMLElement
    expect(tooltip.getAttribute('role')).toBe('tooltip')
  })
})

describe('edge cases', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('multiple annotations targeting same element show distinct markers', () => {
    // Two annotations on same element = two callout circles at different positions
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">`
      + `<g id="btn"><rect x="10" y="10" width="80" height="30"/></g>`
      + `<line x1="50" y1="25" x2="100" y2="5" stroke="#8a7a4f" stroke-width="1"/>`
      + `<circle cx="50" cy="25" r="3" fill="#8a7a4f"/>`
      + `<rect x="100" y="0" width="80" height="20" rx="4" fill="#fefcf3" stroke="#b8a26b" stroke-width="1"/>`
      + `<text x="110" y="14" fill="#3d3526">Note one</text>`
      + `<line x1="70" y1="35" x2="100" y2="40" stroke="#8a7a4f" stroke-width="1"/>`
      + `<circle cx="70" cy="35" r="3" fill="#8a7a4f"/>`
      + `<rect x="100" y="30" width="80" height="20" rx="4" fill="#fefcf3" stroke="#b8a26b" stroke-width="1"/>`
      + `<text x="110" y="44" fill="#3d3526">Note two</text>`
      + `</svg>`
    const wrapper = createWireloomWrapper(SAME_TARGET_SOURCE, svg)
    document.body.appendChild(wrapper)

    addAnnotationToggle(wrapper, SAME_TARGET_SOURCE, mockParse)
    // Already in compact mode (default)

    const markers = wrapper.querySelectorAll('.wireloom__compact-marker')
    expect(markers.length).toBe(2)
    expect(markers[0].textContent).toBe('1')
    expect(markers[1].textContent).toBe('2')
  })

  it('unresolvable target is skipped without breaking other markers', () => {
    // Create SVG with only one callout triplet (first annotation resolvable)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">`
      + `<g id="okBtn"><rect x="10" y="10" width="80" height="30"/></g>`
      + `<line x1="50" y1="25" x2="100" y2="5" stroke="#8a7a4f" stroke-width="1"/>`
      + `<circle cx="50" cy="25" r="3" fill="#8a7a4f"/>`
      + `<rect x="100" y="0" width="80" height="20" rx="4" fill="#fefcf3" stroke="#b8a26b" stroke-width="1"/>`
      + `<text x="110" y="14" fill="#3d3526">Visible</text>`
      + `</svg>`
    const wrapper = createWireloomWrapper(UNRESOLVABLE_SOURCE, svg)
    document.body.appendChild(wrapper)

    addAnnotationToggle(wrapper, UNRESOLVABLE_SOURCE, mockParse)
    // Already in compact mode (default)

    const markers = wrapper.querySelectorAll('.wireloom__compact-marker')
    expect(markers.length).toBe(1) // only the one with a callout circle
    expect(markers[0].textContent).toBe('1')
  })
})

describe('computeMarkerPositions', () => {
  it('returns positions for all callout circles found', () => {
    const container = document.createElement('div')
    container.innerHTML = createSvgWithTargets(['a', 'b'])
    document.body.appendChild(container)

    const svgRoot = container.querySelector('svg') as SVGSVGElement
    const annotations = [
      { index: 1, target: 'a', side: 'left', body: 'A' },
      { index: 2, target: 'b', side: 'right', body: 'B' },
    ]

    const result = computeMarkerPositions(svgRoot, annotations as any)
    expect(result.positions.size).toBe(2) // 2 circles in SVG
    expect(result.positions.has(1)).toBe(true)
    expect(result.positions.has(2)).toBe(true)
    expect(result.colors).not.toBeNull()
    expect(result.colors?.dotColor).toBeTruthy()

    document.body.innerHTML = ''
  })
})
