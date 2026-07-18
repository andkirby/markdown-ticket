/**
 * Tests for the prose precondition scanner (MDT-189 TASK-prose-scan).
 *
 * Covers bdd.md S8 (precondition-section scan lists missing structured deps)
 * and S9 (casual mentions outside precondition sections are ignored), plus
 * edge cases: no precondition section, multiple precondition sections, bare
 * vs fully-qualified keys, dedup, dependencies already declared.
 *
 * Framework: @jest/globals (cross-runner safe).
 */

import { describe, expect, it } from '@jest/globals'
import type { Ticket } from '../../../models/Ticket.js'
import { scanProseGaps } from '../proseScanner.js'

function makeTicket(content: string, dependsOn: string[] = []): Ticket {
  return {
    code: 'MDT-188',
    title: 'Test ticket',
    status: 'Approved',
    type: 'Feature Enhancement',
    priority: 'High',
    dateCreated: null,
    lastModified: null,
    content,
    filePath: '',
    relatedTickets: [],
    dependsOn,
    blocks: [],
  }
}

describe('scanProseGaps', () => {
  it('lists CR keys in a Precondition section that are absent from dependsOn (S8)', () => {
    const ticket = makeTicket(
      [
        '## Description',
        'Body text.',
        '',
        '## Preconditions',
        'VOC-049, VOC-050, VOC-051 and VOC-052 implemented before this ticket.',
      ].join('\n'),
      ['VOC-053'],
    )
    expect(scanProseGaps(ticket, 'MDT').sort()).toEqual([
      'VOC-049',
      'VOC-050',
      'VOC-051',
      'VOC-052',
    ])
  })

  it('recognizes the singular "## Precondition" header', () => {
    const ticket = makeTicket(
      ['## Precondition', 'MDT-100 must be done first.'].join('\n'),
      [],
    )
    expect(scanProseGaps(ticket, 'MDT')).toEqual(['MDT-100'])
  })

  it('recognizes the "## Prerequisites" header (plural alt)', () => {
    const ticket = makeTicket(
      ['## Prerequisites', 'VOC-053 lands first.'].join('\n'),
      [],
    )
    expect(scanProseGaps(ticket, 'MDT')).toEqual(['VOC-053'])
  })

  it('ignores CR keys mentioned outside any precondition section (S9)', () => {
    const ticket = makeTicket(
      [
        '## Description',
        'See also MDT-030 for context.',
        '',
        '## Preconditions',
        'VOC-053 lands first.',
      ].join('\n'),
      [],
    )
    // MDT-030 is in a non-precondition section → not flagged.
    expect(scanProseGaps(ticket, 'MDT')).toEqual(['VOC-053'])
  })

  it('does NOT flag keys that are already declared in dependsOn', () => {
    const ticket = makeTicket(
      ['## Preconditions', 'MDT-100 and MDT-101 must be done.'].join('\n'),
      ['MDT-100', 'MDT-101'],
    )
    expect(scanProseGaps(ticket, 'MDT')).toEqual([])
  })

  it('recognizes only fully-qualified CR-key tokens in prose (bare numbers are ambiguous, ignored)', () => {
    // Design choice: bare numbers like "100" in prose are ambiguous (could
    // be a spec section, a line number, etc.), so the scanner only matches
    // fully-qualified tokens (PROJECT-###). This matches bdd.md S8/S9 where
    // every prose example uses a fully-qualified key.
    const ticket = makeTicket(
      [
        '## Preconditions',
        // MDT-100 is a real CR-key token; bare 200 and 300 are not.
        'MDT-100 must be done first. See also items 200 and 300.',
      ].join('\n'),
      [],
    )
    expect(scanProseGaps(ticket, 'MDT')).toEqual(['MDT-100'])
  })

  it('handles multiple precondition sections (accumulates gaps from each)', () => {
    const ticket = makeTicket(
      [
        '## Preconditions',
        'VOC-053 lands.',
        '',
        '## Other Section',
        'MDT-099 should NOT be flagged.',
        '',
        '## Prerequisites',
        'MDT-100 also required.',
      ].join('\n'),
      [],
    )
    expect(scanProseGaps(ticket, 'MDT').sort()).toEqual(['MDT-100', 'VOC-053'])
  })

  it('returns an empty array when the body has no precondition section', () => {
    const ticket = makeTicket(
      ['## Description', 'Body mentioning MDT-050 but not in a precondition.'].join('\n'),
      [],
    )
    expect(scanProseGaps(ticket, 'MDT')).toEqual([])
  })

  it('returns an empty array when the precondition section is empty', () => {
    const ticket = makeTicket(['## Preconditions', ''].join('\n'), [])
    expect(scanProseGaps(ticket, 'MDT')).toEqual([])
  })

  it('de-duplicates repeated tokens in the same precondition section', () => {
    const ticket = makeTicket(
      ['## Preconditions', 'VOC-053 here. VOC-053 again. VOC-053 thrice.'].join('\n'),
      [],
    )
    expect(scanProseGaps(ticket, 'MDT')).toEqual(['VOC-053'])
  })

  it('preserves first-mention order (stable for deterministic CLI output)', () => {
    const ticket = makeTicket(
      ['## Preconditions', 'VOC-100, then MDT-200, then VOC-300.'].join('\n'),
      [],
    )
    expect(scanProseGaps(ticket, 'MDT')).toEqual(['VOC-100', 'MDT-200', 'VOC-300'])
  })

  it('handles an empty ticket body', () => {
    const ticket = makeTicket('', ['MDT-001'])
    expect(scanProseGaps(ticket, 'MDT')).toEqual([])
  })
})
