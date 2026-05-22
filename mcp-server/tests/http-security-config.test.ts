/// <reference types="jest" />

import { readFileSync } from 'node:fs'
import { parseHttpTransportConfig, validateHttpTransportConfig } from '../src/transports/httpSecurity'
import { selectMcpTransport } from '../src/transports/transportSelection'

describe('MCP HTTP security config', () => {
  it('enables origin validation and rate limiting by default in production', () => {
    const config = parseHttpTransportConfig({
      NODE_ENV: 'production',
      MCP_ALLOWED_ORIGINS: 'https://app.example.com',
    } as NodeJS.ProcessEnv)

    expect(config.enableOriginValidation).toBe(true)
    expect(config.allowedOrigins).toEqual(['https://app.example.com'])
    expect(config.enableRateLimiting).toBe(true)
  })

  it('fails startup config when origin validation has no allowed origins', () => {
    expect(() => parseHttpTransportConfig({
      NODE_ENV: 'production',
      MCP_SECURITY_ORIGIN_VALIDATION: 'true',
      MCP_ALLOWED_ORIGINS: '',
    } as NodeJS.ProcessEnv)).toThrow(/MCP_ALLOWED_ORIGINS/)

    expect(() => validateHttpTransportConfig({
      port: 3002,
      enableOriginValidation: true,
      allowedOrigins: [],
    })).toThrow(/MCP_ALLOWED_ORIGINS/)
  })

  it('fails startup config when auth is enabled without a token', () => {
    expect(() => parseHttpTransportConfig({
      MCP_SECURITY_AUTH: 'true',
    } as NodeJS.ProcessEnv)).toThrow(/MCP_AUTH_TOKEN/)

    expect(() => validateHttpTransportConfig({
      port: 3002,
      enableAuth: true,
    })).toThrow(/MCP_AUTH_TOKEN/)
  })

  it('enables MCP HTTP auth when configured with MCP_AUTH_TOKEN', () => {
    const config = parseHttpTransportConfig({
      MCP_SECURITY_AUTH: 'true',
      MCP_AUTH_TOKEN: 'expected-token',
    } as NodeJS.ProcessEnv)

    expect(config.enableAuth).toBe(true)
    expect(config.authToken).toBe('expected-token')
  })

  it('keeps stdio-compatible defaults independent from HTTP auth settings', () => {
    const config = parseHttpTransportConfig({ NODE_ENV: 'test' } as NodeJS.ProcessEnv)

    expect(config.enableAuth).toBe(false)
    expect(config.authToken).toBeUndefined()
  })

  it('selects stdio without requiring MCP auth env when HTTP transport is not enabled', () => {
    const selection = selectMcpTransport({
      NODE_ENV: 'production',
      MCP_SECURITY_AUTH: 'true',
    } as NodeJS.ProcessEnv)

    expect(selection.mode).toBe('stdio')
    expect(selection.httpConfig).toBeUndefined()
  })

  it('entrypoint uses transport selection seam for stdio independence', () => {
    const entrypoint = readFileSync('src/index.ts', 'utf8')

    expect(entrypoint).toContain('selectMcpTransport(process.env)')
    expect(entrypoint).not.toContain('parseHttpTransportConfig(process.env)')
  })

  it('emits migration warning for legacy MCP HTTP no-auth outside production Docker auth default', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)

    try {
      const config = parseHttpTransportConfig({
        NODE_ENV: 'production',
        MCP_HTTP_ENABLED: 'true',
        MCP_SECURITY_ORIGIN_VALIDATION: 'false',
      } as NodeJS.ProcessEnv)

      expect(config).toMatchObject({
        enableAuth: false,
        authMigrationWarningRequired: true,
      })
      expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/auth|MCP_SECURITY_AUTH|MCP_AUTH_TOKEN|migration/i))
    }
    finally {
      warnSpy.mockRestore()
    }
  })

  it('production Docker default env requires MCP_AUTH_TOKEN when auth is on', () => {
    expect(() => parseHttpTransportConfig({
      NODE_ENV: 'production',
      MCP_HTTP_ENABLED: 'true',
      MCP_SECURITY_AUTH: 'true',
      MCP_SECURITY_ORIGIN_VALIDATION: 'false',
    } as NodeJS.ProcessEnv)).toThrow(/MCP_AUTH_TOKEN/)

    const config = parseHttpTransportConfig({
      NODE_ENV: 'production',
      MCP_HTTP_ENABLED: 'true',
      MCP_SECURITY_AUTH: 'true',
      MCP_AUTH_TOKEN: 'expected-token',
      MCP_SECURITY_ORIGIN_VALIDATION: 'false',
    } as NodeJS.ProcessEnv)

    expect(config.enableAuth).toBe(true)
    expect(config.authToken).toBe('expected-token')
    expect(config.authMigrationWarningRequired).toBe(false)
  })

  it('does not trust reverse proxy headers unless explicitly configured', () => {
    expect(parseHttpTransportConfig({} as NodeJS.ProcessEnv).trustProxy).toBe(false)
    expect(parseHttpTransportConfig({ MCP_TRUST_PROXY: '1' } as NodeJS.ProcessEnv).trustProxy).toBe(1)
    expect(parseHttpTransportConfig({ MCP_TRUST_PROXY: 'loopback, linklocal' } as NodeJS.ProcessEnv).trustProxy).toEqual(['loopback', 'linklocal'])
  })
})
