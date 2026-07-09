/**
 * Attr command metadata (MDT-143).
 *
 * Single source of truth for the accepted attr fields + their help text.
 * Imported by command registration (index.ts → --help) AND the parser
 * (attr.ts → validation), so help output and accepted fields cannot drift.
 * Lightweight by design: imports only domain-contracts, no services —
 * keeps it out of the lazy-loaded command graph.
 */
import { CRPriorities, CRStatuses } from '@mdt/domain-contracts/types'

/** CLI field token → shared field name. */
export const ATTR_FIELDS: Record<string, string> = {
  'status': 'status',
  'priority': 'priority',
  'phase': 'phaseEpic',
  'assignee': 'assignee',
  'related': 'relatedTickets',
  'depends': 'dependsOn',
  'blocks': 'blocks',
  'impl-date': 'implementationDate',
  'impl-notes': 'implementationNotes',
}

export const ATTR_HELP = {
  description: `Update ticket attributes. Fields: ${Object.keys(ATTR_FIELDS).join(', ')}.`,
  // Explicit \n so commander renders one idea per line instead of word-wrapping into a blob.
  // Continuation lines are padded to the description column so they align under <attrs>
  // rather than sitting flush-left (commander indents arg-description continuations by 2).
  attrsArg: [
    'Set attributes as <field><op><value>. Operators: = set, += add, -= remove (relations only).',
    `status: ${CRStatuses.join(' | ')}`,
    '  aliases: backlog->Proposed, open->Approved, done/complete->Implemented, in-progress->In Progress, partial->Partially Implemented, deferred->On Hold',
    `priority: ${CRPriorities.join(' | ')}  (aliases: p1-p4)`,
    'Examples: status=Implemented  priority=High  related+=MDT-100  depends-=MDT-001',
  ].join(`\n  ${' '.repeat(11)}`),
}
