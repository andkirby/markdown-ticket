# Architecture: MDT-181

**Source**: [MDT-181](../MDT-181-project-accent-colors.md)
**Assess recommendation**: Option 2 — Redesign Inline
**Mode**: Normal

## Overview

MDT-181 extends the existing project selector system with per-user, per-project accent color preferences. The accent provides visual identity for project selector chips and browser cards without increasing component dimensions. A single stored hex value drives both light and dark mode rendering via HSL lightness shifting at runtime.

The architecture extends three existing modules (domain-contracts schema, selector data hook, project selector components) and introduces one new utility module (`accentColors.ts`). No new packages, runtime dependencies, or module boundaries are needed.

## Design Pattern: Extend-and-Resolve

**Pattern**: Extend existing data structures, resolve at render boundary.

The accent color flows through the same data path as existing selector state (favorites, usage tracking). The `SelectorStateEntry` schema gains an optional `accent` field. Components resolve the accent at render time using a priority chain: user-configured accent → deterministic fallback. This avoids pre-computation and keeps rendering reactive to preference changes.

**Rationale**: The selector state system already provides per-project, per-user persistence via `/api/config/selector`. Extending it is cheaper than introducing a new storage mechanism. The resolve-at-render pattern ensures fallback derivation stays consistent across chip and card without duplicating logic.

## Module Boundaries

### Owner: `domain-contracts` (accent schema)

| Responsibility | Boundary |
|---------------|----------|
| `SelectorStateEntrySchema` — add `accent: z.string().optional()` | Extends existing Zod schema with optional field; backward compatible |
| Hex format validation regex in `validation.ts` | Shared validation used by both frontend and backend |

**Invariant**: The `accent` field is optional. Absent accent triggers fallback — never an error.

### Owner: `src/utils/accentColors.ts` (accent utilities)

| Responsibility | Boundary |
|---------------|----------|
| 16-color preset palette with names, hex values, and WCAG AA verified foreground colors | Read-only constant export |
| `getFallbackAccent(projectCode)` — deterministic hash → palette index | Pure function, no side effects |
| `getForegroundForAccent(hex)` — luminance-based light/dark text selection | Pure function using WCAG luminance algorithm |
| `isValidAccentHex(value)` — frontend/backend hex validation | Pure predicate function |
| HSL conversion helpers for theme derivation | Internal utilities |

**Invariant**: All functions are pure. No React hooks, no DOM access, no API calls.

### Owner: `src/components/ProjectSelector/useSelectorData.ts` (accent persistence)

| Responsibility | Boundary |
|---------------|----------|
| `setAccent(projectKey, accent)` — write accent to selector state and persist | Extends existing hook; reuses same debounce/persist mechanism |
| Accent read from `selectorState[projectKey].accent` | No new data fetching; accent is part of existing selector state load |

**Invariant**: Accent persistence goes through `/api/config/selector` only. Never through `/api/projects/:code/update`.

### Owner: `src/components/AddProjectModal/components/AccentColorPicker.tsx` (color picker UI)

| Responsibility | Boundary |
|---------------|----------|
| Dropdown/popover with 4×4 preset grid and custom hex input | Self-contained component; receives current accent + onChange callback |
| Inline hex validation with field-level error display | Uses `isValidAccentHex` from accent utilities |
| External "choose color" link with security attributes | `target="_blank"` + `rel="noopener noreferrer"` |

**Invariant**: The picker calls `onChange(accentValue)` — it does not persist directly.

### Owner: `src/components/ProjectSelector/ProjectSelectorCard.tsx` (card rendering)

| Responsibility | Boundary |
|---------------|----------|
| Render filled accent identity area on left side of card | Accepts `accent` prop; applies via inline `style="--project-accent: {hex}"` |
| Slot-based identity area for future image extensibility | Div slot accepts accent fill now; will accept image source later |

**Invariant**: Card row height does not increase. Identity area width is fixed.

### Owner: `src/components/ProjectSelector/ProjectSelectorChip.tsx` (chip rendering)

| Responsibility | Boundary |
|---------------|----------|
| Render compact flat accent stripe on the left edge of the chip | Accepts `accent` prop; applies via inline style CSS custom property |

**Invariant**: Chip dimensions do not increase. The stripe is a flat left-edge treatment, not a gradient, dot, border tint, or filled-chip background.

## Canonical Runtime Flows

### Flow 1: Accent Selection (Edit Form)

```
User opens Project Edit form
  → AddProjectModal renders AccentColorPicker with current accent
  → User selects preset or enters custom hex
  → AccentColorPicker validates hex inline (isValidAccentHex)
  → On valid selection: onChange(accent) called
  → AddProjectModal calls useSelectorData.setAccent(projectKey, accent)
  → Hook updates selectorState and debounced-persists to /api/config/selector
  → Backend validates accent hex via SelectorStateEntrySchema
  → Persisted to project-selector.json
```

