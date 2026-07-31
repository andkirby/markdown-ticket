---
code: MDT-220
status: Proposed
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
| Border-led depth, background tiers, mono ticket codes | Established | inherent Design3 grammar |
| Token bridge to app: v3 tokens already present in app | Partial | src/styles/design-tokens.css |
| Density matrix: 3x3 (size x space) shipped in prototype | Open | strategy calls for one axis only |

### Border and Accent Refinement

- Principle: drop decorative gray borders; whitespace and background tiers hold the layout. Borders survive only where they carry meaning — an accent stripe whose color maps to data.
- Dropped (Done): card static gray border -> transparent, revealed on hover only (.kanban-card); column outer border removed, defined by bg-subtle tier + radius + gap (.board-col); modal badge outlines (priority/type/phase/sprint) -> flat bg-muted tint (design3.html)
- Added (Done): priority accent stripe — 3px left edge, now restricted to critical/high tickets + epics only (importance landmark, not every card; low/medium have no stripe via unset --accent); epic stripe in --epic-color; hover keeps the accent left edge while revealing the other three borders
- Rule (binding): accent color must map to data (priority or epic); never decorative
- Deferred: selected-card indigo accent — no board selection state exists yet
- Drift cleanup (Done): removed the floating col-header underline; collapsed-column border -> transparent to match expanded columns; avatar ring recolored to --bg-elevated to match the card surface; :active now preserves the accent stripe

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
| Propagate tuned dark-theme ramp into app `.dark` tokens | Next | src/styles/design-tokens.css |
| Restyle app surfaces through existing data-* hooks (priority/status/type) | Next | per adoption strategy |
| Density: choose one axis over the 3x3 matrix | Open | needs evidence 9 combos are useful/testable |
| Splines in app | Deferred | needs perf, a11y, clipping, scroll contract; uses canonical dependsOn |
| Pin rail, epic rail, quick-add, subtasks in app | Deferred | await product/domain contracts |

### Update Protocol

- Append a row to the relevant table whenever a redesign change lands, in prototype or app
- Move items from Next/Open to Done as they ship; point the Evidence column at the file or area
- Do not delete historical rows; mark them Superseded when replaced
- Re-baseline this list at each milestone so it stays a faithful record of current state