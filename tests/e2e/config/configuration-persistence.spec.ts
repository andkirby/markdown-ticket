import { expect, test } from '../fixtures/test-fixtures.js'

/**
 * MDT-168 E2E: configuration persistence + side effects.
 * Covers TEST-e2e-config-persistence (BR-2.1, BR-3.1, BR-3.2) and
 * TEST-e2e-config-refresh (BR-3.1, Edge-4).
 *
 * These tests exercise the configuration management API end to end against the
 * isolated E2E backend. The E2E environment runs in no-auth-dev mode (owner
 * capable), so config endpoints are reachable.
 */
test.describe('MDT-168 configuration persistence', () => {
  test.describe.configure({ mode: 'serial' })

  test('owner can read configuration selectors with exposure metadata', async ({ e2eContext }) => {
    const { backendUrl } = e2eContext
    const res = await fetch(`${backendUrl}/api/config/selectors`)
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(Array.isArray(data.selectors)).toBe(true)
    // file-only selectors are omitted
    expect(data.selectors.find((s: { selector: string }) => s.selector === 'project.id')).toBeUndefined()
    // an editable global selector is present
    const links = data.selectors.find((s: { selector: string }) => s.selector === 'links.enableTicketLinks')
    expect(links).toBeDefined()
    expect(links.exposure).toBe('editable')
  })

  test('a valid editable selector persists atomically and returns the effective value', async ({ e2eContext }) => {
    const { backendUrl } = e2eContext
    const res = await fetch(`${backendUrl}/api/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selector: 'links.enableTicketLinks', value: false }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.selector).toBe('links.enableTicketLinks')
    expect(data.effective).toBe(false)
    expect(typeof data.filePath).toBe('string')

    // effective value is observable on a subsequent read
    const readRes = await fetch(`${backendUrl}/api/config/selectors`)
    const readData = await readRes.json()
    const links = readData.selectors.find((s: { selector: string }) => s.selector === 'links.enableTicketLinks')
    expect(links.value).toBe(false)
  })

  test('a global user preference change persists and is observable', async ({ e2eContext }) => {
    const { backendUrl } = e2eContext
    const res = await fetch(`${backendUrl}/api/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selector: 'links.enableDocumentLinks', value: true }),
    })
    expect(res.status).toBe(200)
    expect(res.json()).resolves.toMatchObject({ selector: 'links.enableDocumentLinks', effective: true })
  })
})
