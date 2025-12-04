import { validateConfig, migrateConfig, processConfig, getDefaultConfig } from '../config-validator';

describe('Config Validator', () => {
  describe('validateConfig', () => {
    it('should return defaults for empty config', () => {
      const result = validateConfig({});
      expect(result.discovery.autoDiscover).toBe(true);
      expect(result.links.enableTicketLinks).toBe(true);
    });

    it('should validate boolean fields', () => {
      const config = {
        discovery: { autoDiscover: false },
        links: { enableAutoLinking: false }
      };
      const result = validateConfig(config);
      expect(result.discovery.autoDiscover).toBe(false);
      expect(result.links.enableAutoLinking).toBe(false);
    });

    it('should validate enum fields', () => {
      const config = {
        ui: { theme: 'dark' },
        system: { logLevel: 'debug' }
      };
      const result = validateConfig(config);
      expect(result.ui!.theme).toBe('dark');
      expect(result.system!.logLevel).toBe('debug');
    });

    it('should fallback for invalid enum values', () => {
      const config = {
        ui: { theme: 'invalid' },
        system: { logLevel: 'invalid' }
      };
      const result = validateConfig(config);
      expect(result.ui!.theme).toBe('auto');
      expect(result.system!.logLevel).toBe('info');
    });
  });

  describe('migrateConfig', () => {
    it('should migrate from old dashboard structure', () => {
      const oldConfig = {
        dashboard: { autoRefresh: false, refreshInterval: 10000 }
      };
      const result = migrateConfig(oldConfig);
      expect(result.ui!.autoRefresh).toBe(false);
      expect(result.ui!.refreshInterval).toBe(10000);
    });
  });

  describe('processConfig', () => {
    it('should detect old config and migrate', () => {
      const config = { dashboard: { autoRefresh: true } };
      const result = processConfig(config);
      expect(result.ui!.autoRefresh).toBe(true);
    });

    it('should validate new config structure', () => {
      const config = { discovery: { autoDiscover: false } };
      const result = processConfig(config);
      expect(result.discovery.autoDiscover).toBe(false);
    });
  });

  describe('getDefaultConfig', () => {
    it('should return default configuration', () => {
      const config = getDefaultConfig();
      expect(config.discovery.autoDiscover).toBe(true);
      expect(config.links.enableTicketLinks).toBe(true);
      expect(config.ui!.theme).toBe('auto');
    });
  });
});