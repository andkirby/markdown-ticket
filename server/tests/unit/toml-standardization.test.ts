/**
 * TOML Standardization Tests (MDT-098)
 *
 * Validates that all TOML operations use the single entrypoint
 * @mdt/shared/utils/toml.ts, ensuring no direct imports of the
 * incompatible `toml` package that causes data corruption.
 */

import { execSync } from 'node:child_process'
import path from 'node:path'
import { describe, test, expect } from '@jest/globals'

const repoRoot = path.resolve(__dirname, '../../..')

describe('TOML Standardization (MDT-098)', () => {
  describe('Constraint C1: No direct toml package imports', () => {
    test('shall not have direct imports of "toml" in server/ or shared/', () => {
      // grep -r "from 'toml'" server/ shared/ --include="*.ts" | grep -v "shared/utils/toml"
      const cmd = "grep -r \"from 'toml'\" server/ shared/ --include=\"*.ts\" | grep -v \"shared/utils/toml\" || true"
      const result = execSync(cmd, { encoding: 'utf-8', cwd: repoRoot })

      // Should be empty (no direct imports found)
      expect(result.trim()).toBe('')
    })

    test('shall only import smol-toml in shared/utils/toml.ts', () => {
      // grep -r "from 'smol-toml'" shared/ --include="*.ts" --exclude-dir=dist
      const cmd = "grep -r \"from 'smol-toml'\" shared/ --include=\"*.ts\" --exclude-dir=dist"
      const result = execSync(cmd, { encoding: 'utf-8', cwd: repoRoot })

      // Should only find the import in shared/utils/toml.ts
      const lines = result.trim().split('\n').filter(Boolean)
      expect(lines.length).toBeGreaterThan(0)

      // All lines should point to shared/utils/toml.ts
      lines.forEach(line => {
        expect(line).toContain('shared/utils/toml.ts')
      })
    })

    test('shall use @mdt/shared/utils/toml.js in all TOML operations', () => {
      // Verify the consuming modules use the shared entrypoint
      const consumingFiles = [
        'server/repositories/ConfigRepository.ts',
        'server/routes/system.ts',
        'shared/tools/config-cli.ts',
      ]

      const cmd = `grep -r "@mdt/shared/utils/toml" ${consumingFiles.join(' ')}`
      const result = execSync(cmd, { encoding: 'utf-8', cwd: repoRoot })

      // All consuming files should import from shared utils
      expect(result.trim()).not.toBe('')
    })
  })

  describe('Data Integrity: Parse-Stringify Roundtrip', () => {
    test('smol-toml parse → stringify → parse preserves structure', () => {
      // This test validates that the single parser produces consistent output
      const { parseToml, stringify } = require('@mdt/shared/utils/toml.js')

      const original = {
        project: {
          document: {
            paths: ['docs', 'src'],
            excludeFolders: ['node_modules', '.git'],
          },
        },
      }

      // Roundtrip: parse → stringify → parse
      const roundtripped = parseToml(stringify(original)) as any

      // Verify structure is preserved
      expect(roundtripped.project.document.paths).toEqual(original.project.document.paths)
      expect(roundtripped.project.document.excludeFolders).toEqual(original.project.document.excludeFolders)
    })
  })
})
