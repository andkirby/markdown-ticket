import { parseToml, stringify, stringifyAndVerify } from '../toml'

describe('SEC-001: TOML round-trip verification', () => {
  describe('stringifyAndVerify', () => {
    it('returns valid TOML string for normal config', () => {
      const config = {
        project: {
          name: 'Test Project',
          code: 'TP',
          document: { paths: ['docs', 'README.md'] },
        },
      }

      const result = stringifyAndVerify(config)
      expect(result).toContain('[project]')
      expect(result).toContain('name = "Test Project"')

      // Re-parses cleanly
      const reparsed = parseToml(result) as typeof config
      expect(reparsed.project.name).toBe('Test Project')
    })

    it('passes for config with special characters in strings', () => {
      const config = {
        project: {
          name: 'say "hi" and = value # ok',
          description: '[[brackets]] and \\backslash',
        },
      }

      const result = stringifyAndVerify(config)
      const reparsed = parseToml(result) as typeof config
      expect(reparsed.project.name).toBe(config.project.name)
      expect(reparsed.project.description).toBe(config.project.description)
    })

    it('throws when round-trip produces different structure', () => {
      // Null values are stripped by smol-toml, so this should fail verification
      const config = {
        project: {
          name: 'test',
          value: null,
        },
      }

      expect(() => stringifyAndVerify(config)).toThrow('TOML round-trip verification failed')
    })

    it('includes label in error message', () => {
      expect(() => stringifyAndVerify({ a: null }, 'my-config')).toThrow('my-config')
    })

    it('passes for empty object', () => {
      const result = stringifyAndVerify({})
      expect(result.trim()).toBe('')
    })

    it('passes for nested objects matching real config structure', () => {
      const config = {
        project: {
          name: 'MDT',
          code: 'MDT',
          path: '.',
          active: true,
          description: '',
          repository: 'https://github.com/example/mdt',
          document: {
            paths: ['docs', 'README.md'],
            excludeFolders: ['node_modules', '.git'],
            maxDepth: 5,
          },
        },
      }

      const result = stringifyAndVerify(config)
      const reparsed = parseToml(result) as typeof config
      expect(reparsed).toEqual(config)
    })
  })

  describe('smol-toml escaping behavior (SEC-001 verification)', () => {
    it('escapes newlines in string values', () => {
      const obj = { section: { value: 'line1\nline2' } }
      const toml = stringify(obj)
      // Newline should be escaped as \n in the TOML, not a literal newline
      expect(toml).not.toContain('value = "line1\nline2"')
      expect(toml).toContain('\\n')

      const reparsed = parseToml(toml) as typeof obj
      expect(reparsed.section.value).toBe('line1\nline2')
    })

    it('escapes injection attempt into single string value', () => {
      const malicious = 'x]\n[injected]\nmalicious = true\nname = "y'
      const obj = { project: { name: malicious } }
      const toml = stringify(obj)
      const reparsed = parseToml(toml) as typeof obj

      // No injected sections
      expect(Object.keys(reparsed)).toEqual(['project'])
      expect(Object.keys(reparsed.project)).toEqual(['name'])
      expect(reparsed.project.name).toBe(malicious)
    })

    it('contains double-quote injection in string value', () => {
      const malicious = 'x\"\ncode = \"INJECTED'
      const obj = { project: { name: malicious } }
      const toml = stringify(obj)
      const reparsed = parseToml(toml) as typeof obj

      expect(Object.keys(reparsed.project)).toEqual(['name'])
      expect(reparsed.project.name).toBe(malicious)
    })
  })
})
