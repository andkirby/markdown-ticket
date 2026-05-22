/// <reference types="jest" />

import { parseHttpTransportConfig, validateHttpTransportConfig } from '../src/transports/httpSecurity'

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

  it('does not trust reverse proxy headers unless explicitly configured', () => {
    expect(parseHttpTransportConfig({} as NodeJS.ProcessEnv).trustProxy).toBe(false)
    expect(parseHttpTransportConfig({ MCP_TRUST_PROXY: '1' } as NodeJS.ProcessEnv).trustProxy).toBe(1)
    expect(parseHttpTransportConfig({ MCP_TRUST_PROXY: 'loopback, linklocal' } as NodeJS.ProcessEnv).trustProxy).toEqual(['loopback', 'linklocal'])
  })
})
