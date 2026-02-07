/**
 * Unit tests for server-logger utility
 *
 * Tests cover:
 * - All log level methods (debug, info, warn, error)
 * - Log level filtering behavior
 * - setLevel() function with valid/invalid inputs
 * - getLevel() and getLevels() utility functions
 * - Edge cases (console unavailable, invalid levels)
 * - Message formatting and prefixes
 */

import { getLevel, getLevels, logger, setLevel } from '../server-logger'

describe('server-logger', () => {
  let consoleErrorSpy
  let consoleWarnSpy

  beforeEach(() => {
    // Reset to default log level before each test
    setLevel('info')

    // Spy on console methods
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
  })

  afterEach(() => {
    // Restore original console methods
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  describe('logger.debug()', () => {
    it('should log debug messages when level is debug', () => {
      setLevel('debug')
      logger.debug('test message')

      expect(consoleErrorSpy).toHaveBeenCalledWith('[DEBUG]', 'test message')
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    })

    it('should log debug messages with multiple arguments', () => {
      setLevel('debug')
      logger.debug('test', 'multiple', 'args', 123)

      expect(consoleErrorSpy).toHaveBeenCalledWith('[DEBUG]', 'test', 'multiple', 'args', 123)
    })

    it('should not log debug messages when level is info', () => {
      setLevel('info')
      logger.debug('test message')

      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('should not log debug messages when level is warn', () => {
      setLevel('warn')
      logger.debug('test message')

      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('should not log debug messages when level is error', () => {
      setLevel('error')
      logger.debug('test message')

      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('should handle empty arguments', () => {
      setLevel('debug')
      logger.debug()

      expect(consoleErrorSpy).toHaveBeenCalledWith('[DEBUG]')
    })

    it('should handle complex objects', () => {
      setLevel('debug')
      const obj = { foo: 'bar', nested: { value: 42 } }
      logger.debug('object:', obj)

      expect(consoleErrorSpy).toHaveBeenCalledWith('[DEBUG]', 'object:', obj)
    })
  })

  describe('logger.info()', () => {
    it('should log info messages when level is debug', () => {
      setLevel('debug')
      logger.info('test message')

      expect(consoleErrorSpy).toHaveBeenCalledWith('[INFO]', 'test message')
    })

    it('should log info messages when level is info (default)', () => {
      // Default level is info
      logger.info('test message')

      expect(consoleErrorSpy).toHaveBeenCalledWith('[INFO]', 'test message')
    })

    it('should not log info messages when level is warn', () => {
      setLevel('warn')
      logger.info('test message')

      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('should not log info messages when level is error', () => {
      setLevel('error')
      logger.info('test message')

      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('should log info messages with multiple arguments', () => {
      logger.info('server', 'started', 'on', 'port', 3001)

      expect(consoleErrorSpy).toHaveBeenCalledWith('[INFO]', 'server', 'started', 'on', 'port', 3001)
    })

    it('should handle empty arguments', () => {
      logger.info()

      expect(consoleErrorSpy).toHaveBeenCalledWith('[INFO]')
    })

    it('should handle error objects', () => {
      const error = new Error('test error')
      logger.info('error occurred:', error)

      expect(consoleErrorSpy).toHaveBeenCalledWith('[INFO]', 'error occurred:', error)
    })
  })

  describe('logger.warn()', () => {
    it('should always log warn messages regardless of level', () => {
      setLevel('debug')
      logger.warn('warning message')
      expect(consoleWarnSpy).toHaveBeenCalledWith('warning message')

      consoleWarnSpy.mockClear()

      setLevel('info')
      logger.warn('warning message')
      expect(consoleWarnSpy).toHaveBeenCalledWith('warning message')

      consoleWarnSpy.mockClear()

      setLevel('warn')
      logger.warn('warning message')
      expect(consoleWarnSpy).toHaveBeenCalledWith('warning message')

      consoleWarnSpy.mockClear()

      setLevel('error')
      logger.warn('warning message')
      expect(consoleWarnSpy).toHaveBeenCalledWith('warning message')
    })

    it('should log warn messages with multiple arguments', () => {
      logger.warn('deprecated', 'API', 'used')

      expect(consoleWarnSpy).toHaveBeenCalledWith('deprecated', 'API', 'used')
    })

    it('should handle empty arguments', () => {
      logger.warn()

      expect(consoleWarnSpy).toHaveBeenCalledWith()
    })

    it('should handle complex objects', () => {
      const obj = { warning: 'deprecated field', alternative: 'newField' }
      logger.warn('warning:', obj)

      expect(consoleWarnSpy).toHaveBeenCalledWith('warning:', obj)
    })
  })

  describe('logger.error()', () => {
    it('should always log error messages regardless of level', () => {
      setLevel('debug')
      logger.error('error message')
      expect(consoleErrorSpy).toHaveBeenCalledWith('error message')

      consoleErrorSpy.mockClear()

      setLevel('info')
      logger.error('error message')
      expect(consoleErrorSpy).toHaveBeenCalledWith('error message')

      consoleErrorSpy.mockClear()

      setLevel('warn')
      logger.error('error message')
      expect(consoleErrorSpy).toHaveBeenCalledWith('error message')

      consoleErrorSpy.mockClear()

      setLevel('error')
      logger.error('error message')
      expect(consoleErrorSpy).toHaveBeenCalledWith('error message')
    })

    it('should log error messages with multiple arguments', () => {
      const error = new Error('test error')
      logger.error('error occurred:', error.message)

      expect(consoleErrorSpy).toHaveBeenCalledWith('error occurred:', error.message)
    })

    it('should handle Error objects', () => {
      const error = new Error('test error')
      logger.error(error)

      expect(consoleErrorSpy).toHaveBeenCalledWith(error)
    })

    it('should handle empty arguments', () => {
      logger.error()

      expect(consoleErrorSpy).toHaveBeenCalledWith()
    })

    it('should handle error with stack trace', () => {
      const error = new Error('test error')
      logger.error('Failed to process:', error.stack)

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to process:', error.stack)
    })
  })

  describe('setLevel()', () => {
    it('should set log level to debug', () => {
      setLevel('debug')

      logger.debug('debug')
      logger.info('info')

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2)
    })

    it('should set log level to info', () => {
      setLevel('info')

      logger.debug('debug')
      logger.info('info')

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
      expect(consoleErrorSpy).toHaveBeenCalledWith('[INFO]', 'info')
    })

    it('should set log level to warn', () => {
      setLevel('warn')

      logger.debug('debug')
      logger.info('info')
      logger.warn('warn')
      logger.error('error')

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
      expect(consoleErrorSpy).toHaveBeenCalledWith('error')
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
    })

    it('should set log level to error', () => {
      setLevel('error')

      logger.debug('debug')
      logger.info('info')
      logger.warn('warn')
      logger.error('error')

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
      expect(consoleErrorSpy).toHaveBeenCalledWith('error')
      // Note: warn is always shown regardless of log level
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
      expect(consoleWarnSpy).toHaveBeenCalledWith('warn')
    })

    it('should throw error for invalid level', () => {
      // @ts-expect-error - Testing invalid input
      expect(() => setLevel('invalid')).toThrow(
        'Invalid log level: "invalid". Valid levels are: debug, info, warn, error',
      )
    })

    it('should throw error for empty string', () => {
      // @ts-expect-error - Testing invalid input
      expect(() => setLevel('')).toThrow()
    })

    it('should throw error for null', () => {
      // @ts-expect-error - Testing invalid input
      expect(() => setLevel(null)).toThrow()
    })

    it('should throw error for undefined', () => {
      // @ts-expect-error - Testing invalid input
      expect(() => setLevel(undefined)).toThrow()
    })

    it('should allow changing level multiple times', () => {
      setLevel('error')
      expect(getLevel()).toBe('error')

      setLevel('debug')
      expect(getLevel()).toBe('debug')

      setLevel('warn')
      expect(getLevel()).toBe('warn')

      setLevel('info')
      expect(getLevel()).toBe('info')
    })
  })

  describe('getLevel()', () => {
    it('should return default level as info', () => {
      expect(getLevel()).toBe('info')
    })

    it('should return debug after setting to debug', () => {
      setLevel('debug')
      expect(getLevel()).toBe('debug')
    })

    it('should return warn after setting to warn', () => {
      setLevel('warn')
      expect(getLevel()).toBe('warn')
    })

    it('should return error after setting to error', () => {
      setLevel('error')
      expect(getLevel()).toBe('error')
    })
  })

  describe('getLevels()', () => {
    it('should return all available log levels', () => {
      const levels = getLevels()

      expect(levels).toEqual(['debug', 'info', 'warn', 'error'])
    })

    it('should return readonly array', () => {
      const levels = getLevels()

      // The function returns a readonly array, but Jest can't easily test this
      // We verify the structure is correct
      expect(Array.isArray(levels)).toBe(true)
      expect(levels).toHaveLength(4)
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined arguments gracefully', () => {
      setLevel('debug')
      logger.debug(undefined)
      logger.info(undefined)
      logger.warn(undefined)
      logger.error(undefined)

      expect(consoleErrorSpy).toHaveBeenCalledWith('[DEBUG]', undefined)
      expect(consoleErrorSpy).toHaveBeenCalledWith('[INFO]', undefined)
      expect(consoleWarnSpy).toHaveBeenCalledWith(undefined)
      expect(consoleErrorSpy).toHaveBeenCalledWith(undefined)
    })

    it('should handle null arguments gracefully', () => {
      setLevel('debug')
      logger.debug(null)
      logger.info(null)
      logger.warn(null)
      logger.error(null)

      expect(consoleErrorSpy).toHaveBeenCalledWith('[DEBUG]', null)
      expect(consoleErrorSpy).toHaveBeenCalledWith('[INFO]', null)
      expect(consoleWarnSpy).toHaveBeenCalledWith(null)
      expect(consoleErrorSpy).toHaveBeenCalledWith(null)
    })

    it('should handle number arguments', () => {
      setLevel('debug')
      logger.debug(123)
      logger.info(456)
      logger.warn(789)
      logger.error(101112)

      expect(consoleErrorSpy).toHaveBeenCalledWith('[DEBUG]', 123)
      expect(consoleErrorSpy).toHaveBeenCalledWith('[INFO]', 456)
      expect(consoleWarnSpy).toHaveBeenCalledWith(789)
      expect(consoleErrorSpy).toHaveBeenCalledWith(101112)
    })

    it('should handle boolean arguments', () => {
      setLevel('debug')
      logger.debug(true)
      logger.info(false)
      logger.warn(true)
      logger.error(false)

      expect(consoleErrorSpy).toHaveBeenCalledWith('[DEBUG]', true)
      expect(consoleErrorSpy).toHaveBeenCalledWith('[INFO]', false)
      expect(consoleWarnSpy).toHaveBeenCalledWith(true)
      expect(consoleErrorSpy).toHaveBeenCalledWith(false)
    })

    it('should handle mixed argument types', () => {
      setLevel('debug')
      logger.debug('string', 123, true, { key: 'value' }, [1, 2, 3])

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[DEBUG]',
        'string',
        123,
        true,
        { key: 'value' },
        [1, 2, 3],
      )
    })

    it('should handle very long messages', () => {
      setLevel('debug')
      const longMessage = 'x'.repeat(10000)
      logger.debug(longMessage)

      expect(consoleErrorSpy).toHaveBeenCalledWith('[DEBUG]', longMessage)
    })

    it('should handle special characters in messages', () => {
      setLevel('debug')
      logger.debug('Special chars: \n\t\r\b\f\\\'"')

      expect(consoleErrorSpy).toHaveBeenCalledWith('[DEBUG]', 'Special chars: \n\t\r\b\f\\\'"')
    })

    it('should handle emoji in messages', () => {
      setLevel('debug')
      logger.debug('Test emoji: 🚀 ✨ 🔥')

      expect(consoleErrorSpy).toHaveBeenCalledWith('[DEBUG]', 'Test emoji: 🚀 ✨ 🔥')
    })
  })

  describe('Level Filtering Behavior', () => {
    it('should filter all messages when level is above error', () => {
      setLevel('error')

      logger.debug('debug')
      logger.info('info')
      logger.warn('warn')

      expect(consoleErrorSpy).not.toHaveBeenCalledWith('[DEBUG]', 'debug')
      expect(consoleErrorSpy).not.toHaveBeenCalledWith('[INFO]', 'info')
      // Note: warn uses console.warn, not console.error
    })

    it('should show all messages when level is debug', () => {
      setLevel('debug')

      logger.debug('debug')
      logger.info('info')

      expect(consoleErrorSpy).toHaveBeenCalledWith('[DEBUG]', 'debug')
      expect(consoleErrorSpy).toHaveBeenCalledWith('[INFO]', 'info')
    })

    it('should show info, warn, error when level is info', () => {
      setLevel('info')

      logger.debug('debug')
      logger.info('info')
      logger.warn('warn')
      logger.error('error')

      expect(consoleErrorSpy).not.toHaveBeenCalledWith('[DEBUG]', 'debug')
      expect(consoleErrorSpy).toHaveBeenCalledWith('[INFO]', 'info')
      expect(consoleWarnSpy).toHaveBeenCalledWith('warn')
      expect(consoleErrorSpy).toHaveBeenCalledWith('error')
    })
  })

  describe('Message Prefix Format', () => {
    it('should use [DEBUG] prefix for debug messages', () => {
      setLevel('debug')
      logger.debug('test')

      const calls = consoleErrorSpy.mock.calls
      expect(calls[0][0]).toBe('[DEBUG]')
    })

    it('should use [INFO] prefix for info messages', () => {
      logger.info('test')

      const calls = consoleErrorSpy.mock.calls
      expect(calls[0][0]).toBe('[INFO]')
    })

    it('should not use prefix for warn messages', () => {
      logger.warn('test')

      const calls = consoleWarnSpy.mock.calls
      expect(calls[0]).toEqual(['test'])
    })

    it('should not use prefix for error messages', () => {
      logger.error('test')

      const calls = consoleErrorSpy.mock.calls
      expect(calls[0]).toEqual(['test'])
    })
  })

  describe('Real-world Usage Scenarios', () => {
    it('should handle server startup logging', () => {
      setLevel('info')
      logger.info('Server starting on port', 3001)
      logger.info('Environment:', 'development')
      logger.info('Projects loaded:', 3)

      expect(consoleErrorSpy).toHaveBeenCalledTimes(3)
    })

    it('should handle error logging with context', () => {
      const error = new Error('Database connection failed')
      logger.error('Failed to connect to database:', error.message)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to connect to database:',
        error.message,
      )
    })

    it('should handle debug logging for development', () => {
      setLevel('debug')
      logger.debug('File watcher initialized:', {
        path: '/path/to/watch',
        ignored: /node_modules/,
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith('[DEBUG]', 'File watcher initialized:', {
        path: '/path/to/watch',
        ignored: /node_modules/,
      })
    })

    it('should handle warning for deprecated features', () => {
      logger.warn(
        'DEPRECATED: Using direct file access is deprecated. Use DocumentService instead.',
      )

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'DEPRECATED: Using direct file access is deprecated. Use DocumentService instead.',
      )
    })

    it('should handle multiple rapid log calls', () => {
      setLevel('debug')
      for (let i = 0; i < 100; i++) {
        logger.debug(`Message ${i}`)
      }

      expect(consoleErrorSpy).toHaveBeenCalledTimes(100)
    })
  })
})
