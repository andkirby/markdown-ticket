# Assessment: MDT-181

## Verdict

**Recommendation**: Option 2 — Redesign Inline

## Feature Pressure

### Target Feature Needs
- A new per-user, per-project accent color preference stored in the existing owner-owned selector state system (`project-selector.json` / `/api/config/selector`).
- A color picker dropdown control in the Project Edit form (AddProjectModal in edit mode) that supports 16 presets + custom hex input.
- A "choose color" link in the Project Edit form that opens `https://share.google/ATp6ypatbFk69dC91` in a new tab (`target="_blank"`) for users who want external color selection help.
- Backend hex validation for custom color values before persistence.
- Frontend inline field-level validation error for invalid custom hex values — rejects the change without overriding the previous valid accent.
- Project selector chips (rail) receive a compact accent identity mark (colored indicator bar, dot, or border tint).
- Project browser cards (panel) receive a filled accent identity area on the left side of the card, preserving current card row height.
- Deterministic fallback accent colors for projects where the current user has not selected an accent, stable across sessions.
- Light and dark mode derive theme-appropriate rendering from the same stored hex accent value without separate theme color storage.
- The accent is a personal visual preference — never written to `.mdt-config.toml`, shared project metadata, CLI config, or MCP-visible output.
- The 16-color preset palette must meet accessibility contrast thresholds (WCAG AA 4.5:1) for foreground text (project code/initials) rendered on accent backgrounds. Custom hex values must trigger automatic foreground color selection (light/dark) to maintain readability.

### Current System Assumptions
- Per-project selector state is a flat JSON file (`project-selector.json`) keyed by project code, holding `{ favorite, lastUsedAt, count }`. There is no per-project accent field today.
- The selector state is loaded via `useSelectorData` hook, persisted through `/api/config/selector` POST, and validated by `SelectorStateEntrySchema` in `domain-contracts`.
- Project cards/chips render purely from text data (code, name, description) plus a favorite star overlay. There is no color or image identity treatment.
- The Project Edit form (`AddProjectModal` in edit mode) manages shared project metadata (name, description, repository URL) via PUT `/api/projects/:code/update`. There is no per-user preference control in this form today.
- CSS theming uses CSS custom properties (`--project-card-*`, `--project-chip-*`) with `:root` / `.dark` variants. Card and chip styling is gradient-based using these variables.
- The app is single-user (owner-admin) with optional read-only visitors via read tokens. The auth model (`AccessMode`) has no multi-user identity concept — there is effectively one "current user" per deployment.

## Fitness Summary

| Dimension | Verdict | Why |
|-----------|---------|-----|
| Structural Fit | Healthy | Accent data extends the existing `SelectorStateEntry` naturally — same file, same API, same hook. No new module boundary needed. |
| Extension Fit | Concerning | The Project Edit form currently manages shared project metadata only. Adding a per-user preference control (accent picker) to the same form blurs the line between shared project metadata and personal preference UI. The form needs a clear visual/conceptual separation for the preference section. |
| Dependency Fit | Healthy | No new packages, runtime, or tooling required. Hex validation is trivial. CSS custom properties already support per-instance color overriding. |
| Verification Fit | Healthy | Existing selector state tests (`server/tests/api/selector.test.ts`, `src/components/ProjectSelector/useSelectorData.test.ts`) and project browser tests (`src/components/ProjectSelector/ProjectBrowserPanel.test.tsx`) provide good preservation coverage. Card/chip rendering tests will need extension. |
| Redesign Scope | Concerning | Bounded redesign needed for: (1) `SelectorStateEntrySchema` → add accent field, (2) `useSelectorData` hook → expose accent read/write, (3) AddProjectModal → add preference-only section with color picker, (4) Card/Chip components → accept and render accent identity marks, (5) CSS variable system → support per-project accent overrides. All changes are within the existing project selector module boundary. |

## Mismatch Points

### Project Edit Form — Shared vs. Personal Boundary

- **Current system assumes**: `AddProjectModal` edit mode manages shared project fields (name, description, repository) via PUT to `/api/projects/:code/update`. All fields are shared project metadata.
- **Feature needs**: A color picker dropdown in the same form that persists to the owner's `project-selector.json` (personal preference), not to shared project config.
- **Mismatch**: The form currently has one submit path (shared metadata PUT). Adding a personal preference control requires either: (a) a separate persistence path for the accent within the same form, or (b) a clearly demarcated "Personal Preferences" section in the form that saves independently of the shared project update.
- **Adjustment required**: Add a visually separated "Your Project Accent" section within the edit form that saves to selector state (`/api/config/selector`), not to the project update endpoint. Wire the accent save through `useSelectorData`'s existing persistence pattern.
- **Scope**: bounded

### Selector State Schema Extension

