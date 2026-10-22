---
code: MDT-254
status: Proposed
dateCreated: 2026-10-22T05:26:17.054Z
type: Technical Debt
priority: Medium
---

# Single source of truth for ticket key pattern

## Problem

The ticket key contract is split across two regexes that disagree at five digits:

- `TICKET_KEY_INPUT_PATTERN` (`domain-contracts/src/ticket/frontmatter.ts:16`) accepts `MDT-10000`
- `CR_CODE_PATTERN` (`domain-contracts/src/ticket/frontmatter.ts:8`) rejects it

Live probe (MDT-252 review): `{"key":"MDT-10000","inputAccepted":true,"frontmatterAccepted":false}` — one contract, two answers. `formatCrKey` and its tests already cover five digits (`shared/utils/keyNormalizer.ts:38`, `formatCrKey.test.ts:33`).

## Direction

Single source of truth: one canonical key pattern in domain-contracts that every validation, input, and normalizer site derives from — no parallel regexes. Note the two patterns are intentionally different postures today: input accepts non-padded, case-insensitive keys (`\d{1,5}`, `/i` flag), storage requires canonical padded uppercase — the unified source must preserve both postures, not just delete one regex. While unifying, decide *deliberately* whether the contract is 3–4 or 3–5 digits; today the system answers both ways. Check sort/display order for 9999→10000 before widening.

Found during the MDT-252 consultant review (probe by thr_u6zqw3x92s). External linking does not require this fix — it is a standing contract inconsistency.