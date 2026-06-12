/// <reference types="jest" />

import { readFileSync } from 'node:fs'

const SCANNED_FILES = [
  '../docker-compose.yml',
  '../docker-compose.prod.yml',
  '../docs/DOCKER_GUIDE.md',
  '../docs/MCP_SERVER_GUIDE.md',
]

const ALLOWED_PLACEHOLDERS = [
  'your-secret-token',
  '${MCP_AUTH_TOKEN}', // eslint-disable-line no-template-curly-in-string
]

describe('tracked secret scan', () => {
  it('does not contain committed concrete MCP auth tokens in tracked MDT-156 docs/config', () => {
    for (const file of SCANNED_FILES) {
      let content = readFileSync(file, 'utf8')

      for (const placeholder of ALLOWED_PLACEHOLDERS) {
        content = content.split(placeholder).join('')
      }

      expect(content).not.toMatch(/MCP_AUTH_TOKEN\s*=\s*[\w.-]{16,}/)
      expect(content).not.toMatch(/Bearer\s+[\w.-]{16,}/)
    }
  })
})
