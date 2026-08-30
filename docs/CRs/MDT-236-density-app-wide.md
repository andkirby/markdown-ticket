---
code: MDT-236
status: In Progress
dateCreated: 2026-08-18T01:40:40.513Z
type: Architecture
priority: Medium
implementationNotes: Implemented via pipeline-e2e: app-wide density consumers (list table, documents tree, QuickSearch, panel cards, ticket attributes) + 11px clamp floor (user-approved) + density E2E spec 7/7 green. Artifacts in docs/CRs/MDT-236/.
---

# Extend density system to all surfaces

## 1. Description

### Requirements Scope
`none` — Architecture CR; WHAT only, rollout strategy decided in `mdt:architecture`.

### Problem
- The two-axis density system (SIZE: text & element scale; SPACE: padding & gaps) currently affects ticket cards only — list view rows, documents view, modals, and the ticket viewer ignore the user's density choice.
- Users who pick Compact/Tight to see more content get cards-only relief; every other surface stays at fixed density, so the setting feels half-applied.
- Chrome already has a separate static type scale; without a documented mapping, future surfaces will again mix card tokens, chrome tokens, and raw sizes (the drift this system just cleaned up).

### Affected Areas
- Frontend: all content surfaces — list view rows, documents navigation + viewer, modals/settings, ticket viewer/detail.
- Frontend: density token consumption and documentation (THEME/styleguide contract).
- No backend impact — browser-local preference and CSS tokens only.

### Scope
- **In scope**: SIZE and SPACE axes respond on every content surface, not just ticket cards; documented token-to-surface contract; density menu remains the single control point.
- **Out of scope**: chrome sizing (header/toolbars/menus — already governed by the static chrome type scale, intentionally density-immune); changing axis steps or values; prose/markdown reading density (separate existing setting).

## Existing Foundation (already shipped)

- `01dc2ec5` feat(theme): chrome type scale + two-axis density system
  - Two axes in tokens: SIZE (compact/regular/comfortable → text scale + card radius), SPACE (tight/normal/relaxed → padding/gaps).
  - Header DensityMenu (design3 §Density): preview tiles, live `size · space` readout, reset; Settings modal exposes both axes.
  - Chrome type scale (`--fs-ui`/`--fs-ui-sm`/`--fs-ui-xs`) split from card-density tokens; all chrome migrated off density-driven tokens and raw px/rem font sizes.
- `d642f232` feat(sort): collapsed SortMenu for header and documents toolbar — flush-row menu idiom, shared anchored-popover hook; established the pattern new popovers must reuse.
- Card-density tokens apply today via the density driver hook on the document root; ticket cards (and PinRail card-mimics) are the only consumers.

## 2. Desired Outcome

> Architecture trace projection: [architecture.trace.md](./MDT-236/architecture.trace.md)
> Architecture notes: [architecture.md](./MDT-236/architecture.md)
> Assessment: [assess.md](./MDT-236/assess.md)

### Success Conditions
- Changing SIZE visibly scales text/element sizing on ticket cards, list rows, documents tree/favs/recent rows, and every other surface the architecture classification marks as content (reading-surface participation is an open question below).
- Changing SPACE visibly adjusts padding/gaps within those same surfaces.
- Axes remain independent everywhere: SIZE changes never move padding; SPACE changes never move text scale.
- Chrome (headers, toolbars, menus, popovers) remains density-immune at all settings.
- One density control (the header Density menu) governs all surfaces; no per-surface density toggles and no Settings duplicate (removed MDT-236).

### Constraints
- Must reuse the existing preference layer, change events, and cross-tab sync — no parallel persistence.
- Must keep stored preferences backward-compatible (existing keys/values stay valid).
- Must not regress the chrome type scale or reintroduce density-driven chrome sizing.
- Must respect the interaction-state ramp and existing surface-tier model on newly density-aware surfaces.
- Accessibility floor: no axis combination may drop content text below the smallest sanctioned size (11px / `--fs-ui-xs`), and interactive targets on density-aware surfaces must keep a minimum 24px pointer target; density must never alter color or contrast tokens.

### Non-Goals
- Not adding axis steps or changing token values.
- Not making chrome density-aware.
- Not unifying markdown prose density with this system.

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Token mapping | Do content surfaces consume the card-density tokens directly, or does each surface family get its own density-scaled tokens derived from the axes? | Card tokens are runtime-rewritten on the document root; whatever mapping is chosen must stay token-driven (no JS sizing per component) |
| List view | Which slot (row height/padding, text) scales on list rows, and at which steps? | Must not break table alignment or row testids |
| Documents view | Do tree/favs/recent rows scale by SIZE, SPACE, or both? Viewer content is prose — excluded? | Chrome type scale governs toolbar; navigation rows are content-ish — boundary needs a decision |
| Modals/viewer | Do dialogs and the ticket reader participate, or stay fixed? | Reader comfort is a reading-surface concern; changing it may fight the separate markdown density setting |
| Migration order | Surface-by-surface rollout vs one token-layer change? | Prefer the smallest change that removes the per-surface decision |
| Surface classification | Which remaining surfaces are content vs chrome: QuickSearch result rows, project selector cards/browser, settings rows, ticket detail attributes, swimlane lane cards vs lane headers? | Deliverable: an inventory table with a verdict per surface; chrome verdict = density-immune by rule, not case-by-case taste |

### Source-of-truth anchors (inputs for architecture)
- `frontend/src/THEME.md` §Density slots + §Chrome type scale — token names and current values
- `frontend/src/styleguide.html` §density slots / §chrome type scale — live contract
- `frontend/src/styles/design-tokens.css` — machine truth (axes, chrome scale)
- `frontend/src/hooks/useCardDensity.ts` — runtime rewrite mechanism
- `docs/design/surfaces/sort-menu.spec.md` — popover/menu pattern any new surface must reuse

### Known Constraints
- Density driver rewrites tokens at runtime; consumers must be pure CSS var() references.
- New popovers/menus must reuse the shared anchored-popover hook and flush-row idiom.

### Decisions Deferred
- Per-surface token mapping and values (mdt:architecture).
- Migration sequencing and task breakdown (mdt:architecture, mdt:tasks).

## 4. Acceptance Criteria

### Functional (Outcome-focused)
- [ ] Setting SIZE to compact/comfortable changes text/element scale on cards, list rows, and documents navigation rows in the same interaction.
- [ ] Setting SPACE to tight/relaxed changes padding/gaps on those surfaces without any text-size change.
- [ ] Header, toolbars, menus, and popovers render identically at every density combination.
- [ ] Density choice persists across reloads and syncs across tabs on all affected surfaces.
- [ ] Reset returns every surface to regular · normal.

### Non-Functional
- [ ] No layout shift or overflow introduced at any axis combination on supported viewports.
- [ ] No raw px/rem font sizes added on newly density-aware surfaces (token-greppable).
- [ ] Accessibility floor holds at compact · tight: content text ≥ 11px, interactive targets ≥ 24px, color/contrast unchanged.

### Edge Cases
- Extreme combinations (compact · relaxed, comfortable · tight) must not clip text or collapse rows.
- Stored legacy preferences (pre-two-axis values) must map to sensible defaults on all surfaces.
- A surface misclassified later (content that should be chrome or vice versa) must be fixable by changing its token consumption only — no component rewrite.

## 5. Verification

### How to Verify Success
- Manual: cycle all nine axis combinations; screenshot-compare cards, list, documents, modals.
- Automated: E2E asserting computed styles on representative elements per surface change with the axes and are unchanged on chrome; unit tests for any new token mapping.
- Documentation: THEME.md and styleguide list every density-aware surface and the mapping.