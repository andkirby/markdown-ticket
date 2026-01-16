import { parse, stringify } from '../toml'

describe('tOML Utilities', () => {
  describe('parse', () => {
    it('should parse simple TOML', () => {
      const input = '[project]\nname = "test"\n'
      expect(parse(input)).toEqual({ project: { name: 'test' } })
    })

    it('should handle arrays', () => {
      const input = '[project]\npaths = [ "a", "b", "c" ]\n'
      expect(parse(input)).toEqual({ project: { paths: ['a', 'b', 'c'] } })
    })

    it('should handle nested sections', () => {
      const input = '[project]\nname = "test"\n\n[project.document]\npaths = [ "docs" ]\n'
      expect(parse(input)).toEqual({
        project: {
          name: 'test',
          document: { paths: ['docs'] },
        },
      })
    })

    it('should handle malformed TOML', () => {
      expect(() => parse('invalid toml [')).toThrow()
    })
  })

  describe('stringify', () => {
    it('should stringify object with strings', () => {
      const input = { section: { name: 'test', path: '/tmp' } }
      const result = stringify(input)
      expect(result).toContain('[section]')
      expect(result).toContain('name = "test"')
      expect(result).toContain('path = "/tmp"')
    })

    it('should handle different types', () => {
      const input = { config: { enabled: true, count: 42 } }
      const result = stringify(input)
      expect(result).toContain('enabled = true')
      expect(result).toContain('count = 42')
    })

    it('should handle arrays', () => {
      const input = { section: { items: ['a', 'b', 'c'] } }
      const result = stringify(input)
      expect(result).toContain('[ "a", "b", "c" ]')
    })

    it('should handle nested objects', () => {
      const input = {
        project: {
          name: 'test',
          document: { paths: ['docs'] },
        },
      }
      const result = stringify(input)
      expect(result).toContain('[project]')
      expect(result).toContain('[project.document]')
      expect(result).toContain('paths = [ "docs" ]')
    })

    // Note: smol-toml removes null values entirely
    it('should handle null values according to smol-toml behavior', () => {
      const input = { section: { name: 'test', value: null } }
      const result = stringify(input)
      expect(result).toContain('name = "test"')
      // smol-toml removes null values
      expect(result).not.toContain('value')
    })

    it('should end with single newline', () => {
      const result = stringify({ test: { key: 'value' } })
      expect(result).toMatch(/\n$/)
      expect(result.endsWith('\n\n')).toBe(false)
    })
  })

  describe('roundtrip', () => {
    it('should maintain data integrity through parse->stringify', () => {
      const original = {
        project: {
          name: 'Test Project',
          code: 'TP',
          active: true,
          document: {
            paths: ['README.md', 'docs'],
            excludeFolders: ['node_modules', '.git'],
            maxDepth: 4,
          },
        },
        metadata: {
          dateRegistered: '2025-01-01',
        },
      }

      const toml = stringify(original)
      const parsed = parse(toml)

      expect(parsed).toEqual(original)
    })
  })
})
