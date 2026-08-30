import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { addWireloomFullscreenButtons } from './wireloomFullscreen'

function createWireloomContainer() {
  document.body.innerHTML = `
    <div class="wireloom">
      <div class="wireloom__diagram">
        <svg width="1938.4" height="384" viewBox="0 0 1938.4 384"></svg>
      </div>
    </div>
  `

  const container = document.querySelector('.wireloom') as HTMLElement
  const diagram = container.querySelector('.wireloom__diagram') as HTMLElement

  container.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    width: 900,
    height: 500,
    top: 0,
    right: 900,
    bottom: 500,
    left: 0,
    toJSON: () => ({}),
  })

  diagram.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    width: 1938.4,
    height: 384,
    top: 0,
    right: 1938.4,
    bottom: 384,
    left: 0,
    toJSON: () => ({}),
  })

  return { container, diagram }
}

describe('wireloom fullscreen', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    document.body.style.overflow = ''
  })

  it('adds a fullscreen button to rendered Wireloom containers', () => {
    const { container } = createWireloomContainer()

    addWireloomFullscreenButtons(document)

    expect(container.querySelector('.wireloom__fullscreen-btn')).toBeTruthy()
    expect(container.getAttribute('data-zoom-enabled')).toBe('false')
    expect(container.dataset.overlayEnabled).toBe('false')
  })

  it('opens an in-app overlay with zoom enabled', () => {
    const { container, diagram } = createWireloomContainer()
    let requestFullscreenCalled = false
    container.requestFullscreen = () => {
      requestFullscreenCalled = true

      return Promise.resolve()
    }

    addWireloomFullscreenButtons(document)
    const button = container.querySelector('.wireloom__fullscreen-btn') as HTMLButtonElement
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
    const { container, diagram } = createWireloomContainer()

    addWireloomFullscreenButtons(document)
    const button = container.querySelector('.wireloom__fullscreen-btn') as HTMLButtonElement
    button.click()

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
  })
})
