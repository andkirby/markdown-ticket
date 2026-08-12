/**
 * Unified browser-facing ticket view contract (MDT-226).
 *
 * Source: docs/CRs/MDT-226/architecture.md § Browser-facing ticket contract,
 *         docs/CRs/MDT-226/requirements.md C-11, BR-1.9.
 *
 * The board consumes one unified ticket read model. A canonical local ticket
 * and a cloud projection-only entry share the ticket fields the board needs;
 * `kind`, `readOnly`, and `stale` let the UI render capabilities honestly. The
 * DTO contains no `projectRevision`, `projectionVersion`, catch-up state, cloud
 * URL, or credential (C-11).
 */

/** Whether a unified ticket item is canonical (local Markdown) or projected. */
export const TICKET_ITEM_KINDS = ['canonical', 'projected'] as const

export type TicketItemKind = (typeof TICKET_ITEM_KINDS)[number]

/**
 * One item in the unified browser-facing ticket read model.
 *
 * Field set is the board-relevant header only. Projected entries are always
 * read-only; canonical entries are editable. `stale` indicates the cloud state
 * behind this item is not currently live (C-11, BR-1.5).
 */
export interface UnifiedTicketItem {
  /** `canonical` = local Markdown; `projected` = cloud-derived header only. */
  kind: TicketItemKind
  /** Projected items are always read-only; canonical items are editable. */
  readOnly: boolean
  /** Cloud state behind this item is not currently live. */
  stale: boolean
  /** Ticket code, e.g. `MDT-1`. */
  code: string
  title: string
  status: string
  type: string | null
  priority: string | null
  assignee: string | null
  /**
   * Ticket level (`ticket` | `epic`). Canonical local tickets carry the level
   * parsed from frontmatter (defaulting to `ticket`); the frontend needs this to
   * detect epics (flat board excludes them; swimlanes render them as lanes).
   * Projected entries do not yet carry level and report `null` (a projected
   * stub is not treated as an epic).
   */
  level: string | null
  /**
   * For a child ticket, the epic ticket code it belongs to (`phaseEpic`). The
   * swimlane board needs this to place child tickets under their epic lane.
   * Projected entries do not carry it and report `null`.
   */
  phaseEpic: string | null
  dateCreated: string | null
  lastModified: string | null
}

/** Type guard: the item is a canonical local Markdown ticket. */
export function isCanonicalTicket(item: UnifiedTicketItem): boolean {
  return item.kind === 'canonical'
}

/** Type guard: the item is a cloud-derived projection-only entry. */
export function isProjectedTicket(item: UnifiedTicketItem): boolean {
  return item.kind === 'projected'
}
