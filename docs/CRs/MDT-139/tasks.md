# Tasks

## Overview

# Phase 1 - Extract Value Objects & Constants

**Mode**: prep (refactoring)
**Scope**: `src/utils/mermaid.ts` → `src/utils/mermaid/constants.ts`

## Execution Order

1. **TASK-1**: Create constants.ts with extracted values
2. **TASK-2**: Replace magic numbers in initMermaid()
3. **TASK-3**: Replace magic numbers in zoom functions
4. **TASK-4**: Replace magic numbers in updateFullscreenButtons()
5. **TASK-5**: Create barrel export and verify E2E

## Dependencies

```text
TASK-1 ──> TASK-2 ──> TASK-3 ──> TASK-4 ──> TASK-5
```

## Task List

- Create constants.ts with ZOOM_LIMITS, SCALE_FACTORS, THEME_CONFIG, ADAPTIVE_SCALE (`TASK-1`)
  Owns: `ART-constants-file`
  Makes Green: `TEST-build`, `TEST-lint`
- Replace hardcoded theme values in initMermaid() with THEME_CONFIG (`TASK-2`)
  Owns: `ART-theme-refactor`
  Makes Green: `TEST-build`, `TEST-lint`
- Replace hardcoded zoom/scale values in enableZoom() with ZOOM_LIMITS, SCALE_FACTORS (`TASK-3`)
  Owns: `ART-zoom-refactor`
  Makes Green: `TEST-build`, `TEST-lint`
- Replace hardcoded adaptive scale values in updateFullscreenButtons() with ADAPTIVE_SCALE (`TASK-4`)
  Owns: `ART-fullscreen-refactor`
  Makes Green: `TEST-build`, `TEST-lint`, `TEST-e2e-mermaid`
- Create barrel export in mermaid/index.ts and verify E2E (`TASK-5`)
  Owns: `ART-barrel-export`
  Makes Green: `TEST-e2e`

---

### Task 1: Create constants.ts with extracted values

**Structure**:
- Create `src/utils/mermaid/` directory
- Create `src/utils/mermaid/constants.ts` with:
  - `ZOOM_LIMITS` - min/max zoom values
  - `SCALE_FACTORS` - wheel, pinch, fullscreen scaling
  - `THEME_CONFIG` - font family, size, background
  - `ADAPTIVE_SCALE` - bounds and defaults

**Scope**:
- Creates: `src/utils/mermaid/constants.ts`
- Must Not Touch: Any other files

**Verify**:

```bash
bun run build
bun run lint
```

**Done when**:
- [ ] `src/utils/mermaid/constants.ts` exists with all exported constants
- [ ] TypeScript compiles without errors
- [ ] ESLint passes

---

### Task 2: Replace magic numbers in initMermaid()

**Structure**:
- Import `THEME_CONFIG` from `./mermaid/constants`
- Replace hardcoded font family, font size, background with `THEME_CONFIG` properties

**Scope**:
- Modifies: `src/utils/mermaid.ts` (lines 41-44)
- Must Not Touch: Other functions, other files

**Verify**:

```bash
bun run build
bun run lint
```

**Done when**:
- [ ] `THEME_CONFIG` imported and used in `initMermaid()`
- [ ] No hardcoded theme values remain in that section
- [ ] TypeScript compiles without errors

---

### Task 3: Replace magic numbers in zoom functions

**Structure**:
- Import `ZOOM_LIMITS` and `SCALE_FACTORS` from `./mermaid/constants`
- Replace hardcoded zoom limits (0.1, 10, 15, 20) with `ZOOM_LIMITS` properties
- Replace hardcoded scale steps (0.1, 0.15) with `SCALE_FACTORS` properties

**Scope**:
- Modifies: `src/utils/mermaid.ts` (`enableZoom` function, lines 274-465)
- Must Not Touch: Other functions, other files

**Verify**:

```bash
bun run build
bun run lint
```

**Done when**:
- [ ] `ZOOM_LIMITS` imported and used for zoom bounds
- [ ] `SCALE_FACTORS` imported and used for scale steps
- [ ] No hardcoded zoom/scale values remain in `enableZoom()`
- [ ] TypeScript compiles without errors

---

### Task 4: Replace magic numbers in updateFullscreenButtons()

**Structure**:
- Import `ADAPTIVE_SCALE` from `./mermaid/constants`
- Replace hardcoded adaptive scale values (0.5, 8, 2.3, 3.0, 0.9) with `ADAPTIVE_SCALE` properties

**Scope**:
- Modifies: `src/utils/mermaid.ts` (`updateFullscreenButtons` function, lines 165-272)
- Must Not Touch: Other functions, other files

**Verify**:

```bash
bun run build
bun run lint
bun run test:e2e -- --grep "mermaid"
```

**Done when**:
- [ ] `ADAPTIVE_SCALE` imported and used for scale bounds
- [ ] No hardcoded adaptive scale values remain
- [ ] TypeScript compiles without errors
- [ ] E2E tests for mermaid pass

---

### Task 5: Create barrel export and verify E2E

**Structure**:
- Create `src/utils/mermaid/index.ts` that re-exports from `constants.ts`
- Run full E2E test suite to verify no behavioral changes

**Scope**:
- Creates: `src/utils/mermaid/index.ts`
- Must Not Touch: Any other files

**Verify**:

```bash
bun run build
bun run lint
bun run test:e2e
```

**Done when**:
- [ ] `src/utils/mermaid/index.ts` exists with barrel exports
- [ ] All E2E tests pass
- [ ] No behavioral changes to mermaid rendering
