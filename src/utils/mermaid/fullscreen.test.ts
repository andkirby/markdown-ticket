import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { addFullscreenButtons } from './fullscreen'

function createMermaidContainer() {
  document.body.innerHTML = `
    <div class="mermaid-container">
      <code class="mermaid">
        <svg viewBox="0 0 500 300"></svg>
      </code>
    </div>
  `

  const container = document.querySelector('.mermaid-container') as HTMLElement
  const diagram = container.querySelector('.mermaid') as HTMLElement

  container.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    width: 800,
    height: 600,
    top: 0,
    right: 800,
    bottom: 600,
    left: 0,
    toJSON: () => ({}),
  })

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

describe('mermaid fullscreen', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    document.body.style.overflow = ''
  })

  it('opens an in-app overlay without calling native fullscreen', () => {
    const { container, diagram } = createMermaidContainer()
    let requestFullscreenCalled = false
    container.requestFullscreen = () => {
      requestFullscreenCalled = true

      return Promise.resolve()
    }

    addFullscreenButtons()
    const button = container.querySelector('.mermaid-fullscreen-btn') as HTMLButtonElement
    button.click()

    expect(requestFullscreenCalled).toBe(false)
    expect(container.dataset.overlayEnabled).toBe('true')
    expect(container.getAttribute('data-zoom-enabled')).toBe('true')
    expect(container.style.position).toBe('fixed')
    expect(container.style.inset).toBe('0')
    expect(container.style.width).toBe('100vw')
    expect(container.style.height).toBe('100vh')
    expect(diagram.style.cursor).toBe('grab')
    expect(diagram.style.display).toBe('inline-block')
  })

  it('closes the overlay with Escape', () => {
    const { container, diagram } = createMermaidContainer()

    addFullscreenButtons()
    const button = container.querySelector('.mermaid-fullscreen-btn') as HTMLButtonElement
    button.click()
    let escapeReachedPage = false
    const pageEscapeHandler = () => {
      escapeReachedPage = true
    }
    document.addEventListener('keydown', pageEscapeHandler)

    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    }))

    expect(container.dataset.overlayEnabled).toBe('false')
    expect(container.getAttribute('data-zoom-enabled')).toBe('false')
    expect(container.style.position).toBe('relative')
    expect(container.style.width).toBe('')
    expect(container.style.height).toBe('')
    expect(diagram.style.transform).toBe('')
    expect(diagram.style.display).toBe('')
    expect(escapeReachedPage).toBe(false)
    document.removeEventListener('keydown', pageEscapeHandler)
  })
})
