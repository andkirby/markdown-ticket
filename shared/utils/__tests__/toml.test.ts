import { parse, stringify } from '../toml';

describe('TOML Utilities', () => {
  describe('parse', () => {
    it('should parse simple TOML', () => {
      const input = '[project]\nname = "test"\n';
      expect(parse(input)).toEqual({ project: { name: 'test' } });
    });

    it('should handle malformed TOML', () => {
      expect(() => parse('invalid toml [')).toThrow();
    });
  });

  describe('stringify', () => {
    it('should stringify object with strings', () => {
      const input = { section: { name: 'test', path: '/tmp' } };
      const result = stringify(input);
      expect(result).toContain('[section]');
      expect(result).toContain('name = "test"');
    });

    it('should handle different types', () => {
      const input = { config: { enabled: true, count: 42 } };
      const result = stringify(input);
      expect(result).toContain('enabled = true');
      expect(result).toContain('count = 42');
    });

    it('should skip null/undefined values', () => {
      const input = { section: { name: 'test', value: null } };
      const result = stringify(input);
      expect(result).toContain('name = "test"');
      expect(result).not.toContain('value');
    });

    it('should end with single newline', () => {
      const result = stringify({ test: { key: 'value' } });
      expect(result).toMatch(/\n$/);
      expect(result.endsWith('\n\n')).toBe(false);
    });
  });
});