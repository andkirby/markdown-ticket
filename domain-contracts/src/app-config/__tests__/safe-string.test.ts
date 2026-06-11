import {
  SafeConfigStringOptionalSchema,
  SafeConfigStringSchema,
  SafeConfigPathStringSchema,
} from '../schema.js'

describe('SEC-001: SafeConfigStringSchema', () => {
  describe('SafeConfigStringSchema', () => {
    it('accepts normal strings', () => {
      expect(SafeConfigStringSchema.parse('My Project')).toBe('My Project')
      expect(SafeConfigStringSchema.parse('Hello World!')).toBe('Hello World!')
    })

    it('accepts strings with TOML-safe special characters', () => {
      expect(SafeConfigStringSchema.parse('key = value')).toBe('key = value')
      expect(SafeConfigStringSchema.parse('val # comment')).toBe('val # comment')
      expect(SafeConfigStringSchema.parse('[[array]]')).toBe('[[array]]')
      expect(SafeConfigStringSchema.parse('say "hi"')).toBe('say "hi"')
      expect(SafeConfigStringSchema.parse('C:\\Users')).toBe('C:\\Users')
    })

    it('accepts unicode strings', () => {
      expect(SafeConfigStringSchema.parse('Projét 日本語')).toBe('Projét 日本語')
    })

    it('rejects empty strings', () => {
      const result = SafeConfigStringSchema.safeParse('')
      expect(result.success).toBe(false)
    })

    it('rejects strings with newlines', () => {
      const result = SafeConfigStringSchema.safeParse('hello\nworld')
      expect(result.success).toBe(false)
    })

    it('rejects strings with carriage returns', () => {
      const result = SafeConfigStringSchema.safeParse('hello\rworld')
      expect(result.success).toBe(false)
    })

    it('rejects strings with null bytes', () => {
      const result = SafeConfigStringSchema.safeParse('hello\0world')
      expect(result.success).toBe(false)
    })

    it('rejects strings with other control characters', () => {
      const result = SafeConfigStringSchema.safeParse('hello\x01world')
      expect(result.success).toBe(false)
    })

    it('rejects strings with tab characters', () => {
      // Tab is \x09 — falls in the control character range
      const result = SafeConfigStringSchema.safeParse('hello\tworld')
      expect(result.success).toBe(false)
    })

    it('rejects strings exceeding 512 characters', () => {
      const result = SafeConfigStringSchema.safeParse('a'.repeat(513))
      expect(result.success).toBe(false)
    })

    it('accepts strings at exactly 512 characters', () => {
      const result = SafeConfigStringSchema.safeParse('a'.repeat(512))
      expect(result.success).toBe(true)
    })

    it('rejects injection attempt with section break', () => {
      const result = SafeConfigStringSchema.safeParse('x]\n[injected]\nmalicious = true')
      expect(result.success).toBe(false)
    })
  })

  describe('SafeConfigStringOptionalSchema', () => {
    it('accepts normal non-empty strings', () => {
      expect(SafeConfigStringOptionalSchema.parse('description')).toBe('description')
    })

    it('accepts empty strings', () => {
      expect(SafeConfigStringOptionalSchema.parse('')).toBe('')
    })

    it('rejects strings with newlines', () => {
      const result = SafeConfigStringOptionalSchema.safeParse('hello\nworld')
      expect(result.success).toBe(false)
    })
  })

  describe('SafeConfigPathStringSchema', () => {
    it('accepts normal path strings', () => {
      expect(SafeConfigPathStringSchema.parse('/home/user')).toBe('/home/user')
      expect(SafeConfigPathStringSchema.parse('docs')).toBe('docs')
    })

    it('accepts paths with forward slashes', () => {
      expect(SafeConfigPathStringSchema.parse('/usr/local/bin')).toBe('/usr/local/bin')
    })

    it('rejects empty strings', () => {
      const result = SafeConfigPathStringSchema.safeParse('')
      expect(result.success).toBe(false)
    })

    it('rejects strings with newlines', () => {
      const result = SafeConfigPathStringSchema.safeParse('/home\nuser')
      expect(result.success).toBe(false)
    })

    it('rejects strings with null bytes', () => {
      const result = SafeConfigPathStringSchema.safeParse('/home\0user')
      expect(result.success).toBe(false)
    })

    it('rejects strings with carriage returns', () => {
      const result = SafeConfigPathStringSchema.safeParse('/home\ruser')
      expect(result.success).toBe(false)
    })

    it('rejects strings exceeding 1024 characters', () => {
      const result = SafeConfigPathStringSchema.safeParse('/'.repeat(1025))
      expect(result.success).toBe(false)
    })
  })
})
