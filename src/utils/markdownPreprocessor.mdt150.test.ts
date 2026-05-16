/**
 * MDT-150 Constraint Regression Tests
 *
 * C5: markdownPreprocessor must remain unchanged
 *
 * Locks the preprocessor's link-wrapping behavior for .md references,
 * ticket references, and auto-linking features.
 */
import { describe, expect, it } from 'bun:test'
import MarkdownIt from 'markdown-it'
import { preprocessMarkdown } from './markdownPreprocessor'

describe('MDT-150: markdownPreprocessor unchanged (C5)', () => {
  const linkConfig = {
    enableAutoLinking: true,
    enableTicketLinks: true,
    enableDocumentLinks: true,
  }

  it('wraps .md references as links in markdown output', () => {
    const markdown = 'See architecture.md for details.'
    const processed = preprocessMarkdown(markdown, 'MDT', linkConfig)
    const md = new MarkdownIt()
    const html = md.render(processed)

    // Preprocessor should wrap the .md reference so it becomes a link
    expect(html).toContain('architecture.md')
    expect(processed).not.toBe(markdown) // Should be transformed
  })

  it('wraps ticket key references as links', () => {
    const markdown = 'Related to MDT-151.'
    const processed = preprocessMarkdown(markdown, 'MDT', linkConfig)
    const md = new MarkdownIt()
    const html = md.render(processed)

    expect(html).toContain('MDT-151')
    expect(processed).not.toBe(markdown)
  })

  it('does not alter plain text without links', () => {
    const markdown = 'This is plain text with no references.'
    const processed = preprocessMarkdown(markdown, 'MDT', linkConfig)

    // Should still be the same (possibly with list normalization)
    expect(processed).toContain('plain text with no references')
  })

  it('preserves code blocks untouched', () => {
    const markdown = '```\nMDT-150.md\n```'
    const processed = preprocessMarkdown(markdown, 'MDT', linkConfig)

    // Code blocks should not have links auto-inserted
    expect(processed).toContain('MDT-150.md')
  })

  it('respects enableAutoLinking=false', () => {
    const noLinkConfig = {
      enableAutoLinking: false,
      enableTicketLinks: true,
      enableDocumentLinks: true,
    }
    const markdown = 'See MDT-151 for details.'
    const processed = preprocessMarkdown(markdown, 'MDT', noLinkConfig)

    // With auto-linking disabled, should not wrap ticket refs
    expect(processed).toBe(markdown)
  })

  it('does not double-wrap ticket-key-prefixed .md filenames (BR-2)', () => {
    // MDT-150-smartlink-doc-urls.md should produce a clean ticket link,
    // not a double-wrapped corruption like:
    // [[MDT-150](/prj/MDT/ticket/MDT-150)-smartlink-doc-urls.md](...)
    //
    // Current behavior: preprocessor produces plain text (no link at all)
    // because the ticket-key match + protection layers prevent wrapping.
    // After Task 1 (exclusion guard), this should produce a ticket link.
    const markdown = 'See MDT-150-smartlink-doc-urls.md for details.'
    const processed = preprocessMarkdown(markdown, 'MDT', linkConfig)

    // Must NOT contain double-wrap corruption pattern
    expect(processed).not.toContain('](/prj/MDT/ticket/MDT-150)-smartlink')

    // The filename should appear in the output (as text or link)
    expect(processed).toContain('MDT-150-smartlink-doc-urls.md')

    // After Task 1: this should be wrapped as a ticket link
    // For now, verify no corruption
    const md = new MarkdownIt()
    const html = md.render(processed)
    expect(html).toContain('MDT-150-smartlink-doc-urls.md')
  })
})

// ---
// MDT-150: resolveDocumentRef unit tests
// ---
// These tests exercise the private resolveDocumentRef function by calling
// preprocessMarkdown with sourcePath and checking the hrefs in the output.
// Since resolveDocumentRef is not exported, we test through the public API.
//
// sourcePath values here mirror what TicketViewer passes:
//   - main doc:   '{ticketKey}.md'        (e.g. 'MDT-150.md')
//   - subdoc:     '{ticketKey}/{path}.md'  (e.g. 'MDT-150/bdd.md')
//
// NOTE: sourcePath is relative to ticketsPath, NOT project root.
// This is a known design issue — see Bug 2/3 in code review.

/** Extract href from the first markdown link in processed output */
function extractFirstHref(processed: string): string | null {
  const match = processed.match(/\]\(([^)]+)\)/)
  return match ? match[1] : null
}

