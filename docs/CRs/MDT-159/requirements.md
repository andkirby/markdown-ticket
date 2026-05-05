# Requirements: MDT-159

**Source**: [MDT-159](../MDT-159-dynamic-cr-key-padding.md)
**Generated**: 2026-05-04
**Type**: Technical Debt (brief scope)

## Overview

Centralize CR key number formatting into a single `formatCrKey()` function in `shared/utils/keyNormalizer.ts`, replacing 10 hardcoded `padStart(3, '0')` call sites across shared, frontend, server, and test code. The change introduces dynamic padding (`Math.max(3, String(num).length)`) so keys scale correctly from 3-digit to 5-digit+ ticket numbers.

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | architecture.md (Module Boundaries), tasks.md (Verify) |
| C2 | architecture.md (Data Flow), tests.md (unit tests), tasks.md (Verify) |
| C3 | architecture.md (Module Boundaries), tests.md (coverage check), tasks.md (Scope) |
| C4 | tests.md (performance sanity check), tasks.md (Verify) |

## Semantic Decisions

- **Dynamic padding**: `Math.max(3, String(num).length)` — numbers 1-999 stay 3-digit padded, 1000+ use natural digit count (no extra padding needed). Rejected: fixed 5-digit width (unnecessary leading zeros), condition-based logic (unnecessary branching).
- **Function location**: `shared/utils/keyNormalizer.ts` — already imported across all layers. Rejected: new `crKeyFormatter.ts` file (import fragmentation without benefit).
- **Function naming**: `formatCrKey` — aligns with existing module naming (`normalizeKey`, `KeyNormalizationError`). Rejected: `formatTicketKey` (inconsistent with CR domain terminology used throughout).
- **Scope of replacement**: All 10 sites (production + test + mock), not just 7 from original research. Test fixtures and mocks must also use the centralized function.

## Open Items

None. All open questions from the CR (naming, location) were resolved in the assess stage.

---
*Rendered by /mdt:requirements via spec-trace*
