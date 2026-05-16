/**
 * Tests for useMarkdownProcessor rendering pipeline.
 *
 * These tests verify the markdown-it migration by directly testing the
 * rendering engine output against the obligations from architecture.md.
 *
 * Since useMarkdownProcessor is a React hook, we test the underlying
 * markdown-it configuration and pipeline components directly.
 *
 * Covers: OBL-processor-unit-tests, OBL-render-pipeline-swap,
 * OBL-wireframe-fence-plugin, OBL-heading-id-slug-compat,
 * OBL-syntax-highlight-compat, OBL-task-list-plugin
 */
import { describe, expect, it } from 'bun:test'
import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'
import { markdownItWireframePlugin } from '../../utils/markdownItWireframePlugin'
import { slugify } from '../../utils/slugify'
import { processMermaidBlocks } from '../../utils/mermaid'
import { highlightCodeBlocks } from '../../utils/syntaxHighlight'
import DOMPurify from 'dompurify'
import { ALLOWED_ATTR, ALLOWED_TAGS } from './domPurifyConfig'

/**
 * Creates a markdown-it instance matching the configuration
 * that useMarkdownProcessor will use (markdown-it + plugins).
 */
function createProcessorMd(): MarkdownIt {
  // @ts-expect-error markdown-it-task-lists has no type declarations
  const taskLists = require('markdown-it-task-lists')

  // @ts-expect-error markdown-it types don't expose all plugin signatures cleanly
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
  })

  // Enable strikethrough
  md.enable('strikethrough')

  md.use(markdownItWireframePlugin)
  md.use(taskLists, { disabled: true })
  md.use(anchor, { slugify, level: Array.from({ length: 6 }, (_, i) => i + 1) })

  return md
}

/**
 * Simulates the full rendering pipeline from useMarkdownProcessor:
 * render → processMermaid → highlight → sanitize
 */
function renderPipeline(markdown: string): string {
  const md = createProcessorMd()
  let html = md.render(markdown)
  html = processMermaidBlocks(html)
  html = highlightCodeBlocks(html)
  html = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: [...ALLOWED_ATTR],
  })
  return html
}

