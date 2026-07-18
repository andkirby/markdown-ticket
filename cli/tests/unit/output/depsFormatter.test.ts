/**
 * Tests for depsFormatter (MDT-189 TASK-formatter).
 *
 * Pure-function tests of the human-readable deps report renderer. The deps
 * command action is a thin wire (project/key resolution + delegation to the
 * shared DependencyGraph + scanProseGaps); the formatter is where all
 * presentation logic lives, so this is where coverage concentrates.
 *
 * Framework: @jest/globals (cross-runner safe — works under jest and bun test,
 * matching cli/tests conventions).
 *
 * NOTE: color output is gated by shouldUseColor() which checks NO_COLOR. The
 * tests run with color disabled (NO_COLOR=1 is the test-runner default for
 * deterministic output) — assertions are made against the plain-text form.
 */

import { describe, expect, it } from '@jest/globals'
import type { Violation } from '@mdt/shared/services/ticket/DependencyGraph.js'
import {
  formatDepsReport,
  formatEvidence,
  formatReadyLine,
  formatViolationRow,
  formatViolationTable,
} from '../../../src/output/depsFormatter.js'

// Force deterministic output regardless of TTY/NO_COLOR env state.
process.env.NO_COLOR = '1'

function violation(over: Partial<Violation> = {}): Violation {
  return {
    dep: 'MDT-101',
    status: 'Approved',
    kind: 'waiting',
    action: 'none (informational)',
    ...over,
  }
}

describe('formatReadyLine', () => {
  it('returns "Ready: YES" when zero violations', () => {
    expect(formatReadyLine(0)).toBe('Ready: YES')
  })

  it('returns singular "Ready: NO (1 unresolved)"', () => {
    expect(formatReadyLine(1)).toBe('Ready: NO (1 unresolved)')
  })

  it('returns plural "Ready: NO (N unresolved)"', () => {
    expect(formatReadyLine(2)).toBe('Ready: NO (2 unresolved)')
    expect(formatReadyLine(7)).toBe('Ready: NO (7 unresolved)')
  })
})

describe('formatEvidence', () => {
  it('renders a waiting violation with status in quotes', () => {
    const v = violation({ dep: 'VOC-053', status: 'Approved', kind: 'waiting' })
    expect(formatEvidence(v)).toBe('VOC-053 is "Approved" (waiting)')
  })

  it('renders a missing target with "Target missing" wording', () => {
    const v = violation({
      dep: 'MDT-999',
      status: 'missing',
      kind: 'broken-plan',
      action: 'reject-MDT-999 | unlink-MDT-999',
    })
    expect(formatEvidence(v)).toBe('Target missing (broken-plan); reject-MDT-999 | unlink-MDT-999')
  })

  it('renders a Rejected dep with the action hint in the evidence', () => {
    const v = violation({
      dep: 'MDT-101',
      status: 'Rejected',
      kind: 'broken-plan',
      action: 'reject-MDT-101 | unlink-MDT-101',
    })
    expect(formatEvidence(v)).toBe(
      'MDT-101 is "Rejected" (broken-plan); reject-MDT-101 | unlink-MDT-101',
    )
  })
})

describe('formatViolationRow', () => {
  it('emits "dependsOn: <KEY>" | status | evidence columns', () => {
    const v = violation({ dep: 'MDT-101', status: 'Approved', kind: 'waiting' })
    const row = formatViolationRow(v, false)
    expect(row).toContain('dependsOn: MDT-101')
    expect(row).toContain('| waiting')
    expect(row).toContain('| MDT-101 is "Approved" (waiting)')
  })

  it('renders broken-plan status as "broken" in the status column for fit', () => {
    const v = violation({
      dep: 'MDT-999',
      status: 'missing',
      kind: 'broken-plan',
      action: 'reject-MDT-999 | unlink-MDT-999',
    })
    const row = formatViolationRow(v, false)
    expect(row).toContain('| broken      |')
    // Evidence still preserves the full "broken-plan" word.
    expect(row).toContain('broken-plan')
  })
})

describe('formatViolationTable', () => {
  it('emits a header and separator before the rows', () => {
    const lines = formatViolationTable([violation()])
    expect(lines[0]).toMatch(/^Precondition/)
    expect(lines[1]).toMatch(/^-{10,}/)
  })

  it('emits one row per violation', () => {
    const lines = formatViolationTable([
      violation({ dep: 'MDT-100' }),
      violation({ dep: 'MDT-101' }),
    ])
    // header + separator + 2 rows
    expect(lines).toHaveLength(4)
    expect(lines[2]).toContain('dependsOn: MDT-100')
    expect(lines[3]).toContain('dependsOn: MDT-101')
  })
})

describe('formatDepsReport', () => {
  it('renders the full report: header, table, summary line', () => {
    const report = formatDepsReport({
      ticketCode: 'MDT-188',
      violations: [
        violation({ dep: 'VOC-053', status: 'Approved', kind: 'waiting' }),
      ],
      proseGaps: [],
    })
    expect(report).toContain('Dependency check: MDT-188')
    expect(report).toContain('dependsOn: VOC-053')
    expect(report).toContain('Ready: NO (1 unresolved)')
    // No prose gaps → no "Unverifiable prose" section.
    expect(report).not.toContain('Unverifiable prose')
  })

  it('renders the all-satisfied form with no table', () => {
    const report = formatDepsReport({
      ticketCode: 'MDT-100',
      violations: [],
      proseGaps: [],
    })
    expect(report).toContain('All dependencies satisfied.')
    expect(report).toContain('Ready: YES')
    expect(report).not.toContain('Precondition')
  })

  it('appends an "Unverifiable prose" section when proseGaps is non-empty (S8)', () => {
    const report = formatDepsReport({
      ticketCode: 'MDT-188',
      violations: [],
      proseGaps: ['VOC-049', 'VOC-050', 'VOC-051', 'VOC-052'],
    })
    expect(report).toContain('Unverifiable prose:')
    expect(report).toContain('VOC-049, VOC-050, VOC-051, VOC-052')
  })

  it('renders table + prose gaps + summary together when all three are non-empty', () => {
    const report = formatDepsReport({
      ticketCode: 'MDT-188',
      violations: [
        violation({ dep: 'VOC-053', status: 'Approved', kind: 'waiting' }),
        violation({
          dep: 'MDT-999',
          status: 'missing',
          kind: 'broken-plan',
          action: 'reject-MDT-999 | unlink-MDT-999',
        }),
      ],
      proseGaps: ['VOC-049', 'VOC-050'],
    })
    expect(report).toContain('Dependency check: MDT-188')
    expect(report).toContain('dependsOn: VOC-053')
    expect(report).toContain('Target missing (broken-plan)')
    expect(report).toContain('Unverifiable prose:')
    expect(report).toContain('Ready: NO (2 unresolved)')
  })
})
