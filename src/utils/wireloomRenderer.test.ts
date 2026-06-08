import type { WireloomModule, WireloomRenderOptions } from './wireloomRenderer'
/**
 * Tests for Wireloom integration — optional, graceful degradation.
 *
 * Covers:
 * - Fence plugin emits placeholder when wireloom block detected
 * - Non-wireloom blocks are unaffected
 * - WireloomRenderer: graceful fallback when wireloom not installed
 */
import { beforeEach, describe, expect, it, mock } from 'bun:test'
import MarkdownIt from 'markdown-it'
import { markdownItWireloomPlugin } from './markdownItWireloomPlugin'
import {
  compactWireloomAnnotations,
  formatWireloomError,
  getWireloomRenderOptions,
  renderWireloomElements,
  WIRELOOM_ANNOTATION_MAX_LINE_CHARS,
  WIRELOOM_RENDER_THEME,
} from './wireloomRenderer'

function createMd(): MarkdownIt {
  const md = new MarkdownIt({ html: true })
  md.use(markdownItWireloomPlugin)
  return md
}

function encodeWireloomSource(source: string): string {
  return btoa(unescape(encodeURIComponent(source)))
}

function createPendingContainer(source: string): HTMLElement {
  const encoded = encodeWireloomSource(source)
  const container = document.createElement('div')
  container.innerHTML = `<p>Before</p><div class="wireloom-pending" data-source-encoded="${encoded}"></div><p>After</p>`
  return container
}

function createMockWireloomModule(render: WireloomModule['default']['render']): WireloomModule {
  return { default: { render } }
}

describe('markdownItWireloomPlugin', () => {
  it('emits wireloom-pending placeholder for wireloom blocks', () => {
    const md = createMd()
    const html = md.render('```wireloom\nwindow "Test":\n  panel:\n    text "Hello"\n```')

    expect(html).toContain('wireloom-pending')
    expect(html).toContain('data-source-encoded')
    expect(html).not.toContain('<pre>')
  })

  it('preserves other code blocks untouched', () => {
    const md = createMd()
    const html = md.render('```typescript\nconst x = 1\n```')

    expect(html).toContain('language-typescript')
    expect(html).not.toContain('wireloom')
  })

  it('preserves wireframe blocks untouched', () => {
    const md = createMd()
    const html = md.render('```wireframe state:surface\ncontent\n```')

    expect(html).toContain('language-wireframe')
    expect(html).not.toContain('wireloom')
  })

  it('handles empty wireloom block', () => {
    const md = createMd()
    const html = md.render('```wireloom\n```')

    expect(html).toContain('wireloom-pending')
  })

  it('round-trips source through base64 encoding', () => {
    const source = 'window "Sign in":\n  panel:\n    button "OK" primary'
    const encoded = encodeWireloomSource(source)
    const decoded = decodeURIComponent(escape(atob(encoded)))

    expect(decoded).toBe(source)
  })

  it('round-trips unicode source through base64 encoding', () => {
    const source = 'window "Ünlocked":\n  text "Café résumé"'
    const encoded = encodeWireloomSource(source)
    const decoded = decodeURIComponent(escape(atob(encoded)))

    expect(decoded).toBe(source)
  })
})