### Flow 2: Accent Resolution (Rendering)

```
Chip/Card component receives ProjectWithSelectorState
  → Component calls resolveAccent(project) helper
  → If selectorState.accent exists → use it
  → Else → getFallbackAccent(project.code) → deterministic palette color
  → Component sets inline style="--project-accent: {resolvedAccent}"
  → CSS consumes var(--project-accent) for identity rendering
  → getForegroundForAccent(hex) provides text color for code/initials on accent
```

### Flow 3: Theme Adaptation

```
Same stored hex value rendered in light or dark mode
  → Light mode: accent used as-is for identity fill; surface tints derived via HSL lightness shift (lighten)
  → Dark mode: accent used as-is for identity fill; surface tints derived via HSL lightness shift (darken)
  → Foreground text selection (light/dark) is computed from hex luminance — theme-independent
  → No re-selection or page reload needed on theme switch
```

## 16-Color Preset Palette

The palette uses well-distributed hues across the color wheel with WCAG AA 4.5:1 verified contrast for foreground text:

| # | Name | Hex | Foreground | Notes |
|---|------|-----|------------|-------|
| 1 | Red | `#dc2626` | `#ffffff` | Tailwind red-600 |
| 2 | Orange | `#ea580c` | `#ffffff` | Tailwind orange-600 |
| 3 | Amber | `#d97706` | `#1a1a1a` | Tailwind amber-600 — high luminance, dark text |
| 4 | Yellow | `#ca8a04` | `#1a1a1a` | Tailwind yellow-600 — high luminance, dark text |
| 5 | Lime | `#65a30d` | `#1a1a1a` | Tailwind lime-600 — high luminance, dark text |
| 6 | Green | `#16a34a` | `#ffffff` | Tailwind green-600 |
| 7 | Emerald | `#059669` | `#ffffff` | Tailwind emerald-600 |
| 8 | Teal | `#0d9488` | `#ffffff` | Tailwind teal-600 |
| 9 | Cyan | `#0891b2` | `#ffffff` | Tailwind cyan-600 |
| 10 | Blue | `#2563eb` | `#ffffff` | Tailwind blue-600 |
| 11 | Indigo | `#4f46e5` | `#ffffff` | Tailwind indigo-600 |
| 12 | Violet | `#7c3aed` | `#ffffff` | Tailwind violet-600 |
| 13 | Purple | `#9333ea` | `#ffffff` | Tailwind purple-600 |
| 14 | Fuchsia | `#c026d3` | `#ffffff` | Tailwind fuchsia-600 |
| 15 | Pink | `#db2777` | `#ffffff` | Tailwind pink-600 |
| 16 | Rose | `#e11d48` | `#ffffff` | Tailwind rose-600 |

**Foreground selection**: Each preset has a foreground color determined by the `getForegroundForAccent()` luminance algorithm. High-luminance presets (Yellow, Lime, Amber) use dark text (`#1a1a1a`); low-luminance presets use white (`#ffffff`). Custom hex values compute foreground via relative luminance comparison against `#ffffff` and `#000000`.

## Hex Validation Contract

Accepted format: `#RRGGBB` — exactly 7 characters, leading `#`, followed by 6 hex digits.

| Input | Verdict | Reason |
|-------|---------|--------|
| `#3b82f6` | Accept | Valid 6-digit hex |
| `#f00` | Reject | 3-digit shorthand |
| `blue` | Reject | Named color |
| `3b82f6` | Reject | Missing leading `#` |
| `#ffffff00` | Reject | 8-digit (includes alpha/transparent) |
| `#gggggg` | Reject | Non-hex characters |
| `#FF0000` | Accept (normalized) | Uppercase accepted, normalized to `#ff0000` before storage |

**Rule**: Accept `#RRGGBB` case-insensitively (hex digits may be uppercase or lowercase). Normalize to lowercase before storage.

## CSS Accent Strategy

Accent rendering uses inline CSS custom properties scoped per element:

```css
/* Per-element accent override */
style="--project-accent: #2563eb"

/* CSS consumption */
.project-chip__accent-mark {
  background-color: var(--project-accent);
}
.project-card__identity-fill {
  background-color: var(--project-accent);
}
```

Theme adaptation for surfaces adjacent to the accent identity area:
- Light mode: surfaces use the accent at reduced opacity or HSL-shifted lighter variants
- Dark mode: surfaces use the accent at reduced opacity or HSL-shifted darker variants

The CSS does not define static accent color variables — all accent color comes from inline custom properties set by React components.

## Edit Form Separation

The `AddProjectModal` in edit mode gains a "Your Project Accent" section:

