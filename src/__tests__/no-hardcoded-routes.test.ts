/**
 * MDT-184: Constraint C-1 — No hardcoded /prj/ outside routes module
 *
 * Scans all runtime source files (excluding tests, node_modules, generated)
 * and asserts that /prj/ path literals only appear in routes.ts.
 */
import { describe, expect, it } from 'bun:test'
import { execSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'

const PROJECT_ROOT = path.resolve(__dirname, '..', '..')
const SRC_DIR = path.join(PROJECT_ROOT, 'src')

/**
 * Files allowed to contain /prj/ literals.
 * routes.ts owns the pattern constants; linkBuilder.ts is a deprecated facade.
 */
const ALLOWED_FILES = new Set([
  'src/routes.ts',
])

describe('MDT-184 C-1: no hardcoded /prj/ outside routes module', () => {
  it('has no /prj/ template literals outside allowed files', () => {
    const output = execSync(
      'find src -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v ".test." | grep -v ".spec." | grep -v __tests__ | grep -v __mocks__',
      { cwd: PROJECT_ROOT, encoding: 'utf-8' },
    )

    const files = output.trim().split('\n').filter(Boolean)
    const violations: string[] = []

    for (const file of files) {
      if (ALLOWED_FILES.has(file))
        continue

      const fullPath = path.join(PROJECT_ROOT, file)
      if (!fs.existsSync(fullPath))
        continue

      const content = fs.readFileSync(fullPath, 'utf-8')
      const lines = content.split('\n')

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        // Skip comments
        if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*') || line.trimStart().startsWith('/*'))
          continue

        // Match /prj/ in template literals or string literals
        if (/['"`]\/prj\//.test(line) || /`\/prj\//.test(line)) {
          violations.push(`${file}:${i + 1}: ${line.trim()}`)
        }
      }
    }

    expect(violations).toEqual([])
  })
})
