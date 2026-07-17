import { expect, test } from '../fixtures/test-fixtures.js'

/**
 * MDT-168 E2E: configuration refresh behavior.
 * Covers TEST-e2e-config-refresh (BR-3.1, Edge-4): after a successful config
 * write, the effective state is observable on the next read (the system
 * converges to the new effective configuration).
 */
test.describe('MDT-168 configuration refresh', () => {
  test('a written value is observable on the next read without duplication', async ({ e2eContext }) => {
    const { backendUrl } = e2eContext

    // write a value
    const writeRes = await fetch(`${backendUrl}/api/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selector: 'links.linkValidation', value: true }),
    })
    expect(writeRes.status).toBe(200)

    // read again — effective value reflects the write
    const readRes = await fetch(`${backendUrl}/api/config/selectors`)
    const data = await readRes.json()
    const lv = data.selectors.find((s: { selector: string }) => s.selector === 'links.linkValidation')
    expect(lv.value).toBe(true)

    // writing again is idempotent — no duplication or corruption
    const rewriteRes = await fetch(`${backendUrl}/api/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selector: 'links.linkValidation', value: true }),
    })
    expect(rewriteRes.status).toBe(200)
    const rereadRes = await fetch(`${backendUrl}/api/config/selectors`)
    const reread = await rereadRes.json()
    const lvAfter = reread.selectors.find((s: { selector: string }) => s.selector === 'links.linkValidation')
    expect(lvAfter.value).toBe(true)
  })
})
