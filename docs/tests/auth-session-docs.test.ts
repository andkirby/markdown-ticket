import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

describe('MDT-176 auth session operator documentation', () => {
  test('documents enabling backend auth and local no-auth mode', () => {
    const authGuide = read('docs/AUTH_SESSION_GUIDE.md')
    const dockerGuide = read('docs/DOCKER_GUIDE.md')
    const developmentGuide = read('docs/DEVELOPMENT_GUIDE.md')

    for (const content of [authGuide, dockerGuide]) {
      expect(content).toContain('API_SECURITY_AUTH')
      expect(content).toContain('API_AUTH_TOKEN')
      expect(content.toLowerCase()).toContain('browser')
      expect(content.toLowerCase()).toContain('unlock')
    }

    expect(developmentGuide).toMatch(/local.*no-auth|no-auth.*local/i)
  })

  test('documents session cookie security, CSRF behavior, and logout', () => {
    const authGuide = read('docs/AUTH_SESSION_GUIDE.md')

    for (const requiredTerm of [
      'HttpOnly',
      'SameSite=Strict',
      'Secure',
      'Path=/api',
      'X-MDT-Owner-Intent',
      'Origin',
      'logout',
      'DELETE /api/auth/session',
      'POST /api/auth/session',
    ]) {
      expect(authGuide).toContain(requiredTerm)
    }
  })

  test('documents raw-token handling and auth scope boundary', () => {
    const authGuide = read('docs/AUTH_SESSION_GUIDE.md')

    expect(authGuide).toMatch(/raw admin token/i)
    expect(authGuide).toMatch(/not.*localStorage|localStorage.*not/i)
    expect(authGuide).toMatch(/not.*sessionStorage|sessionStorage.*not/i)
    expect(authGuide).toMatch(/not.*URL|URL.*not/i)
    expect(authGuide).toMatch(/not.*OAuth|OAuth.*not/i)
    expect(authGuide).toMatch(/not.*RBAC|RBAC.*not/i)
    expect(authGuide).toMatch(/not.*password login|password login.*not/i)
    expect(authGuide).toMatch(/not.*token rotation|token rotation.*not/i)
    expect(authGuide).toMatch(/not.*refresh tokens|refresh tokens.*not/i)
    expect(authGuide).toMatch(/MDT-172/)
  })
})
