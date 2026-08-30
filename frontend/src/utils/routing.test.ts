import { afterEach, describe, expect, it } from 'bun:test'
import { findProjectByTicketKey } from './routing'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('findProjectByTicketKey', () => {
  it('checks the project matching the ticket prefix before scanning other projects', async () => {
    const fetchedUrls: string[] = []

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input)
      fetchedUrls.push(url)

      if (url === '/api/projects') {
        return Response.json([
          { id: 'broken', project: { code: 'BAD' } },
          { id: 'target', project: { code: 'MDT' } },
        ])
      }

      if (url === '/api/projects/broken/crs')
        return new Response('Server error', { status: 500 })

      if (url === '/api/projects/target/crs')
        return Response.json([{ code: 'MDT-094' }])

      return new Response('Not found', { status: 404 })
    }) as typeof fetch

    await expect(findProjectByTicketKey('MDT-94')).resolves.toBe('MDT')
    expect(fetchedUrls).toEqual(['/api/projects', '/api/projects/target/crs'])
  })

  it('continues searching when a non-prefix project ticket request fails', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url === '/api/projects') {
        return Response.json([
          { id: 'broken', project: { code: 'BAD' } },
          { id: 'fallback', project: { code: 'ALT' } },
        ])
      }

      if (url === '/api/projects/broken/crs')
        return new Response('Server error', { status: 500 })

      if (url === '/api/projects/fallback/crs')
        return Response.json([{ code: 'MDT-094' }])

      return new Response('Not found', { status: 404 })
    }) as typeof fetch

    await expect(findProjectByTicketKey('MDT-94')).resolves.toBe('ALT')
  })
})
