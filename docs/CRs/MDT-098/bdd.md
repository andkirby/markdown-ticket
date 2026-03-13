# BDD: MDT-098

**Source**: [MDT-098](../MDT-098.md)
**Generated**: 2026-03-13
**Status**: Normal mode (canonical)

## Overview

This ticket is a **technical refactoring** with no user-visible behavior changes. The TOML parser standardization is complete - all code already uses `@mdt/shared/utils/toml.ts` as the single entrypoint.

**Note**: An E2E test exists at `tests/e2e/documents/path-persistence.spec.ts` but is blocked by a separate test infrastructure timing issue (headless mode flakiness). The TOML standardization work is complete and verified via unit tests.

## Journey

_No user journey changes - this is internal refactoring only._

## Acceptance Strategy

**Current State**: All TOML operations standardized to `@mdt/shared/utils/toml.ts`. Unit tests confirm the implementation.

**Out of Scope**: E2E testing - deferred due to test infrastructure timing issues unrelated to TOML standardization.

## Coverage Summary

| Requirement ID | Requirement | Scenario |
|----------------|-------------|----------|
| - | No BDD scenarios for technical refactoring | - |

**Technical requirements** (BR-1 through BR-4, C1) are covered by `/mdt:tests` - they describe the implementation fix, not user-visible behavior.

---
*Canonical scenarios and coverage: [bdd.trace.md](./bdd.trace.md)*
*Rendered by /mdt:bdd via spec-trace*
