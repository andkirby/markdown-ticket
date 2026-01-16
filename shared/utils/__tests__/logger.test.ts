import { createQuietLogger, logQuiet } from '../logger'

describe('logger', () => {
  let stderrSpy: jest.SpyInstance

  beforeEach(() => {
    stderrSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    stderrSpy.mockRestore()
  })

  describe('logQuiet', () => {
    it('should log to stderr when quiet is false', () => {
      logQuiet(false, 'Test message', { data: 'test' })
      expect(stderrSpy).toHaveBeenCalledWith('Test message', { data: 'test' })
    })

    it('should not log when quiet is true', () => {
      logQuiet(true, 'Test message')
      expect(stderrSpy).not.toHaveBeenCalled()
    })

    it('should handle multiple arguments', () => {
      logQuiet(false, 'Message', 'arg1', 'arg2', 123)
      expect(stderrSpy).toHaveBeenCalledWith('Message', 'arg1', 'arg2', 123)
    })
  })

  describe('createQuietLogger', () => {
    it('should create logger with default quiet=false', () => {
      const logger = createQuietLogger()
      logger('Test')
      expect(stderrSpy).toHaveBeenCalledWith('Test')
    })

    it('should create logger with quiet=true', () => {
      const logger = createQuietLogger(true)
      logger('Test')
      expect(stderrSpy).not.toHaveBeenCalled()
    })

    it('should pass through all arguments', () => {
      const logger = createQuietLogger(false)
      logger('Message', { obj: true }, 42)
      expect(stderrSpy).toHaveBeenCalledWith('Message', { obj: true }, 42)
    })
  })
})
