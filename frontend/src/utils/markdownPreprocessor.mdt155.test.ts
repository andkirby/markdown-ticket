import { describe, expect, it } from 'bun:test'
import { preprocessMarkdown } from './markdownPreprocessor'

describe('MDT-155: markdown document reference matching', () => {
  const linkConfig = {
    enableAutoLinking: true,
    enableTicketLinks: true,
    enableDocumentLinks: true,
  }

  it('converts standalone relative markdown references and preserves anchors', () => {
    const markdown = 'See requirements.trace.md#br-13 and ../README.md for details.'
    const processed = preprocessMarkdown(markdown, 'MDT', linkConfig, 'MDT-155/architecture.md')

    expect(processed).toContain('[requirements.trace.md#br-13](/prj/MDT/ticket/MDT-155/requirements.trace.md#br-13)')
    expect(processed).toContain('[../README.md](/prj/MDT/documents?file=docs%2FREADME.md)')
  })

  it('does not convert bare URLs or email-like tokens ending in .md', () => {
    const markdown = 'Download https://example.com/readme.md or email user@example.md before reading architecture.md.'
    const processed = preprocessMarkdown(markdown, 'MDT', linkConfig, 'MDT-155/requirements.md')

    expect(processed).toContain('https://example.com/readme.md')
    expect(processed).not.toContain('[https://example.com/readme.md]')
    expect(processed).toContain('user@example.md')
    expect(processed).not.toContain('[user@example.md]')
    expect(processed).toContain('[architecture.md](/prj/MDT/ticket/MDT-155/architecture.md)')
  })

  it('still leaves protected markdown links and code untouched', () => {
    const markdown = [
      'Existing [docs](requirements.md#overview) stay a single link.',
      'External [release](https://example.com/readme.md) stays external.',
      'Mail [person](mailto:user@example.md) stays external.',
      'Inline `requirements.md#overview` stays code.',
      '```',
      'tasks.md#task-1',
      '```',
    ].join('\n')

    const processed = preprocessMarkdown(markdown, 'MDT', linkConfig, 'MDT-155/architecture.md')

    expect(processed).toContain('[docs](/prj/MDT/ticket/MDT-155/requirements.md#overview)')
    expect(processed).toContain('[release](https://example.com/readme.md)')
    expect(processed).toContain('[person](mailto:user@example.md)')
    expect(processed).toContain('`requirements.md#overview`')
    expect(processed).toContain('tasks.md#task-1')
    expect(processed).not.toContain('`[requirements.md#overview]')
    expect(processed).not.toContain('[tasks.md#task-1]')
  })
})
