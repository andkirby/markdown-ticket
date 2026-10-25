/**
 * Unit tests for parseCreateTokens
 *
 * Tests the CLI token parsing logic in isolation,
 * focusing on slug vs title disambiguation.
 */

import { describe, expect, test } from 'bun:test'
import { parseCreateTokens } from '../../../src/commands/create.js'

// Canonical values from domain-contracts (resolved by aliases)
const TYPE_FEATURE = 'Feature Enhancement'
const TYPE_BUG = 'Bug Fix'
const TYPE_TASK = 'Feature Enhancement' // DEFAULT_TYPE
const PRIORITY_HIGH = 'High'
const PRIORITY_P2 = 'High' // p2 → High
const PRIORITY_MEDIUM = 'Medium'

describe('parseCreateTokens', () => {
  // ── Title extraction ──────────────────────────────────────────────

  test('quoted title (single quotes)', () => {
    const result = parseCreateTokens(['feature', '\'Fix login bug\''])
    expect(result.title).toBe('Fix login bug')
    expect(result.slug).toBeNull()
    expect(result.type).toBe(TYPE_FEATURE)
  })

  test('quoted title (double quotes)', () => {
    const result = parseCreateTokens(['feature', '"Add user management"'])
    expect(result.title).toBe('Add user management')
    expect(result.slug).toBeNull()
  })

  test('unquoted single word becomes title', () => {
    const result = parseCreateTokens(['feature', 'Refactor'])
    expect(result.title).toBe('Refactor')
    expect(result.slug).toBeNull()
  })

  // ── Slug from dashed token (no title yet) ─────────────────────────

  test('dashed token with no prior title becomes slug and derives title', () => {
    const result = parseCreateTokens(['feature', 'fix-database-pool'])
    expect(result.slug).toBe('fix-database-pool')
    expect(result.title).toBe('Fix Database Pool')
  })

  // ── Explicit slug after title ─────────────────────────────────────

  test('dashed token after quoted title becomes slug', () => {
    const result = parseCreateTokens(['feature', '\'New feature\'', 'custom-slug'])
    expect(result.title).toBe('New feature')
    expect(result.slug).toBe('custom-slug')
  })

  test('dashed token after unquoted single-word title becomes slug', () => {
    const result = parseCreateTokens(['feature', 'Refactor', 'refactor-auth'])
    expect(result.title).toBe('Refactor')
    expect(result.slug).toBe('refactor-auth')
  })

  // ── Multi-word title with hyphens (the regression bug) ────────────
  // Bug: token.includes('-') matched before checking for spaces,
  // causing the entire title to be used as slug (with spaces in filename).

  test('unquoted multi-word title containing hyphens is treated as title, not slug', () => {
    const result = parseCreateTokens([
      'feature',
      'Group management via namespace-based process clustering with Shift modifier actions',
    ])
    expect(result.title).toBe('Group management via namespace-based process clustering with Shift modifier actions')
    expect(result.slug).toBeNull()
  })

  test('unquoted multi-word title with single hyphen is title, not slug', () => {
    const result = parseCreateTokens(['bug', 'Fix off-by-one error in parser'])
    expect(result.title).toBe('Fix off-by-one error in parser')
    expect(result.slug).toBeNull()
  })

  test('unquoted multi-word title with trailing dashed word is title', () => {
    const result = parseCreateTokens(['feature', 'Implement auto-save for tech-debt tracker'])
    expect(result.title).toBe('Implement auto-save for tech-debt tracker')
    expect(result.slug).toBeNull()
  })

  // ── Type and priority parsing ─────────────────────────────────────

  test('combined type/priority token', () => {
    const result = parseCreateTokens(['feature/p2', '\'New feature\''])
    expect(result.type).toBe(TYPE_FEATURE)
    expect(result.priority).toBe(PRIORITY_P2)
    expect(result.title).toBe('New feature')
  })

  test('separate type and priority tokens', () => {
    const result = parseCreateTokens(['high', 'bug', '\'Critical crash\''])
    expect(result.type).toBe(TYPE_BUG)
    expect(result.priority).toBe(PRIORITY_HIGH)
    expect(result.title).toBe('Critical crash')
  })

  // ── Defaults ──────────────────────────────────────────────────────

  test('defaults to default type and medium priority', () => {
    const result = parseCreateTokens(['\'Just a title\''])
    expect(result.type).toBe(TYPE_TASK)
    expect(result.priority).toBe(PRIORITY_MEDIUM)
    expect(result.title).toBe('Just a title')
  })

  // ── Error case ────────────────────────────────────────────────────

  test('throws when no title can be determined', () => {
    expect(() => parseCreateTokens([])).toThrow('Usage:')
  })

  // ── Strict explicit token validation (MDT-263) ────────────

  test('unknown type part in combined token throws with valid set', () => {
    expect(() => parseCreateTokens(['chore/low', '\'Probe\''])).toThrow(/Unknown create token 'chore\/low' \(part 'chore'\)/)
    expect(() => parseCreateTokens(['chore/low', '\'Probe\''])).toThrow(/Valid types: Architecture, Feature Enhancement, Bug Fix, Technical Debt, Documentation, Research/)
    expect(() => parseCreateTokens(['chore/low', '\'Probe\''])).toThrow(/Valid priorities: Low, Medium, High, Critical/)
  })

  test('unknown priority part in combined token throws', () => {
    expect(() => parseCreateTokens(['feature/urgent', '\'Probe\''])).toThrow(/\(part 'urgent'\)/)
  })

  test('fully unknown combined token throws', () => {
    expect(() => parseCreateTokens(['chore/x', '\'Probe\''])).toThrow(/\(part 'chore'\)/)
  })

  test('unknown standalone token with quoted title throws', () => {
    expect(() => parseCreateTokens(['spike', '\'Probe\''])).toThrow(/Unknown create token 'spike'/)
  })

  test('unknown standalone token after title throws instead of silent drop', () => {
    expect(() => parseCreateTokens(['bug', '\'Fix X\'', 'login'])).toThrow(/Unknown create token 'login'/)
  })

  test('unknown standalone token without quoted title becomes the title (legacy)', () => {
    const result = parseCreateTokens(['feature', 'Refactor'])
    expect(result.title).toBe('Refactor')
    expect(result.type).toBe(TYPE_FEATURE)
  })

  test('dashed slug tokens are never enum candidates', () => {
    const result = parseCreateTokens(['bug', '\'Fix X\'', 'login-timeout'])
    expect(result.slug).toBe('login-timeout')
    expect(result.title).toBe('Fix X')
  })

  test('known aliases still resolve under strict validation', () => {
    const result = parseCreateTokens(['bug/p1', '\'Critical crash\''])
    expect(result.type).toBe(TYPE_BUG)
    expect(result.priority).toBe('Critical')

    const debt = parseCreateTokens(['tech-debt', '\'X\''])
    expect(debt.type).toBe('Technical Debt')

    const docs = parseCreateTokens(['docs', '\'X\''])
    expect(docs.type).toBe('Documentation')
  })

  test('canonical multi-word type token still resolves', () => {
    const result = parseCreateTokens(['feature enhancement', '\'X\''])
    expect(result.type).toBe(TYPE_FEATURE)
  })

  // ── MDT-263 review regressions ────────────────────

  test('canonical multi-word type does not count as an explicit title (review #2)', () => {
    const result = parseCreateTokens(['Feature Enhancement', 'Refactor'])
    expect(result.type).toBe(TYPE_FEATURE)
    expect(result.title).toBe('Refactor')
  })

  test('slash inside a multi-word title token is title text, not enum grammar (review #1)', () => {
    const result = parseCreateTokens(['bug', 'Fix input/output'])
    expect(result.type).toBe(TYPE_BUG)
    expect(result.title).toBe('Fix input/output')
  })

  test('two bare unknown words reject in either order — real-shell single-word titles (review #1)', () => {
    // A real shell strips quotes: `create spike 'Probe'` arrives as [spike, Probe]
    expect(() => parseCreateTokens(['spike', 'Probe'])).toThrow(/Unknown create token 'Probe'/)
    expect(() => parseCreateTokens(['Probe', 'spike'])).toThrow(/Unknown create token 'spike'/)
  })

  test('inherited Object properties never resolve as enum tokens (review #3)', () => {
    expect(() => parseCreateTokens(['constructor/low', '\'X\''])).toThrow(/\(part 'constructor'\)/)
    expect(() => parseCreateTokens(['__proto__/p1', '\'X\''])).toThrow(/\(part '__proto__'\)/)
    expect(() => parseCreateTokens(['bug', '\'X\'', 'constructor'])).toThrow(/Unknown create token 'constructor'/)
    expect(() => parseCreateTokens(['bug', '\'X\'', 'toString'])).toThrow(/Unknown create token 'toString'/)
  })
})