describe('MDT-150: resolveDocumentRef via preprocessMarkdown', () => {
  const linkConfig = {
    enableAutoLinking: true,
    enableTicketLinks: true,
    enableDocumentLinks: true,
  }

  describe('BUG-1: dot-slash (./) produces double ticket-key in URL', () => {
    it('does NOT produce double ticket-key for ./path from subdoc', () => {
      // CR file links: [architecture.md](./MDT-150/architecture.md)
      // sourcePath is the subdoc being rendered, not the CR file.
      // Currently produces: /prj/MDT/ticket/MDT-150/MDT-150/architecture.md
      // Expected:        /prj/MDT/ticket/MDT-150/architecture.md
      const markdown = 'See [architecture.md](./MDT-150/architecture.md) for details.'
      const processed = preprocessMarkdown(markdown, 'MDT', linkConfig, 'MDT-150/requirements.md')
      const href = extractFirstHref(processed)
      expect(href).not.toBeNull()
      // Must NOT have double MDT-150
      expect(href).not.toContain('MDT-150/MDT-150')
    })

    it('does NOT produce double ticket-key for ./path from main doc', () => {
      // Main CR file viewing a link like [trace](./MDT-150/requirements.trace.md)
      // sourcePath = 'MDT-150.md', no sourceDir
      // Currently produces: /prj/MDT/ticket/MDT-150/MDT-150/requirements.trace.md
      // Expected:        /prj/MDT/ticket/MDT-150/requirements.trace.md
      const markdown = 'See [trace](./MDT-150/requirements.trace.md) for details.'
      const processed = preprocessMarkdown(markdown, 'MDT', linkConfig, 'MDT-150.md')
      const href = extractFirstHref(processed)
      expect(href).not.toBeNull()
      expect(href).not.toContain('MDT-150/MDT-150')
    })
  })

  describe('BUG-2: documents URL has double docs/ prefix', () => {
    it('does NOT double docs/ prefix for unwrapped .. paths escaping ticket folder', () => {
      // Bare (unwrapped) ref: ../../README.md from MDT-150/requirements.md
      // Currently produces: /prj/MDT/documents?file=docs%2Fdocs%2FREADME.md
      // Expected:        /prj/MDT/documents?file=docs%2FREADME.md
      const markdown = 'See ../../README.md for details.'
      const processed = preprocessMarkdown(markdown, 'MDT', linkConfig, 'MDT-150/requirements.md')
      const href = extractFirstHref(processed)
      expect(href).not.toBeNull()
      // Must NOT have double docs/
      expect(href).not.toContain('docs%2Fdocs')
      expect(href).not.toContain('docs/docs')
      // Should be a documents link
      expect(href).toContain('/documents')
    })

    it('does NOT double docs/ prefix for already-linked .. paths', () => {
      // Already-linked ref: [README](../../README.md) from MDT-150/requirements.md
      // protectExistingLinks resolves this before convertDocumentReferences
      // Currently produces: /prj/MDT/documents?file=docs%2Fdocs%2FREADME.md
      // Expected:        /prj/MDT/documents?file=docs%2FREADME.md
      const markdown = 'See [README](../../README.md) for details.'
      const processed = preprocessMarkdown(markdown, 'MDT', linkConfig, 'MDT-150/requirements.md')
      const href = extractFirstHref(processed)
      expect(href).not.toBeNull()
      expect(href).not.toContain('docs%2Fdocs')
      expect(href).not.toContain('docs/docs')
    })

    it('correctly resolves ../ traversal from subdoc to sibling ticket', () => {
      // ../MDT-151.md from MDT-150/requirements.md
      const markdown = 'See [MDT-151](../MDT-151.md) for details.'
      const processed = preprocessMarkdown(markdown, 'MDT', linkConfig, 'MDT-150/requirements.md')
      const href = extractFirstHref(processed)
      expect(href).not.toBeNull()
      expect(href).toContain('/prj/MDT/ticket/MDT-151')
      // Must NOT be a documents link
      expect(href).not.toContain('/documents')
    })
  })

  describe('BUG-3: main CR file sourcePath missing ticketsPath prefix', () => {
    it('resolves .. paths correctly from main CR file (unwrapped)', () => {
      // Main doc sourcePath = 'MDT-150.md' (no ticketsPath prefix)
      // Unwrapped ref: ../../README.md
      // Currently: pop on empty array does nothing, produces docs%2FREADME.md
      // (passes by coincidence — not double docs/ but wrong resolved path)
      // The real issue: sourcePath should be docs/CRs/MDT-150.md for correct math
      const markdown = 'See ../../README.md for details.'
      const processed = preprocessMarkdown(markdown, 'MDT', linkConfig, 'MDT-150.md')
      const href = extractFirstHref(processed)
      expect(href).not.toBeNull()
      // Should produce a documents link (escaping ticket folder)
      expect(href).toContain('/documents')
    })

    it('resolves ../ticket-prefixed file from main CR file', () => {
      // ../MDT-151.md from main doc (sourcePath = 'MDT-150.md')
      // Currently fails: empty sourceDir can't pop, MDT-151.md doesn't match
      // ticket-key regex after resolution (it does BEFORE resolution, so this
      // works for already-linked refs but fails for bare refs)
      const markdown = 'See ../MDT-151.md for details.'
      const processed = preprocessMarkdown(markdown, 'MDT', linkConfig, 'MDT-150.md')
      const href = extractFirstHref(processed)
      expect(href).not.toBeNull()
      expect(href).toContain('/prj/MDT/ticket/MDT-151')
    })

    it('resolves ../ticket-prefixed file from main CR file (already-linked)', () => {
      // Already-linked: [MDT-151](../MDT-151.md) from sourcePath = 'MDT-150.md'
      // protectExistingLinks resolves first — ticket key regex matches before resolution
      // This currently works because the ticket-key check happens before path math
      const markdown = 'See [MDT-151](../MDT-151.md) for details.'
      const processed = preprocessMarkdown(markdown, 'MDT', linkConfig, 'MDT-150.md')
      const href = extractFirstHref(processed)
      expect(href).not.toBeNull()
      expect(href).toContain('/prj/MDT/ticket/MDT-151')
    })
  })

  describe('Happy path: resolution with sourcePath', () => {
    it('resolves bare filename to ticket subdoc URL', () => {
      const markdown = 'See [architecture](architecture.md) for details.'
      const processed = preprocessMarkdown(markdown, 'MDT', linkConfig, 'MDT-150/requirements.md')
      const href = extractFirstHref(processed)
      expect(href).not.toBeNull()
      expect(href).toBe('/prj/MDT/ticket/MDT-150/architecture.md')
    })

    it('resolves ticket-key filename to ticket URL', () => {
      const markdown = 'See [MDT-151](MDT-151.md) for details.'
      const processed = preprocessMarkdown(markdown, 'MDT', linkConfig, 'MDT-150/requirements.md')
      const href = extractFirstHref(processed)
      expect(href).not.toBeNull()
      expect(href).toBe('/prj/MDT/ticket/MDT-151')
    })

    it('resolves ticket-prefixed filename to ticket URL', () => {
      const markdown = 'See [smartlink](MDT-150-smartlink-doc-urls.md) for details.'
      const processed = preprocessMarkdown(markdown, 'MDT', linkConfig, 'MDT-150/requirements.md')
      const href = extractFirstHref(processed)
      expect(href).not.toBeNull()
      expect(href).toBe('/prj/MDT/ticket/MDT-150')
    })

    it('preserves anchor on bare filename', () => {
      const markdown = 'See [overview](architecture.md#overview) for details.'
      const processed = preprocessMarkdown(markdown, 'MDT', linkConfig, 'MDT-150/requirements.md')
      const href = extractFirstHref(processed)
      expect(href).not.toBeNull()
      expect(href).toBe('/prj/MDT/ticket/MDT-150/architecture.md#overview')
    })

    it('preserves anchor on ticket-key filename', () => {
      const markdown = 'See [section](MDT-151.md#section) for details.'
      const processed = preprocessMarkdown(markdown, 'MDT', linkConfig, 'MDT-150/requirements.md')
      const href = extractFirstHref(processed)
      expect(href).not.toBeNull()
      expect(href).toBe('/prj/MDT/ticket/MDT-151#section')
    })

    it('does NOT double-wrap ticket-key filenames', () => {
      // Unwrapped markdown — preprocessor should produce clean link
      const markdown = 'See MDT-150-smartlink-doc-urls.md for details.'
      const processed = preprocessMarkdown(markdown, 'MDT', linkConfig, 'MDT-150/requirements.md')
      // Must NOT contain double-wrap corruption
      expect(processed).not.toContain('](/prj/MDT/ticket/MDT-150)-smartlink')
      // Should produce a ticket link
      expect(processed).toContain('/prj/MDT/ticket/MDT-150')
    })

    it('passes through when no sourcePath (backward compat)', () => {
      const markdown = 'See architecture.md for details.'
      const processed = preprocessMarkdown(markdown, 'MDT', linkConfig)
      // Without sourcePath, bare filenames get simple wrapping
      expect(processed).toContain('[architecture.md](')
      // Should NOT contain absolute URLs
      expect(processed).not.toContain('/prj/')
    })
  })
})
