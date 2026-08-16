/**
 * Unit Tests for env parsing utilities (MDT-117)
 *
 * Covers the centralized numeric env parsing and the deprecation-aware port
 * resolver, including the explicit-source (*From) variants used by callers
 * that receive an env object instead of reading process.env directly.
 */

import { parseEnvInt, parseEnvIntFrom, parsePortEnv, parsePortEnvFrom } from '../env'

describe('parseEnvInt', () => {
  it('returns the parsed integer when set', () => {
    expect(parseEnvIntFrom({ TEST_VALUE: '42' } as NodeJS.ProcessEnv, 'TEST_VALUE', 7)).toBe(42)
  })

  it('returns the default when unset', () => {
    expect(parseEnvIntFrom({} as NodeJS.ProcessEnv, 'TEST_VALUE', 7)).toBe(7)
  })

  it('treats an empty string the same as unset', () => {
    expect(parseEnvIntFrom({ TEST_VALUE: '' } as NodeJS.ProcessEnv, 'TEST_VALUE', 7)).toBe(7)
  })

  it('falls back to the default on NaN', () => {
    expect(parseEnvIntFrom({ TEST_VALUE: 'not-a-number' } as NodeJS.ProcessEnv, 'TEST_VALUE', 7)).toBe(7)
  })

  it('reads process.env through the wrapper', () => {
    process.env.MDT_TEST_PARSE_ENV_INT = '17'
    try {
      expect(parseEnvInt('MDT_TEST_PARSE_ENV_INT', 1)).toBe(17)
    }
    finally {
      delete process.env.MDT_TEST_PARSE_ENV_INT
    }
  })
})

describe('parsePortEnvFrom', () => {
  it('uses the primary variable when set', () => {
    expect(parsePortEnvFrom({ MCP_HTTP_PORT: '3010' } as NodeJS.ProcessEnv, 'MCP_HTTP_PORT', 'HTTP_PORT', 3002)).toBe(3010)
  })

  it('returns the default when neither variable is set', () => {
    expect(parsePortEnvFrom({} as NodeJS.ProcessEnv, 'MCP_HTTP_PORT', 'HTTP_PORT', 3002)).toBe(3002)
  })

  it('falls back to the default when the primary value is not numeric', () => {
    expect(parsePortEnvFrom({ MCP_HTTP_PORT: 'oops' } as NodeJS.ProcessEnv, 'MCP_HTTP_PORT', 'HTTP_PORT', 3002)).toBe(3002)
  })

  it('warns and uses the deprecated variable when the primary is unset', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    try {
      expect(parsePortEnvFrom({ HTTP_PORT: '3011' } as NodeJS.ProcessEnv, 'MCP_HTTP_PORT', 'HTTP_PORT', 3002)).toBe(3011)
      expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/deprecated.*use.*MCP_HTTP_PORT/))
    }
    finally {
      warnSpy.mockRestore()
    }
  })

  it('prefers the primary over the deprecated variable without warning', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    try {
      expect(
        parsePortEnvFrom(
          { MCP_HTTP_PORT: '3012', HTTP_PORT: '3013' } as NodeJS.ProcessEnv,
          'MCP_HTTP_PORT',
          'HTTP_PORT',
          3002,
        ),
      ).toBe(3012)
      expect(warnSpy).not.toHaveBeenCalled()
    }
    finally {
      warnSpy.mockRestore()
    }
  })

  it('ignores the deprecated variable when it is empty', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    try {
      expect(parsePortEnvFrom({ HTTP_PORT: '' } as NodeJS.ProcessEnv, 'MCP_HTTP_PORT', 'HTTP_PORT', 3002)).toBe(3002)
      expect(warnSpy).not.toHaveBeenCalled()
    }
    finally {
      warnSpy.mockRestore()
    }
  })

  it('reads process.env through the parsePortEnv wrapper', () => {
    process.env.MDT_TEST_PRIMARY_PORT = '3014'
    try {
      expect(parsePortEnv('MDT_TEST_PRIMARY_PORT', undefined, 3002)).toBe(3014)
    }
    finally {
      delete process.env.MDT_TEST_PRIMARY_PORT
    }
  })
})
