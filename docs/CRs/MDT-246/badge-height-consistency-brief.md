# Agent Brief — Badge Height Consency (MDT-246 follow-up, user ruling 2026-09-16)

You are working in the repo root (branch
`main`, worktree deliberately dirty — see "Do not touch" below). Dev servers
are already running: frontend `http://localhost:3075`, backend `:3001`.
NEVER restart or kill them.

## The ruling (supersedes the earlier "badge grows ~4px" design note)

**Every badge, on every surface, renders at the same height — the canonical
badge height (currently 20px: `text-xs` line-height 16 + 2px vertical
padding). The split chip's action zone must NOT increase the badge's visible
box height anywhere.** The 24×24 hit-target floor (MDT-236 / WCAG 2.5.8) is
STILL REQUIRED — it moves to an invisible expanded hit surface, not the
visible box.

This is a user decision reported as UAT feedback: the epic badge with the
button was visibly taller than its neighbors in the ticket header.

## Background you must know (cascade lessons already paid for)

1. Badges render as `<Badge variant="outline" className="badge …">` where
   `Badge` is `frontend/src/components/ui/badge.tsx` (shadcn, cva) and
   `.badge` lives in `frontend/src/components/Badge/badge.css` inside
   `@layer components`. That wrapper recently had its chrome utilities
   (`px-1.5 py-0.5 text-xs font-semibold`) stripped because Tailwind's
   utilities layer outranks `@layer components` regardless of specificity —
   they silently defeated badge.css overrides (fixed defect F1, recorded in
   `docs/CRs/MDT-246/uat.md`). Do not re-add utilities to the wrapper, and do
   not try to override element-level utilities from `@layer components` — it
   does not work. Unlayered CSS beats all layers, but do not use it; keep
   badge chrome in badge.css.
2. The split chip (MDT-246) is `.badge.badge--split` containing
   `span.badge__id` (passive Zap + key link, padding 2px 6px → 20px tall) and
   a sibling `button.badge-action` (rows-3 glyph, 1px currentColor seam,
   rest veil `color-mix 45% --bg-muted`, hover `--state-hover-bg`). It
   currently has `min-width: 24px; min-height: 24px` — that min-height is
   what makes the chip 24px while every other badge is 20px.
3. ContextBadge renders the split chip only with `detail` (viewer header
   `CompactTicketHeader.tsx`, dead `TicketAttributes.tsx`); board cards
   (`TicketAttributeTags.tsx`) keep the compact badge — that boundary stays.

## Step 1 — Inventory (measure before changing)

Write a Playwright measurement script (node, `createRequire` on the repo root
to load `playwright`; see the pattern in any `tests/e2e` spec) that visits,
against the live app at `localhost:3075`, project `MDT`:

1. `/prj/MDT/ticket/MDT-246` (ticket viewer header)
2. `/prj/MDT` and `/prj/MDT/epics` (board cards — enable "Show badges" in the
   swimlane toolbar; also check the flat board's TicketCard badges)
3. `/prj/MDT/list` (list view attribute tags)

For EVERY `.badge` element on each page, record: surface, selector-ish
identity (data-status/priority/context/type/relationship or ancestor
testid), `getBoundingClientRect().height`, computed padding-top/bottom,
font-size/line-height/font-weight. Produce a table of all DISTINCT heights
and which badges have them. The user reported inconsistency between board and
ticket view — enumerate every delta, not just the split chip (e.g. verify
board-card badges and viewer badges are both 20px; if any other divergence
exists, it is in scope too).

## Step 2 — Fix

In `frontend/src/components/Badge/badge.css`, split-chip block only:

- The action zone's VISIBLE box becomes the canonical badge height (20px):
  remove `min-height: 24px` from the layout; keep `min-width: 24px` (width
  is not the problem; the chip may be wider than tall).
- Preserve the ≥24×24 CLICKABLE target with an invisible expansion:
  `position: relative` on `.badge-action` plus a pseudo-element hit surface,
  e.g. `.badge-action::after { content: ""; position: absolute; inset: -2px 0; }`
  → hit area 24px tall (20 visible + 2 above + 2 below) × ≥24 wide. The
  badges row uses 8px gaps, so a 2px vertical overshadow collides with
  nothing. Do not expand horizontally into the seam side if it would overlap
  the key link's hit area — vertical-only expansion is enough.
- Hover veil, focus treatment, seam, and the rest-veil ladder must stay on
  the VISIBLE box. Focus ring stays thin/faint and keyboard-only
  (`:focus-visible`), per repo policy.
- The Zap stays 12px (`badge__icon`), aria-hidden, never a click target.
  Zones stay siblings; no button inside the link.

If Step 1 found any OTHER height divergence (board vs viewer, swimlane lane
meta StatusBadge, etc.), fix it in the same pass, in badge.css, without
touching the wrapper in `ui/badge.tsx` (it is now correctly chrome-free).

## Step 3 — Sync the pattern contract (styleguide.html)

`frontend/src/styleguide.html` § "epic badge · split chip — identity vs
action" is the user-approved pattern reference:

- Update the demo CSS (`.badge-action` demo copy) to the same-height + hit-
  expansion pattern so the demo renders 20px chips like production.
- Update the section's Geometry note: replace "the badge grows ~4px to host a
  legal target" with the new ruling — same height everywhere; the 24×24 floor
  is met by the invisible hit surface, not the visible box. Keep the rejected
  bare-glyph rationale intact (it measured the glyph target, still valid).
- The demo's compiled `.badge` base copies stay as they are.

## Step 4 — Sync durable docs

- `docs/design/surfaces/context-badge.spec.md`: "Split chip (epic jump,
  MDT-246)" section — the "badge grows ~4px to host it" sentence and the
  States row ("pill grows ~4px") become the same-height ruling. The a11y
  wording "≥24×24 button" becomes "≥24×24 hit surface (visible box 20px,
  expanded hit area)". Note the ruling date and that it supersedes the
  2026-09-13 geometry note.
