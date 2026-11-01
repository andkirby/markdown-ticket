import type { ExternalReference } from '@mdt/domain-contracts'
import type { KeyboardEvent, ReactNode } from 'react'
import { ExternalLink } from 'lucide-react'
import { ExternalReferencePopover } from './ExternalReferencePopover'
import { splitRepositoryLabel } from './referenceLabel'

function isolate(event: { stopPropagation: () => void }) {
  event.stopPropagation()
}

function isolateKeyboard(event: KeyboardEvent) {
  if (['Enter', ' ', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key))
    event.stopPropagation()
}

export function ExternalReferenceLink({ reference, renderLabel = label => label, expanded = false, indicator = false }: {
  reference: ExternalReference
  renderLabel?: (label: string) => ReactNode
  expanded?: boolean
  indicator?: boolean
}) {
  const repository = !expanded && splitRepositoryLabel(reference)
  const content = (
    <span className="external-reference__key ticket-key">
      {repository
        ? (
            <>
              <span className="external-reference__repository">
                <span className="external-reference__repository-start">{renderLabel(repository.start)}</span>
                <span className="external-reference__repository-end">{renderLabel(repository.end)}</span>
              </span>
              <span className="external-reference__issue">{renderLabel(repository.issue)}</span>
            </>
          )
        : renderLabel(expanded ? reference.ref : reference.displayKey)}
    </span>
  )
  if (!reference.url) {
    const reason = reference.unavailableReason ?? 'This reference cannot be opened.'
    if (expanded) {
      return <span className="external-reference__link ticket-key" data-reference-state="unavailable" data-testid="external-reference-unavailable">{content}</span>
    }
    return (
      <ExternalReferencePopover
        label={`Why ${reference.ref} is unavailable`}
        trigger={(
          <button className="external-reference__more external-reference__link" type="button" data-reference-state="unavailable" data-testid="external-reference-details-trigger" title={`${reference.ref}: ${reason}`} aria-label={`Explain unavailable reference ${reference.ref}`}>
            <span data-testid="external-reference-unavailable">{content}</span>
          </button>
        )}
      >
        <span className="external-reference__reason">{reason}</span>
      </ExternalReferencePopover>
    )
  }
  return (
    <a className="external-reference__link ticket-key" data-testid="external-reference-link" href={reference.url} target="_blank" rel="noopener noreferrer" draggable={false} title={`${reference.ref} — ${reference.url}`} aria-label={`Open ${reference.key} in ${reference.kind} (${reference.instance}), new tab`} onClick={isolate} onPointerDown={isolate} onMouseDown={isolate} onKeyDown={isolateKeyboard}>
      {content}
      {indicator && <ExternalLink className="badge__icon badge__icon--indicator external-reference__arrow" aria-hidden="true" />}
    </a>
  )
}
