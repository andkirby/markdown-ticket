import { beforeEach, describe, expect, it } from 'bun:test'
import { disableZoom, enableZoom } from './zoom'

function createMermaidContainer() {
  document.body.innerHTML = `
    <div class="mermaid-container">
      <code class="mermaid" data-fullscreen-scale="2">
        <svg viewBox="0 0 500 300"></svg>
      </code>
      <button class="mermaid-fullscreen-btn" type="button"></button>
    </div>
  `

  const container = document.querySelector('.mermaid-container') as HTMLElement
  const diagram = container.querySelector('.mermaid') as HTMLElement

  diagram.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    width: 500,
    height: 300,
    top: 0,
    right: 500,
    bottom: 300,
    left: 0,
    toJSON: () => ({}),
  })

  return { container, diagram }
}

describe('mermaid zoom', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('makes the Mermaid diagram transformable when zoom is enabled', () => {
    const { container, diagram } = createMermaidContainer()

    enableZoom(container)

    expect(container.getAttribute('data-zoom-enabled')).toBe('true')
    expect(diagram.style.transformOrigin).toBe('center center')
    expect(diagram.style.cursor).toBe('grab')
    expect(diagram.style.transition).toBe('transform 0.1s ease-out')
    expect(diagram.style.display).toBe('inline-block')
    expect(diagram.style.userSelect).toBe('none')
    expect(diagram.style.touchAction).toBe('none')
  })

  it('zooms with the mouse wheel', () => {
    const { container, diagram } = createMermaidContainer()
    enableZoom(container)

    container.dispatchEvent(new WheelEvent('wheel', {
      deltaY: -100,
      bubbles: true,
      cancelable: true,
    }))

    expect(diagram.style.transform).toBe('scale(2.2) translate(0px, 0px)')
  })

  it('pans from Mermaid diagram drag', () => {
    const { container, diagram } = createMermaidContainer()
    enableZoom(container)

    diagram.dispatchEvent(new MouseEvent('mousedown', {
      button: 0,
      clientX: 100,
      clientY: 100,
      bubbles: true,
      cancelable: true,
    }))
    document.dispatchEvent(new MouseEvent('mousemove', {
      clientX: 140,
      clientY: 120,
      bubbles: true,
    }))
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

    expect(diagram.style.transform).toBe('scale(2) translate(20px, 10px)')
  })

  it('cleans up zoom styles', () => {
    const { container, diagram } = createMermaidContainer()
    enableZoom(container)

    disableZoom(container)

    expect(container.getAttribute('data-zoom-enabled')).toBe('false')
    expect(diagram.style.transform).toBe('')
    expect(diagram.style.transformOrigin).toBe('')
    expect(diagram.style.cursor).toBe('')
    expect(diagram.style.transition).toBe('')
    expect(diagram.style.display).toBe('')
    expect(diagram.style.userSelect).toBe('')
    expect(diagram.style.touchAction).toBe('')
  })
})
