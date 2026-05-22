import { request as httpRequest } from 'node:http'
import { expect, test } from './fixtures/test-fixtures.js'
import { buildScenario } from './setup/index.js'

function getSseHeaders(url: string, origin: string): Promise<{ statusCode: number | undefined, headers: Record<string, string | string[] | undefined> }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(url, { headers: { Origin: origin } }, (res) => {
      resolve({
        statusCode: res.statusCode,
        headers: res.headers,
      })
      res.destroy()
      req.destroy()
    })

    req.setTimeout(1000, () => {
      req.destroy(new Error('SSE response did not start within timeout'))
    })
    req.on('error', reject)
    req.end()
  })
}

test.describe('Security hardening', () => {
  test('SSE stream allows GET /api/events from a configured browser origin', async ({ e2eContext }) => {
    const response = await getSseHeaders(`${e2eContext.backendUrl}/api/events`, 'http://localhost:6173')

    expect(response.statusCode).toBe(200)
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:6173')
    expect(response.headers['access-control-allow-origin']).not.toBe('*')
  })

  test('Devtools stream allows GET from a configured browser origin', async ({ e2eContext }) => {
    const response = await getSseHeaders(`${e2eContext.backendUrl}/api/devtools/logs/stream`, 'http://localhost:6173')

    expect(response.statusCode).toBe(200)
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:6173')
    expect(response.headers['access-control-allow-origin']).not.toBe('*')
  })

  test('directory browse denies outside root and allows inside root', async ({ request, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    const outside = await request.get(`${e2eContext.backendUrl}/api/directories?path=${encodeURIComponent('/etc')}`)

    expect(outside.status()).toBe(403)
    expect(await outside.json()).not.toHaveProperty('directories')

    const inside = await request.get(`${e2eContext.backendUrl}/api/directories?path=${encodeURIComponent(scenario.projectDir)}`)

    expect(inside.status()).toBe(200)
    expect((await inside.json()).directories).toBeDefined()
  })
})