describe('wireloomRenderer graceful fallback', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark')
    document.body.innerHTML = ''
  })

  it('isWireloomAvailable resolves to a boolean', async () => {
    const { isWireloomAvailable } = await import('./wireloomRenderer')
    const available = await isWireloomAvailable()

    expect(typeof available).toBe('boolean')
  })

  it('wraps rendered SVGs for native-width scrolling and fullscreen controls', async () => {
    const source = 'window "Test":\n  panel:\n    text "Hello"'
    const encoded = encodeWireloomSource(source)
    const container = document.createElement('div')
    container.innerHTML = `<div class="wireloom-pending" data-source-encoded="${encoded}"></div>`

    await renderWireloomElements(container)

    expect(container.querySelector('.wireloom__diagram svg')).toBeTruthy()
    expect(container.querySelector('.wireloom__fullscreen-btn')).toBeTruthy()
    expect(container.querySelector('.wireloom')?.getAttribute('data-source-encoded')).toBe(encoded)
  })

  it('uses the explicit light theme default when rendering Wireloom', async () => {
    const source = 'window "Light Default":\n  text "Hello"'
    const render = mock(async (_id: string, _source: string, options: WireloomRenderOptions) => {
      return { svg: `<svg data-theme="${options.theme}"></svg>` }
    })
    const container = createPendingContainer(source)

    await renderWireloomElements(container, {
      loadWireloom: async () => createMockWireloomModule(render),
      now: () => 1,
    })

    expect(render).toHaveBeenCalledTimes(1)
    expect(render.mock.calls[0]?.[2]).toEqual({ theme: WIRELOOM_RENDER_THEME.LIGHT })
    expect(container.querySelector('.wireloom__diagram svg')?.getAttribute('data-theme')).toBe(WIRELOOM_RENDER_THEME.LIGHT)
  })

  it('compacts long annotation bodies before rendering Wireloom', async () => {
    const source = [
      'window "Annotated":',
      '  button "Play all" id="playAll"',
      '',
      'annotation "Play all is visible in the bottom player, so it remains available in the middle of a long list." target="playAll" position=top',
    ].join('\n')
    const compactSource = compactWireloomAnnotations(
      source,
      await import('wireloom') as WireloomModule,
      WIRELOOM_ANNOTATION_MAX_LINE_CHARS,
    )

    expect(compactSource).toContain('Play all is visible in the\\nbottom player')
  })

  it('passes compacted annotations to the Wireloom renderer', async () => {
    const source = [
      'window "Annotated":',
      '  button "Play all" id="playAll"',
      '',
      'annotation "Play all is visible in the bottom player, so it remains available in the middle of a long list." target="playAll" position=top',
    ].join('\n')
    const render = mock(async (_id: string, _source: string, options: WireloomRenderOptions) => {
      return { svg: `<svg data-theme="${options.theme}"></svg>` }
    })
    const realWireloom = await import('wireloom') as WireloomModule
    const container = createPendingContainer(source)

    await renderWireloomElements(container, {
      loadWireloom: async () => ({
        default: {
          parse: realWireloom.default.parse,
          render,
          serialize: realWireloom.default.serialize,
        },
      }),
      now: () => 11,
    })

    expect(render.mock.calls[0]?.[1]).toContain('Play all is visible in the\\nbottom player')
  })

  it('uses the explicit dark theme default when rendering Wireloom', async () => {
    document.documentElement.classList.add('dark')
    const source = 'window "Dark Default":\n  text "Hello"'
    const render = mock(async (_id: string, _source: string, options: WireloomRenderOptions) => {
      return { svg: `<svg data-theme="${options.theme}"></svg>` }
    })
    const container = createPendingContainer(source)

    await renderWireloomElements(container, {
      loadWireloom: async () => createMockWireloomModule(render),
      now: () => 2,
    })

    expect(render).toHaveBeenCalledTimes(1)
    expect(render.mock.calls[0]?.[2]).toEqual({ theme: WIRELOOM_RENDER_THEME.DARK })
    expect(getWireloomRenderOptions()).toEqual({ theme: WIRELOOM_RENDER_THEME.DARK })
  })

  it('shows Wireloom parse error location without crashing the rest of the markdown', async () => {
    const source = 'bad "Wireloom"'
    const error = { message: 'Expected window root', line: 2, column: 5 }
    const container = createPendingContainer(source)

    await renderWireloomElements(container, {
      loadWireloom: async () => createMockWireloomModule(async () => {
        throw error
      }),
      now: () => 3,
    })

    const errorElement = container.querySelector('.wireloom-error')
    expect(errorElement?.textContent).toContain('Wireloom line 2, column 5')
    expect(errorElement?.textContent).toContain('Expected window root')
    expect(container.textContent).toContain('Before')
    expect(container.textContent).toContain('After')
  })

  it('falls back to escaped plain code when Wireloom cannot load', async () => {
    const source = 'window "Fallback":\n  text "<unsafe>"'
    const container = createPendingContainer(source)

    await renderWireloomElements(container, {
      loadWireloom: async () => null,
    })

    const code = container.querySelector('pre > code.language-wireloom')
    expect(code?.textContent).toBe(source)
    expect(container.querySelector('.wireloom')).toBeNull()
  })

  it('formats Wireloom errors with partial position context', () => {
    expect(formatWireloomError({ message: 'Bad source', line: 4 }))
      .toBe('Wireloom line 4: Bad source')
  })
})
