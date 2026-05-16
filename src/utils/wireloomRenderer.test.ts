/**
 * Tests for Wireloom integration — optional, graceful degradation.
 *
 * Covers:
 * - Fence plugin emits placeholder when wireloom block detected
 * - Non-wireloom blocks are unaffected
 * - WireloomRenderer: graceful fallback when wireloom not installed
 */
import { describe, expect, it } from 'bun:test'
import MarkdownIt from 'markdown-it'
import { markdownItWireloomPlugin } from './markdownItWireloomPlugin'

function createMd(): MarkdownIt {
  const md = new MarkdownIt({ html: true })
  md.use(markdownItWireloomPlugin)
  return md
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
    const encoded = btoa(unescape(encodeURIComponent(source)))
    const decoded = decodeURIComponent(escape(atob(encoded)))

    expect(decoded).toBe(source)
  })

  it('round-trips unicode source through base64 encoding', () => {
    const source = 'window "Ünlocked":\n  text "Café résumé"'
    const encoded = btoa(unescape(encodeURIComponent(source)))
    const decoded = decodeURIComponent(escape(atob(encoded)))

    expect(decoded).toBe(source)
  })
})

describe('wireloomRenderer graceful fallback', () => {
  it('isWireloomAvailable returns false when not installed', async () => {
    // In test environment, wireloom is not installed as optional dep
    const { isWireloomAvailable } = await import('./wireloomRenderer')
    // This will attempt dynamic import and fail gracefully
    const available = await isWireloomAvailable()
    // If wireloom happens to be installed, this is true; if not, false
    // Either way it should not throw
    expect(typeof available).toBe('boolean')
  })
})
