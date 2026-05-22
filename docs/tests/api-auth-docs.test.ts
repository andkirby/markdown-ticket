import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

describe('MDT-157 API auth migration docs', () => {
  test('production Docker defaults MCP HTTP auth on and requires a token', () => {
    const prodCompose = read('docker-compose.prod.yml')

    expect(prodCompose).toContain('MCP_SECURITY_AUTH=${MCP_SECURITY_AUTH:-true}')
    expect(prodCompose).toContain('MCP_AUTH_TOKEN=${MCP_AUTH_TOKEN:?Set MCP_AUTH_TOKEN for production MCP HTTP}')
  })

  test('Docker docs document backend and MCP auth migration path', () => {
    const dockerGuide = read('docs/DOCKER_GUIDE.md')
    const dockerReference = read('docs/DOCKER_REFERENCE.md')
    const mcpGuide = read('docs/MCP_SERVER_GUIDE.md')

    for (const content of [dockerGuide, dockerReference]) {
      expect(content).toContain('API_SECURITY_AUTH')
      expect(content).toContain('API_AUTH_TOKEN')
      expect(content).toContain('MCP_SECURITY_AUTH')
      expect(content).toContain('MCP_AUTH_TOKEN')
      expect(content.toLowerCase()).toContain('migration')
      expect(content).toContain('Authorization')
      expect(content).toContain('X-API-Key')
      expect(content).toContain('401')
      expect(content).toContain('MDT-172')
    }

    expect(mcpGuide).toContain('MCP_SECURITY_AUTH')
    expect(mcpGuide).toContain('MCP_AUTH_TOKEN')
    expect(mcpGuide).toContain('Authorization: Bearer')
    expect(mcpGuide.toLowerCase()).toContain('migration')
    expect(mcpGuide).toContain('MDT-172')
  })

  test('nginx config preserves backend credential headers', () => {
    const nginx = read('nginx.conf')

    expect(nginx).toContain('proxy_set_header Authorization $http_authorization')
    expect(nginx).toContain('proxy_set_header X-API-Key $http_x_api_key')
  })
})
