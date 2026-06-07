# Tests: MDT-181

**Source**: [MDT-181](../MDT-181-project-accent-colors.md)
**Generated**: 2026-06-07

## Overview

RED tests for project accent colors across schema validation, selector-state persistence, accent utility rules, selector rendering, and the edit-form E2E journey.

## Module → Test Mapping

| Module | Test File | Tests |
|--------|-----------|-------|
| `domain-contracts/src/app-config/schema.ts` + `validation.ts` | `domain-contracts/src/app-config/__tests__/accent.test.ts` | optional accent field, uppercase normalization, valid `#RRGGBB`, malformed hex rejection |
| `src/utils/accentColors.ts` | `src/utils/__tests__/accentColors.test.ts` | 16-color palette, WCAG AA foreground contrast, deterministic fallback, hex validation |
| `src/components/ProjectSelector/useSelectorData.ts` | `src/components/ProjectSelector/useSelectorData.test.ts` | accent load, accent persistence, cross-user/read-only no-owner-state isolation guard |
| `server /api/config/selector` | `server/tests/api/selector.test.ts` | selector-only persistence, uppercase normalization, malformed hex rejection |
| `src/components/ProjectSelector/ProjectSelectorChip.tsx` + `ProjectSelectorCard.tsx` | `src/components/ProjectSelector/ProjectSelectorAccent.test.tsx` | chip accent mark, card identity fill, repeated-accent rendering, no-image fallback path |
| Edit form + selector/browser journey | `tests/e2e/selector/project-accent-colors.spec.ts` | edit-form picker, helper link security, preset persistence, invalid hex rejection, fallback stability, keyboard navigation, compact chip/card height preservation, theme switching |

## Constraint Coverage

| Constraint ID | Test File | Tests |
|---------------|-----------|-------|
| C1 | `server/tests/api/selector.test.ts` | accent persists in selector-state storage only |
| C2 | `tests/e2e/selector/project-accent-colors.spec.ts` | same stored accent survives light/dark switching |
| C3 | `src/components/ProjectSelector/ProjectSelectorAccent.test.tsx`, `tests/e2e/selector/project-accent-colors.spec.ts` | chip/card identity keeps compact structure in unit tests and equal rendered height in E2E |
| C4 | `src/utils/__tests__/accentColors.test.ts` | 16-color palette + contrast verification |
| C5 | `src/utils/__tests__/accentColors.test.ts` | luminance-based foreground auto-selection |
| C6 | `src/utils/__tests__/accentColors.test.ts` | deterministic fallback algorithm |
| C7 | `tests/e2e/selector/project-accent-colors.spec.ts` | personal accent section in edit form |
| C8 | `domain-contracts/src/app-config/__tests__/accent.test.ts`, `server/tests/api/selector.test.ts` | strict `#RRGGBB` validation |
| C9 | `tests/e2e/selector/project-accent-colors.spec.ts` | secure external helper link |

## Edge Coverage

| Edge ID | Test File | Tests |
|---------|-----------|-------|
| Edge-1 | `src/utils/__tests__/accentColors.test.ts` | unset accent resolves to deterministic fallback |
| Edge-2 | `domain-contracts/src/app-config/__tests__/accent.test.ts`, `tests/e2e/selector/project-accent-colors.spec.ts` | malformed custom hex rejected and previous accent preserved |
| Edge-3 | `tests/e2e/selector/project-accent-colors.spec.ts` | helper link has new-tab security contract |
| Edge-4 | `src/components/ProjectSelector/ProjectSelectorAccent.test.tsx` | repeated accent values render independently |
| Edge-5 | `src/components/ProjectSelector/ProjectSelectorAccent.test.tsx` | long labels keep identity marks present |
| Edge-6 | `tests/e2e/selector/project-accent-colors.spec.ts` | theme switch updates without re-selection |
| Edge-7 | `src/components/ProjectSelector/useSelectorData.test.ts`, `server/tests/api/selector.test.ts` | no-owner-state path does not load or persist owner selector changes |
| Edge-8 | `src/components/ProjectSelector/ProjectSelectorAccent.test.tsx` | accent remains sole identity source without image |
| Edge-9 | `src/components/ProjectSelector/ProjectSelectorAccent.test.tsx` | no image autodiscovery path assumed by card rendering |

## BDD E2E Trace Continuity

| BDD Scenario ID | E2E Test File | Test Plan ID |
|-----------------|---------------|--------------|
| `color_picker_preset_selection` | `tests/e2e/selector/project-accent-colors.spec.ts` | `TEST-e2e-project-accent-colors` |
| `color_picker_custom_hex` | `tests/e2e/selector/project-accent-colors.spec.ts` | `TEST-e2e-project-accent-colors` |
| `color_picker_invalid_hex_rejected` | `tests/e2e/selector/project-accent-colors.spec.ts` | `TEST-e2e-project-accent-colors` |
| `choose_color_external_link` | `tests/e2e/selector/project-accent-colors.spec.ts` | `TEST-e2e-project-accent-colors` |
| `accent_persistence_personal_only` | `tests/e2e/selector/project-accent-colors.spec.ts` | `TEST-e2e-project-accent-colors` |
| `rail_chip_accent_identity` | `tests/e2e/selector/project-accent-colors.spec.ts` | `TEST-e2e-project-accent-colors` |
| `rail_fallback_derivation` | `tests/e2e/selector/project-accent-colors.spec.ts` | `TEST-e2e-project-accent-colors` |
| `rail_fallback_session_stability` | `tests/e2e/selector/project-accent-colors.spec.ts` | `TEST-e2e-project-accent-colors` |
| `rail_fallback_user_override` | `tests/e2e/selector/project-accent-colors.spec.ts` | `TEST-e2e-project-accent-colors` |
| `browser_card_filled_identity` | `tests/e2e/selector/project-accent-colors.spec.ts` | `TEST-e2e-project-accent-colors` |
| `theme_derivation_single_accent` | `tests/e2e/selector/project-accent-colors.spec.ts` | `TEST-e2e-project-accent-colors` |
| `existing_behavior_preserved` | `tests/e2e/selector/project-accent-colors.spec.ts` | `TEST-e2e-project-accent-colors` |

## Verify

```bash
bun test domain-contracts/src/app-config/__tests__/accent.test.ts
bun test src/utils/__tests__/accentColors.test.ts
bun test src/components/ProjectSelector/ProjectSelectorAccent.test.tsx
bun test src/components/ProjectSelector/useSelectorData.test.ts
bun run --cwd server jest tests/api/selector.test.ts
PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/selector/project-accent-colors.spec.ts --project=chromium
spec-trace validate MDT-181 --stage tests
```

---
*Canonical test-plan projection: [tests.trace.md](./tests.trace.md)*
