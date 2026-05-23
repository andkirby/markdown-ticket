# Requirements: MDT-172

**Source**: [MDT-172](../MDT-172-public-read-only-sharing.md)
**Generated**: 2026-05-23

## Overview

MDT-172 adds public read-only project sharing while preserving owner/admin write control. The requirements separate anonymous public access, unlisted share IDs, scoped read tokens, and owner/admin mutation rights.

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | architecture.md sharing ID generation, tests.md ID entropy/format tests |
| C2 | architecture.md token storage/logging boundary, tests.md raw-secret leak tests |
| C3 | architecture.md owner session boundary, tests.md URL/storage denial checks |
| C4 | architecture.md mutation gate, tests.md direct API mutation denial |
| C5 | architecture.md SSE scope filtering, tests.md SSE event visibility tests |
| C6 | architecture.md CORS/origin policy, tests.md no CORS widening checks |
| C7 | architecture.md cookie mutation CSRF protection, tests.md owner mutation intent/origin checks |
| C8 | architecture.md exchange endpoint limits, tests.md generic token/code errors |

## Non-Ambiguity Table

| Concept | Final Semantic | Rejected Semantic | Why |
|---------|----------------|-------------------|-----|
| Private project | Invisible to anonymous and read-token callers unless a token explicitly scopes it. | Active projects are visible once API auth is bypassed. | Sharing must be opt-in. |
| Public read-only | Listed by anonymous `/api/projects` and readable, never writable. | Public grants full project access. | Public write access is out of scope. |
| Unlisted read-only | Reachable by valid `/share/{shareId}` but absent from anonymous listing. | Unlisted appears in project list with a hidden flag. | Listing itself leaks project existence. |
| Scoped read token | Expands visible project reads only. | Token implies owner/admin access. | Sharing and authorization token models must remain separate. |
| One-time code | Exchanged through POST and removed from browser URL after storage. | Long-lived query-string token. | Query strings leak through logs and browser history. |
| Share ID | Stable bookmarkable path identifier that grants read-only visibility for a shared project. | Same as one-time token/code. | Share IDs may be stored in URLs but must not grant write access. |
| Read-only UI | UI removes or disables mutation affordances, while backend remains authoritative. | UI-only protection. | Direct API calls must still fail with 403. |

## Review Notes

- Requirements trace projection: [requirements.trace.md](./requirements.trace.md)
- Edge cases stay routed to tests, not BDD, unless represented by an observable behavior requirement.
