import { getDefaultConfig, migrateConfig, processConfig, validateConfig } from '../config-validator'

describe('config Validator', () => {
  describe('validateConfig', () => {
    it('should return defaults for empty config', () => {
      const result = validateConfig({})
      expect(result.discovery.autoDiscover).toBe(true)
      expect(result.links.enableTicketLinks).toBe(true)
    })

    it('should validate boolean fields', () => {
      const config = {
        discovery: { autoDiscover: false },
        links: { enableAutoLinking: false },
      }
      const result = validateConfig(config)
      expect(result.discovery.autoDiscover).toBe(false)
      expect(result.links.enableAutoLinking).toBe(false)
    })

    it('should validate enum fields', () => {
      const config = {
        system: { logLevel: 'debug' },
      }
      const result = validateConfig(config)
      expect(result.system!.logLevel).toBe('debug')
    })

    it('should fallback for invalid enum values', () => {
      const config = {
        system: { logLevel: 'invalid' },
      }
      const result = validateConfig(config)
      expect(result.system!.logLevel).toBe('info')
    })
  })

  describe('migrateConfig', () => {
    it('should migrate from old dashboard structure', () => {
      const oldConfig = {
        dashboard: { autoRefresh: false, refreshInterval: 10000 },
      }
      const result = migrateConfig(oldConfig)
      expect(result.links.enableAutoLinking).toBe(false)
    })
  })

  describe('processConfig', () => {
    it('should detect old config and migrate', () => {
      const config = { dashboard: { autoRefresh: true } }
      const result = processConfig(config)
      expect(result.links.enableAutoLinking).toBe(true)
    })

    it('should validate new config structure', () => {
      const config = { discovery: { autoDiscover: false } }
      const result = processConfig(config)
      expect(result.discovery.autoDiscover).toBe(false)
    })
  })

  describe('getDefaultConfig', () => {
    it('should return default configuration', () => {
      const config = getDefaultConfig()
      expect(config.discovery.autoDiscover).toBe(true)
      expect(config.links.enableTicketLinks).toBe(true)
    })
  })
})
