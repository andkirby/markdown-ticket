import { describe, expect, it } from 'bun:test'
import { processMermaidBlocks } from './core'

describe('processMermaidBlocks', () => {
  function decodeRenderedSource(html: string): string {
    const match = html.match(/data-source-encoded="([^"]+)"/)
    expect(match).not.toBeNull()
    return decodeURIComponent(match![1])
  }

  describe('markdown-it output compatibility (BR-6, OBL-mermaid-regex-cleanup)', () => {
    it('transforms language-mermaid code blocks from markdown-it output', () => {
      const html = '<pre><code class="language-mermaid">graph TB\n    A --&gt; B</code></pre>'
      const result = processMermaidBlocks(html)

      expect(result).toContain('mermaid-container')
      expect(result).toContain('data-source-encoded')
      expect(result).toContain('<div class="mermaid"')
      expect(result).not.toContain('language-mermaid')
      expect(decodeRenderedSource(result)).toBe('graph TB\n    A --> B')
    })

    it('decodes HTML entities in mermaid content', () => {
      const html = '<pre><code class="language-mermaid">A[&quot;Start&quot;] --&gt; B[&apos;Done&apos;]\nC &amp; D\nE[&#39;Next&#39;]</code></pre>'
      const result = processMermaidBlocks(html)
      const source = decodeRenderedSource(result)

      expect(source).toContain('A["Start"] --> B[\'Done\']')
      expect(source).toContain('C & D')
      expect(source).toContain('E[\'Next\']')
    })

    it('handles multiple mermaid blocks with unique IDs', () => {
      const html = [
        '<pre><code class="language-mermaid">graph TB\n    A --&gt; B</code></pre>',
        '<pre><code class="language-mermaid">graph TB\n    C --&gt; D</code></pre>',
      ].join('')
      const result = processMermaidBlocks(html)

      const matches = result.match(/id="mermaid-diagram-\d+"/g)
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
