import { describe, expect, it } from 'bun:test'
import { processMermaidBlocks } from './core'

describe('processMermaidBlocks', () => {
  describe('markdown-it output compatibility (BR-6, OBL-mermaid-regex-cleanup)', () => {
    it('transforms language-mermaid code blocks from markdown-it output', () => {
      const html = '<pre><code class="language-mermaid">graph TB\n    A --&gt; B</code></pre>'
      const result = processMermaidBlocks(html)

      expect(result).toContain('mermaid-container')
      expect(result).toContain('data-mermaid-id')
      expect(result).toContain('<code class="mermaid"')
      expect(result).not.toContain('language-mermaid')
    })

    it('decodes HTML entities in mermaid content', () => {
      const html = '<pre><code class="language-mermaid">A --&gt; B\nC &amp; D</code></pre>'
      const result = processMermaidBlocks(html)

      expect(result).toContain('A --> B')
      expect(result).toContain('C & D')
    })

    it('handles multiple mermaid blocks with unique IDs', () => {
      const html = [
        '<pre><code class="language-mermaid">graph TB\n    A --&gt; B</code></pre>',
        '<pre><code class="language-mermaid">graph TB\n    C --&gt; D</code></pre>',
      ].join('')
      const result = processMermaidBlocks(html)

      const matches = result.match(/data-mermaid-id="mermaid-diagram-\d+"/g)
      expect(matches).toHaveLength(2)
      expect(matches![0]).not.toBe(matches![1])
    })
  })

  describe('non-mermaid blocks untouched', () => {
    it('does not modify non-mermaid code blocks', () => {
      const html = '<pre><code class="language-javascript">const x = 1</code></pre>'
      const result = processMermaidBlocks(html)

      expect(result).toBe(html)
    })

    it('does not modify plain code blocks', () => {
      const html = '<pre><code>plain text</code></pre>'
      const result = processMermaidBlocks(html)

      expect(result).toBe(html)
    })
  })
})
