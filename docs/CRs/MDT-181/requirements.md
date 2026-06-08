# Requirements: MDT-181

**Source**: [MDT-181](../MDT-181-project-accent-colors.md)
**Generated**: 2026-06-07
**Scope**: full

## Overview

MDT-181 adds per-user, per-project accent colors to the project selector and browser surfaces. Users choose one of 16 preset colors or a custom hex value from Settings > Appearance > Project Accents. The accent provides stronger visual identity in the selector rail and browser cards without increasing component dimensions. A single stored hex value drives both light and dark mode rendering. The feature is a personal visual preference — never written to shared project configuration. Accent changes are staged and saved on explicit user action (not immediately on pick).

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | architecture.md (Storage Boundary), tasks.md (Verify: no shared config writes) |
| C2 | architecture.md (Theme Derivation Strategy), tests.md (theme switching tests) |
| C3 | architecture.md (Component Layout), tests.md (layout regression tests) |
| C4 | architecture.md (Palette Definition), tests.md (contrast verification) |
| C5 | architecture.md (Foreground Auto-Selection), tests.md (custom hex contrast) |
| C6 | architecture.md (Fallback Algorithm), tests.md (determinism tests) |
| C7 | architecture.md (Edit Form Separation), tasks.md (form UI implementation) |
| C8 | architecture.md (Backend Validation Contract), tests.md (negative validation tests) |
| C9 | architecture.md (External Link Security), tests.md (link attribute tests) |

## Non-Ambiguity Table

| Concept | Final Semantic (chosen truth) | Rejected Semantic | Why |
|---------|-------------------------------|-------------------|-----|
| Accent storage location | Owner-owned `project-selector.json` via `/api/config/selector` API, extending `SelectorStateEntry` with optional `accent` field | Browser localStorage; backend per-user database table | Existing selector state pattern already provides per-project state persistence. Extending it avoids new storage mechanisms. |
| Accent scope | Per-user, per-project pair — one color per user/project combination | Per-project shared accent; per-user global accent | CR explicitly scopes this as personal preference per project, not shared. |
| Valid hex format | 6-digit hex with leading `#` (e.g., `#3b82f6`) | 3-digit shorthand (`#f00`), no leading `#`, CSS named colors, RGB/RGBA | Strict format simplifies validation and ensures consistent storage. 3-digit shorthand introduces ambiguity. |
| Fallback algorithm | FNV-1a hash of project code → 360° hue mapping with fixed saturation 65%, lightness 45%. Stable, deterministic, no migration. Results cached in a `Map`. | Random color per render; sequential color assignment; user-selectable default; 16-color palette index | CR requires stability across sessions and no migration. FNV-1a provides excellent distribution for short strings and a unique vivid color per project code. |
| Theme derivation | Single stored hex → runtime HSL lightness shift or CSS overlay for theme-appropriate surface treatment | Separate stored colors per theme; CSS-only static variables | CR explicitly requires one selection to drive both themes. Runtime derivation from a single value is the only approach that satisfies this. |
| Foreground auto-selection | Compute foreground color (light/dark text) from stored hex using sRGB perceptual brightness formula (`r×299 + g×587 + b×114 / 1000`, threshold 150). Vivid saturated colors get white; only light/pastel values get dark text. | Hard-coded foreground per preset; user-selectable foreground; WCAG luminance contrast ratio | Perceptual brightness correctly handles saturated blues/purples that WCAG luminance misclassifies as "dark". Ensures comfortable readability for accent badges.
| Edit form section | Accent controls live in Settings > Appearance > Project Accents, completely separate from the Edit Project form which handles shared metadata only. Settings provides staged editing with explicit Save/Cancel. | Inline with shared project fields; separate modal | CR requires clear separation between personal preference and shared project metadata. Settings naturally owns personal preferences with proper save/cancel semantics. |
| Image slot in cards | Card identity area designed as a slot accepting either accent color or image source (extensibility only, not implemented in this CR) | No extensibility for future image; separate card layout for images | CR acceptance criteria includes image fill as a supported treatment. Slot-based design avoids card layout rework when image support arrives. |
| Read-only visitor accent | Read-only visitors receive deterministic fallback accent only — no personal preference storage. Avoids introducing localStorage as a new storage mechanism consistent with single-user deployment model | Read-only visitors use localStorage for personal accent preferences | Current deployment model is single-user (owner-admin). Adding client-side storage for non-owner users introduces a new persistence mechanism. Fallback-only keeps the change bounded. |
| Selector chip treatment | Non-active project selector chips render accent according to the selected style: gradient fade, flat stripe, or plate badge (colored code with auto-contrast text) | Fixed single treatment; no user choice | User-selectable via Style dropdown. All treatments stay compact and keep chip dimensions stable. |
| Gradient accent mode | Replaced by `accentStyle` dropdown. Three named styles: Gradient (gradient fade), Flat (thin stripe), Plate (colored code badge). User selects from dropdown in Settings. Default is Gradient. | No user toggle, gradient-only or flat-only | Gives users explicit control over accent rendering with more visual options. Plate style adds identity-plate rendering where the project code becomes a colored badge. |
| Accent coloring toggle | Default on. Master toggle disables all accent coloring on chips and cards. User toggle in Settings. | Accent always visible | Some users prefer minimal visual noise. Toggle respects preference immediately. |
| Autocolor | Default on. On = projects without a user-set accent receive a deterministic fallback color. Off = projects without a manual accent show no accent color. Reset behavior changes: when off and hex input is empty, reset fills the computed fallback hex into the input. | Always-on fallback | Gives users explicit control over whether unconfigured projects get auto-coloring. When off, only manually configured accents appear. |

## Configuration

No new environment variables or configuration settings required. Accent preferences ride on existing `project-selector.json` and `/api/config/selector` infrastructure. `accentEnabled`, `autocolor`, and `accentStyle` persist in localStorage (`mdt-selector-preferences`).

---
*Requirements trace projection: [requirements.trace.md](./requirements.trace.md)*
