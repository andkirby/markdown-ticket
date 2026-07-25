/**
 * TEST-package-boundary — covers C1.
 *
 * Enforces the cloud package boundary at compile/runtime: cloud/ imports only
 * @mdt/domain-contracts from this monorepo; no filesystem-aware shared, server,
 * cli, mcp-server, or src imports leak in.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'bun:test'

const CLOUD_SRC = join(import.meta.dir, '..', 'src')

const FORBIDDEN_MONOREPO_IMPORTS = [
  '@mdt/shared',
  '@mdt/server',
  '@mdt/cli',
  '@mdt/mcp',
  'shared/',
  'server/',
  // Relative escapes out of cloud/ into another workspace:
  // allow only ../../worker-configuration (generated types) and intra-cloud.
]

function listTsFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...listTsFiles(full))
    }
    else if (entry.endsWith('.ts')) {
      out.push(full)
    }
  }
  return out
}

describe('cloud package boundary (C1)', () => {
  test('cloud/src imports only @mdt/domain-contracts from the monorepo', () => {
    const files = listTsFiles(CLOUD_SRC)
    expect(files.length).toBeGreaterThan(0)
    const violations: string[] = []
    for (const file of files) {
      const src = readFileSync(file, 'utf8')
      for (const forbidden of FORBIDDEN_MONOREPO_IMPORTS) {
        const re = new RegExp(`from ['"]${forbidden.replace(/\//g, '\\/')}`)
        if (re.test(src)) {
          violations.push(`${file}: imports ${forbidden}`)
        }
      }
    }
    expect(violations).toEqual([])
  })

  test('cloud/src uses only intra-package relative imports or domain-contracts', () => {
    const files = listTsFiles(CLOUD_SRC)
    const violations: string[] = []
    for (const file of files) {
      const src = readFileSync(file, 'utf8')
      const importMatches = src.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)
      for (const m of importMatches) {
        const rel = m[1]
        // Relative imports must resolve within cloud/ (intra-package).
        // ../../worker-configuration is the generated binding types file.
        if (rel.startsWith('../../') && !rel.includes('worker-configuration')) {
          violations.push(`${file}: escapes package via ${rel}`)
        }
      }
    }
    expect(violations).toEqual([])
  })

  test('exclusions (C8): no presence/websocket/durable-object surface in cloud/src', () => {
    const files = existsSync(CLOUD_SRC) ? listTsFiles(CLOUD_SRC) : []
    const forbiddenTokens = ['WebSocket', 'DurableObject', 'presence', 'Presence']
    const violations: string[] = []
    for (const file of files) {
      const src = readFileSync(file, 'utf8')
      for (const token of forbiddenTokens) {
        if (src.includes(token)) {
          violations.push(`${file}: references ${token}`)
        }
      }
    }
    expect(violations).toEqual([])
  })
})
