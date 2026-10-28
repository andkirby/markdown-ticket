import { describe, expect, it } from 'bun:test'
import { preprocessMarkdown } from './markdownPreprocessor'

const config = { enableAutoLinking: true, enableTicketLinks: true, enableDocumentLinks: true }

describe('MDT-265 canonical key parsing in markdown', () => {
  for (const key of ['TP0-042', 'TP0-10000', 'AB123-99999']) {
    const project = key.split('-')[0]
    const source = `${key}/requirements.md`

    it(`resolves bare and inline subdocuments from ${key}`, () => {
      const result = preprocessMarkdown('notes.md and `design.md#intro` and `preview.html`', project, config, source)
      expect(result).toContain(`[notes.md](/prj/${project}/ticket/${key}/notes.md)`)
      expect(result).toContain(`[\`design.md#intro\`](/prj/${project}/ticket/${key}/design.md#intro)`)
      expect(result).toContain(`[\`preview.html\`](/prj/${project}/ticket/${key}/preview.html)`)
    })

    it(`resolves ticket documents and subdocuments in the tickets area for ${key}`, () => {
      const input = `[ticket](docs/CRs/${key}-title.md#intro) [subdoc](docs/CRs/${key}/part/plan.md#step)`
      const result = preprocessMarkdown(input, project, config, 'docs/guide.md')
      expect(result).toBe(`[ticket](/prj/${project}/ticket/${key}#intro) [subdoc](/prj/${project}/ticket/${key}/part/plan.md#step)`)
    })

    it(`resolves relative sibling references for ${key}`, () => {
      const input = `[ticket](../${key}-title.md#intro) [subdoc](../${key}/plan.md#step)`
      const result = preprocessMarkdown(input, project, config, 'MDT-123/notes.md')
      expect(result).toBe(`[ticket](/prj/${project}/ticket/${key}#intro) [subdoc](/prj/${project}/ticket/${key}/plan.md#step)`)
    })

    it(`protects ${key} filenames from nested link conversion`, () => {
      const result = preprocessMarkdown(`${key}-title.md#intro`, project, config, source)
      expect(result).toBe(`[${key}-title.md#intro](/prj/${project}/ticket/${key}#intro)`)
    })

    it(`resolves bare ticket filenames from documents context for ${key}`, () => {
      expect(preprocessMarkdown(`[ticket](${key}.md)`, project, config, 'docs/guide.md'))
        .toBe(`[ticket](/prj/${project}/ticket/${key})`)
    })
  }

  it('bounds prose keys without linking valid-looking suffixes of invalid tokens', () => {
    const input = 'TP0-042 TP0-10000 TP0-12 TP0-100000 TP0-042x 1TP0-042 LONGTP0-042 tp0-042'
    expect(preprocessMarkdown(input, 'TP0', config)).toBe(
      '[TP0-042](/prj/TP0/ticket/TP0-042) [TP0-10000](/prj/TP0/ticket/TP0-10000) TP0-12 TP0-100000 TP0-042x 1TP0-042 LONGTP0-042 tp0-042',
    )
  })

  it('does not extract truncated keys from invalid source paths', () => {
    const result = preprocessMarkdown('[notes](notes.md)', 'TP0', config, 'TP0-100000/requirements.md')
    expect(result).toContain('/documents?file=TP0-100000%2Fnotes.md')
    expect(result).not.toContain('/ticket/')
  })

  it('does not truncate invalid ticket filenames to five digits', () => {
    const result = preprocessMarkdown('[ticket](../TP0-100000-title.md)', 'TP0', config, 'TP0-042/notes.md')
    expect(result).not.toContain('/ticket/TP0-10000')
  })

  it('preserves code spans, existing links and fenced examples', () => {
    const input = '`TP0-042` [existing](/prj/TP0/ticket/TP0-10000)\n\n```text\nTP0-042\n```'
    expect(preprocessMarkdown(input, 'TP0', config)).toBe(input)
  })

  it('does not split a ticket-shaped filename suffix out of an invalid token', () => {
    const result = preprocessMarkdown('BAD-TP0-042.md', 'TP0', config, 'TP0-001/notes.md')
    expect(result).toBe('[BAD-TP0-042.md](/prj/TP0/ticket/TP0-001/BAD-TP0-042.md)')
  })

  it('resolves relative HTML subdocuments and anchors through the document grammar', () => {
    expect(preprocessMarkdown('[preview](../TP0-042/preview.html#intro)', 'TP0', config, 'TP0-10000/notes.md'))
      .toBe('[preview](/prj/TP0/ticket/TP0-042/preview.html#intro)')
    expect(preprocessMarkdown('`preview.html#intro`', 'TP0', config, 'TP0-042/notes.md'))
      .toBe('[`preview.html#intro`](/prj/TP0/ticket/TP0-042/preview.html#intro)')
  })

  it('protects complete ticket-shaped HTML filenames before prose key conversion', () => {
    expect(preprocessMarkdown('TP0-042.html#intro', 'TP0', config, 'TP0-001/notes.md'))
      .toBe('[TP0-042.html#intro](/prj/TP0/ticket/TP0-001/TP0-042.html#intro)')
    expect(preprocessMarkdown('docs/reports/TP0-042.html#intro', 'TP0', config, 'TP0-001/notes.md', 'docs/CRs', p => p === 'docs/reports/TP0-042.html'))
      .toBe('[docs/reports/TP0-042.html#intro](/prj/TP0/documents?file=docs%2Freports%2FTP0-042.html#intro)')
  })

  it('restores complete HTML filenames in documents context without a ticket key', () => {
    expect(preprocessMarkdown('TP0-042.html#intro', 'TP0', config, 'docs/guide.md'))
      .toBe('[TP0-042.html#intro](/prj/TP0/documents?file=docs%2FTP0-042.html#intro)')
    expect(preprocessMarkdown('docs/reports/TP0-042.html#intro', 'TP0', config, 'docs/guide.md', 'docs/CRs', p => p === 'docs/reports/TP0-042.html'))
      .toBe('[docs/reports/TP0-042.html#intro](/prj/TP0/documents?file=docs%2Freports%2FTP0-042.html#intro)')
    expect(preprocessMarkdown('TP0-042.html#intro', 'TP0', config, 'docs/guide.md', 'docs/CRs', p => p === 'TP0-042.html'))
      .toBe('[TP0-042.html#intro](/prj/TP0/documents?file=TP0-042.html#intro)')
    expect(preprocessMarkdown('TP0-042.html#intro', 'TP0', config, 'docs/guide.md', 'docs/CRs', () => false, () => 'docs/reports/TP0-042.html'))
      .toBe('[TP0-042.html#intro](/prj/TP0/documents?file=docs%2Freports%2FTP0-042.html#intro)')
  })

  it('does not add document links in documents context when they are disabled', () => {
    expect(preprocessMarkdown('TP0-042.html#intro', 'TP0', { ...config, enableDocumentLinks: false }, 'docs/guide.md'))
      .toBe('TP0-042.html#intro')
  })
})
