import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

/**
 * bb installs refuse imports that escape the plugin directory (its
 * install-time bundler enforces the package boundary), so plugins/bb keeps
 * a synced copy of the shared _lib sources. This test is the drift guard:
 * edit the canonical file in plugins/_lib/, then re-copy into
 * plugins/bb/lib/. Never edit the copies directly.
 */

const SHARED = ['run-cli.js', 'mdt-tools.js', 'spec-trace-tools.js', 'bb-workspace.js']

describe('plugins/bb/lib is byte-identical to plugins/_lib', () => {
  for (const file of SHARED) {
    test(`${file} is in sync`, () => {
      const canonical = readFileSync(new URL(`../_lib/${file}`, import.meta.url), 'utf8')
      const copy = readFileSync(new URL(`../bb/lib/${file}`, import.meta.url), 'utf8')
      expect(copy).toBe(canonical)
    })
  }
})
