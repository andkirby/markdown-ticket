import { describe, expect, it } from 'bun:test'
import { slugify } from './slugify'

describe('slugify', () => {
  describe('GitHub-compatible slug generation (C5, BR-9)', () => {
    it('lowercases text', () => {
      expect(slugify('Introduction')).toBe('introduction')
    })

    it('replaces spaces with hyphens', () => {
      expect(slugify('Getting Started')).toBe('getting-started')
    })

    it('strips punctuation characters', () => {
      expect(slugify('What\'s new?')).toBe('whats-new')
    })

    it('handles simple heading text', () => {
      expect(slugify('Overview')).toBe('overview')
    })

    it('handles multi-word headings', () => {
      expect(slugify('Architecture Overview')).toBe('architecture-overview')
    })

    it('handles trailing punctuation', () => {
      expect(slugify('Conclusion!')).toBe('conclusion')
    })
  })

  describe('Edge-5: special characters matching Showdown ghCompatibleHeaderId', () => {
    it('handles C++ style heading (non-word chars become empty, leaving double hyphens)', () => {
      // Showdown ghCompatibleHeaderId: 'C++ & Rust' → 'c--rust'
      // The & and ++ are stripped, ++ leaves empty gap → double hyphen
      expect(slugify('C++ & Rust')).toBe('c--rust')
    })

    it('preserves Unicode characters (Showdown keeps them)', () => {
      // Showdown ghCompatibleHeaderId: 'Über Büros' → 'über-büros'
      // Unicode chars are NOT stripped
      expect(slugify('Über Büros')).toBe('über-büros')
    })

    it('handles ampersand in heading', () => {
      // 'Foo & Bar' → 'foo--bar' (& stripped, gap becomes double hyphen)
      expect(slugify('Foo & Bar')).toBe('foo--bar')
    })

    it('handles parenthesized text', () => {
      expect(slugify('Section (optional)')).toBe('section-optional')
    })

    it('handles heading with existing hyphens', () => {
      expect(slugify('pre-commit hook')).toBe('pre-commit-hook')
    })
  })

  describe('Edge-4: headerLevelStart offset', () => {
    it('slugify itself is independent of headerLevelStart', () => {
      // The offset is applied externally; slugify only converts text to ID
      expect(slugify('Sub Section')).toBe('sub-section')
    })
  })
})
