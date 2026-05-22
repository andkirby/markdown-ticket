import { request as httpRequest } from 'node:http'
import { expect, test } from './fixtures/test-fixtures.js'

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
})
