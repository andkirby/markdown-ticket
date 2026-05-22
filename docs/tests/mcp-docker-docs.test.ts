import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

describe('MCP Docker security docs', () => {
  test('production compose enables origin validation and rate limiting', () => {
    const compose = read('docker-compose.prod.yml')

    expect(compose).toContain('MCP_SECURITY_ORIGIN_VALIDATION=true')
    expect(compose).toContain('MCP_ALLOWED_ORIGINS=${MCP_ALLOWED_ORIGINS:?Set MCP_ALLOWED_ORIGINS for production MCP HTTP}')
    expect(compose).toContain('MCP_SECURITY_RATE_LIMITING=true')
  })

  test('Docker and MCP docs document required production allowed origins', () => {
    const dockerGuide = read('docs/DOCKER_GUIDE.md')
    const mcpGuide = read('docs/MCP_SERVER_GUIDE.md')

    expect(dockerGuide).toContain('MCP_ALLOWED_ORIGINS')
    expect(dockerGuide).toContain('enabled by default')
    expect(mcpGuide).toContain('startup fails')
  })
})
