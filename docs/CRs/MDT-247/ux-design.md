# UX Design: MDT-247

**Generated**: 2026-09-22 · Gate: `references/ux-gate.md` · Project registry: `docs/SKILLS.md`

```text
Journey intent: A reader scanning a ticket-key line (QuickSearch hit, pinned-
ticket tooltip) wants to recognize the ticket's status at a glance — the same
muscle memory the priority glyph already trained — while every surface that
already shows the status badge keeps exactly ONE status encoding: the badge
gains the leading glyph, the key strip yields. List readers get a dedicated
Status column whose cell value is the badge itself.

Surfaces: ticket-key strip (TicketCode.tsx:42-46 — slot between the priority
glyph and the key; every consumer enumerated) on the two surfaces with no
co-rendered badge: QuickSearch results (QuickSearchResults.tsx:90,280) and
the pin-bar tooltip (PinItem.tsx:97 — badge removed by this CR); StatusBadge
everywhere it renders — card attribute rows (TicketAttributeTags.tsx:56-58),
cloud stub (CloudProjectionStub.tsx:85), viewer header
(CompactTicketHeader.tsx:29) + attributes (TicketAttributes.tsx:23), swimlane
lane-header meta (SwimlaneBoard/index.tsx:527), new list Status column
(ProjectView.tsx:197-251); suppressed-strip surfaces: board/swimlane/cloud
cards, swimlane lane header, viewer header, list rows (desktop + mobile).

States: strip icon ON where no badge co-renders — {priority}{status icon}{key}
{type}{epic Zap}{worktree}, glyph at --sz-icon with native <title> status-name
tooltip · strip icon SUPPRESSED on every badge-co-rendering surface (board +
swimlane ticket cards, cloud-projected stub, swimlane lane header, viewer
header, list rows) — strip unchanged, the badge is the status encoding ·
StatusBadge = {icon}{label} on all its surfaces (PriorityBadge parity) ·
list desktop: Status column between Title and Attributes, cell =
<StatusBadge>; the Attributes cell omits the STATUS tag (one badge per row);
list mobile: the existing lead status tag IS the mobile status column ·
pin tooltip: .pin-tooltip__status badge block removed, status icon rides the
strip, aria-label keeps "({status})" (PinItem.tsx:45-47) · epics ride the
same machinery (lane passes ticket={lane.epic}); lane header suppresses
(badge at index.tsx:527), epic keys carry the icon on icon-surfaces;
lifecycle label untouched · missing/unknown status: no icon anywhere, badge
label unchanged (graceful absence); invalid status → rejected glyph +
data-status="invalid" colors (badge.css:54) · In Progress = in-progress.svg
(play) per status_svg README; in-progress-fast-forward.svg,
in-progress-alt-fast-forward.svg unmapped (no data distinguishes them);
deferred.svg unmapped (no CRStatus exists — schema.ts:9-17 has 7) · both
themes by construction (currentColor + --status-* fg tokens).

Interactions: native <title> hover tooltip carrying the status name on the
strip glyph (MDT-244 precedent, TypeIcon.tsx title prop) — non-interactive,
no tab stop, no SR presence; no new board/list interactions (list row click
unchanged; the Status column is display-only); pin tooltip mechanics
unchanged (portaled Radix hover); if the config route is later chosen, two
Settings toggles mirroring ui.ticketKey.typeIcon* (open question, below).

Accessibility/responsive: glyphs aria-hidden decorative — the accessible
name is the badge label, the key text, or the pin aria-label (status is
already in it); the <title> hover is a pointer-only aid duplicating nearby
text on badge surfaces, and on icon-only strips it matches MDT-244's
owner-reviewed C4 decision · sizes: strip glyph --sz-icon 16px (parity with
priority/type/epic glyphs, ticket.css:86-118), badge glyph .badge__icon 12px
(badge.css:31-34) · color: currentColor everywhere; new
.ticket-code__status-icon[data-status] rules mirror badge.css's status→token
fg mapping exactly (proposed→backlog, approved→open, in-progress→progress,
implemented→done, rejected/invalid→rejected, on-hold→hold,
partially-implemented→progress) — no new tokens, both themes inherit ·
glyphs normalized to 24×24 viewBox + currentColor + ~2 stroke (lucide weight;
fixes the 64×64-hardcoded-hex and the alt-fast-forward drift) · responsive:
desktop table gains the Status column, mobile maps it to the existing lead
tag; strip glyph is density-immune (--sz-icon is the fixed 16px slot).

Alternatives considered: badge icon only (no strip slot) — rejected, the
strip stays status-less on the two surfaces where it is the ONLY encoding ·
always render strip icon + badge together — rejected, duplicate encoding ·
lucide glyphs instead of status_svg — rejected, discards the owner-provided
10-icon set that is the spec · serving from public/icons/status_svg/ via
URL — rejected, STYLING.md §SVG Icons bans per-icon public files (late-fetch
pop) and MDT-244's no-new-network-requests AC (CR line 99) · adding glyphs
to sprite.svg — viable curated-glyph route, rejected in favor of an inline
statusIcons.ts component map for parity with PRIORITY_ICON/TYPE_ICON and
trivial currentColor · keeping the STATUS tag in list Attributes alongside
the new column — rejected, two badges in one row · wiring the fast-forward
variants — rejected, no field distinguishes them; breaks one-glyph-per-status
positional stability · config-gated ui.ticketKey.statusIconNearKey/
statusIconInBadge (defaults per MDT-244's selectors.ts:251-264 precedent) —
NOT rejected, open implementation question: the owner's spec reads always-on
("everywhere"), so the design ships always-on; if the owner later wants an
off switch the two USER/EDITABLE/SETTINGS selectors slot in without redesign.
```