```
┌─────────────────────────────────────┐
│  Project Name: [__________]         │  ← shared metadata (PUT /api/projects/:code/update)
│  Description: [__________]          │
│  Repository:  [__________]          │
├─────────────────────────────────────┤
│  ── Your Project Accent ──          │  ← personal preference section
│  [AccentColorPicker dropdown]       │     persisted via /api/config/selector
│  [Choose color ↗]                   │
│                                     │
└─────────────────────────────────────┘
```

The accent section saves independently via `useSelectorData.setAccent()`. The shared project fields save via the existing PUT endpoint. The two persistence paths are completely separate.

## Fallback Accent Algorithm

```
function getFallbackAccent(projectCode: string): string
  1. hash = simple string hash of projectCode (sum of char codes)
  2. index = hash % 16 (palette size)
  3. return PALETTE[index].hex
```

Properties:
- Deterministic: same project code always maps to same palette color
- Stable across sessions: no randomness, no storage dependency
- No migration required: fallback is computed, not stored
- Even distribution: hash modulo 16 provides reasonable spread across palette

## Structure

```
domain-contracts/src/app-config/
  schema.ts                          ← SelectorStateEntrySchema.accent extension
  validation.ts                      ← Hex validation helper
  __tests__/accent.test.ts           ← NEW: accent schema + validation tests

src/utils/
  accentColors.ts                    ← NEW: palette, fallback, foreground, validation
  __tests__/accentColors.test.ts     ← NEW: accent utilities tests

src/components/AddProjectModal/
  AddProjectModal.tsx                ← "Your Project Accent" section addition
  components/AccentColorPicker.tsx   ← NEW: color picker dropdown
  components/AccentColorPicker.css   ← NEW: picker styles

src/components/ProjectSelector/
  useSelectorData.ts                 ← setAccent() extension
  useSelectorData.test.ts            ← accent read/write/persist test extension
  ProjectSelectorChip.tsx            ← left-edge accent stripe rendering
  ProjectSelectorCard.tsx            ← accent identity area rendering
  project-selector.css               ← accent CSS custom property consumption
  types.ts                           ← accent type additions
  ProjectBrowserPanel.test.tsx       ← accent rendering test extension

server/
  repositories/ConfigRepository.ts   ← backend selector state handling
  tests/api/selector.test.ts         ← backend accent validation tests
```

## Invariants

1. **Storage isolation**: Accent is stored only in `project-selector.json` via `/api/config/selector`. Never in `.mdt-config.toml`, global registry, shared metadata, CLI config, or MCP output.
2. **Optional field**: `accent` on `SelectorStateEntry` is optional. Absent accent is not an error — fallback is used.
3. **Dimensional stability**: The chip left-edge accent stripe and card identity treatment must not increase chip or card dimensions.
4. **Single source of truth**: One stored hex per user/project. Theme derivation is computed, not stored.
5. **Pure utilities**: `accentColors.ts` exports only pure functions and constants. No React, no DOM, no API.
6. **Separate persistence paths**: Accent saves through selector state API; shared project metadata saves through project update API. These never cross.

## Extension Rule

When adding new identity treatments (e.g., uploaded images in card identity area):
1. Extend the slot in `ProjectSelectorCard` identity area to accept an image source
2. Add image resolution to the accent resolution flow (priority: image > user accent > fallback accent)
3. Image persistence follows the same personal-preference storage pattern (`project-selector.json`)
4. Do NOT add image support to chips — chips use accent color only

## Error Philosophy

- **Invalid hex input**: Frontend rejects immediately with inline error. Previous valid accent preserved. Backend also validates and rejects — defense in depth.
- **Missing accent**: Not an error. Fallback accent derived deterministically from project code.
- **API failure during accent save**: Selector state update fails gracefully. Existing accent unchanged in UI. Error shown via existing error handling in `useSelectorData`.

## Assessed Mismatch Responses

Each mismatch from `assess.md` has a concrete architectural response:

| Assess Mismatch | Architecture Response |
|----------------|----------------------|
| Project Edit Form — Shared vs Personal Boundary | OBL-edit-form-accent-section: Visual separator + separate persistence path via selector state API |
| Selector State Schema Extension | OBL-schema-accent-field: Optional `accent` field on `SelectorStateEntrySchema`; backward compatible |
| Card/Chip Identity Rendering | OBL-chip-accent-identity + OBL-card-accent-identity: Inline CSS custom property; slot-based card identity area |
| Fallback Accent Determinism | OBL-fallback-accent-algorithm: Hash of project code modulo palette size |
| Theme Derivation Strategy | OBL-theme-derivation-strategy: HSL lightness shift from single stored hex |

**Dependency pressure**: No new dependencies adopted. All functionality implemented with existing packages (Zod for validation, existing CSS custom property system for rendering).

**Verification gaps addressed**: OBL-test-coverage-extension requires extending 4 existing test suites and creating 2 new test files before implementation.

---
*Architecture trace projection: [architecture.trace.md](./architecture.trace.md)*
