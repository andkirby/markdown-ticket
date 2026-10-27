# MDT-252 requirements review

Reviewer: @thread:thr_g5ynmg2ccm, read-only review of source, ticket, requirements notes/trace/store and UX/HTML exploration. No app or executable-test verification.

## Initial verdict

**FIX FIRST**: the notes conflicted over add/remove normalization, and the canonical trace omitted chosen same-origin and invalid-entry/project-availability guarantees. UI placement remained pending user agreement.

## Corrections applied

- BR-3 now protects untouched stored strings/order during explicit mutations.
- C6 now limits materialized shorthand expansion to newly supplied replacement/add operands with an explicit default repository; reads/configuration changes do not rebind stored shorthand.
- C13 now defines exact stored-string removal only. The reviewer found that raw-first/expanded-fallback removal was not idempotent when both raw and canonical forms coexisted; the fallback was removed.
- Notes distinguish replacement-list normalization from add-operand normalization, preserving all pre-existing raw entries on an add. Explicit replacement is required to normalize an already stored shorthand string.
- C3 carries the configured-base-origin requirement.
- C14 requires invalid/unsupported optional tracker entries to yield unavailable refs with a diagnostic while preserving project availability.
- UX focus returns to the invoking details control, and CLI notes accurately call refs a new field using established operator syntax.

Requirement trace was regenerated through spec-trace; requirements validation passes. Independent recheck returned **PASS** for requirements semantics and the user-selected A concept, including configured shortening, numeric/# search and unconditional search-result badges. Minor requested wording reconciliation has been applied. This is not an implementation completion review.
