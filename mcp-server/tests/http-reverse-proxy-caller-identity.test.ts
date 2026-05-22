/// <reference types="jest" />

import type { Request } from 'express'
import { getCallerIdentity } from '../src/transports/httpSecurity'

describe('MCP reverse proxy caller identity', () => {
  it('uses forwarded address and host/proto for anonymous callers', () => {
    const req = {
      headers: {
        origin: 'https://app.example.com',
      },
      ip: '203.0.113.10',
      protocol: 'https',
      hostname: 'mcp.example.com',
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request

    expect(getCallerIdentity(req)).toBe('anon:203.0.113.10')
  })

  it('ignores spoofed forwarded headers when Express has not trusted them', () => {
    const req = {
      headers: {
        origin: 'https://app.example.com',
        'x-forwarded-for': '203.0.113.99',
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'spoofed.example.com',
        host: 'mcp.local',
      },
      ip: '127.0.0.1',
      protocol: 'http',
      hostname: 'mcp.local',
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request

    expect(getCallerIdentity(req)).toBe('anon:127.0.0.1')
  })

  it('ignores client-controlled origin and host for anonymous caller buckets', () => {
    const firstRequest = {
      headers: {
        origin: 'https://first.example.com',
        host: 'first.example.com',
      },
      ip: '203.0.113.10',
      protocol: 'https',
      hostname: 'first.example.com',
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request
    const secondRequest = {
      headers: {
        origin: 'https://second.example.com',
        host: 'second.example.com',
      },
      ip: '203.0.113.10',
      protocol: 'https',
      hostname: 'second.example.com',
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request

    expect(getCallerIdentity(firstRequest)).toBe(getCallerIdentity(secondRequest))
  })

  it('uses hashed authorization identity when available', () => {
    const req = {
      headers: {
        authorization: 'Bearer secret',
      },
      ip: '203.0.113.10',
      protocol: 'http',
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request

    expect(getCallerIdentity(req)).toMatch(/^auth:[a-f0-9]{64}:203\.0\.113\.10$/)
  })
})
