#!/usr/bin/env bun
/**
 * Clean up leaked MDT test temp directories — MDT-239.
 *
 * Historical e2e runs (before MDT-239) never tore down their TestEnvironment,
 * leaking one `mdt-test-<uuid>` directory per worker on every run — thousands
 * of directories accumulated in $TMPDIR. The new wrapper cleans up after
 * itself; this script removes the backlog.
 *
 * Usage:
 *   bun scripts/e2e/clean-leaked-temp-dirs.ts          # dry run (default)
 *   bun scripts/e2e/clean-leaked-temp-dirs.ts --apply  # actually delete
 */

import { readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

const APPLY = process.argv.includes('--apply')
const PREFIXES = ['mdt-test-', 'mdt-e2e-']
/** Do not delete dirs modified within the last hour — a live run may own them. */
const MIN_AGE_MS = 60 * 60 * 1000

function main(): void {
  const entries = readdirSync(tmpdir())
  const cutoff = Date.now() - MIN_AGE_MS

  let candidates = 0
  let deleted = 0
  let skippedFresh = 0
  let errors = 0

  for (const name of entries) {
    if (!PREFIXES.some(prefix => name.startsWith(prefix)))
      continue
    const dir = join(tmpdir(), name)
    try {
      const stats = statSync(dir)
      if (!stats.isDirectory())
        continue
      if (stats.mtimeMs > cutoff) {
        skippedFresh++
        continue
      }
      candidates++
      if (APPLY) {
        rmSync(dir, { recursive: true, force: true })
        deleted++
      }
    }
    catch {
      errors++
    }
  }

  const mode = APPLY ? 'APPLY' : 'DRY RUN'
  console.log(`[${mode}] tmpdir=${tmpdir()}`)
  console.log(`  stale ${PREFIXES.join('/')} dirs: ${candidates}`)
  console.log(`  skipped (modified < 1h ago): ${skippedFresh}`)
  console.log(`  deleted: ${deleted}`)
  if (errors)
    console.log(`  errors: ${errors}`)
  if (!APPLY && candidates > 0)
    console.log('\nRe-run with --apply to delete them.')
}

main()
