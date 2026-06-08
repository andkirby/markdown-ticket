# BDD: MDT-181

**Source**: [MDT-181](../MDT-181-project-accent-colors.md)
**Generated**: 2026-06-07
**Mode**: Normal
**Framework**: Playwright (E2E)

## Overview

18 BDD scenarios across 11 journeys covering all BDD-routed behavior requirements for project accent colors. Scenarios test the complete user flow: selecting accents in Settings, persistence as personal preference, rendering in selector rail and browser cards, theme derivation, backend validation, reset to default, accent rendering styles (gradient, flat, plate), autocolor behavior, and preservation of existing behavior.

## Acceptance Strategy

Scenarios are grouped into 9 journeys:

| Journey | Scenarios | Covers |
|---------|-----------|--------|
| Color picker selection | 3 | BR-1.1, BR-1.2, BR-1.3, BR-1.4 |
| Accent persistence & isolation | 2 | BR-1.5, BR-2.1, BR-2.2 |
| Selector rail rendering | 1 | BR-3.1, BR-3.3 |
| Fallback derivation & stability | 3 | BR-3.2, BR-5.1, BR-5.2 |
| Browser card rendering | 1 | BR-4.1, BR-4.2, BR-4.3 |
| Theme behavior | 1 | BR-6.1, BR-6.2 |
| Backend validation | 1 | BR-8.1 |
| Existing behavior preservation | 1 | BR-7.1, BR-7.2 |
| Cross-user independence | 1 | BR-2.3 |
| Accent rendering styles | 3 | BR-10.1, BR-10.2, BR-11.1, BR-11.2, BR-11.3 |
| Autocolor behavior | 3 | BR-12.1, BR-12.2, BR-12.3 |
| **Total** | **18** | **25 BRs** |

All BDD-routed behavior requirements have scenario coverage. Constraints (C1–C9) and edge cases (Edge-1–Edge-10) are routed to `mdt:tests` and are not BDD coverage targets.

## Test-Facing Contract Notes

### Selectors and Data Attributes

| Element | Data Attribute | Usage |
|---------|---------------|-------|
| Color picker dropdown | `data-testid="project-accent-picker"` | Open/close picker, select preset |
| Preset color swatch | `data-testid="accent-preset-{name}"` | Click specific preset |
| Custom hex input | `data-testid="accent-custom-hex-input"` | Enter custom hex value |
| Validation error | `data-testid="accent-validation-error"` | Assert error visibility |
| Choose color link | `data-testid="accent-choose-color-link"` | Click external link |
| Selector chip accent | `data-testid="project-selector-chip-{code}"` | Assert accent rendering per style (gradient, flat, plate) |
| Browser card identity area | `data-testid="project-browser-card-{code}"` | Assert filled identity |

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/config/selector` | GET | Load selector state with accent per project |
| `/api/config/selector` | POST | Persist selector state including accent changes |
| `/api/projects/:code/update` | PUT | Shared project metadata update (accent NOT sent here) |

### Accent Storage Contract

- Accent stored in `project-selector.json` as `accent` field on each `SelectorStateEntry`
- Valid format: `#RRGGBB` (6-digit hex with leading `#`)
- Absent `accent` field → fallback accent derived from project code hash

## Execution Notes

- E2E framework: Playwright (`bun run test:e2e`)
- Test expectation: **fail** (normal mode, before implementation)
- Scenarios can be executed against `bun run dev:full` dev environment
- Cross-user independence scenario requires two browser contexts or sessions (single-user deployment makes this a verification of isolation boundary rather than runtime multi-user)

## UAT Refinement — Accent Rendering Modes

### BR-10.1: Accent coloring master toggle off
```gherkin
Scenario: accent_coloring_disabled
  Given user has enabled accent colors
  When user toggles "Accent Colors" off in Settings > Appearance
  Then selector chips and browser cards render without accent marks
  And project codes and names remain fully visible
```

### BR-10.2: Accent coloring re-enabled
```gherkin
Scenario: accent_coloring_re_enabled
  Given user has disabled accent colors
  When user toggles "Accent Colors" back on
  Then accent marks reappear immediately on chips and cards
  And no page reload is required
```

### BR-11.1: Gradient accent style (default)
```gherkin
Scenario: gradient_accent_style
  Given user has "Gradient" style selected in Settings > Appearance
  When a project has a configured accent
  Then the chip shows a 25px gradient fade from transparent to accent color
  And the browser card shows a 40% width gradient fade at 0.5 opacity
  And the active card shows a subtle background gradient
```

### BR-11.2: Flat accent style
```gherkin
Scenario: flat_accent_style
  Given user has "Flat" style selected in Settings > Appearance
  When a project has a configured accent
  Then the chip shows a 4px flat stripe at 0.3 opacity
  And the browser card shows a 6px flat stripe at 0.3 opacity
```

### BR-11.3: Plate accent style
```gherkin
Scenario: plate_accent_style
  Given user has "Plate" style selected in Settings > Appearance
  When a project has a configured accent
  Then the chip code element renders as a colored badge with accent-filled background
  And the chip code badge has right-rounded corners and auto-computed foreground for contrast
  And the browser card code element renders as a colored badge with accent-filled background
  And the browser card identity area is removed — the badge provides the accent identity
```

### BR-12.1: Autocolor on (default)
```gherkin
Scenario: autocolor_on_fallback
  Given user has Autocolor enabled in Settings > Appearance
  And a project has no user-configured accent
  When the project appears in the selector rail or browser
  Then the project shows a deterministic fallback accent color
```

### BR-12.2: Autocolor off
```gherkin
Scenario: autocolor_off_no_fallback
  Given user has Autocolor disabled in Settings > Appearance
  And a project has no user-configured accent
  When the project appears in the selector rail or browser
  Then the project shows no accent color
  And plate-style code badges revert to plain text with default code color
```

### BR-12.3: Reset fills auto hex when autocolor off
```gherkin
Scenario: reset_fills_auto_hex
  Given user has Autocolor disabled in Settings > Appearance
  And the selected project has an empty hex input
  When user clicks the Reset button
  Then the computed fallback hex is filled into the hex input
  And the user can keep or modify the value before saving
```

---
*BDD trace projection: [bdd.trace.md](./bdd.trace.md)*
