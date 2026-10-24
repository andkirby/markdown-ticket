import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'bun:test'

/**
 * MDT-258 §4.5 doc-vs-code drift guard, born from MDT-099's false
 * "server/repositories/ no longer exists" claim (corrected 2026-10-24).
 *
 * Convention: a CR may assert machine-checkable facts in a fenced
 * ```claims block, e.g.
 *
 *   ```claims
 *   paths_exist: [server/repositories/ConfigRepository.ts]
 *   ```
 *
 * The test walks docs/CRs/MDT-*.md and fails when a claimed path is gone.
 */

const CRS_DIR = 'docs/CRs'
const BLOCK = /```claims\n([\s\S]*?)```/g
const LIST = /paths_exist:\s*\[([^\]]*)\]/g

function claimedPaths(md: string): string[] {
  const paths: string[] = []
  for (const block of md.matchAll(BLOCK)) {
    for (const list of block[1].matchAll(LIST)) {
      for (const raw of list[1].split(',')) {
        const p = raw.trim().replace(/^['"]|['"]$/g, '')
        if (p)
          paths.push(p)
      }
    }
  }
  return paths
}

describe('CR claims blocks (doc-vs-code drift)', () => {
  test('every paths_exist claim points at a real path', () => {
    const files = readdirSync(CRS_DIR).filter(f => /^MDT-.*\.md$/.test(f))
    const checked: string[] = []
    for (const file of files) {
      for (const p of claimedPaths(readFileSync(join(CRS_DIR, file), 'utf8'))) {
        checked.push(`${file}: ${p}`)
        expect({ claim: p, exists: existsSync(p) }).toEqual({ claim: p, exists: true })
      }
    }
    // The convention must stay exercised: MDT-099 carries the founding claim.
    expect(checked.some(c => c.startsWith('MDT-099'))).toBe(true)
  })
})
