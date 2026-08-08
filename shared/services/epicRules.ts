/**
 * MDT-205 — Pure epic domain rules.
 *
 * These functions encode the stable facts about epics and have ZERO I/O. The
 * shared `TicketService` is the sole orchestrator: it fetches the target ticket
 * or children (it owns getCR / listCRs) and passes plain data into these pure
 * functions. Keeping the rules pure means they are exhaustively unit-testable
 * without a filesystem and reusable by future consumers (dry-run, bulk
 * validation, the frontend offering phaseEpic targets).
 *
 * Two validation concerns live here:
 *  1. phaseEpic target resolution — a child's `phaseEpic` pointing at a ticket
 *     key must target a real epic in a usable (Approved / Implemented) state.
 *  2. epic close guard — an epic may not move to Implemented while it has
 *     non-terminal children.
 *
 * Free-text phaseEpic values that are not ticket-key-shaped are intentionally
 * NOT validated (Edge-6) — only ticket-key-shaped values trigger a lookup.
 */

import type { CRLevelValue } from '../models/Types.js'
import { TICKET_KEY_INPUT_PATTERN } from '@mdt/domain-contracts'
import { CRLevel, CRStatus } from '../models/Types.js'

/**
 * Statuses in which an epic is referenceable by a child's `phaseEpic`.
 * A `Proposed` epic is not yet usable; `Approved` and `Implemented` are.
 */
export const USABLE_EPIC_STATUSES: readonly string[] = [
  CRStatus.APPROVED,
  CRStatus.IMPLEMENTED,
] as const

/**
 * Statuses that count as "done" for the epic close guard. An epic may move to
 * Implemented only when every child is in one of these terminal states (C-3).
 */
export const EPIC_CLOSE_TERMINAL_STATUSES: readonly string[] = [
  CRStatus.IMPLEMENTED,
  CRStatus.REJECTED,
  CRStatus.PARTIALLY_IMPLEMENTED,
] as const

/**
 * Stable, actionable error codes for epic-rule violations. Every surface (CLI,
 * MCP, REST) maps these to user-facing text so behaviour is uniform (BR-2).
 */
export const EPIC_ERROR_CODES = {
  TARGET_NOT_FOUND: 'EPIC_TARGET_NOT_FOUND',
  TARGET_NOT_EPIC: 'EPIC_TARGET_NOT_EPIC',
  NOT_USABLE: 'EPIC_NOT_USABLE',
  HAS_OPEN_CHILDREN: 'EPIC_HAS_OPEN_CHILDREN',
} as const

export type EpicErrorCode
  = (typeof EPIC_ERROR_CODES)[keyof typeof EPIC_ERROR_CODES]

export class EpicRuleError extends Error {
  readonly code: EpicErrorCode
  readonly details?: unknown
  constructor(code: EpicErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'EpicRuleError'
    this.code = code
    this.details = details
  }
}

/**
 * True when a value is ticket-key-shaped (`CODE-###`, case-insensitive).
 * Only key-shaped phaseEpic values are validated against a target ticket;
 * free text (e.g. "Q3 cleanup") is left untouched (Edge-6).
 */
export function isTicketKey(value: unknown): value is string {
  return (
    typeof value === 'string'
    && value.trim().length > 0
    && TICKET_KEY_INPUT_PATTERN.test(value.trim())
  )
}

/** True when the status permits an epic to be referenced by a child. */
export function isUsableEpicState(status: unknown): boolean {
  return (
    typeof status === 'string'
    && (USABLE_EPIC_STATUSES as readonly string[]).includes(status)
  )
}

/** True when a status counts as terminal for the epic close guard (C-3). */
export function isEpicCloseTerminal(status: unknown): boolean {
  return (
    typeof status === 'string'
    && (EPIC_CLOSE_TERMINAL_STATUSES as readonly string[]).includes(status)
  )
}

