# Agent Goal: Research, Verify, and Reconcile MDT-198

Ticket: `MDT-198` — Research cloud ticket coordination

Repository: project root

Mode: End-to-end research using `mdt-pipeline-e2e` and MDT flow.

Final gate: Stop at User Review. Do not mark the ticket `Implemented` without
explicit user approval.

## Goal

Complete MDT-198 as an evidence-backed research ticket:

- answer RQ1-RQ12;
- run the required collision, retry, stale-write, and failure POC;
- decide whether Cloudflare Workers plus D1 is sufficient;
- define the cloud/local authority, data, authentication, synchronization, and
  operational boundaries;
- independently verify the result against current code, owner documents, POC
  output, and current official Cloudflare documentation;
- fix all unambiguous ticket, artifact, and documentation drift;
- leave a decision-ready package and any justified follow-up tickets.

This ticket does not implement or deploy the production collaboration service.

## Load These Skills

1. `mdt-pipeline-e2e` as the orchestration loop.
2. `mdt` and its MDT workflow reference.
3. `mdt:poc` for executable technical experiments.
4. `mdt:reflection` after research and verification.
5. `mdt-cli` for ticket reads, status updates, and follow-up ticket creation.
6. `mdt:clarification` only if a consequential product decision cannot be
   resolved from the ticket, evidence, or project documents.

Load additional skills only when the work actually requires them.

## Pre-flight

Run:

```bash
cd "$(git rev-parse --show-toplevel)"
bash .agents/skills/mdt-pipeline-e2e/scripts/discover_project.sh \
  . MDT-198
mdt-cli 198
git status --short
```

Read completely before changing anything:

- `AGENTS.md`
- `CLAUDE.md`
- `docs/SKILLS.md`
- `docs/CRs/MDT-198-cloud-ticket-coordination.md`
- every existing file under `docs/CRs/MDT-198/`
- `docs/architecture/auth-and-sharing-architecture.md`
- `docs/architecture/project-identity-and-worktrees.md`
- `docs/CRs/MDT-022-duplicate-ticket-detection-and-resolution-system-with-smart-numbering.md`
- `docs/CRs/MDT-071-implement-file-based-cr-numbering-remove-mdt-next-.md`
- `docs/CRs/MDT-157-api-auth.md`
- `docs/CRs/MDT-172-public-read-only-sharing.md`
- `docs/CRs/MDT-177-read-access-sharing-journey.md`
- current ticket creation, project identity, auth, SSE, CLI, MCP, board, and
  domain-contract code reached from those documents.

Read `docs/PRE_IMPLEMENT.md` before writing any TypeScript, including POC code.

Do not create the top-level `docs/CRs/MDT-198.pipeline-state.json`. A hidden,
ignored checkpoint inside `docs/CRs/MDT-198/` is allowed but is not a durable
output. Keep durable workflow outcomes in the ticket and approved research
subdocuments.

## Dirty Worktree Boundary

- Treat every pre-existing modification as user-owned.
- Do not stash, reset, restore, overwrite, stage, or commit unrelated files.
- Re-read `git status --short` before and after each milestone.
- Touch only MDT-198 artifacts, justified follow-up tickets, and owner documents
  whose current-state drift is proven by evidence.
- Do not commit unless the user separately requests it.

## Status Rule

Keep MDT-198 `Proposed` during discovery. Immediately before creating research
or POC artifacts, run:

```bash
mdt-cli attr 198 status="In Progress"
mdt-cli 198
```

Use `mdt-cli` for frontmatter changes. Do not hand-edit ticket frontmatter.

## Research Pipeline

Use the `mdt-pipeline-e2e` state contract, adapted for a Research ticket:

| Milestone | Action |
|---|---|
| Pre-flight | Run discovery, record the dirty boundary, establish baselines |
| Assess | Confirm fit, scope, non-goals, existing overlap, and decision owners |
| Requirements | Skip: ticket type is Research and requirements scope is `none` |
| Scenarios | Skip: record experiment cases in `poc.md`, not product BDD |
| Architecture | Defer production architecture; produce a research recommendation |
| UX | Skip: no production UI is implemented; capture only required user journeys |
| Tests | Use executable POC cases and rerunnable commands as research evidence |
| Tasks | Use an experiment checklist in `poc.md`; no implementation task plan |
| Implement | Execute `mdt:poc`; do not build production service code |
| Review | Independently verify evidence and repair drift |
| Debt | Record unresolved risks or create bounded follow-up research |
| Reflection | Reconcile approved findings into the ticket and research artifacts |
| User Review | Stop and request approval to close |

Keep skipped-milestone reasons concise in the final verification report.

## Current-truth Research

Verify rather than repeat the ticket's preliminary statements:

1. Trace every current ticket-creation entry point to the shared numbering
   owner.
2. Prove whether separate clones or processes can still allocate the same key.
3. Verify current project identity across canonical checkouts and worktrees.
4. Verify current browser, backend API, MCP HTTP, and read-sharing identity
   models.
5. Verify how the board receives ticket status changes and whether current SSE
   is instance-local.
6. Identify the narrow shared-service seam where cloud allocation would enter.
7. Search current tickets and owner documents for overlapping collaboration,
   numbering, authentication, or cloud work.

Use primary and current sources for Cloudflare claims:

- official Cloudflare D1 documentation;
- official Workers documentation;
- official Cloudflare Access documentation;
- official Durable Objects documentation.

Record source URLs and access dates. Do not rely on memory for mutable product
limits, pricing, API semantics, or authentication behavior.

## Required Research Artifact

Create:

```text
docs/CRs/MDT-198/research.md
```

It must include:

1. Executive decision: `Go`, `Reduced scope`, `No-Go`, or `Inconclusive`.
2. Direct answers to RQ1-RQ12, each with evidence.
3. Minimal supported collaboration journeys and explicit non-goals.
4. Cloud/local field-authority matrix with exactly one writer per synchronized
   field.
5. Ticket lifecycle covering reservation, local creation, acknowledgement,
   abandonment, retry, rename, deletion, restore, and Git publication.
6. Project identity, membership, roles, onboarding, and offboarding.
7. Human browser, interactive CLI/MCP, and headless-client authentication
   sequences.
8. Authorization, tenant isolation, audit, privacy, retention, and revocation.
9. D1 schema sketch, constraints, indexes, idempotency storage, and versioning.
10. API contract draft with error and precondition semantics.
11. Polling/SSE/WebSocket comparison and a measurable threshold for adding
    Durable Objects.
12. Cost and limits with date, source, and assumptions.
13. Backup, Time Travel, export, restore, and vendor-exit path.
14. Component integration and migration map for shared services, server, CLI,
    MCP, frontend, and domain contracts.
15. Rejected alternatives and remaining risks.
16. Follow-up ticket recommendation.

Do not present proposed behavior as current implemented behavior.

## Required POC

Use `mdt:poc` and create:

```text
docs/CRs/MDT-198/poc.md
docs/CRs/MDT-198/poc/
```

The summary in `poc.md` is durable. Treat code under `poc/` as throwaway
according to the POC skill; do not adapt it into production code.

The POC must be locally runnable without deploying production resources. Prefer
Wrangler/Miniflare with a local D1 database or the smallest faithful SQLite
substitute, and state any semantic difference from production D1.

At minimum, execute and record:

- parallel create intents receive unique per-project ticket numbers;
- repeated delivery with the same idempotency key returns the same result;
- different projects can allocate independently;
- allocation plus metadata creation is atomic;
- failed local file creation produces a recoverable reservation state;
- duplicate acknowledgement is harmless;
- stale metadata versions are rejected deterministically;
- cloud gaps do not cause number reuse;
- export produces a repository-independent representation.

For every experiment, record:

- hypothesis;
- exact command;
- environment and dependency versions;
- actual output;
- pass/fail result;
- limitations;
- architecture implication.

Do not claim Cloudflare Access behavior was proven by a local data POC unless an
actual Access-protected environment was exercised. Documentation-based
conclusions must be labeled as such.

## Product Decision Handling

Resolve with evidence when possible. Stop for user input only if the answer
would materially change product scope and cannot be safely inferred.

