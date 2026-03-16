---
code: MDT-139
status: Implemented
dateCreated: 2026-03-14T00:37:13.327Z
type: Technical Debt
priority: Medium
---

# MDT-112: Refactor src/utils/mermaid.ts for SOLID compliance

## 1. Description

`src/utils/mermaid.ts` is a **582-line utility module** that violates Single Responsibility Principle by mixing multiple concerns:
- Mermaid library initialization
- HTML processing
- Rendering orchestration
- Fullscreen management (190 lines)
- Zoom/Pan interactions (223 lines)
- Debug utilities

The file has high cyclomatic and cognitive complexity, with a 191-line `enableZoom()` function containing 8 inline event handlers and mutable closure state.

## 2. Rationale

- **Testability**: Current design makes unit testing impossible (global event listeners on import, closure state)
- **Maintainability**: 582 lines exceeds the 300-line threshold; magic numbers throughout
- **SOLID compliance**: Multiple responsibilities in one module
- **SSR compatibility**: Global `document` access on import breaks server-side rendering

## 3. Solution Analysis

Evaluated alternatives:
1. **Full rewrite** - Too risky, loses battle-tested touch gesture handling
2. **Incremental extraction** (selected) - Lower risk, each phase independently verifiable

Selected approach: Phase-by-phase extraction following TDD principles.

## 4. Implementation Specification

### Phase 1: Extract Value Objects & Constants (this CR)
Extract magic numbers into named constants:
- `ZOOM_LIMITS` - min/max zoom values
- `SCALE_FACTORS` - wheel, pinch, fullscreen scaling
- `THEME_CONFIG` - font family, size, background

### Future Phases (separate CRs)
- Phase 2: Extract ZoomState class
- Phase 3: Extract event handlers
- Phase 4: Extract fullscreen module
- Phase 5: Extract SVG icon components

## 5. Acceptance Criteria

- [ ] Constants extracted to `src/utils/mermaid/constants.ts`
- [ ] Magic numbers replaced with named constants in `mermaid.ts`
- [ ] All existing E2E tests pass
- [ ] No behavioral changes to mermaid rendering