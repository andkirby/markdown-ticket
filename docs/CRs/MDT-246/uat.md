# UAT Refinement Brief — MDT-246 (Round 1)

## Objective

Verify the shipped epic-board jump end to end on the live app
(`http://localhost:3075`, project MDT, real data): both entry points, the
focused arrival, the return-context round trip, and the degradation paths.

## Approved Changes

None — round 1 is a verification round. No requirement deltas. Three
review-find fixes landed before UAT (behavior-faithful corrections, no spec
change):

1. `carryViewParam` now inserts `?view=` **before** a `#fragment` (appending
   after it silently placed the param inside the hash for anchored epic values
   like `MDT-012#section`).
2. `Collapse all` now ends focus (it collapses the focused lane — the
   interactions contract counts that as ending focus; `toggleLane` already
   did).
3. `architecture.md` corrected: `TicketAttributes.tsx` is dead code at the
   baseline commit (only its test imports it); the live detail surface is the
   viewer header. The `detail` flag stays on the panel for correctness if it
   is revived.

## Changed Requirement IDs

None.

## Affected Downstream Trace

None (all stages revalidated strict after the fixes:
`spec-trace validate MDT-246 --stage all` passes).

## Execution Slices

None — implementation complete; no remaining execution work for this round.

## Validation

Browser walk 2026-09-16 (Playwright-driven, real MDT project, read-only
navigation; log + screenshots in the session record):

- **A — split chip (MDT-246 → MDT-225):** chip 106.4×24.0 (post-fix; see
  finding F1 below); identity zone 78.4×20.0 (height parity with the plain
  badge 77.3×20.0, centered at the same 2px rhythm); action zone exactly
  24.0×24.0 (C-1 floor), flush right. Zone names: "Open epic MDT-225" /
  "Show MDT-225 on Epics board". Action click → one navigation to
  `/prj/MDT/epics?epic=MDT-225`, modal closed, lane expanded + highlighted
  (`--epic-color` oklch 0.715 0.126 215.2 at 8% wash), live region announces
  "Epic lane MDT-225 … expanded", highlight auto-cleared after ~2s while the
  expansion persisted — and survived a full reload (localStorage).
- **B — CTA (MDT-225 detail):** `Epics →` control 104.6×32.0 with Rows3
  leading + arrow-right trailing, full-sentence aria; click → same focused
  arrival. No CTA on non-epic tickets (MDT-246: count 0).
- **C — view carry round trip:** opened MDT-246 from the Epics view
  (`?view=epics` on the modal URL) → identity-zone key link →
  `/ticket/MDT-225?view=epics` (carried) → close → back on `/prj/MDT/epics`.
- **D — unknown token:** `/epics?epic=MDT-999` renders a normal board, no
  focused lane, no error state.
- **E — production override case:** MDT-225 is Implemented (closed), so its
  lane is hidden by default on `/epics` — every real jump to it exercises the
  Show-closed override; arrival renders and expands the lane while the toggle
  stays off.

Script artifacts during the walk (not product defects): the CTA check on the
badge-linked epic modal raced the ticket fetch (re-checked with settle: CTA
present, correct aria); MDT-246's card is legitimately absent on a default
`/epics` board because its epic is closed.

## Watchlist

- `TicketAttributes.tsx` dead code (pre-existing) — if revived, it already
  renders the split chip via the `detail` flag.
- Cross-project phase values still resolve against the current project
  (pre-existing `classifyLink` limitation, documented in
  `context-badge.spec.md`).

## Round-1 finding F1 (user-reported, fixed 2026-09-16)

**Split chip rendered 28px with dead space** (identity text floating high,
~40% taller than the 20px neighbor badges). Root cause: the shadcn `Badge`
wrapper bakes `px-1.5 py-0.5 text-xs font-semibold` utilities into every
render, and Tailwind's utilities layer outranks `@layer components` — so
`badge.css`'s `.badge--split { padding: 0 }` (and even the curated
`font-medium`) silently never applied. Same mechanism had all badges at
font-weight 600 while badge.css/styleguide say 500, and leaves the unused
`.badge--sm`/`--lg` variants dead-by-cascade.

Fix (root cause, not symptom): stripped the chrome utilities from the wrapper
(`ui/badge.tsx`) — `.badge` in badge.css is now the actual source of badge
chrome, as its header always claimed. Re-measured: chip 106.4×24.0 (was
118.4×28.0), shell padding 0, plain badges unchanged at 20.0 (font-weight
600→500, the documented value). Visual pass: centered, symmetric 2px rhythm,
button flush. Gates re-run: fe:test 1130/1130, lint 0, validate:ts 5/5, board
E2E 40/40. Also removed the never-applied `align-items: stretch` from
`.badge--split` (the wrapper's `items-center` outranked it; centering renders
identically).

## Round-1 finding F2 (user ruling, fixed 2026-09-16)

**The split chip was visibly taller than its neighbors** — 24px against the
20px of every other badge in the header. User ruling: every badge on every
surface renders at the same height, the canonical 20px badge box; the
MDT-236 24×24 hit-target floor still applies but is met by an invisible hit
surface, not the visible box. Supersedes F1's end-state ("chip 106.4×24.0,
styleguide parity") and the 2026-09-13 "badge grows ~4px" geometry notes.

Before (inventory of all `.badge` elements on four surfaces — viewer header,
flat board, epics swimlane with Show-badges + Expand-all, list): 2207 visible
badges at exactly 20.00px (padding 2px/2px, font 12px/16px/500); the chip was
the single 24.00px outlier (106.42×24.00; action zone 24.00×24.00,
`min-height: 24px`, `position: static`).

Fix: badge.css split-chip block only — `.badge-action` drops `min-height`
(keeps `min-width: 24px`), gains `align-self: stretch` (visible box becomes
the identity zone's 20px line; `align-self` on the item is immune to the
wrapper-utility cascade that F1 documented) and an invisible `::after` hit
surface (`inset: -2px 0` → 24px band above/below, vertical-only so it never
reaches the key link). Wrapper untouched; seam, rest veil, hover ramp, and
keyboard-only `:focus-visible` outline stay on the visible box. Styleguide
demo copy + geometry note synced; `context-badge.spec.md` hit-target wording
synced.

After (re-measured, same script): chip 106.42×20.00, action zone
20.00×24.00 (`alignSelf: stretch`, `position: relative`), identity zone
20.00 — equal to every neighbor badge on all four surfaces. Hit-target proof
(`document.elementFromPoint`, action button at (x, y..y+20)): center →
`button.badge-action`; 1.5px above edge → button; 1.5px below edge → button;
2px above edge → button; 3px out → `div.compact-ticket-header__badges`
(outside the surface). Screenshots light + dark (viewer header, board card,
styleguide demo): chip flush with neighbors, text vertically centered.

## Watchlist additions (post-review follow-ups, non-blocking)

- `SmartLink` now subscribes to `useLocation` for the view-carry rule — every
  in-content link re-renders on navigation. Route changes are infrequent and
  the board re-renders anyway; revisit only if link-heavy documents show
  measurable jank.
- Process debt (this ticket): the verification plan must be sealed BEFORE
  implementation starts — `mdt-verify seal-plan` requires the live baseline,
  so a post-hoc plan cannot produce immutable evidence. Recorded in
  `.pipeline-state.json` exceptions.

## Open Decisions

None.