Default research assumptions, unless evidence rejects them:

- cloud coordination is opt-in per project;
- gaps in ticket numbers are acceptable, reuse is not;
- Markdown/Git remains authoritative for ticket bodies and workflow documents;
- presence is advisory and must not infer ownership from Git branches;
- service credentials identify machines, not people;
- Durable Objects are excluded unless a measured serialization or realtime
  requirement justifies them.

Do not silently choose cloud authority for title, status, type, priority, or
assignee. Make the trade-off explicit and recommend one authority model.

## Independent Verification and Drift Repair

After the research and POC appear complete, start a separate review pass. Do
not reuse conclusions without rechecking their evidence.

### Verify

1. Re-read MDT-198 and all files under `docs/CRs/MDT-198/`.
2. Re-run every POC command from a clean local POC state.
3. Recheck relevant current code and owner documents.
4. Reopen the cited official Cloudflare sources.
5. Compare:
   - ticket objective and all RQ success criteria;
   - research claims and POC output;
   - field authority and lifecycle states;
   - API contract and D1 schema constraints;
   - authentication claims and authorization model;
   - integration map and current ownership;
   - follow-up ticket scope and final recommendation.
6. Inspect the complete MDT-198 diff and current git status.

### Fix Drift

Fix every unambiguous mismatch found in:

- `research.md`;
- `poc.md`;
- MDT-198 research questions, initial findings, acceptance boxes, decision, and
  references;
- justified follow-up tickets;
- current-state owner documentation when it is demonstrably stale.

Do not update durable architecture or user documentation to describe an
unimplemented future system. Keep future design in MDT-198 and follow-up
tickets until implementation exists.

If drift requires a new product choice, record it as an open decision and stop
at User Review rather than guessing.

After every repair, rerun the affected verification until it passes.

## Validation

Always run:

```bash
bunx markdownlint-cli2 \
  docs/CRs/MDT-198-cloud-ticket-coordination.md \
  docs/CRs/MDT-198/*.md
mdt-cli 198
git diff --check
git status --short
```

Also run:

- every documented POC command;
- any focused tests needed to prove current integration assumptions;
- `bun run validate:ts` if tracked TypeScript was changed;
- the relevant package tests, lint, and build if production code was changed.

Do not run broad tests merely to create activity. Do run enough verification to
support every completion claim.

Record exact commands, results, and pre-existing failures in:

```text
docs/CRs/MDT-198/verification.md
```

## Completion Contract

The ticket is ready for User Review only when:

- RQ1-RQ12 have direct, evidence-backed answers;
- the field-authority matrix names one writer per synchronized field;
- all required POC cases pass or a failed hypothesis drives a documented
  alternative;
- authentication conclusions distinguish human and machine identity;
- the topology decision states why D1 is sufficient or why Durable Objects are
  required;
- operational and vendor-exit requirements are concrete;
- the integration map matches current code ownership;
- research, POC, ticket, pipeline state, and follow-up recommendations agree;
- all unambiguous drift found during review is fixed and reverified;
- no unrelated user changes were modified;
- no production implementation is falsely claimed;
- the ticket remains `In Progress` pending user approval.

If the result is positive and sufficiently bounded, create proposed follow-up
Architecture and first-slice Feature tickets using `mdt-cli`. If the result is
negative or reduced, record that outcome instead of manufacturing follow-up
work.

## Final Report

Return:

```text
Ticket: MDT-198
Pipeline: mdt-pipeline-e2e + MDT research flow
Decision: Go | Reduced scope | No-Go | Inconclusive

Artifacts:
  - research.md
  - poc.md
  - verification.md
  - follow-up tickets, if justified

POC:
  - experiments executed
  - pass/fail summary
  - important limitations

Verification:
  - commands and results
  - drift found
  - drift fixed
  - remaining open decisions

Repository:
  - ticket-scoped files changed
  - unrelated dirty files preserved
  - commits: none unless separately requested

Approval needed:
  - review the decision package
  - approve follow-up scope
  - approve changing MDT-198 from In Progress to Implemented
```

Begin with pre-flight. Do not skip discovery, POC execution, the independent
verification pass, or drift repair.
