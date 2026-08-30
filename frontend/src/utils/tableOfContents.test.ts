import { describe, expect, it } from 'bun:test'
import { extractTableOfContents } from './tableOfContents'

describe('extractTableOfContents', () => {
  describe('heading extraction (BR-11)', () => {
    it('extracts headings from raw markdown', () => {
      const markdown = '# Introduction\n## Overview\n### Details\n## Conclusion'
      const result = extractTableOfContents(markdown)

      expect(result).toHaveLength(4)
      expect(result[0].text).toBe('Introduction')
      expect(result[0].level).toBe(1)
      expect(result[1].text).toBe('Overview')
      expect(result[1].level).toBe(2)
      expect(result[2].text).toBe('Details')
      expect(result[2].level).toBe(3)
    })

    it('generates slug IDs matching rendering pipeline', () => {
      const markdown = '# Getting Started\n## Architecture Overview'
      const result = extractTableOfContents(markdown)

      expect(result[0].id).toBe('getting-started')
      expect(result[1].id).toBe('architecture-overview')
    })

    it('returns empty array for content without headings', () => {
      const markdown = 'Just some text\nNo headings here'
      const result = extractTableOfContents(markdown)

      expect(result).toEqual([])
    })
  })

  describe('headerLevelStart offset (Edge-4)', () => {
    it('offsets heading levels by headerLevelStart', () => {
      const markdown = '## Sub Heading'
      const result = extractTableOfContents(markdown, 3)

      // Showdown behavior: headerLevelStart=3 means # → h3, ## → h4. So level = headingLevel + headerLevelStart - 1 = 2 + 3 - 1 = 4
      expect(result[0].level).toBe(4)
    })

    it('offsets h1 by headerLevelStart', () => {
      const markdown = '# Title'
      const result = extractTableOfContents(markdown, 3)

      expect(result[0].level).toBe(3)
    })
  })

  describe('inline markdown stripping', () => {
    it('strips bold syntax from heading text', () => {
      const markdown = '# **Important** Section'
      const result = extractTableOfContents(markdown)

      expect(result[0].text).toBe('Important Section')
    })

    it('strips italic syntax from heading text', () => {
      const markdown = '# _Emphasized_ Title'
      const result = extractTableOfContents(markdown)

      expect(result[0].text).toBe('Emphasized Title')
    })

    it('strips inline code from heading text', () => {
      const markdown = '# Using `useState` Hook'
      const result = extractTableOfContents(markdown)

      expect(result[0].text).toBe('Using useState Hook')
    })

    it('strips link syntax from heading text', () => {
      const markdown = '# [Linked](url) Title'
      const result = extractTableOfContents(markdown)

      expect(result[0].text).toBe('Linked Title')
    })
  })

  describe('heading ID with special characters (Edge-5)', () => {
    it('generates correct slug for heading with special characters', () => {
      const markdown = '# C++ & Rust'
      const result = extractTableOfContents(markdown)

      // Showdown ghCompatibleHeaderId: 'C++ & Rust' → 'c--rust'
      expect(result[0].id).toBe('c--rust')
    })

    it('preserves Unicode characters in slug (matches Showdown)', () => {
      const markdown = '# Über Büros'
      const result = extractTableOfContents(markdown)

      // Showdown keeps Unicode: 'über-büros'
      expect(result[0].id).toBe('über-büros')
    })
  })

  describe('code block exclusion', () => {
    it('ignores # comments inside backtick fenced code blocks', () => {
      const markdown = '# Real Heading\n\n```bash\n# This is a shell comment\necho hello\n```\n\n## Section'
      const result = extractTableOfContents(markdown)

      expect(result).toHaveLength(2)
      expect(result[0].text).toBe('Real Heading')
      expect(result[1].text).toBe('Section')
    })

    it('ignores # comments inside tilde fenced code blocks', () => {
      const markdown = '# Title\n\n~~~python\n# Python comment\nx = 1\n~~~\n\n## Sub'
      const result = extractTableOfContents(markdown)

      expect(result).toHaveLength(2)
      expect(result[0].text).toBe('Title')
      expect(result[1].text).toBe('Sub')
    })

    it('handles code blocks with language info strings', () => {
      const markdown = '# Title\n\n```typescript\n// # not a heading\nconst x: number = 1\n```\n\n## Section'
      const result = extractTableOfContents(markdown)

      expect(result).toHaveLength(2)
      expect(result[0].text).toBe('Title')
      expect(result[1].text).toBe('Section')
    })

    it('handles multiple code blocks interspersed with headings', () => {
      const markdown = '# Title\n\n```bash\n# comment1\n```\n\n## Section\n\n```python\n# comment2\n```\n\n### Sub'
      const result = extractTableOfContents(markdown)

      expect(result).toHaveLength(3)
      expect(result[0].text).toBe('Title')
      expect(result[1].text).toBe('Section')
      expect(result[2].text).toBe('Sub')
    })

    it('handles code block with trailing spaces on closing fence', () => {
      const markdown = '# Title\n\n```bash\n# comment\n```   \n\n## Section'
      const result = extractTableOfContents(markdown)

      expect(result).toHaveLength(2)
      expect(result[0].text).toBe('Title')
      expect(result[1].text).toBe('Section')
    })
  })

  describe('rendering-free extraction', () => {
    it('extracts headings without needing a markdown renderer', () => {
      // This test verifies the function works with regex-based extraction
      // and does NOT import showdown (architectural invariant)
      const markdown = '# Hello\nSome text\n## World'
      const result = extractTableOfContents(markdown)

      expect(result).toHaveLength(2)
      expect(result[0].text).toBe('Hello')
      expect(result[1].text).toBe('World')
    })
  })
})
