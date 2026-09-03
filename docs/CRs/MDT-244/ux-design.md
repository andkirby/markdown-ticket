# UX Design: MDT-244

**Generated**: 2026-09-02 · Gate: `references/ux-gate.md` · Project registry: `docs/SKILLS.md`

```text
Journey intent: A reader scanning any ticket-key line (board card, list row,
viewer header, search hit) wants to recognize the ticket's type at a glance —
same muscle memory as the priority glyph before the key — without losing card
density; users who prefer text badges keep them.

Surfaces: ticket-key line on every surface that renders TicketCode (board
card, cloud stub, list row, viewer header, QuickSearch hit); TypeBadge in
ticket viewer header + attribute rows; Settings (backend config section —
descriptor-driven toggles appear automatically).

States: option off (default — byte-identical to today) · key glyph on ·
badge glyph on · both on with viewer-header suppression · missing/unknown
type (no key glyph; badge fallback unchanged) · epic ticket ({type glyph}
{gold Zap} — level and type stay orthogonal).

Interactions: two Settings toggles (persist to user.toml via config API);
no new in-board interactions; values apply on next config refresh.

Accessibility/responsive: key-line glyphs aria-hidden (decorative); the
badge label or key text remains the accessible name; glyph = --sz-icon
16px, lucide 2px stroke; works in both themes via existing --type-* tokens;
icon-only surfaces are out of scope (badge label never removed without the
key glyph taking over, per suppression rule).

Alternatives considered: tri-state single setting and always-show-both —
rejected in CR §3 (dead state / duplicate encoding); localStorage UI
preference — rejected by owner decision (must be app configuration).
```

**Reviewer**: pipeline UX gate (checklist below); final visual judgment deferred to owner at User Review
**Verdict**: approved — the design is owner-specified (format + config model given verbatim by the UX owner); gate checklist passes
**Required changes**: none
**Durable docs**: `styleguide.html#type-icons` already documents the glyph set (landed in ccaba832). STYLING.md § Stable Scanning Patterns gains the type-marker line **after** implementation lands, together with the implementation commit — deferring the durable-doc edit to the same change keeps the doc from describing unwired behavior (repo rule: durable docs describe final behavior, not drafts).

### Gate checklist
- [x] Journey intent explicit
- [x] State coverage complete (off/on/both/suppression/unknown/epic)
- [x] Durable docs describe final behavior (deferred edit recorded with reason)
- [x] Accessibility + responsive stated
- [x] No contradiction with requirements/architecture/tests (C3, C4 carried)
