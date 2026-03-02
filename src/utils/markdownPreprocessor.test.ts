import showdown from 'showdown'
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
    const converter = new showdown.Converter({
      tables: true,
      strikethrough: true,
      tasklists: true,
      ghCodeBlocks: true,
      smoothLivePreview: true,
      simpleLineBreaks: true,
    })

    expect(processed).toContain('    - inside of one')
    expect(converter.makeHtml(processed)).toContain('<li>one<ul>')
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
