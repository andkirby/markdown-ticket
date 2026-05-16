import MarkdownIt from 'markdown-it'
import { describe, expect, it } from 'bun:test'
import { preprocessMarkdown } from './markdownPreprocessor'

describe('preprocessMarkdown', () => {
  const linkConfig = {
    enableAutoLinking: true,
    enableTicketLinks: true,
    enableDocumentLinks: true,
  }

  it('normalizes two-space nested list indentation so nested lists render correctly', () => {
    const markdown = [
      '- one',
      '  - inside of one',
      '- two',
      '',
    ].join('\n')

    const processed = preprocessMarkdown(markdown, 'DEM', linkConfig)
    const md = new MarkdownIt()

    expect(processed).toContain('    - inside of one')
    // markdown-it renders nested list with newline between li and ul
    expect(md.render(processed)).toContain('<li>one')
    expect(md.render(processed)).toContain('<ul>')
  })

  it('does not change already valid four-space nested lists', () => {
    const markdown = [
      '- one',
      '    - inside of one',
      '- two',
      '',
    ].join('\n')

    const processed = preprocessMarkdown(markdown, 'DEM', linkConfig)

    expect(processed).toContain('    - inside of one')
    expect(processed).not.toContain('      - inside of one')
  })
})
