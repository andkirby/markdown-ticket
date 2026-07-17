import type { ConfigSelectorDescriptor } from './configApiClient'
import { beforeEach, describe, expect, it, mock } from 'bun:test'

// Mock authFetch so the client never reaches the network.
const authFetch = mock(async (_input: string, _init?: unknown) => {
  return { ok: true, status: 200, json: async () => ({}) } as unknown as Response
})

mock.module('../auth/authFetch', () => ({ authFetch }))

// eslint-disable-next-line import/first
import { applyConfig, fetchConfigSelectors } from './configApiClient'

function mockResponse(body: unknown, status: number, ok = status >= 200 && status < 300): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response
}

describe('configApiClient', () => {
  beforeEach(() => {
    authFetch.mockClear()
  })

  describe('fetchConfigSelectors', () => {
    it('returns selector descriptors on success', async () => {
      const descriptors: ConfigSelectorDescriptor[] = [
        { selector: 'links.enableTicketLinks', scope: 'global', exposure: 'editable', ownerSurface: 'settings', validation: 'Boolean.', value: true },
      ]
      authFetch.mockResolvedValueOnce(mockResponse({ selectors: descriptors }, 200))
      const result = await fetchConfigSelectors()
      expect(result).toEqual(descriptors)
      expect(authFetch.mock.calls[0][0]).toBe('/api/config/selectors')
    })

    it('throws on non-ok response', async () => {
      authFetch.mockResolvedValueOnce(mockResponse({ error: 'denied' }, 403))
      await expect(fetchConfigSelectors()).rejects.toThrow(/Failed to read config selectors/)
    })
  })

  describe('applyConfig', () => {
    it('returns ok outcome with effective value on 200', async () => {
      authFetch.mockResolvedValueOnce(mockResponse({ selector: 'links.enableTicketLinks', effective: false, filePath: '/x/config.toml' }, 200))
      const outcome = await applyConfig('links.enableTicketLinks', false)
      expect(outcome.ok).toBe(true)
      if (outcome.ok) {
        expect(outcome.effective).toBe(false)
      }
      // mutation must pass ownerIntent
      const call = authFetch.mock.calls[0]
      expect((call[1] as { ownerIntent: boolean }).ownerIntent).toBe(true)
      expect((call[1] as { method: string }).method).toBe('PATCH')
    })

    it('maps a 400 to a field-level error', async () => {
      authFetch.mockResolvedValueOnce(mockResponse({ selector: 'links.enableTicketLinks', message: 'Invalid value.', field: 'links.enableTicketLinks' }, 400))
      const outcome = await applyConfig('links.enableTicketLinks', 'bad')
      expect(outcome.ok).toBe(false)
      if (!outcome.ok) {
        expect(outcome.error.selector).toBe('links.enableTicketLinks')
        expect(outcome.error.message).toBe('Invalid value.')
      }
    })

    it('maps a 403 to a field-level error with status message', async () => {
      authFetch.mockResolvedValueOnce(mockResponse({}, 403))
      const outcome = await applyConfig('links.enableTicketLinks', true)
      expect(outcome.ok).toBe(false)
      if (!outcome.ok) {
        expect(outcome.error.message).toMatch(/403/)
      }
    })
  })
})