**Reviewer**: pipeline UX gate (checklist below); final visual judgment deferred to owner at User Review
**Verdict**: approved — the design is owner-specified (strip format, badge parity, suppression, list column, pin swap given verbatim by the UX owner); every enumerated surface was verified in source; gate checklist passes
**Required changes**: none to the design; three CR-doc amendments carried for the next pipeline stage —
1. **Epic AC refinement** (CR line 110): "epic keys carry the status icon" holds only on surfaces without a co-rendered badge; the swimlane lane header suppresses (its `StatusBadge`, `SwimlaneBoard/index.tsx:527`), so as written the AC contradicts the suppression ACs (lines 105-106). Amend to: *"epic keys carry the status icon on icon-surfaces (QuickSearch, pin tooltip); badge-co-rendering surfaces (lane header, viewer) suppress."*
2. **Cross-project QuickSearch gap** (missing from CR Affected Artifacts): the cross-project search response carries only `code`/`title`/`priority` — no `status` (`domain-contracts/src/ticket/search.ts:49-58`), so cross-project hits cannot render the icon without a contract change. Either extend the schema (`status: z.string().nullable().optional()`, mirroring `priority`) or de-scope cross-project hits to graceful absence. Current-project hits are unaffected (`Ticket` carries `status`). Decide before Tests.
3. **Resolve the CR's clarification slots with this design's decisions**: In Progress = `in-progress.svg` (README default), fast-forward variants unmapped (line 113); always-on recommended with the config route remaining open (line 112); color strategy = `currentColor` + `--status-*` fg tokens (line 118); delivery = bundled inline glyphs, not `public/` URLs (line 119).

**Durable docs**: `docs/design/surfaces/pin-rail.spec.md` + `pin-rail.mockups.md` were updated to the strip-icon tooltip on 2026-09-22 at owner direction ("update designs"), ahead of implementation — they now cite MDT-247 as their drift anchor. Still deferred to the implementation commit, mirroring MDT-244's rule (they spec runtime behavior): `frontend/src/STYLING.md` § Stable Scanning Patterns gains the status-marker bullet (between Priority and Type); `styleguide.html` may gain a status-icons section beside `#type-icons`. List view has no canonical surface spec today — the Status-column contract lives in this CR; decide at implementation whether a `list-view.spec.md` is warranted.

### Gate checklist
- [x] Journey intent explicit
- [x] State coverage complete (icon-on / suppressed per surface / badge-icon / list column desktop+mobile / pin swap / epic / missing-unknown-invalid / variant + deferred disposition / both themes)
- [x] Durable docs describe final behavior (edits deferred to the implementation commit, reason recorded)
- [x] Accessibility + responsive stated (aria-hidden, title tooltip, --sz-icon / badge__icon sizing, token colors, mobile column mapping)
- [x] No contradiction with requirements/architecture/tests (two CR AC refinements + one contract gap carried in Required changes)
