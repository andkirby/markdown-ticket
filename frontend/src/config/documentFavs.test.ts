import {
  parseDocumentFavStateOrDefault,
  safeValidateDocumentFavState,
} from '@mdt/domain-contracts'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { saveDocumentFavs } from './documentFavs'

const originalFetch = globalThis.fetch

describe('document fav state contracts (MDT-171)', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch
    mock.restore()
  })

  it('validates ordered file and folder records and falls back for invalid state', () => {
    const state = {
      favItems: [
        { path: 'docs', type: 'folder', favoritedAt: '2026-05-18T10:00:00.000Z' },
        { path: 'docs/guide.md', type: 'file', favoritedAt: '2026-05-18T10:01:00.000Z' },
      ],
    }

    expect(safeValidateDocumentFavState(state).success).toBe(true)
    expect(parseDocumentFavStateOrDefault({ favItems: [{ path: '../secret.md', type: 'file', favoritedAt: 'bad' }] })).toEqual({ favItems: [] })
  })

  it('writes complete ordered lists through PUT /api/documents/favs only', async () => {
    const fetchMock = mock(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response(JSON.stringify({
        favItems: [
          { path: 'docs', type: 'folder', favoritedAt: '2026-05-18T10:00:00.000Z' },
          { path: 'docs/guide.md', type: 'file', favoritedAt: '2026-05-18T10:01:00.000Z' },
        ],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })

    globalThis.fetch = fetchMock as typeof fetch

    const result = await saveDocumentFavs({
      projectId: 'MDT',
      favItems: [
        { path: 'docs', type: 'folder', favoritedAt: '2026-05-18T10:00:00.000Z' },
        { path: 'docs/guide.md', type: 'file', favoritedAt: '2026-05-18T10:01:00.000Z' },
      ],
    })

    expect(result.favItems.map(item => item.path)).toEqual(['docs', 'docs/guide.md'])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/documents/favs')
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('PUT')
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toEqual({
      projectId: 'MDT',
      favItems: [
        { path: 'docs', type: 'folder', favoritedAt: '2026-05-18T10:00:00.000Z' },
        { path: 'docs/guide.md', type: 'file', favoritedAt: '2026-05-18T10:01:00.000Z' },
      ],
    })
  })
})
