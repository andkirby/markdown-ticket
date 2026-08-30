import { describe, expect, it } from 'bun:test'
import MarkdownIt from 'markdown-it'
import { markdownItWireframePlugin } from './markdownItWireframePlugin'

describe('markdownItWireframePlugin', () => {
  function createMd(): MarkdownIt {
    const md = new MarkdownIt()
    md.use(markdownItWireframePlugin)
    return md
  }

  describe('wireframe fence with metadata (BR-1)', () => {
    it('renders label div above code block when wireframe fence has metadata', () => {
      const md = createMd()
      const input = '```wireframe state:surface empty\nsome content\n```'
      const result = md.render(input)

      expect(result).toContain('<div class="code-block-label wireframe-label">state:surface empty</div>')
      expect(result).toContain('<code class="language-wireframe">')
      expect(result).toContain('some content')
    })

    it('places label div before the pre/code block', () => {
      const md = createMd()
      const input = '```wireframe state:surface empty\ncontent\n```'
      const result = md.render(input)

      const labelIndex = result.indexOf('code-block-label')
      const preIndex = result.indexOf('<pre>')
      expect(labelIndex).toBeLessThan(preIndex)
    })
  })

  describe('wireframe fence without metadata (BR-2)', () => {
    it('renders normal code block without label when info string has no metadata', () => {
      const md = createMd()
      const input = '```wireframe\nsome content\n```'
      const result = md.render(input)

      expect(result).not.toContain('code-block-label')
      expect(result).not.toContain('wireframe-label')
      expect(result).toContain('<code class="language-wireframe">')
    })

    it('renders normal code block when info string is only whitespace', () => {
      const md = createMd()
      const input = '```wireframe \nsome content\n```'
      const result = md.render(input)

      expect(result).not.toContain('code-block-label')
      expect(result).toContain('<code class="language-wireframe">')
    })
  })

  describe('HTML escaping in labels (C1, Edge-1)', () => {
    it('escapes HTML special characters in info string metadata', () => {
      const md = createMd()
      const input = '```wireframe <script>alert("xss")</script>\ncontent\n```'
      const result = md.render(input)

      expect(result).not.toContain('<script>')
      expect(result).toContain('&lt;script&gt;')
      expect(result).toContain('code-block-label')
    })

    it('escapes ampersands in metadata', () => {
      const md = createMd()
      const input = '```wireframe foo & bar\ncontent\n```'
      const result = md.render(input)

      expect(result).toContain('&amp;')
      expect(result).toContain('code-block-label')
    })

    it('escapes quotes in metadata', () => {
      const md = createMd()
      const input = '```wireframe state: "active"\ncontent\n```'
      const result = md.render(input)

      expect(result).toContain('&quot;')
      expect(result).toContain('code-block-label')
    })
  })

  describe('multiple metadata tokens (Edge-3)', () => {
    it('renders entire info string as label text when multiple tokens present', () => {
      const md = createMd()
      const input = '```wireframe state:surface empty mode:edit\ncontent\n```'
      const result = md.render(input)

      expect(result).toContain('<div class="code-block-label wireframe-label">state:surface empty mode:edit</div>')
    })
  })

  describe('non-wireframe fences (Edge-2)', () => {
    it('does not add label to non-wireframe code blocks', () => {
      const md = createMd()
      const input = '```javascript\nconst x = 1\n```'
      const result = md.render(input)

      expect(result).not.toContain('code-block-label')
      expect(result).toContain('<code class="language-javascript">')
    })

    it('does not add label to unnamed code blocks', () => {
      const md = createMd()
      const input = '```\nplain code\n```'
      const result = md.render(input)

      expect(result).not.toContain('code-block-label')
      expect(result).toContain('<code>')
    })
  })
})
