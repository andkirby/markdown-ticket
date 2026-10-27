import type { ExternalReference } from '@mdt/domain-contracts'
import type { KeyboardEvent } from 'react'
import { resolveExternalReferences } from '@mdt/shared/services/externalReferences'
import { referenceMatchScore } from '@mdt/shared/services/ticket/referenceSearch'
import { ArrowUpRight, CircleAlert } from 'lucide-react'
import { useId, useRef } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { TrackerIcon } from './TrackerIcon'

function isolateCard(event: { stopPropagation: () => void }) {
  event.stopPropagation()
}

function isolateKeyboard(event: KeyboardEvent) {
  if (['Enter', ' ', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key))
    event.stopPropagation()
}

function ReferenceBadge({ reference, full = false }: { reference: ExternalReference, full?: boolean }) {
  const label = full ? reference.ref : reference.displayKey
  const content = (
    <>
      {reference.url ? <TrackerIcon kind={reference.kind} /> : <CircleAlert className="external-reference__icon" aria-hidden="true" />}
      {!full && reference.instanceLabel && (
        <span className="external-reference__instance">
          {reference.instanceLabel}
          :
        </span>
      )}
      <span className="external-reference__key ticket-key">{label}</span>
      {reference.url && <ArrowUpRight className="external-reference__arrow" aria-hidden="true" />}
    </>
  )
  if (!reference.url) {
    return (
      <span className="badge external-reference" data-external-reference data-reference-state="unavailable" data-testid="external-reference-unavailable" title={reference.unavailableReason} aria-label={`${reference.ref}: unavailable. ${reference.unavailableReason ?? ''}`}>
        {content}
      </span>
    )
  }
  return (
    <a className="badge external-reference" data-external-reference data-reference-state="resolved" data-testid="external-reference-link" href={reference.url} target="_blank" rel="noopener noreferrer" draggable={false} title={`${reference.ref} — ${reference.url}`} aria-label={`Open ${reference.key} in ${reference.kind} (${reference.instance}), new tab`} onClick={isolateCard} onPointerDown={isolateCard} onMouseDown={isolateCard} onKeyDown={isolateKeyboard}>
      {content}
    </a>
  )
}

interface ExternalReferenceBadgesProps {
  refs?: readonly string[]
  externalRefs?: readonly ExternalReference[]
  full?: boolean
  query?: string
}

/**
 * @testid external-reference-link — explicit native new-tab issue link
 * @testid external-reference-unavailable — preserved non-navigating ref
 * @testid external-reference-details-trigger — full-list inspection, including <=2 refs
 * @testid external-reference-details — complete bounded reference list
 */
export function ExternalReferenceBadges({ refs, externalRefs, full = false, query = '' }: ExternalReferenceBadgesProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const labelId = useId()
  const references = externalRefs ?? resolveExternalReferences(refs ?? [], undefined)
  if (references.length === 0)
    return null
  const occurrences = new Map<string, number>()
  const entries = references.map((reference) => {
    const occurrence = (occurrences.get(reference.ref) ?? 0) + 1
    occurrences.set(reference.ref, occurrence)
    return { reference, key: `${reference.ref}:${occurrence}` }
  })
  const inline = [...entries].sort((a, b) => referenceMatchScore([b.reference.ref], query) - referenceMatchScore([a.reference.ref], query)).slice(0, 2)
  return (
    <>
      {inline.map(({ reference, key }) => <ReferenceBadge key={key} reference={reference} full={full} />)}
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="badge external-reference__more" data-external-reference data-testid="external-reference-details-trigger" aria-label={`Inspect all ${references.length} external references`} onClick={isolateCard} onPointerDown={isolateCard} onMouseDown={isolateCard} onKeyDown={isolateKeyboard}>
            {references.length > 2 ? `+${references.length - 2}` : '⋯'}
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
          {entries.map(({ reference, key }) => (
            <div className="external-reference__detail" key={key}>
              <ReferenceBadge reference={reference} full />
              {reference.unavailableReason && <span className="external-reference__reason">{reference.unavailableReason}</span>}
            </div>
          ))}
        </PopoverContent>
      </Popover>
    </>
  )
}
