# Architecture: MDT-244

**Generated**: 2026-09-02 · Assess verdict: Option 1 (Integrate As-Is)

## Overview

The feature bolts onto three existing seams without moving any boundary: the `TicketCode` single-composition point gains one optional slot; `TypeBadge` gains one optional leading glyph; and the declarative config registry gains two USER-scope selectors that ride the existing config API, patch-schema map, and settings-owned editing flow. The only genuinely new piece is a small shared consumption module so a component rendered once per card/row/search-hit can read two config booleans without per-instance fetches.

## Decisions

1. **Config consumption seam** (assess mismatch response): new `frontend/src/config/ticketKeyConfig.ts` — module-level store holding the two selector values, populated by one `fetchConfigSelectors`-based read, consumed via `useSyncExternalStore`, and refreshed by the same narrow window-event mechanism `useBackendConfig` uses for `ui.projectSelector.*` (BR-7.1 precedent; its notification list gains the two new selectors). Server-side SSE `config:changed` remains the target architecture for a later CR — staleness until refresh is accepted (Edge-1).
2. **Key-line glyph styling**: mirror the `.priority-icon` rows in `ticket.css` — `.ticket-code__type-icon` sized `var(--sz-icon)` with per-`data-type` `--type-*` color rules. Colored, matching the priority glyph precedent (scannability), not neutral currentColor.
3. **Suppression ownership**: `CompactTicketHeader` owns the omission — it reads the same shared options and conditionally renders its `TypeBadge`. `TicketCode` stays suppression-agnostic (it never knows about badges), keeping the composition point single-purpose.
4. **Settings UI comes free**: `BackendConfigSection` renders editable user-scope selectors from descriptors; registering the two selectors with `exposure: editable`, `ownerSurface: settings` surfaces the toggles without bespoke Settings work. Implementation verifies labels/wording.
5. **Glyph set frozen**: `TypeIcon`/`typeIcons.ts` are consumed unchanged — no new glyphs, no fallback changes.

## Module Boundaries

- `domain-contracts/src/config-management/*` — owns selector truth (descriptors + patch schemas). Frontend consumes delivered values, never hardcodes config semantics.
- `frontend/src/config/ticketKeyConfig.ts` — the only module that knows how the two options are fetched/refreshed; components read a plain `{ typeIconNearKey, typeIconInBadge }`.
- `TicketCode.tsx` — owns key-line composition only. `TypeBadge.tsx` — owns badge composition only. `CompactTicketHeader.tsx` — owns suppression.

## Invariants

- Key rendering changes happen only in `TicketCode.tsx` (STYLING.md scanning-pattern invariant).
- Options live in `user.toml` via the declarative registry — never localStorage, never bespoke fetches in components.
- Absent keys → both options off; output byte-identical to pre-feature.
- No new colors, sizes, or network requests; glyph aria-hidden in the key line.
- `user.toml` values are validated by strict patch schemas; boolean only.

## Program Design

Skipped — the change is local and reversible: additive TOML keys through the existing declarative registry, no API shape change (PATCH contract untouched), no persistence-model or security-boundary change. Canonical contracts live in the trace obligations.

## Diagrams

```text
Settings (descriptor-driven) ──PATCH /api/config──▶ user.toml
                                                        │
                                        config API ◀────┘ (fetch once + narrow refresh event)
                                                        │
                                  ticketKeyConfig.ts (module store + useSyncExternalStore)
                                                        │
                     TicketCode slot ◀──────────────────┤
                     TypeBadge leading glyph ◀──────────┤
                     CompactTicketHeader suppression ◀──┘
```
