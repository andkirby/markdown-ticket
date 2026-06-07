# BDD: MDT-181

**Source**: [MDT-181](../MDT-181-project-accent-colors.md)
**Generated**: 2026-06-07
**Mode**: Normal
**Framework**: Playwright (E2E)

## Overview

14 BDD scenarios across 9 journeys covering all 21 BDD-routed behavior requirements for project accent colors. Scenarios test the complete user flow: selecting accents in the Project Edit form, persistence as personal preference, rendering in selector rail and browser cards, theme derivation, backend validation, and preservation of existing behavior. The fallback behavior is modeled across 3 separate scenarios to capture session boundaries (derivation, stability, override).

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
| **Total** | **14** | **21 BRs** |

All 21 BDD-routed behavior requirements have scenario coverage. Constraints (C1–C9) and edge cases (Edge-1–Edge-10) are routed to `mdt:tests` and are not BDD coverage targets.

## Test-Facing Contract Notes

### Selectors and Data Attributes

| Element | Data Attribute | Usage |
|---------|---------------|-------|
| Color picker dropdown | `data-testid="project-accent-picker"` | Open/close picker, select preset |
| Preset color swatch | `data-testid="accent-preset-{name}"` | Click specific preset |
| Custom hex input | `data-testid="accent-custom-hex-input"` | Enter custom hex value |
| Validation error | `data-testid="accent-validation-error"` | Assert error visibility |
| Choose color link | `data-testid="accent-choose-color-link"` | Click external link |
| Selector chip left-edge stripe | `data-testid="project-selector-chip-{code}"` | Assert flat left-edge accent stripe rendering |
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

---
*BDD trace projection: [bdd.trace.md](./bdd.trace.md)*
