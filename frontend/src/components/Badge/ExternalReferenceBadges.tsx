import type { ExternalReference } from '@mdt/domain-contracts'
import type { ReactNode } from 'react'
import { resolveExternalReferences } from '@mdt/shared/services/externalReferences'
import { referenceMatchScore } from '@mdt/shared/services/ticket/referenceSearch'
import { CircleAlert } from 'lucide-react'
import { ExternalReferenceLink } from './ExternalReferenceLink'
import { ExternalReferencePopover } from './ExternalReferencePopover'
import { INLINE_MAX } from './RelationshipBadge'
import { TrackerIcon } from './TrackerIcon'

function ReferenceGroup({ references, query, renderLabel }: { references: ExternalReference[], query: string, renderLabel?: (label: string) => ReactNode }) {
  const entries = references.map((reference, index) => ({ reference, key: `${reference.ref}:${index}` }))
  const inline = [...entries].sort((a, b) => referenceMatchScore([b.reference.ref], query) - referenceMatchScore([a.reference.ref], query)).slice(0, INLINE_MAX)
  const visibleKeys = new Set(inline.map(entry => entry.key))
  const overflow = entries.filter(entry => !visibleKeys.has(entry.key))
  const lastLinkKey = [...inline].reverse().find(({ reference }) => reference.url)?.key
  const first = references[0]!
  const hasUnavailable = references.some(reference => !reference.url)
  return (
    <span className="badge external-reference" data-external-reference data-testid="external-reference-group" role="group" aria-label={`${first.kind ?? 'External'} references (${first.instance || 'unconfigured'})`} title={references.map(reference => reference.ref).join(', ')}>
      {first.kind ? <TrackerIcon kind={first.kind} /> : <CircleAlert className="external-reference__icon" aria-hidden="true" />}
      {first.instanceLabel && (
        <span className="external-reference__instance">
          {first.instanceLabel}
          :
        </span>
      )}
      {inline.map(({ reference, key }) => <ExternalReferenceLink key={key} reference={reference} renderLabel={renderLabel} indicator={key === lastLinkKey} />)}
      {hasUnavailable && first.kind && <CircleAlert className="external-reference__icon" aria-label="Includes unavailable references" />}
      {overflow.length > 0 && (
        <ExternalReferencePopover
          label={`More external references in ${first.instance}`}
          trigger={(
            <button type="button" className="external-reference__more" data-testid="external-reference-details-trigger" aria-label={`Show ${overflow.length} more external references in ${first.instance}`}>
              +
              {overflow.length}
            </button>
          )}
        >
          {overflow.map(({ reference, key }) => (
            <div className="external-reference__detail" key={key}>
              <ExternalReferenceLink reference={reference} renderLabel={renderLabel} expanded />
              {!reference.url && <span className="external-reference__reason">{reference.unavailableReason ?? 'This reference cannot be opened.'}</span>}
            </div>
          ))}
        </ExternalReferencePopover>
      )}
    </span>
  )
}

interface ExternalReferenceBadgesProps {
  refs?: readonly string[]
  externalRefs?: readonly ExternalReference[]
  query?: string
  renderLabel?: (label: string) => ReactNode
}

/**
 * @testid external-reference-group — one tracker-instance badge with up to three keys
 * @testid external-reference-link — explicit native new-tab issue link
 * @testid external-reference-unavailable — preserved non-navigating ref
 * @testid external-reference-details-trigger — overflow or unavailable explanation
 * @testid external-reference-details — bounded hidden-reference list
 */
export function ExternalReferenceBadges({ refs, externalRefs, query = '', renderLabel }: ExternalReferenceBadgesProps) {
  const references = externalRefs ?? resolveExternalReferences(refs ?? [], undefined)
  const groups = new Map<string, ExternalReference[]>()
  for (const reference of references) {
    const group = groups.get(reference.instance) ?? []
    group.push(reference)
    groups.set(reference.instance, group)
  }
  const ordered = [...groups.entries()].sort((a, b) => referenceMatchScore(b[1].map(reference => reference.ref), query) - referenceMatchScore(a[1].map(reference => reference.ref), query))
  return <>{ordered.map(([instance, entries]) => <ReferenceGroup key={instance} references={entries} query={query} renderLabel={renderLabel} />)}</>
}
