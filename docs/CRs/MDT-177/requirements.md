# Requirements: MDT-177

**Source**: [MDT-177](../MDT-177-read-access-sharing-journey.md)
**Generated**: 2026-05-23

## Overview

MDT-177 adds an owner-managed read-sharing journey for named, multi-project access without exposing reusable secrets in URLs or browser-readable storage. The requirements lock down the owner creation flow, one-time invite exchange, additive share grants, recoverable read-only unlock, allowed-origin link generation, revocation/expiry behavior, backend read-only enforcement, and downstream E2E journey coverage.

Canonical requirements live in spec-trace and are rendered in [requirements.trace.md](./requirements.trace.md).

## Scope Framing

- Full requirements scope was selected by the ticket.
- Behavioral scenarios route to BDD because they are user-visible journeys.
- Security, storage, backend enforcement, origin normalization, privacy, and E2E coverage carry forward to tests.
- Architecture must decide persistence details, invite route shape, session expiry refresh mechanics, and public-origin normalization mechanics without weakening these requirements.

## Constraint Carryover

| Constraint ID | Must Appear In |
|---|---|
| C1 | architecture.md token storage; tests.md unit/API storage assertions |
| C2 | architecture.md invite lifecycle; tests.md single-use/expiry coverage |
| C3 | architecture.md rate limiting; tests.md exchange throttling coverage |
| C4 | architecture.md security boundaries; tests.md URL/storage/log safety checks |
| C5 | architecture.md authorization boundary; tests.md backend mutation denial |
| C6 | architecture.md origin policy contract; tests.md `PUBLIC_ORIGIN` and current-origin fallback cases |
| C7 | architecture.md read-session merge helper; tests.md additive grant coverage |
| C8 | architecture.md compatibility decision; tests.md env read-token preservation |
| C9 | architecture.md route ownership; tests.md owner-only management API coverage |
| C10 | tests.md Playwright plan for MDT-177 journeys |
| C11 | architecture.md project visibility filtering; tests.md privacy boundary coverage |
| C12 | architecture.md domain-contract ownership; tests.md schema contract coverage |

## Non-Ambiguity Table

| Concept | Final Semantic | Rejected Semantic | Why |
|---|---|---|---|
| Named read access | A named token grants one or more selected private projects plus public projects. | One token per project only. | The ticket requires multi-project person-level sharing. |
| Invite link | Invite URLs contain a short-lived one-time code, not the persistent read token. | Put reusable read tokens in generated URLs. | URLs are copied, logged, and hard to revoke safely. |
| Invite exchange result | Valid exchange writes an HttpOnly read cookie and cleans the URL before project content renders. | Leave the invite code visible after exchange. | Code cleanup is part of the required browser journey. |
| Read-session grant merge | Successful invite exchange or share-link exchange while a read session exists merges the new grants with existing read grants and sets the merged read-session expiry to the earliest expiry among active grants. | Opening a new invite or share link replaces existing grants, extends access to the latest expiry, or leaves expiry policy for architecture to choose. | The ticket requires additive grants, and review fixed expiry semantics to the earliest active grant expiry. |
| Project switching | Token-scoped visitors switch among visible granted projects without re-entering a token. | Prompt per project switch. | The token session represents the visitor's allowed project set. |
| Read-only unlock | Owner unlock from read-only mode is an overlay with cancel and bad-token recovery. | Switch to a full locked screen on failure. | The visitor must not lose the current read-only board. |
| Link origin | `PUBLIC_ORIGIN` is used when configured; current origin is fallback only when server policy accepts it and no public origin is configured. | Always use `window.location.origin`, or let the owner choose arbitrary domains. | Public sharing links must use server-approved, intentional origins. |
| Revocation | Revocation blocks future exchanges and refreshed sessions from granting private project access. | Existing browser access remains valid indefinitely. | Revocation must have an enforceable next-check boundary. |
| Expiry | Expired tokens cannot generate invites or exchange into sessions. | Expiry only hides UI status. | Expiry must be enforced server-side. |
| Write denial | Backend authorization denies every read-only mutation even if the UI hides controls. | Rely on frontend hiding alone. | The backend remains the enforcement layer. |
| Secret handling | Raw tokens and invite codes never persist in browser-readable storage or logs. | Store secrets for convenience or diagnostics. | This is a security invariant of the sharing design. |

## Downstream Review Notes

- BDD should cover the owner token creation, invite exchange, token project switching, share-link merge, unlock cancel, bad-token recovery, allowed-origin selection, revoke/expiry, and user-visible read-only control journeys.
- Architecture must keep named-token owner CRUD separate from public invite exchange and preserve env-token compatibility unless it records an explicit MDT-177 deprecation decision.
- Tests must include Playwright coverage for MDT-177 journeys and backend read-only mutation denial, not only unit and API contracts.

## UAT Refinement 2026-05-24

The read-access boundary contracts are part of MDT-177 and must not stay as parallel local TypeScript interfaces. Access-mode vocabulary, auth capability flags, public-link-origin response shape, and read-token management API DTOs belong in `domain-contracts`. Runtime policy, route authorization, cookie handling, and token persistence internals stay in server modules.
