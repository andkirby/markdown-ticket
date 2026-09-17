/**
 * MDT-246: "Epics →" header action on the epic ticket detail.
 *
 * The forward half of the lane↔detail loop: the inverse action (lane → open
 * epic) uses the Docs glyph; this one uses the Epics view glyph (Rows3) — one
 * destination vocabulary, never the Zap identity glyph. The trailing
 * arrow-right is the go-verb: this control leaves the modal (the app has no
 * back stack), so the affordance must read as a jump.
 *
 * One navigation lands on /prj/:code/epics?epic=KEY — the URL change closes
 * the ticket modal with it (no onClose call, no orphaned state). Arrival
 * behavior is owned by SwimlaneBoard (epic-navigation.interactions.md).
 *
 * @testid epic-board-action — the "Epics →" CTA in the CompactTicketHeader action slot
 */
import { ArrowRight, Rows3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { buildEpicsFocusPath } from '../../routes'

interface EpicBoardActionProps {
  projectCode: string
  ticketCode: string
}

export function EpicBoardAction({ projectCode, ticketCode }: EpicBoardActionProps) {
  const navigate = useNavigate()
  const sentence = `Show ${ticketCode} on Epics board`
  return (
    <button
      type="button"
      className="ticket-viewer-action ticket-viewer-action--jump"
      onClick={() => navigate(buildEpicsFocusPath(projectCode, ticketCode))}
      aria-label={sentence}
      title={sentence}
      data-testid="epic-board-action"
    >
      <Rows3 aria-hidden="true" />
      <span>Epics</span>
      <ArrowRight className="ticket-viewer-action__arrow" aria-hidden="true" />
    </button>
  )
}