- **Current system assumes**: `SelectorStateEntry` has exactly three fields: `favorite`, `lastUsedAt`, `count`.
- **Feature needs**: A new `accent` field (hex string or preset name) per project entry.
- **Mismatch**: Minor — the Zod schema and validation need extension. The `project-selector.json` structure gains a new optional field. The `useSelectorData` hook needs accent-aware merge/persist.
- **Adjustment required**: Extend `SelectorStateEntrySchema` with `accent: z.string().optional()`. Update `useSelectorData` to expose `setAccent(projectKey, value)`. Frontend components consume the accent from selector state.
- **Scope**: local

### Card/Chip Identity Rendering

- **Current system assumes**: Cards and chips are text-only with gradient backgrounds from CSS variables. No per-instance color customization.
- **Feature needs**: Per-project accent applied as a colored identity mark (chip: small colored indicator; card: filled left area or border accent) without increasing card dimensions. Card identity area must support both accent-color fill and uploaded-image fill via a slot-based design that can accept either a color value or an image source.
- **Mismatch**: The current CSS variable system defines global card/chip colors. Per-project accent requires either inline styles or CSS variable overrides scoped to individual card instances. The card layout currently has no identity slot — code text is the only visual mark.
- **Adjustment required**: Pass accent color from `ProjectWithSelectorState` to card/chip components. Apply accent via inline style or per-element CSS custom property (`style="--project-accent: #3b82f6"`). Update CSS to consume `var(--project-accent)` where accent treatment is needed. Design a slot-based identity area in cards that renders either an accent-color fill or an image when available, preserving card dimensions.
- **Scope**: bounded

### Fallback Accent Determinism

- **Current system assumes**: All projects render identically except for text content and favorite state.
- **Feature needs**: Projects without a user-selected accent need a deterministic fallback color (stable across sessions, not random each render).
- **Mismatch**: No fallback color mechanism exists. A hash-based derivation from project code would work but needs explicit design.
- **Adjustment required**: Implement a `getFallbackAccent(projectCode)` function that deterministically maps project code to one of the 16 preset colors (e.g., via codepoint hash modulo palette size). Apply fallback only when `selectorState.accent` is unset.
- **Scope**: local

### Theme Derivation Strategy

- **Current system assumes**: Light/dark theme switching is handled globally via CSS custom properties defined in `:root` and `.dark` blocks in `design-tokens.css` and `project-selector.css`. All colors are statically defined at build time.
- **Feature needs**: A single stored hex accent value (e.g., `#3b82f6`) must produce theme-appropriate rendering in both light and dark modes without requiring separate stored colors.
- **Mismatch**: The current system has no mechanism to derive light and dark surface treatments from a single dynamic hex value at runtime. Static CSS variables cannot adapt to per-project accent colors.
- **Adjustment required**: Implement a concrete single-hex-to-light/dark rendering strategy. Options: (a) HSL lightness shift — parse hex to HSL, lighten for light-mode surfaces, darken for dark-mode surfaces; (b) CSS opacity/overlay technique — use the stored hex as a base, apply a semi-transparent white/black overlay in CSS for theme adaptation; (c) dual-surface treatment — accent fills identity area directly, adjacent text uses computed foreground from hex luminance. The palette preset definitions should include light/dark surface variants. Custom hex values should compute foreground and surface treatment from luminance.
- **Scope**: bounded

## Open Questions Resolution

| # | Open Question | Status | Answer / Disposition |
|---|--------------|--------|---------------------|
| 1 | What exact 16 accent names and values should be canonical? | Resolved by design | Architecture stage must define the 16-color palette with names, hex values, and verified WCAG AA contrast on both light and dark backgrounds. |
| 2 | What exact hex formats should backend validation accept? | Resolved by design | 6-digit hex with leading `#` (e.g., `#3b82f6`). Reject 3-digit shorthand, non-hex characters, transparent values, and missing leading `#`. Backend validation contract defined in architecture stage. |
| 3 | What Project Edit form control pattern should host preset colors plus custom hex? | Resolved by design | A dropdown/popover color picker with a 4×4 preset grid and a custom hex input field below it. Clearly separated from shared project fields in a "Your Project Accent" section. |
| 4 | Which per-user storage tier should own the selected accent? | Resolved | Owner-owned `project-selector.json` via `/api/config/selector` — same storage tier as favorites and usage tracking. Single-user deployment model means this is effectively per-user. |
| 5 | How should projects without a user-selected accent receive fallback colors? | Resolved by design | Deterministic hash of project code mapped to the 16-color palette. Stable across sessions, no migration required. |
| 6 | Should future image support use upload/select-and-copy into user-owned preference storage? | Deferred | Out of scope for this CR. Image slot in card identity area will be designed for extensibility but not implemented. |
| 7 | How should future uploaded image/logo and accent color priority be resolved? | Deferred | Out of scope for this CR. Architecture should design the identity slot to accept either color or image source, but priority rules are not needed until image support is implemented. |
| 8 | What contrast thresholds apply to accent marks and filled identity areas? | Resolved | WCAG AA 4.5:1 for foreground text (project code/initials) on accent backgrounds. Palette presets must meet this threshold. Custom hex must trigger automatic foreground selection based on luminance. |

## Edge Cases

