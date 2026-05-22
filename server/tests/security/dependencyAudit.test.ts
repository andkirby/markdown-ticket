/// <reference types="jest" />

import { readFileSync } from 'node:fs'

function compareSemver(actual: string, minimum: string): number {
  const actualParts = actual.split('.').map(Number)
  const minimumParts = minimum.split('.').map(Number)

  for (let i = 0; i < 3; i++) {
    const actualPart = actualParts[i] || 0
    const minimumPart = minimumParts[i] || 0

    if (actualPart !== minimumPart)
      return actualPart - minimumPart
  }

  return 0
}

function packageVersion(lockContent: string, packageName: string): string | undefined {
  const match = lockContent.match(new RegExp(`"${packageName.replace('/', '\\/')}"\\s*:\\s*\\["${packageName.replace('/', '\\/')}@([^"@]+)"`))

  return match?.[1]
}

describe('runtime dependency audit threshold', () => {
  const lock = readFileSync('../bun.lock', 'utf8')

  it('uses DOMPurify at or above the MDT-156 threshold', () => {
    expect(compareSemver(packageVersion(lock, 'dompurify') || '0.0.0', '3.3.2')).toBeGreaterThanOrEqual(0)
  })

  it('documents remaining transitive runtime advisory handling', () => {
    expect(lock).toContain('express-rate-limit@')
    expect(lock).toContain('path-to-regexp@')
  })
})
