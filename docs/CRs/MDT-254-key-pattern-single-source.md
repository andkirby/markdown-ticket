---
code: MDT-254
status: Implemented
dateCreated: 2026-10-22T05:26:17.054Z
type: Technical Debt
priority: Medium
implementationDate: 2026-10-22
implementationNotes: Single source of truth for the ticket-key contract (MDT-254 + review follow-up). Leaf module project/code.ts exports PROJECT_CODE_PATTERN and anchor-free PROJECT_CODE_PATTERN_BODY; frontmatter.ts exports TICKET_NUMBER_MIN_DIGITS (3) and TICKET_NUMBER_MAX_DIGITS (5) and composes CR_CODE_PATTERN (canonical stored form, 3-5 digits) plus TICKET_KEY_INPUT_PATTERN (loose input, case-insensitive non-padded). Contract deliberately 3-5 digits. Every parallel regex now derives - TicketService phaseEpic + numeric sort, staged-validation, proseScanner, TreeBuilder, PathSelectionStrategy root exclusion, PathWatcherService, WorktreeService branch extraction, keyNormalizer (full-format and numeric shorthand bounded), normalizeKeyTerm, MCP project inference, CLI deps/view/attr/rename/args, frontend routing, relationshipLink, quick-search ordering. Review findings from thr_65hd5qhtxx addressed - dash-anchored number extraction, shorthand bound parity, slug-optional ticket filenames, worktree left boundary, watch of ticket dirs, root-ticket document leak. Remaining known parallel parsers (frontend path/link surfaces - markdownPreprocessor, sseClient, linkValidator, linkProcessor) tracked in a follow-up ticket.
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