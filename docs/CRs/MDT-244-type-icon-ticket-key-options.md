---
code: MDT-244
status: Implemented
dateCreated: 2026-09-02T11:08:22.012Z
type: Feature Enhancement
priority: Medium
phaseEpic: MDT-231
---

# Add ticket-type icon display options to ticket key

## 1. Description

### Requirements Scope
`full`

### Problem
- `frontend/src/components/TicketCode.tsx` renders `{PriorityIcon}{key}{epic Zap}{worktree}` — priority and epic-ness have positionally-stable markers beside the key, the type attribute has none
- `frontend/src/components/Badge/TypeIcon.tsx` + `typeIcons.ts` exist (six lucide glyphs, see `styleguide.html#type-icons`) but nothing consumes them
- `frontend/src/components/Badge/TypeBadge.tsx` is text-only — no way to show the type glyph inside the badge, nor to suppress the badge where the glyph already renders beside the key

### Affected Artifacts
- `frontend/src/components/TicketCode.tsx` — single key-composition point; gains optional `{TypeIcon}` slot
- `frontend/src/components/Badge/TypeBadge.tsx` — gains optional leading glyph
- `frontend/src/components/Badge/TypeIcon.tsx`, `frontend/src/components/Badge/typeIcons.ts` — existing, consumed here unchanged
- two app-configuration selectors, user scope in `CONFIG_DIR/user.toml` (`ui.ticketKey.typeIconNearKey`, `ui.ticketKey.typeIconInBadge`), exposure `editable`, owner surface `settings` — following the `ui.projectSelector.*` precedent; NOT browser-only UI preferences (localStorage)

### Scope
- **Changes**: optional type-glyph slot in `TicketCode`, optional leading glyph in `TypeBadge`, two user-scope app-configuration selectors, badge-suppression precedence on co-rendering surfaces
- **Unchanged**: the six-glyph set itself, `PriorityIcon` position/behavior, epic Zap marker, worktree marker, badge.css type colors, the browser-only preference layer (localStorage `browser.*` selectors)

## 2. Decision

### Chosen Approach
Render the type glyph in the `TicketCode` slot between key and epic Zap, driven by two user-scope app-configuration options with a badge-suppression precedence rule.

### Rationale
- every surface already routes key rendering through `TicketCode.tsx` (single-composition invariant, STYLING.md § Stable Scanning Patterns) — type gains the same everywhere-scannability priority has, one edit point
- icon-replaces-badge removes duplicate type encoding where key and badge co-render (ticket viewer header shows both)
- the badge-glyph option keeps `TypeBadge` self-sufficient on surfaces that render it without the key row
- two booleans + precedence beat a tri-state enum: all four states are meaningful, no dead combination
- app configuration, not UI preference: options persist in `user.toml` server-side — consistent across browsers and delivered through the settings-owned config flow (MDT-168 `useBackendConfig`), like `ui.projectSelector.*`

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Two options + suppression precedence** | key-icon option suppresses adjacent badge | **ACCEPTED** — matches requested config; no dead state; independent badge control on detail surfaces |
| Single tri-state setting (badge / icon / off) | one enum instead of two toggles | loses independent badge-glyph control where badge renders without the key |
| Always render icon and badge together | no suppression rule | duplicate glyph + text in one header line |
| Browser-only UI preference (localStorage `browser.*`) | client-side toggle like `browser.cardDensity` | rejected — owner decision: these are app configuration; localStorage would not persist across browsers nor flow through the settings-owned config path |

## 4. Artifact Specifications

### New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| `ui.ticketKey.typeIconNearKey` (`user.toml`, user scope) | Setting | show/hide the type glyph in the key slot |
| `ui.ticketKey.typeIconInBadge` (`user.toml`, user scope) | Setting | show/hide the leading glyph inside `TypeBadge` |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `domain-contracts/src/config-management/selectors.ts` + exposure registration | Selector added | register `ui.ticketKey.typeIconNearKey` / `ui.ticketKey.typeIconInBadge` (user scope, `editable`, owner `settings`) |
| `frontend/src/components/TicketCode.tsx` | Element added | optional `<TypeIcon>` after `{code}`, before epic Zap; reads `typeIconNearKey` |
| `frontend/src/components/Badge/TypeBadge.tsx` | Element added | optional leading `<TypeIcon className="badge__icon">` when `typeIconInBadge` is on |
| `frontend/src/components/TicketViewer/CompactTicketHeader.tsx` | Behavior added | suppress `TypeBadge` when the key row already shows the type glyph |

### Integration Points

| From | To | Interface |
|------|----|-----------|
| `TicketCode` | `TypeIcon` | `<TypeIcon type={ticket.type} className="ticket-code__type-icon" />` |
| `user.toml` via config API (`useBackendConfig` / `configApiClient`) | `TicketCode` / `TypeBadge` | two read-only display flags, defaults off when keys absent |

### Key Patterns
- Single-composition invariant: key-layout changes happen only in `TicketCode.tsx`, never per-surface
- `data-type` attribute coloring: glyph inherits `--type-*` via `currentColor` (badge.css), no new colors
- Fast-Refresh map-module pattern: `typeIcons.ts` stays a plain module beside the component
- Owner-first config: rendering toggles are declarative selectors (MDT-238), server-persisted in `user.toml` — never localStorage

## 5. Acceptance Criteria

### Functional
- [x] `TicketCode` renders `{priority}{key}{type icon}{epic Zap}{worktree}` — type icon sits between key and Zap when `typeIconNearKey` is on
- [x] with `typeIconNearKey` off, key rendering is identical to current output
- [x] `TypeBadge` renders a leading glyph when `typeIconInBadge` is on, text-only when off
- [x] when the key row shows the type glyph, `TypeBadge` is suppressed on co-rendering surfaces (viewer header); badge reappears when the option turns off
- [x] missing/unknown type: no key glyph rendered, badge behavior unchanged *(divergence, annotated: a present-but-unknown type renders the feature-fallback glyph — mirroring badge.css's unknown → feature tint; a missing type renders none)*
- [x] both options default off — shipped behavior unchanged until opted in
- [x] options are app configuration: set via Settings → persisted to `user.toml`, honored across browsers; absent keys fall through to defaults (off)
- [x] key-line glyph carries a native `<title>` hover tooltip with the type name (added during owner review 2026-09-03; non-interactive, aria-hidden preserved)

### Non-Functional
- [x] glyph renders at `--sz-icon` (16px), lucide 2px stroke, `--type-*` color via `currentColor`
- [x] key-line glyphs stay `aria-hidden`; badge text remains the accessible name
- [x] no new network requests (glyphs ship in the JS bundle via lucide-react)

### Testing
- Unit: `TicketCode` with option on/off → `svg[data-type]` present/absent, position between code and epic Zap
- Unit: `TypeBadge` with `typeIconInBadge` on/off → leading `svg` present/absent
- Unit: viewer header with key icon on → `TypeBadge` absent; off → present
- Manual: board card, list row, viewer header, QuickSearch hit — both themes, glyph legible at 16px; toggle via Settings → value lands in `user.toml` and survives a localStorage clear

## 6. Verification

### By CR Type
- Artifact `TicketCode.tsx` renders the type slot per options; unit tests above pass; manual visual pass on board + viewer in both themes

### Metrics
- none — visual feature with no baseline metric; verifiable artifacts are the acceptance criteria above

## 7. Deployment

- Ships via normal `bun run build`; selector registration touches the config model (domain-contracts) and the existing config API — no new endpoint
- Display options default off — absent `user.toml` keys fall through to defaults; no configuration migration