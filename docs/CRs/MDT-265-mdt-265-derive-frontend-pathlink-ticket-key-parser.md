---
code: MDT-265
creationId: 08f29404-a67f-4d8d-b022-079a665d12eb
status: Proposed
dateCreated: 2026-10-27T00:55:58.704Z
type: Technical Debt
priority: Medium
---

# MDT-265 Derive frontend path/link ticket-key parsers from canonical key pattern

## Problem

MDT-254 unified the ticket-key contract in domain-contracts, but several frontend **path and URL parsers** still carry hardcoded `[A-Z]+-\d+`-style regexes. They match stored canonical keys, so they silently fail for alphanumeric project codes (`TP0-042` — `[A-Z]+` stops before the `0`) and were never bounded to the 3–5 digit contract.

Known sites (all in `frontend/src`, non-test):

- `services/sseClient.ts:301` — subdocument filePath match
- `utils/markdownPreprocessor.ts:343,347,448,464,488,509,698` — ticket doc/subdoc link resolution
- `utils/linkValidator.ts:21` — ticket link token scan
- `utils/linkProcessor.ts:53,70` — absolute `/prj/CODE/ticket/KEY` route parsing

These are consumers of already-canonical stored keys (routing/parsing surfaces), not contract validators — which is why they were deferred from MDT-254. Defect class is identical though: a `TP0` project gets broken ticket links, unresolvable subdocuments, and missed live updates in these surfaces.

## Direction

Derive each site from the canonical pieces exported by `@mdt/domain-contracts` (`PROJECT_CODE_PATTERN_BODY`, `TICKET_NUMBER_MIN_DIGITS`, `TICKET_NUMBER_MAX_DIGITS`) or from `CR_CODE_PATTERN`/`TICKET_KEY_INPUT_PATTERN` where the posture matches. Keep each site's existing case sensitivity and capture-group layout. `linkProcessor.ts`'s `[A-Z]+-[A-Z]?\d+` variant needs a case-by-case look (it tolerates a letter before the digits — verify what produces that shape before touching).

## Acceptance

- No hardcoded ticket-key-shaped regex remains in `frontend/src` outside tests.
- Ticket links and subdocument resolution work for an alphanumeric-code project (e.g. `TP0`) and a 5-digit ticket (`X-10000`).
- Covered by unit tests at least for markdownPreprocessor and linkProcessor.