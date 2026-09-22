# Requirements: MDT-247

**Source**: [MDT-247](../MDT-247-status-icon-integration.md)
**Generated**: 2026-09-22 · Stage: `mdt:requirements` · Scope: `full`

## Overview

Status becomes scannable at the ticket key: a status glyph joins the key strip wherever no status badge already encodes status (QuickSearch results, pin tooltip), `StatusBadge` gains a leading glyph everywhere it renders, the list view gains a Status column, and the pin tooltip swaps its badge block for the strip glyph. One status encoding per surface, delivered always-on, with the seven `CRStatus` states mapped to bundled inline glyphs. Consumers: any reader scanning boards, lists, search results, or the pin rail.

## Clarification Slots — Resolved

The CR carried six `*(Requires mdt:clarification)*` slots. All are resolved per the gate-approved `ux-design.md` ("Required changes" #3 instructs resolving them with the design's decisions); the owner confirms or reopens any of these at pipeline User Review:

| Slot (CR line) | Resolution |
|----------------|------------|
| L115 always-on vs config-gated | **Always-on**; no `ui.ticketKey.statusIcon*` selectors registered in this CR. The selector route remains a documented follow-up that slots in without redesign if the owner later wants an off switch |
| L114 cross-project QuickSearch | **Extend the contract**: `SearchResponseSchema` gains `status: z.string().nullable().optional()` mirroring `priority` (C8, additive; older responses degrade to graceful absence — BR-1.9 covers missing status) |
| L116 In Progress variant | **`in-progress.svg`** (play) per `status_svg/README.txt` default; fast-forward variants unmapped (C6) |
| L121 color strategy | **`currentColor` + `--status-*` fg tokens** mirrored from badge.css; amended r2: one new owner-approved pair `--status-partial`/`-bg` (lime) for Partially Implemented (C3) |
| L122 delivery path | **Bundled inline glyph components** in a map module; no `public/` URL fetches (C4, STYLING.md §SVG Icons + MDT-244 no-new-network-requests) |
| L106 unmapped assets | **Ship as assets, exclude from registry** — no `Deferred` CRStatus exists, no data distinguishes the fast-forward variants (C6) |

## Non-Ambiguity Table

| Concept | Final Semantic (chosen truth) | Rejected Semantic | Why |
|---------|-------------------------------|-------------------|-----|
| One status encoding per surface | Strip glyph suppresses wherever the badge co-renders; surfaces without a badge get the glyph | Always render both | Duplicate encoding; inverts MDT-244's badge-side suppression to the glyph side |
| Epic keys | Ride the same machinery: glyph on icon-surfaces, suppressed on badge-co-rendering surfaces | Epic-specific rendering | Lane passes the full epic ticket; no special case needed |
| List Status cell | The `StatusBadge` itself (with its new glyph); Attributes cell drops the STATUS tag | Second rendering beside the tag, or keep tag + column | One badge per row |
| Mobile status column | The existing lead status tag IS the mobile status column | New mobile-only element | ux-design responsive mapping |
| Pin tooltip encoding | Strip glyph only; `.pin-tooltip__status` badge block removed | Keep badge + glyph | Owner-directed swap; aria-label already carries status |
| Registry module shape | Plain map module beside the badge components (`priorityIcons.ts` pattern) | Sprite.svg entry, per-icon components in public/ | Fast-Refresh-clean; parity with PRIORITY_ICON/TYPE_ICON; C4 |
| Invalid status (badge) | Rejected glyph + `data-status="invalid"` colors | No glyph on invalid | ux-design States; isInvalid prop already exists |
| List-view durable spec | No `list-view.spec.md` in this CR; the Status-column contract lives in the CR (revisit only if implementation reveals drift risk) | New spec file now | No canonical list-view spec exists today; not this CR's deliverable |

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 (16px/12px legibility, both themes) | architecture.md (Visual), tasks.md (Verify: manual visual pass) |
| C2 (aria-hidden + `<title>`, badge label = accessible name) | architecture.md (Accessibility), tests.md (unit assertions) |
| C3 (currentColor + existing `--status-*` tokens) | architecture.md (Visual), tests.md |
| C4 (inline bundled glyphs, no public URLs) | architecture.md (Asset strategy), tasks.md |
| C5 (24×24 viewBox normalization, ~2 stroke) | architecture.md (Asset strategy), tasks.md |
| C6 (deferred + fast-forwards unmapped) | architecture.md (Registry), tests.md (registry exhaustiveness test) |
| C7 (unchanged invariants: priority/type/epic/worktree/tokens/enum) | architecture.md (Boundaries), tests.md (regression) |
| C8 (search contract additive + optional) | architecture.md (Contract change), tests.md (contract test) |

## Delivery Timing

All requirements: **Now** (single-ticket delivery; `--tags timing:now` on every canonical record).

## Verification Pointers

- Canonical rows and routes: `requirements.trace.md` (generated — not source of truth)
- Behavior coverage targets: CR §5 Acceptance Criteria checkboxes (Functional + Non-Functional)
- Next stage: `mdt:bdd MDT-247`

---
*Rendered by mdt:requirements via spec-trace 0.4.0*
