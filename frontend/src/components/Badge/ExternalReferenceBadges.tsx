import type { ExternalReference } from '@mdt/domain-contracts'
import type { KeyboardEvent, ReactNode } from 'react'
import { resolveExternalReferences } from '@mdt/shared/services/externalReferences'
import { referenceMatchScore } from '@mdt/shared/services/ticket/referenceSearch'
import { ArrowUpRight, CircleAlert } from 'lucide-react'
import { useId, useRef } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { INLINE_MAX } from './RelationshipBadge'
import { TrackerIcon } from './TrackerIcon'

function isolateCard(event: { stopPropagation: () => void }) {
  event.stopPropagation()
}

function isolateKeyboard(event: KeyboardEvent) {
  if (['Enter', ' ', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key))
    event.stopPropagation()
}

function ReferenceLink({ reference, renderLabel }: { reference: ExternalReference, renderLabel?: (label: string) => ReactNode }) {
  const content = <span className="external-reference__key">{renderLabel ? renderLabel(reference.displayKey) : reference.displayKey}</span>
  if (!reference.url) {
    return (
      <span className="external-reference__link ticket-key" data-reference-state="unavailable" data-testid="external-reference-unavailable" title={`${reference.ref}: ${reference.unavailableReason ?? 'Unavailable'}`} aria-label={`${reference.ref}: unavailable. ${reference.unavailableReason ?? ''}`}>
        {content}
      </span>
    )
  }
  return (
    <a className="external-reference__link ticket-key" data-testid="external-reference-link" href={reference.url} target="_blank" rel="noopener noreferrer" draggable={false} title={`${reference.ref} — ${reference.url}`} aria-label={`Open ${reference.key} in ${reference.kind} (${reference.instance}), new tab`} onClick={isolateCard} onPointerDown={isolateCard} onMouseDown={isolateCard} onKeyDown={isolateKeyboard}>
      {content}
    </a>
  )
}

function ReferenceGroup({ references, query, renderLabel }: { references: ExternalReference[], query: string, renderLabel?: (label: string) => ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null)
  const labelId = useId()
  const entries = references.map((reference, index) => ({ reference, key: `${reference.ref}:${index}` }))
  const inline = [...entries].sort((a, b) => referenceMatchScore([b.reference.ref], query) - referenceMatchScore([a.reference.ref], query)).slice(0, INLINE_MAX)
  const visibleKeys = new Set(inline.map(entry => entry.key))
  const overflow = entries.filter(entry => !visibleKeys.has(entry.key))
  // Unavailable inline refs retain a non-navigating path to their explanation.
  // Resolved links already visible on the card never repeat in the dropdown.
  const details = entries.filter(entry => !visibleKeys.has(entry.key) || !entry.reference.url)
  const first = references[0]!
  const hasLinks = references.some(reference => reference.url)
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
      {inline.map(({ reference, key }) => <ReferenceLink key={key} reference={reference} renderLabel={renderLabel} />)}
      {hasLinks && <ArrowUpRight className="external-reference__arrow" aria-hidden="true" />}
      {hasUnavailable && first.kind && <CircleAlert className="external-reference__icon" aria-label="Includes unavailable references" />}
      {details.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="external-reference__more" data-testid="external-reference-details-trigger" aria-label={overflow.length > 0 ? `Show ${overflow.length} more external references in ${first.instance}` : `Inspect unavailable external references in ${first.instance}`} onClick={isolateCard} onPointerDown={isolateCard} onMouseDown={isolateCard} onKeyDown={isolateKeyboard}>
              {overflow.length > 0 ? `+${overflow.length}` : '⋯'}
            </button>
          </PopoverTrigger>
          <PopoverContent
            ref={panelRef}
            className="external-reference__panel"
            data-external-references
            data-testid="external-reference-details"
            tabIndex={-1}
            aria-labelledby={labelId}
            align="start"
            onClick={isolateCard}
            onPointerDown={isolateCard}
            onEscapeKeyDown={isolateCard}
            onOpenAutoFocus={(event) => {
              event.preventDefault()
              const target = panelRef.current?.querySelector<HTMLAnchorElement>('a[href]') ?? panelRef.current
              target?.focus()
            }}
          >
            <strong id={labelId} className="external-reference__heading">External references</strong>
            {details.map(({ reference, key }) => (
              <div className="external-reference__detail" key={key}>
                <ReferenceLink reference={reference} renderLabel={renderLabel} />
                {reference.unavailableReason && <span className="external-reference__reason">{reference.unavailableReason}</span>}
              </div>
            ))}
          </PopoverContent>
        </Popover>
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
