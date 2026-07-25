import type { CloudPrincipal } from '@mdt/domain-contracts'
import { CoordinationError } from '@mdt/domain-contracts'
import { describe, expect, mock, test } from 'bun:test'
import { CoordinationRouter } from '../src/cloudflare/http/router'

const principal: CloudPrincipal = { kind: 'human', id: 'owner@example.com', display: 'owner@example.com' }
const validator = {
  validate: mock(() => Promise.resolve(principal)),
} as unknown as import('../src/cloudflare/access/jwt').AccessValidator

function request(method: string): Request {
  return new Request('https://coord.example.com/v1/projects/p1/test', {
    method,
    headers: { 'Cf-Access-Jwt-Assertion': 'assertion' },
  })
}

describe('coordination router contract', () => {
  test('matches both method and path', async () => {
    const router = new CoordinationRouter(validator, {} as never)
    router.coordination('GET', /^\/v1\/projects\/(?<projectId>[^/]+)\/test$/, async () => new Response('{}'))

    expect((await router.handle(request('GET'))).status).toBe(200)
    expect((await router.handle(request('POST'))).status).toBe(400)
  })

  test('returns the canonical nested error envelope', async () => {
    const router = new CoordinationRouter(validator, {} as never)
    router.coordination('GET', /^\/v1\/projects\/(?<projectId>[^/]+)\/test$/, async (ctx) => {
      throw new CoordinationError('projection_version_conflict', {
        requestId: ctx.requestId,
        message: 'Projection version does not match.',
        currentVersion: 7,
      })
    })

    const response = await router.handle(request('GET'))
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: {
        code: 'projection_version_conflict',
        message: 'Projection version does not match.',
        requestId: expect.any(String),
        retryable: false,
        currentVersion: 7,
      },
    })
  })

  test('maps an unexpected handler failure to recoverable unavailability', async () => {
    const router = new CoordinationRouter(validator, {} as never)
    router.coordination('GET', /^\/v1\/projects\/(?<projectId>[^/]+)\/test$/, async () => {
      throw new Error('D1 unavailable')
    })

    const response = await router.handle(request('GET'))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      error: {
        code: 'coordination_unavailable',
        message: 'coordination_unavailable',
        requestId: expect.any(String),
        retryable: true,
      },
    })
  })

  test('maps invalid Access assertions to authentication required', async () => {
    const invalidValidator = {
      validate: mock(() => Promise.reject(new Error('invalid signature'))),
    } as unknown as import('../src/cloudflare/access/jwt').AccessValidator
    const router = new CoordinationRouter(invalidValidator, {} as never)
    router.coordination('GET', /^\/v1\/projects\/(?<projectId>[^/]+)\/test$/, async () => new Response('{}'))

    const response = await router.handle(request('GET'))
    expect(response.status).toBe(401)
    expect((await response.json() as { error: { code: string } }).error.code)
      .toBe('authentication_required')
  })
})
