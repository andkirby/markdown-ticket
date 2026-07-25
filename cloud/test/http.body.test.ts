import { describe, expect, test } from 'bun:test'
import { MAX_JSON_BODY_BYTES, readJsonObject } from '../src/cloudflare/http/body'

describe('coordination request body validation', () => {
  test('accepts a bounded JSON object', async () => {
    const request = new Request('https://example.com', {
      method: 'POST',
      body: JSON.stringify({ value: 1 }),
    })
    await expect(readJsonObject(request, 'req-1')).resolves.toEqual({ value: 1 })
  })

  test('rejects malformed JSON and non-object JSON', async () => {
    await expect(readJsonObject(new Request('https://example.com', {
      method: 'POST',
      body: '{',
    }), 'req-2')).rejects.toMatchObject({ code: 'invalid_request' })
    await expect(readJsonObject(new Request('https://example.com', {
      method: 'POST',
      body: '[]',
    }), 'req-3')).rejects.toMatchObject({ code: 'invalid_request' })
  })

  test('rejects metadata payloads larger than the fixed limit', async () => {
    const request = new Request('https://example.com', {
      method: 'POST',
      body: JSON.stringify({ value: 'x'.repeat(MAX_JSON_BODY_BYTES) }),
    })
    await expect(readJsonObject(request, 'req-4'))
      .rejects
      .toMatchObject({ code: 'invalid_request' })
  })
})
