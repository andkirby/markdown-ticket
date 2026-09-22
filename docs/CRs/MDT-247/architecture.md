# Architecture: MDT-247

**Source**: [MDT-247](../MDT-247-status-icon-integration.md) · [assess.md](./assess.md) (Option 1) · [requirements.md](./requirements.md) · [bdd.md](./bdd.md)
**Generated**: 2026-09-22 · Stage: `mdt:architecture` · Mode: normal (canonical)

## Overview

Status icons follow the two proven MDT-244 seams, extended by one deliberate inversion: a `StatusIcon` lookup component + `statusIcons.ts` map module mirror `TypeIcon`/`typeIcons.ts` exactly, but presence of the glyph is **opt-in by prop**, not config — `TicketCode` renders the status glyph only when a surface explicitly passes `status`. That single mechanism implements both the always-on icon-surfaces AND the suppression precedence: badge-co-rendering surfaces simply don't pass the prop, so double encoding is impossible by construction. The `SearchResponseSchema` gains one additive optional field (`status`, mirroring `priority`) so cross-project QuickSearch hits can carry it.

## Pattern

**Map module + lookup component (MDT-244 pattern, owner-glyph payload).** `statusGlyphs.tsx` holds the seven inline SVG components ported from `status_svg/` (normalized 24×24 viewBox, `currentColor`, ~2 stroke — fixing the 64×64/hex drift per C5); `statusIcons.ts` holds the `Record<string, StatusGlyph>` keyed by `formatDataAttr(status)` (Fast-Refresh-clean split: component file exports only components, map file exports only the record); `StatusIcon.tsx` looks up and renders with `data-status={key}`, `aria-hidden`, and an optional native `<title>` child — the `TypeIcon.tsx` shape verbatim. Splitting into two files is required because, unlike `typeIcons.ts` (lucide refs only), the glyphs are locally-defined components.

## Module Boundaries

- `TicketCode` is the only strip mutator (single-composition invariant, STYLING.md § Stable Scanning Patterns). New prop `status?: string`; glyph renders iff the prop resolves to a mapped value. **No `ticket.status` fallback** — a deliberate asymmetry vs `priority ?? ticket?.priority`: suppression must be structural, not per-call-site discipline.
- `StatusBadge` owns the badge glyph: renders `<StatusIcon status={isInvalid ? 'Rejected' : status} className="badge__icon" />` before the label. Invalid maps the *glyph* to rejected while the badge keeps `data-status="invalid"` (BR-1.10; the E2E contract asserts `svg.badge__icon[data-status="rejected"]` inside `.badge[data-status="invalid"]`).
- `TicketAttributeTags` gains `excludeStatus?: boolean` — desktop list rows pass it so the Attributes cell drops the STATUS tag (BR-1.5); board/swimlane cards and mobile list cards keep the default (the lead tag IS the mobile status column, BR-1.6).
- `ProjectView` owns the desktop Status column: `<TableHead>Status</TableHead>` between Title and Attributes; cell = `<StatusBadge status={ticket.status} isInvalid={!VALID_STATUSES.includes(...)}>` mirroring `TicketCard.tsx:25` (reuse `utils/ticketStatus`).
- `PinItem` removes the `.pin-tooltip__status` block and `StatusBadge` import; passes `status={metadata?.status}` — unloaded metadata → undefined → no glyph (Edge-1 for free).
- `QuickSearchResults` passes `status={ticket.status}` (current) and `status={result.ticket.status ?? undefined}` (cross, new contract field).
- Server: `TicketService.searchTickets` hit gains `status: cr.status ?? null`; local `SearchResultItem` interface (line 34) widens to match.

## Invariants

1. One status encoding per surface — structurally enforced (prop presence), never per-site discipline
2. Registry maps exactly the 7 `CRStatus` kebels; `deferred`/fast-forward variants ship as assets but stay unmapped (C6)
3. No new color tokens; strip colors mirror badge.css `data-status` → `--status-*` fg mapping via new `.ticket-code__status-icon[data-status]` rules in `TicketCard/ticket.css` (sizing at the `--sz-icon` 16px slot, matching `.ticket-code__type-icon`)
4. Unchanged: priority glyph, type-icon slot + options, epic Zap, worktree marker, badge tokens, `CRStatus` enum (C7)
5. Glyphs bundle inline — zero network requests (C4)

## Program Design

Consequential surface: the cross-package search contract (additive, optional, backward compatible — treated as local/reversible; no interactive review required, flagged at pipeline User Review).

```ts
// domain-contracts/src/ticket/search.ts — SearchResponseSchema (additive)
ticket: z.object({
  code: z.string(),
  title: z.string(),
  priority: z.string().nullable().optional(),
  status: z.string().nullable().optional(),   // NEW — mirrors priority (C8)
})

// TicketCode props (additive)
interface TicketCodeProps {
  code: string; className?: string; ticket?: Ticket; priority?: string
  status?: string   // NEW — glyph renders iff mapped; no ticket.status fallback
}
```

Call order (cross-project hit): QuickSearch input → `/api/projects/:id/search` (`ticket_key` mode) → `TicketService.searchTickets` → hit `{ticket: {code, title, priority, status}}` → `SearchResponseSchema.parse` → `QuickSearchResults` → `TicketCode status={result.ticket.status ?? undefined}` → `StatusIcon` lookup → glyph or null. Older/absent `status` degrades to no glyph (BR-1.9 path).

**Least-confident decisions** (evidence + invalidator):
1. *Opt-in prop vs opt-out suppression flag* — chosen opt-in because a missed opt-out silently double-encodes (owner's hard rule) while a missed opt-in merely omits a glyph. Invalidated if the owner wants status on any future badge-surface by default; then flip to `showStatusIcon` default-on with explicit suppression at the ~6 enumerated sites.
2. *Two-file glyph split* — required by `react-refresh/only-export-components` (local component defs + record export can't share a file). Invalidated only if the repo adopts a bundler-level SVG pipeline.
3. *Server populates `status` from `cr.status ?? null`* — `getCR` returns the parsed CR which carries status; if a repository variant ever omits it, null degrades gracefully.

## Extension Rule

New key-strip surface without a badge → pass `status`. New badge surface → don't. Future `ui.ticketKey.statusIcon*` selectors (the deferred config route) wrap the two consumer sites (`TicketCode`, `StatusBadge`) the way `useTicketKeyOptions` wraps MDT-244's — no structural change needed.

---
*Rendered by mdt:architecture via spec-trace 0.4.0*