| Edge Case | Assessment | Disposition |
|-----------|-----------|-------------|
| Current user has no configured accent for a project | Fallback mechanism needed | Handled by design — deterministic `getFallbackAccent(projectCode)` produces stable color from palette hash |
| Current user enters malformed custom hex | Validation at both frontend and backend | Frontend: inline field-level error, rejects change without overriding previous valid accent. Backend: rejects with structured validation error, does not persist |
| Current user opens external color helper and returns without changing value | No state change | No-op — `choose color` link opens in new tab; returning without change leaves accent unchanged |
| Another user has a different configured accent for the same project | Cross-user independence | Handled by design — accent is per-user preference in owner-owned `project-selector.json`. In single-user deployment this is moot. Multi-user deployments would need separate preference storage (future concern) |
| Project has no uploaded image or image fails to load | Image out of scope | Accent color is the only identity source in this CR. Future image support adds fallback logic |
| Previously selected personal image is missing from user-owned storage | Image out of scope | No personal image storage in this CR. Future image support addresses this |
| Project folder contains possible logo/image files but user has not selected one | Out of scope — no auto-discovery | CR explicitly excludes auto-reading images from project folder |
| Project has a long code or long name | Layout robustness | Existing card/chip truncation (`truncate break-words`) handles long text. Accent mark is fixed-size; does not affect text layout |
| User switches between light and dark mode | Same accent, different rendering | Theme derivation strategy produces adapted rendering from single stored hex. No re-selection needed |
| Read-only visitor views/uses accent preference | Requires design decision | Read-only visitors via read tokens cannot currently write to `/api/config/selector` (requires owner-admin access). Decision needed: either (a) read-only visitors get deterministic fallback accents only, or (b) accent preferences are stored client-side (localStorage) for non-owner users |
| Multiple projects select the same accent | Normal case | No conflict — multiple projects can share the same accent. User distinguishes by code/name text |

## Dependency and Tooling Pressure

- New packages: none
- Runtime/config impact: none — accent data piggybacks on existing `project-selector.json` and `/api/config/selector` API
- Testing/E2E impact: existing selector state and project browser tests need extension for accent field; no new test harness needed
- Main risk introduced: blur between shared project metadata and personal preference in the edit form — must be clearly separated in the UI and persistence path

## Verification Gaps

- Preservation tests needed: extend `SelectorStateEntrySchema` tests to cover accent field validation (valid hex `#3b82f6`, invalid hex `blue`, 3-digit shorthand `#f00`, missing/undefined, transparent values); extend `useSelectorData` tests to cover accent read/write/persist cycle; test frontend inline validation error behavior for malformed hex; test backend structured validation error response
- E2E/contract drift risks: `project-selector.json` schema gains an optional field — backward compatible; `/api/config/selector` response shape gains accent in entries — backward compatible
- Accessibility verification: 16-color palette presets must be verified against WCAG AA 4.5:1 contrast ratio for foreground text; custom hex foreground auto-selection must be tested with edge-case colors (very light, very dark, near-mid-range)
- Safe-to-refactor now?: yes — existing tests cover current selector state behavior; the accent field is additive and optional

## Recommendation

### Option 1: Integrate As-Is
Use when: No conceptual boundary issue in the edit form exists.
Architecture impact: minimal
**Not chosen** because the Project Edit form needs bounded redesign to cleanly separate shared metadata from personal preference controls.

### Option 2: Redesign Inline
Use when: The form boundary issue is real but localized to the edit form and selector state module. No new system-level seams are needed.
Architecture must redesign:
1. `SelectorStateEntrySchema` in `domain-contracts` — add optional `accent` field
2. `useSelectorData` hook — expose `setAccent(projectKey, accent)` with persistence
3. `AddProjectModal` edit mode — add "Your Project Accent" section, clearly separated from shared project fields, with color picker dropdown (16 presets + custom hex)
4. Backend hex validation — extend selector state validation to accept valid hex strings for the accent field
5. `ProjectSelectorCard` and `ProjectSelectorChip` — accept and render accent color from selector state
6. CSS system — support per-element accent via inline custom property
7. Fallback accent — deterministic hash-based function for projects without user-selected accent
8. AddProjectModal — add external "choose color" link (`target="_blank"`) alongside the color picker, pointing to `https://share.google/ATp6ypatbFk69dC91`
9. Theme derivation — implement single-hex-to-light/dark rendering strategy (HSL lightness shift or CSS overlay technique)
10. Accessibility — define 16-color palette with verified WCAG AA contrast; implement automatic foreground color selection for custom hex values based on luminance
11. Validation — frontend inline field-level error for invalid custom hex (rejects without overriding previous valid); backend structured validation error response

Expected scope added: The redesign is bounded to the project selector module (`src/components/ProjectSelector/`), the selector state schema (`domain-contracts/src/app-config/schema.ts`), the selector state hook, and the edit form. No cross-cutting changes needed.

### Option 3: Redesign First
Use when: The feature cannot fit without reworking multiple system boundaries.
Reason redesign cannot wait: N/A — the mismatch is bounded, not systemic.
**Not chosen** because the change is well-contained within existing module boundaries.
