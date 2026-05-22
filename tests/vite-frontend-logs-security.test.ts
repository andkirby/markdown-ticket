import { describe, expect, test } from 'bun:test'
import {
  isLocalFrontendLoggingRequest,
  isLoopbackAddress,
  parseFrontendLogsRequestBody,
  rejectNonLocalFrontendLoggingRequest,
} from '../vite.config'

function makeRequest(remoteAddress: string, headers: Record<string, string> = {}) {
  return {
    headers,
    socket: { remoteAddress },
  }
}

function makeResponse() {
  const headers = new Map<string, string>()
  let body = ''

  return {
    res: {
      statusCode: 200,
      setHeader(name: string, value: string) {
        headers.set(name, value)
      },
      end(value = '') {
        body = value
      },
    },
    get headers() {
      return headers
    },
    get body() {
      return body
    },
  }
}

describe('Vite frontend logging localhost boundary - MDT-157 UAT', () => {
  test('accepts loopback addresses used by local dev and E2E', () => {
    expect(isLoopbackAddress('127.0.0.1')).toBe(true)
    expect(isLoopbackAddress('127.2.3.4')).toBe(true)
    expect(isLoopbackAddress('::1')).toBe(true)
    expect(isLoopbackAddress('0:0:0:0:0:0:0:1')).toBe(true)
    expect(isLoopbackAddress('::ffff:127.0.0.1')).toBe(true)
    expect(isLocalFrontendLoggingRequest(makeRequest('::1'))).toBe(true)
  })

  test('rejects non-loopback callers before endpoint handling', () => {
    const response = makeResponse()
    const rejected = rejectNonLocalFrontendLoggingRequest(makeRequest('192.168.0.42'), response.res)

    expect(rejected).toBe(true)
    expect(response.res.statusCode).toBe(403)
    expect(response.headers.get('Content-Type')).toBe('application/json')
    expect(JSON.parse(response.body)).toEqual({ error: 'Forbidden' })
  })

  test('does not trust spoofed forwarded headers as localhost identity', () => {
    const request = makeRequest('203.0.113.10', {
      'x-forwarded-for': '127.0.0.1',
      'x-real-ip': '127.0.0.1',
      host: 'localhost:5173',
    })

    expect(isLocalFrontendLoggingRequest(request)).toBe(false)
  })

  test('parses valid frontend log payloads and flags malformed JSON', () => {
    expect(parseFrontendLogsRequestBody('{"logs":[{"level":"info","message":"ok"}]}')).toEqual({
      ok: true,
      logs: [{ level: 'info', message: 'ok' }],
    })
    expect(parseFrontendLogsRequestBody('{bad json')).toEqual({ ok: false })
  })
})