- `docs/design/surfaces/epic-navigation.interactions.md`: only if it
  mentions the chip size (check § Keyboard and focus) — update likewise.
- CR `docs/CRs/MDT-246-epic-detail-board-jump.md` §8 Clarifications: append
  "### UAT finding F2 (2026-09-16)" — the ruling, the fix, and the
  re-measured heights.
- `docs/CRs/MDT-246/uat.md`: append the F2 record under the F1 section with
  before/after measurements.
- Do NOT edit `.pipeline-state.json`, `.tasks-status.yaml`, or anything under
  `docs/CRs/.trace/`.

## Step 5 — Verify (all must pass; record commands + numbers)

1. Re-run the Step-1 measurement script: every `.badge` on all three surfaces
   reports the SAME height (±0.5px), and the split chip equals the plain
   badges. Record the table.
2. Hit-target proof: for the split chip's action button, use
   `document.elementFromPoint()` at points 2px above and 2px below the
   button's visual center-line edges — both must resolve to the BUTTON
   (pseudo-element hits belong to the origin element). Record coordinates.
3. Visual: screenshots of the ticket header, a board card, and the styleguide
   demo, light AND dark mode (toggle `.dark` on `<html>`). Confirm the epic
   chip is not taller than neighbors and the text is vertically centered.
4. `bun run fe:test` — 0 fail (was 1130 pass).
5. `bun run lint:frontend` — 0 problems.
6. `bun run validate:ts` — all projects pass.
7. `bun run test:e2e -- tests/e2e/board/epic-board-jump.spec.ts` — 4/4
   (selectors `button.badge-action`, `.badge--split` are unchanged).
8. Optional but preferred: add ONE durable geometry assertion to
   `tests/e2e/board/epic-board-jump.spec.ts` (first test, after the header is
   visible): epic chip `boundingBox().height` equals the status badge's
   height. Re-run the spec.

## Constraints

- Never `git add` / commit / stash / reset anything — the worktree carries a
  parallel session's uncommitted work (`TicketViewer/index.tsx`,
  `ticket-viewer.css`, `server/*`, `shared/*` are mixed-ownership; you should
  not need to touch the two TicketViewer files at all).
- No Tailwind utility classes in JSX for contracted components (the
  `enforce-semantic-classes` pre-commit hook blocks them; CSS belongs in the
  colocated component CSS).
- Do not restart the dev servers; do not run `bun run dev`.
- Accessibility contract is non-negotiable: two tab stops with distinct names
  ("Open epic {KEY}" / "Show {KEY} on Epics board"), stopPropagation on both
  zones, keyboard-only focus rings.
- CSS goes through the parse gate (valid syntax; no smart quotes, balanced
  braces). Match the file's existing comment style and nesting.

## Deliverables (final message)

1. The Step-1 inventory table (before) and the Step-5 re-measurement (after).
2. The hit-target proof coordinates.
3. List of files changed with one-line reasons.
4. Exact verification commands + exit codes/pass counts.
5. Any divergence you found but did NOT fix (with evidence), if out of scope.