/** Minimal view of a ticket needed by the rules. */
export interface RuleTicket {
  code: string
  level?: CRLevelValue
  status?: string
  phaseEpic?: string
}

/**
 * Outcome of classifying a phaseEpic write. `skipped` means the value is not
 * ticket-key-shaped (free text) and needs no target lookup (Edge-6).
 */
export type PhaseEpicResolution
  = | { outcome: 'ok' }
    | { outcome: 'skipped' }
    | { outcome: 'reject', code: EpicErrorCode, message: string }

/**
 * Classify a `phaseEpic` write against its (possibly absent) target ticket.
 *
 * @param value      the new phaseEpic value (string, possibly empty to clear)
 * @param target     the resolved target ticket, or `null`/`undefined` if absent
 * @returns a resolution describing whether to accept, skip, or reject
 *
 * Rules:
 *  - empty / cleared phaseEpic → ok (clearing is always allowed, Edge-2)
 *  - non-ticket-key free text → skipped (no lookup, Edge-6)
 *  - key-shaped but target missing → reject TARGET_NOT_FOUND (Edge-7)
 *  - target present but level !== epic → reject TARGET_NOT_EPIC
 *  - target is an epic in Proposed → reject NOT_USABLE (must be Approved first)
 *  - target is an Approved/Implemented epic → ok
 */
export function resolvePhaseEpicTarget(
  value: string | undefined | null,
  target: RuleTicket | null | undefined,
): PhaseEpicResolution {
  const trimmed = (value ?? '').trim()

  // Clearing phaseEpic is always allowed, regardless of epic state (Edge-2).
  if (trimmed === '') {
    return { outcome: 'ok' }
  }

  // Free-text (non-ticket-key) values are not validated (Edge-6).
  if (!isTicketKey(trimmed)) {
    return { outcome: 'skipped' }
  }

  // Key-shaped value: the target must exist and be a usable epic.
  if (!target) {
    return {
      outcome: 'reject',
      code: EPIC_ERROR_CODES.TARGET_NOT_FOUND,
      message: `phaseEpic target "${trimmed}" does not exist. Create it as an epic or check the ticket key.`,
    }
  }

  if (target.level !== CRLevel.EPIC) {
    return {
      outcome: 'reject',
      code: EPIC_ERROR_CODES.TARGET_NOT_EPIC,
      message: `phaseEpic target "${trimmed}" is not an epic (level=ticket). Set its level to epic first.`,
    }
  }

  if (!isUsableEpicState(target.status)) {
    return {
      outcome: 'reject',
      code: EPIC_ERROR_CODES.NOT_USABLE,
      message: `phaseEpic target "${trimmed}" is an epic in status "${target.status ?? 'Proposed'}". Approve the epic before referencing it.`,
    }
  }

  return { outcome: 'ok' }
}

/**
 * Enforce the epic close guard.
 *
 * An epic may move to Implemented only when it has no non-terminal children.
 * Returns the list of blocking children so the error can name them (BR-5).
 *
 * @param epic      the epic attempting to close (must be level=epic)
 * @param children  the epic's child tickets (any ticket whose phaseEpic points here)
 * @throws EpicRuleError(HAS_OPEN_CHILDREN) when any child is non-terminal
 *
 * Edge-3: an epic with zero children is closable (guard is vacuous).
 */
export function assertEpicClosable(
  epic: RuleTicket,
  children: RuleTicket[],
): void {
  const blockers = children.filter(
    child => !isEpicCloseTerminal(child.status),
  )
  if (blockers.length > 0) {
    throw new EpicRuleError(
      EPIC_ERROR_CODES.HAS_OPEN_CHILDREN,
      `Cannot move epic "${epic.code}" to Implemented: ${blockers.length} child ticket(s) are not terminal: ${blockers.map(b => b.code).join(', ')}.`,
      { blockers: blockers.map(b => b.code) },
    )
  }
}
