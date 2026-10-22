# MDT-258 phases 4–5 execution contract

Decision: READY. Mode: execute. Baseline: `63eff014678abc9903132b745817b20b92341f2a`.
Implementation and conventional commits are explicitly authorized by the user.
Shared worktree: preserve all initial unrelated changes; stage exact task paths.

## Problem, invariants and design

Registered persisted decoders still assert types, and reads still forward raw
query values. Implement only the phase 4/5 seams enumerated in the ticket and
boundary-validation-design.md §A–D. Use existing parseRequest, defineTool and
canonical contract schemas. Retain Zod v4 compatibility shims.

Valid files and requests retain spelling, normalization, defaults, filters and
pagination behavior. Tolerant reads retain fallback/migration policy; malformed
persisted files never become HTTP input errors. No new formats, bulk migration,
startup rewrite, response DTO validation, filesystem policy or auth policy.
Corrupt recovery journals must never trigger replay writes. Shape rejection is
intentional for structurally invalid runtime input. Risks: persisted legacy
formats, optional metadata, replay state, query coercion, SSE dispatch/deduping.

Local config reads need a validation-only persisted contract: the old predicate
returned raw spelling and omitted preview defaults after checking a normalized
copy. Characterization fixtures prove this before wiring. Strict mutation
reload contracts remain separate. Transport-only schemas remain adapter-local.

## Acceptance and baseline

Canonical inherited owner: ticket phases 4/5 and design §C.

| ID | Invariant / verification |
| --- | --- |
| P4-A | Modern/legacy config and extensions, minimal registry; temp-file fixtures and project suites. |
| P4-B | Frontmatter H1/dates/relationships/defaults/metadata; markdown/watcher suites. |
| P4-C | Per-template skip/fallback and pins/favorites reset; fixtures and state service API tests. |
| P4-D | Corrupt journal/pending projection never replay writes; recovery spy tests and read-model rebuild. |
| P5-A | Ten advertised MCP tools each have one validator; parity plus malformed/compatible read fixtures. |
| P5-B | Scalar Express envelopes, parseInt/default/clamp parity; focused controller/route tests. |
| P5-C | Local browser event schema, unknown ignored, malformed dropped, view defaults; frontend tests. |
| P5-D | Existing CRUD journey through isolated E2E wrapper, or documented narrow API fallback. |
| R-A | Boundary manifest strictly shrinks, zero new exceptions; checker and adversarial fixtures. |
| R-B | Domain build/tests, focused owning suites, package builds, full TS with named baseline only. |

Executed before production wiring: domain build PASS, 373 domain tests PASS;
checker PASS (209 identities/220 occurrences/23 modules), 35 checker tests PASS;
server baseline 88 tests/9 suites PASS; shared existing baseline 50 tests/6 suites
PASS; new file characterization 8 tests PASS (initial template fixture corrected
from empty requiredFields to its existing required title policy).

## Documentation ownership and mutation intent

Documentation impact: NONE for normative owners. Reviewed configuration local/
global specifications, server architecture and event-system ownership. These
continue to own file formats, layer boundaries, migration and SSE behavior.
The ticket/design are scope/acceptance owners, unchanged. Evidence lives only
in this plan and phase-4-5-result.md; no status edits or historical claim rewrites.

Allowed production edits: domain-contracts persisted/input schemas and barrels;
the listed shared project/markdown/template/cloud-sync loaders and their types;
server listed controllers/routes/server bindings, config adapter/repository,
sharing collision reader and watcher; MCP registry/read envelopes and handler
legacy dispatch; frontend SSE/local route derivations; boundary checker/manifest.
Allowed tests: focused owning-package fixtures and checker adversarial tests.
Allowed artifacts: this plan, phase-4-5-result.md, bounded logs in thread storage
and `/tmp/mdt258-45`. No unrelated cleanup, dependencies, CI adoption or shims.

## Verification

Build domain first; `bun test ./domain-contracts/src`; focused shared/server/MCP
Jest with `--runInBand` and isolated CONFIG_DIR for shared; affected package
builds; `bun run validate:ts:all`; boundary check/fixtures; frontend isolated
Bun tests; `bun run test:e2e -- <CRUD spec>`; owning ESLint and markdownlint;
explicit staging/whitespace and post-commit scope checks. Do not chase documented
frontend setup TS, bun:test-in-Jest, or integration flakes. Reconcile actual diff
with owners and report every gate, count, deviation and remaining §E CI work.
No performance improvement is claimed; preserve metadata processing fast path.
