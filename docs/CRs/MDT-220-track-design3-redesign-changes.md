---
code: MDT-220
status: Implemented
dateCreated: 2026-07-31T16:17:05.949Z
type: Documentation
priority: Medium
---

# Track Design3 Redesign Changes

### Purpose

- Living inventory of every Design3 redesign change, kept current as work continues
- Framed by two lenses: Visual Architecture (look/structure) and Functionality (behavior/interactions)
- Single source of truth so redesign decisions do not drift or get lost across sessions
- Scope: the `designs/board-zai/` prototype today; the real-app port (`src/styles`, `src/components`) as it begins
- Out of scope: reproducing prototype mock data, Alpine state, or invented domain models in the app

### Status Legend

- Done: shipped in the prototype
- Partial: landed but incomplete or not yet propagated
- Next: queued, ready to start
- Open: needs a decision before work
- Deferred: waiting on a product/domain contract
- Rejected: explicitly decided against (binding)

### Visual Architecture

| Change | Status | Evidence |
| --- | --- | --- |
| Dark-theme background ramp tuned to match light's perceptual (CIE L*) steps | Done | 01-tokens.css `.dark` |
| Priority indicators: colored dots replaced with icon glyphs | Done | assets/icons/priority/*.svg, 5 surfaces |
| Cmd+K scope-tab strip given bg-subtle band (parity with ticket-view tabs) | Done | design3.html |
| Priority icon is a flex child of .card-code (matches app TicketCard .ticket-card__code + .priority-icon); scales with key font (--fs-xs); 4px gap, no overlap | Done | design3.html card-top, 05-components.css |
| Tier-led depth (borders dropped), background tiers, mono ticket codes | Established | inherent Design3 grammar; src/ port drops card/column/badge borders, keeps only the data-driven accent stripe |
| Token bridge to app: tuned dark-theme ramp propagated to src/styles/design-tokens.css .dark (--bg-subtle #1a1f2b / --bg-muted #232b3a / --bg-elevated #2c3848, matching the prototype) | Done | src/styles/design-tokens.css |
| Density matrix: 3x3 (size x space) shipped in prototype | Open | strategy calls for one axis only |

### Border and Accent Refinement

- Principle: drop decorative gray borders; whitespace and background tiers hold the layout. Borders survive only where they carry meaning — an accent stripe whose color maps to data.
- Dropped (Done): card static gray border -> transparent, revealed on hover only (.kanban-card); column outer border removed, defined by bg-subtle tier + radius + gap (.board-col); modal badge outlines (priority/type/phase/sprint) -> flat bg-muted tint — design3.html, now ported to src/ (ticket.css, column.css, badge.css)
- Added (Done): priority accent stripe — 3px left edge, now restricted to critical/high tickets + epics only (importance landmark, not every card; low/medium have no stripe via unset --card-accent); epic stripe in --epic-color; hover keeps the accent left edge while revealing the other three borders
- Rule (binding): accent color must map to data (priority or epic); never decorative
- Deferred: selected-card indigo accent — no board selection state exists yet
- Drift cleanup (Done): removed the floating col-header underline; collapsed-column border -> transparent to match expanded columns; avatar ring recolored to --bg-elevated to match the card surface; :active now preserves the accent stripe
- Badges flat in src/ (Done): removed `border` from the shared shadcn `Badge` base (`ui/badge.tsx`) — the single source, since `Badge` is used only by the five `.badge` components — so every status/priority/type/context/relationship badge is now a flat bg-tint + colored text with no outline. Stripped the now-dead `border-color` tints from `badge.css`. Verified live: 472 board badges + viewer badges all `border-width: 0`.
- Project cards/chips: borders DROPPED (scope reversal — was a deliberate hold) — ProjectSelector `.project-card`/`.project-chip`/`.project-launcher` are now tier-led: transparent border at rest, reveal `--border-strong` on hover; chip/launcher moved `bg-elevated`→`bg-subtle` (they sat on an `bg-elevated` header and would have vanished without the border). Active card keeps its **primary** border + active launcher keeps `ring-primary` (data-driven state indicators). Plate code-badges lost their decorative border. Board project-switcher pills → borderless (`bg-muted` inactive / `bg-primary` active). Filter-bar trigger/chips + project dropdown items stay border-led (recessed/floating control surfaces).
- Border audit (Done): grep of all border usage across src/. The shadcn `Card` primitive (`ui/Card.tsx`) + `.card` class are dead code (0 consumers). Most rendered borders are load-bearing (form-control affordance, structural separators, floating layers, AuthUnlock panel). Decorative surfaces resolved: ReadAccessTokens panels → `bg-muted` tier; ResolutionDialog option cards → tier-led borderless choice-menu (`bg-muted` + `hover:bg-primary/10`); ProjectSelector card/chip/launcher + Board pills → tier-led (above). **Deferred:** DuplicateResolver is legacy bootstrap-era inline styles (`#007bff`/`#dee2e6`/`#f8f9fa`); dropping borders ghosts white-on-`#f8f9fa` boxes, so it awaits a full tokenization rewrite, not a piecemeal fix.
- Styleguide (Done): `src/styleguide.html` expanded with a form-elements section (primary/secondary/outline/ghost buttons, text input + error, select, checkbox) and a borderless tier-led surfaces/elevation demo — all reading live from `design-tokens.css`. Browser-verified in light + dark (primary `#4f46e5`/`#6366f1`, input `--bg-muted`, surface card reads on `--bg-subtle` by tier contrast alone).
- Badge WCAG (Deferred): a WCAG-contrast audit found light-mode badge label text falls below 4.5:1 (saturated fg on pale tint — 5/7 status, 4/4 priority, 4/5 type fail; dark passes). Root cause = one token used for both accent (wants vivid) and label text (wants dark). Proven fixes (darker fg steps) + the architectural fix (derive text via `oklch(from var(--accent) calc(l-0.18) c h)`, implies OKLCH migration) are documented in BADGE_ARCHITECTURE.md. Badges keep current colors until that migration.
- Surface contract for controls (Done): codified in STYLING.md + demonstrated in styleguide.html — a control's fill must differ ≥3:1 from its container or be border-defined (else it ghosts). Measured: `--bg-muted` is **1.23:1** from `--card` in light, so a borderless muted input and `btn-secondary` (`--secondary` ≈ `--muted`) ghost on white. **Form-control borders are affordance, not decoration** — they stay (decision: hairline + focus ring, across `.input`/`.settings-input`/sort selects/project-search/FormField; NOT redundant with the card hover-reveal, which is for *containers*). `btn-secondary` is border-defined. `--bg-muted` is untouchable (~36 files); a fully borderless input would need a dedicated recessed fill — rejected for this light aesthetic.
- OKLCH migration (Done): all `design-tokens.css` colors converted HSL/hex → oklch — shadcn set as bare `L C H` channels consumed via `oklch(var(--x))`, v3 semantic set as full `oklch()` colors consumed bare. Consumption `hsl(var(`→`oklch(var(` across 18 files; `tailwind.config` colors → `oklch(var(--x) / <alpha-value>)` (placeholder **required** — v3's auto-alpha works for `hsl(var())` not `oklch(var())`). Visually neutral — canvas readback: `oklch(0.457 0.214 277)` renders exactly `#4338ca`. Build ✓, fe:test 826. Enables perceptual tier steps + the `oklch(from var(--accent) calc(l-0.18) c h)` badge-text fix (still TODO).
- Form controls unified (Done): `.settings-input`/`.settings-select` → `h-10` (was ~32px; now matches `.input` 40px); documents-view sort select + direction button → `h-10` + `rounded-md` + `ring-2` (was `h-[38px]` + `rounded` 4px + `ring-1`); AuthUnlock password input → canonical `.input` class (was hand-rolled). All controls now share the styleguide treatment (hairline border + `bg-muted` + focus ring, `h-10`, `rounded-md`).
- Ticket-key class (Done): `.ticket-code` promoted from empty hook to the canonical ticket-key class (mono `JetBrains Mono`, `tabular-nums`, weight 600, `--primary`). It had been inline utilities (`font-medium text-primary dark:text-blue-400` — sans-serif + blue-in-dark vs indigo-in-light inconsistency). `TicketCode` now renders just `.ticket-code`; the board card's `.ticket-card__code` layers density `font-size`. Ticket number is now consistently mono/tabular on every surface (board, viewer, search).

### Real-App Port (src/)

- Status: implemented and verified — TypeScript passes all 6 packages; full frontend suite 826 pass / 0 fail across 84 files. 53 files changed, +923 / -597.
- Browser-verified live (`http://localhost:3075/prj/MDT`, dark mode): 185 board cards + 190 list rows render the priority glyph before the key on every surface — board card (`.ticket-card__code`), list table Key cell, ticket-viewer header (`.modal__headline`). Full glyph map (critical=Flame, high=ChevronUp, medium=Equal, low=ChevronDown); no-priority renders no icon. Card treatment now matches design3: `.ticket-card` border is transparent until hover (no permanent gray box) with a 3px left accent stripe on critical (red `#f87171`) / high (orange `#fb923c`) only; medium/low have a transparent stripe (importance landmark, not every card). Columns are borderless (bg-subtle tier holds them). Dark ramp resolves to `#1a1f2b / #232b3a / #2c3848`. Verified via computed styles after hard reload.
- Priority icon before key (stable scan): rendered by `<TicketCode>` (the single source, commit f501368f) on every surface — board card, cloud-projected stub, list (desktop + mobile), ticket-viewer header, and QuickSearch results. No surface hand-composes the glyph, so it can't be forgotten. Codified in STYLING.md "Stable Scanning Patterns".
- Icon architecture: `<TicketCode>` owns the invariant — it renders `<PriorityIcon>` (currentColor via data-priority -> prio token) then the code; every surface renders `<TicketCode>`. The earlier per-surface `<PriorityIcon> + <TicketCode>` hand-composition was removed.
- PriorityBadge.tsx: added PRIORITY_ICON glyph map (critical=Flame, high=ChevronUp, medium=Equal, low=ChevronDown); new PriorityIcon.tsx component exported from Badge/index.
- Card treatment (now matches design3 — supersedes an earlier "border-led divergence" decision that left the old bordered look): `.ticket-card` = `border: 1px solid transparent` + `border-left: 3px solid var(--card-accent, transparent)`, revealed on hover; `--card-accent` is set to the priority token for critical/high only (low/medium unset → transparent stripe). Column `.column` border dropped (bg-subtle tier); column-header gray underline dropped; collapsed-column border transparent until hover. NOTE: the custom property is named `--card-accent`, NOT `--accent` — `--accent` is the global shadcn theme token (a raw HSL triplet like `219.1 24.7% 18.2%`, invalid as a bare color), and reusing it silently killed the stripe for unset priorities until renamed.
- Also touched: Badge/badge.css, Board.tsx, Column/column.css + index, QuickSearch, Header, SettingsModal, ProjectSelector, DocumentsView, RelativeTimestamp, config (settingsPreferences, ticketCardBadges), ui/Modal, colorUtils removed.

### Functionality and Interactions

| Change | Status | Evidence |
| --- | --- | --- |
| Splines render via SVG `<g x-html>` (template x-for fails inside svg) | Done | splinePaths getter |
| Splines two-axis scroll: horizontal native, vertical redraw | Done | @scroll.passive on .col-cards |
| Splines redraw on layout shift (column collapse/expand, density change) | Done | $nextTick(drawSplines) |
| Splines dx ratio set to 0.4 | Done | per design3-splines.md |
| Epic click performs zoom-to-filter using epicId (not card id) | Done | activeEpicFilter |
| Epic child exclusion, progress, and pin-to-top when filtered | Done | ticketsByColumn, epicProgress |
| Breadcrumb shows "Epic:" label | Done | header |
| Epic Detail modal: Description / Child Tickets / Documents | Done | selectedEpic |
| Epic data enriched with description and linkedDocs | Done | app.js |
| Epic entry points: card Details button + rail info button | Done | design3.html |
| White-block regression on epic subwindow fixed (reactive :style) | Done | design3.html |

### Hygiene and Artifacts

| Change | Status | Evidence |
| --- | --- | --- |
| Artifact renamed to design3.html | Done | was "zai - design3-epics.html" |
| AGENTS.md added for agent sessions (own-repo note, conventions, known gaps) | Done | designs/board-zai/AGENTS.md |
| .gitignore added for .DS_Store | Done | designs/board-zai |
| Spec docs kept current | Done | design3-epics.md, design3-splines.md |

### Decisions Rejected (Binding)

- Do not port the Alpine state model or the mock ticket store into the app
- Do not infer Epic identity from free-text phaseEpic
- Do not add an artificial 600-900ms load delay or a generic "Synced" state
- Do not create v2/ or legacy/ parallel component trees
- Do not paste prototype Tailwind strings into every component; retheme through existing semantic hooks

### Next and Open

| Item | Status | Note |
| --- | --- | --- |
| Propagate tuned dark-theme ramp into app `.dark` tokens | Done | src/styles/design-tokens.css `.dark` = #1a1f2b / #232b3a / #2c3848; browser-verified live |
| Restyle app surfaces through existing data-* hooks (priority/status/type) | Done | `<TicketCode>` renders the glyph before the key on every surface; borderless cards + critical/high accent stripe; flat badges; browser-verified |
| Density: choose one axis over the 3x3 matrix | Open | needs evidence 9 combos are useful/testable |
| Splines in app | Deferred | needs perf, a11y, clipping, scroll contract; uses canonical dependsOn |
| Pin rail, epic rail, quick-add, subtasks in app | Deferred | await product/domain contracts |

### Session 2026-08-02: documents/ticket-view polish + epic badge

| Change | Status | Evidence |
 | --- | --- | --- |
| Documents filename-tabs: stop duplicating `.tab__list` padding/bg/border (double padding + double border) | Done | documents-view.css → wrapper `flex-shrink-0`; commit 826685c3 |
| FileTree selected title: `text-primary` (1.9:1 in dark) → `text-foreground font-medium` | Done | FileTree.tsx; commit 826685c3 |
| FavDocuments section bottom padding (`pb-0` → `pb-2`) | Done | FavDocuments.tsx; commit 826685c3 |
| Epic badge: lucide `Zap` + gold (`--epic-3`), split from phase via `data-context="epic"` | Done | ContextBadge.tsx, badge.css; commit 9a2284f8 |
| Canonical `.ticket-key` typography (mono/tabular/600, color-agnostic); epic-link keys mono + inherit badge color | Done | ticket.css, TicketCode.tsx, ContextBadge.tsx; commit 3f558e69 |
| Ticket-detail tab strip: solid `bg-subtle` band (dropped the translucent `bg-background/50` utility that was winning) | Done | TicketDocumentTabs.tsx, ticket-viewer.css; commit 95b5cfaa |
| Removed redundant font declarations (`.ticket-card__code` slimmed to size+layout; `.compact-ticket-header__code` dropped) | Done | ticket.css, ticket-viewer.css, CompactTicketHeader.tsx; this commit |

### Update Protocol

- Append a row to the relevant table whenever a redesign change lands, in prototype or app
- Move items from Next/Open to Done as they ship; point the Evidence column at the file or area
- Do not delete historical rows; mark them Superseded when replaced
- Re-baseline this list at each milestone so it stays a faithful record of current state