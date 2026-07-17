import { expect, test } from '../fixtures/test-fixtures.js'

/**
 * MDT-168 E2E: validation failure behavior.
 * Covers TEST-e2e-config-validation-failure (BR-2.2, BR-2.3): unknown,
 * disallowed, and invalid selectors are rejected with a field-level error
 * before any write, and invalid values are never converted to defaults.
 */
test.describe('MDT-168 configuration validation failure', () => {
  test('rejects an unknown selector with a field-level error', async ({ e2eContext }) => {
    const { backendUrl } = e2eContext
    const res = await fetch(`${backendUrl}/api/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selector: 'totally.unknown.selector', value: true }),
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Validation Error')
    expect(data.selector).toBe('totally.unknown.selector')
  })

  test('rejects a guarded selector routed through the scalar patcher', async ({ e2eContext }) => {
    const { backendUrl } = e2eContext
    const res = await fetch(`${backendUrl}/api/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selector: 'discovery.maxDepth', value: 5 }),
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.selector).toBe('discovery.maxDepth')
    expect(String(data.message)).toMatch(/guarded/i)
  })

  test('rejects an invalid value and never converts it to a default', async ({ e2eContext }) => {
    const { backendUrl } = e2eContext
    // record the current value first
    const beforeRes = await fetch(`${backendUrl}/api/config/selectors`)
    const beforeData = await beforeRes.json()
    const before = beforeData.selectors.find((s: { selector: string }) => s.selector === 'links.enableTicketLinks').value

    // attempt an invalid write (string for a boolean selector)
    const res = await fetch(`${backendUrl}/api/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selector: 'links.enableTicketLinks', value: 'not-a-boolean' }),
    })
    expect(res.status).toBe(400)

    // the value is unchanged (not defaulted)
    const afterRes = await fetch(`${backendUrl}/api/config/selectors`)
    const afterData = await afterRes.json()
    const after = afterData.selectors.find((s: { selector: string }) => s.selector === 'links.enableTicketLinks').value
    expect(after).toEqual(before)
  })

  test('rejects a request missing the selector field', async ({ e2eContext }) => {
    const { backendUrl } = e2eContext
    const res = await fetch(`${backendUrl}/api/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: true }),
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.field).toBe('selector')
  })
})
