import { TICKET_KEY_INPUT_PATTERN } from '@mdt/domain-contracts'
import { normalizeKeyTerm } from '../../utils/keyNormalizer.js'
import { parseExternalIdentity } from '../externalReferences.js'

/** Resolution/configuration never changes which stored identities are searchable. */
export function referenceMatchScore(refs: readonly string[] | undefined, query: string): number {
  const term = query.trim().toLowerCase()
  if (!term)
    return 0
  const gitNumber = /^#(\d+)$/.exec(term)
  let score = 0
  for (const ref of refs ?? []) {
    const identity = parseExternalIdentity(ref)
    if (gitNumber) {
      if (identity.repository && identity.number === gitNumber[1])
        score = 100
      continue
    }
    if (ref.toLowerCase() === term || identity.key.toLowerCase() === term || identity.number === term)
      score = Math.max(score, 100)
    else if (ref.toLowerCase().includes(term))
      score = Math.max(score, 35)
  }
  return score
}

export function isReferenceKeyQuery(query: string): boolean {
  const term = query.trim()
  return TICKET_KEY_INPUT_PATTERN.test(term) || /^#?\d+$/.test(term) || /^\S[^\s:]*:\S+$/.test(term) || /^\S[^\s/]*\/\S+#\d+$/.test(term)
}

export function ticketSearchProvenance(ticket: { code: string, title: string, description?: string, refs?: readonly string[] }, query: string): Array<'local-key' | 'external-ref' | 'text'> {
  const term = query.trim().toLowerCase()
  if (!term)
    return []
  const sources: Array<'local-key' | 'external-ref' | 'text'> = []
  if (referenceMatchScore(ticket.refs, term))
    sources.push('external-ref')
  if (/^#\d+$/.test(term))
    return sources
  const code = ticket.code.toLowerCase()
  const keyMatch = TICKET_KEY_INPUT_PATTERN.test(term)
    ? code === normalizeKeyTerm(term)
    : /^\d+$/.test(term) ? code.split('-').slice(-1)[0]!.includes(term) || Number(code.split('-').slice(-1)[0]) === Number(term) : code.includes(term)
  if (keyMatch)
    sources.unshift('local-key')
  if (ticket.title.toLowerCase().includes(term) || ticket.description?.toLowerCase().includes(term))
    sources.push('text')
  return sources
}

/** Rank exact identities before partial code/ref/text matches, independently of project. */
export function ticketSearchScore(ticket: { code: string, title: string, refs?: readonly string[] }, query: string): number {
  const term = query.trim().toLowerCase()
  const code = ticket.code.toLowerCase()
  const exactLocal = code === normalizeKeyTerm(term)
    || (/^\d+$/.test(term) && Number(code.split('-').slice(-1)[0]) === Number(term))
  return exactLocal ? 200 : Math.max(referenceMatchScore(ticket.refs, term), ticketSearchProvenance(ticket, term).includes('local-key') ? 40 : 0)
}