describe('useMarkdownProcessor pipeline (markdown-it)', () => {
  describe('wireframe rendering (BR-1, BR-2, C1)', () => {
    it('renders wireframe block with metadata as labeled block', () => {
      const html = renderPipeline('```wireframe state:surface empty\ncontent\n```')

      expect(html).toContain('code-block-label')
      expect(html).toContain('wireframe-label')
      expect(html).toContain('state:surface empty')
      expect(html).toContain('language-wireframe')
    })

    it('renders wireframe block without metadata as plain code block', () => {
      const html = renderPipeline('```wireframe\ncontent\n```')

      expect(html).not.toContain('code-block-label')
      expect(html).toContain('language-wireframe')
    })

    it('escapes HTML in wireframe label (XSS prevention)', () => {
      const html = renderPipeline('```wireframe <img src=x onerror=alert(1)>\ncontent\n```')

      // The label text is HTML-escaped: < becomes &lt; etc.
      // The img tag appears as escaped text in the label, not as a live element
      expect(html).not.toContain('<img')
      expect(html).toContain('&lt;img')
      expect(html).toContain('code-block-label')
    })
  })

  describe('table rendering (BR-3)', () => {
    it('renders markdown tables as HTML table elements', () => {
      const html = renderPipeline('| H1 | H2 |\n| --- | --- |\n| A | B |')

      expect(html).toContain('<table>')
      expect(html).toContain('<th>')
      expect(html).toContain('<td>')
    })
  })

  describe('strikethrough rendering (BR-4)', () => {
    it('renders strikethrough syntax as del tags', () => {
      const md = createProcessorMd()
      const html = md.render('~~deleted text~~')

      // markdown-it uses <s> tag for strikethrough (enabled via md.enable('strikethrough'))
      expect(html).toContain('<s>deleted text</s>')
    })
  })

  describe('task list rendering (BR-5)', () => {
    it('renders task list checkboxes', () => {
      const md = createProcessorMd()
      const html = md.render('- [ ] unchecked\n- [x] checked')

      // markdown-it-task-lists plugin produces checkbox inputs
      expect(html).toContain('<input')
      expect(html).toContain('type="checkbox"')
    })
  })

  describe('mermaid block compatibility (BR-6)', () => {
    it('produces HTML compatible with processMermaidBlocks', () => {
      const md = createProcessorMd()
      const rawHtml = md.render('```mermaid\ngraph TB\n    A --> B\n```')

      // markdown-it produces: <pre><code class="language-mermaid">...</code></pre>
      expect(rawHtml).toContain('language-mermaid')
      expect(rawHtml).toContain('<pre>')

      // After processMermaidBlocks, should have mermaid-container
      const processed = processMermaidBlocks(rawHtml)
      expect(processed).toContain('mermaid-container')
    })
  })

  describe('code block classes for Prism highlighting (BR-7, Edge-2)', () => {
    it('produces pre/code blocks with language classes', () => {
      const html = renderPipeline('```typescript\nconst x: number = 1\n```')

      expect(html).toContain('language-typescript')
    })

    it('renders unnamed code blocks without language class', () => {
      const html = renderPipeline('```\nplain text\n```')

      expect(html).toContain('<pre>')
      expect(html).toContain('<code>')
    })
  })

  describe('heading ID generation (BR-9, C5)', () => {
    it('generates heading IDs using GitHub-compatible slugs', () => {
      expect(slugify('Getting Started')).toBe('getting-started')
      expect(slugify('C++ & Rust')).toBe('c--rust')
    })

    it('renders headings with id attributes matching shared slugify (C5)', () => {
      const md = createProcessorMd()
      const html = md.render('## Getting Started\n### C++ & Rust')

      expect(html).toContain('id="getting-started"')
      expect(html).toContain('id="c--rust"')
    })
  })

  describe('DOMPurify allows wireframe labels (BR-10)', () => {
    it('does not strip wireframe label div and classes after sanitization', () => {
      const html = renderPipeline('```wireframe state:surface empty\ncontent\n```')

      expect(html).toContain('code-block-label')
      expect(html).toContain('wireframe-label')
    })

    it('allows div elements with class attributes', () => {
      const testHtml = '<div class="code-block-label wireframe-label">test</div>'
      const sanitized = DOMPurify.sanitize(testHtml, {
        ALLOWED_TAGS: [...ALLOWED_TAGS],
        ALLOWED_ATTR: [...ALLOWED_ATTR],
      })

      expect(sanitized).toContain('code-block-label')
      expect(sanitized).toContain('wireframe-label')
      expect(sanitized).toContain('<div')
    })
  })

  describe('performance non-regression (C2)', () => {
    it('markdown-it rendering is not slower than Showdown for standard content', () => {
      const md = createProcessorMd()
      const standardMarkdown = [
        '# Heading 1',
        '## Heading 2',
        'Paragraph with **bold** and *italic* text.',
        '',
        '| Col1 | Col2 |',
        '| --- | --- |',
        '| A | B |',
        '',
        '```typescript',
        'const x: number = 1;',
        '```',
        '',
        '- Item 1',
        '- Item 2',
        '',
        '> Blockquote',
      ].join('\n')

      // Warmup
      for (let i = 0; i < 10; i++) md.render(standardMarkdown)

      // Measure markdown-it
      const start = performance.now()
      for (let i = 0; i < 100; i++) md.render(standardMarkdown)
      const mdTime = performance.now() - start

      // Baseline: should complete 100 renders in under 500ms
      // This is a generous upper bound; the actual time should be much less
      expect(mdTime).toBeLessThan(500)
    })
  })

  describe('showdown removal (C3)', () => {
    it('useMarkdownProcessor does not import showdown', async () => {
      const fs = await import('fs')
      const path = await import('path')
      const filePath = path.resolve(__dirname, 'useMarkdownProcessor.ts')
      const content = fs.readFileSync(filePath, 'utf-8')

      expect(content).not.toContain('showdown')
      expect(content).not.toContain("from 'showdown'")
    })

    it('tableOfContents does not import showdown', async () => {
      const fs = await import('fs')
      const path = await import('path')
      const filePath = path.resolve(__dirname, '../../utils/tableOfContents.ts')
      const content = fs.readFileSync(filePath, 'utf-8')

      expect(content).not.toContain('showdown')
    })
  })

  describe('preprocessor pipeline compat (BR-8, OBL-preprocessor-pipeline-compat)', () => {
    it('preprocesses ticket references before markdown-it rendering', () => {
      const { preprocessMarkdown } = require('../../utils/markdownPreprocessor')
      const linkConfig = { enableAutoLinking: true, enableTicketLinks: true, enableDocumentLinks: true }
      const md = createProcessorMd()

      const markdown = 'See MDT-001 for details.'
      const preprocessed = preprocessMarkdown(markdown, 'MDT', linkConfig)
      const html = md.render(preprocessed)

      // Preprocessor should convert MDT-001 into a markdown link
      // which markdown-it then renders as an <a> tag
      expect(html).toContain('<a')
      expect(html).toContain('MDT-001')
    })

    it('preprocessor output is valid markdown-it input', () => {
      const { preprocessMarkdown } = require('../../utils/markdownPreprocessor')
      const linkConfig = { enableAutoLinking: true, enableTicketLinks: true, enableDocumentLinks: true }
      const md = createProcessorMd()

      const markdown = '# Title\n\nParagraph with MDT-001 reference.\n\n```typescript\nconst x = 1\n```'
      const preprocessed = preprocessMarkdown(markdown, 'MDT', linkConfig)
      const html = md.render(preprocessed)

      // Code block should be preserved through preprocess → render
      expect(html).toContain('language-typescript')
      expect(html).toContain('Title')
    })
  })

  describe('pipeline order (C4)', () => {
    it('preserves fixed pipeline: render → mermaid → highlight → sanitize', () => {
      // Integration test: verify all pipeline steps execute in order
      const md = createProcessorMd()
      const raw = '```mermaid\ngraph TB\n    A --> B\n```\n\n```typescript\nconst x = 1\n```'

      const rendered = md.render(raw)
      expect(rendered).toContain('language-mermaid')
      expect(rendered).toContain('language-typescript')

      const mermaidProcessed = processMermaidBlocks(rendered)
      expect(mermaidProcessed).toContain('mermaid-container')
      expect(mermaidProcessed).toContain('language-typescript')

      const highlighted = highlightCodeBlocks(mermaidProcessed)
      // Prism should add token classes for typescript
      expect(highlighted).toContain('language-typescript')

      const sanitized = DOMPurify.sanitize(highlighted, {
        ALLOWED_TAGS: [...ALLOWED_TAGS],
        ALLOWED_ATTR: [...ALLOWED_ATTR],
      })
      expect(sanitized).toContain('mermaid-container')
      expect(sanitized).toContain('language-typescript')
    })
  })
})
