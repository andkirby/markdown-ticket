# BDD

## Overview

MDT-177 acceptance is organized around the read-access sharing journey: owner-managed named access, one-time invite exchange, token-scoped project browsing, additive share links, recoverable owner unlock from read-only mode, allowed-origin link generation, lifecycle visibility, and read-only control suppression.

Canonical scenarios are stored in spec-trace and rendered in [bdd.trace.md](./bdd.trace.md).

## Acceptance Strategy

- Scenario count: 12 total, within the normal-mode budget.
- Source scope: only `behavior` requirements routed to `bdd` in [requirements.trace.md](./requirements.trace.md).
- Constraint and edge-case requirements remain routed to downstream tests and architecture.
- Related requirements are grouped where they form one observable journey, especially token listing/creation, configured-origin selection/fallback, and revoked/expired/invalid access behavior.

## E2E Framework

- Framework: Playwright E2E.
- Conventions: `tests/AGENTS.md` and `tests/e2e/AGENTS.md`.
- Intended executable file: `tests/e2e/sharing/read-access-journey.spec.ts`.
- Intended focused command: `bunx playwright test tests/e2e/sharing/read-access-journey.spec.ts --project=chromium`.

## Journey Coverage

- Owner creates named multi-project token and sees status/scope without raw token exposure.
- Owner generates a short-lived one-time invite URL without persistent token exposure.
- Clean invite exchange creates read-only access and cleans the URL before content renders.
- Token-scoped visitor switches among assigned private projects plus public projects.
- Token-scoped visitor opens a share link and keeps existing token/public access.
- Read-only owner unlock supports cancel and invalid-token recovery without losing the board.
- Link generation uses the server-selected configured origin, allowed current origin when no configured origin exists, or no-origin failure state.
- Revoked, expired, invalid, consumed, or revoked-token invite paths fail visibly without widening access.
- Read-only visitors do not see write, project mutation, settings, favorite, drag, delete, or file-write controls.
- Owner Lock refreshes all project-list surfaces into read-only visibility, removing owner-only projects after the downgrade.
- Header access status lives in the hamburger menu: owner/admin gets a green dot, share/read-token gets an orange dot, and public-only read-only gets no dot.

## Execution Notes

Normal mode was used. The executable Playwright RED spec was generated at `tests/e2e/sharing/read-access-journey.spec.ts` and is expected to fail before MDT-177 implementation. The provisional canonical test-plan link is `TEST-read-access-journey`; downstream `mdt:tests` may refine coverage grouping if needed.
