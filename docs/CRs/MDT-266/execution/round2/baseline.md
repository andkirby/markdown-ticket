---
status: READY
target: MDT-266 round2 baseline before internal compatibility retirement
baseline: HEAD 4c8ae15be10ef02626f2c0513e23b3909df92448 plus staged tree bbf4a31798848b1ab9eee54efa8f0222ff488e24
skill_identity: 569a4c272adcaeab2e32b69c89c15783c04cee4893242d067eda8e851b1d372f
mode: execute
---

# Round2 baseline

No backend/test/source mutation has begun. This baseline inherits the final
first-round operation evidence and records the parent's newly executed static
failures; it does not rerun broad suites or represent every gate as green.

## Exact workspace identity

Working directory is repository root (`.`). Fresh read-only observations:

| Command / identity | Observed result |
| --- | --- |
| `git rev-parse HEAD` |4c8ae15be10ef02626f2c0513e23b3909df92448|
| `git diff --cached --name-only` |149parent-staged task paths before these three round2 documents|
| `git diff --name-only` |Empty before round2 artifact creation|
| `git cat-file -t bbf4a31798848b1ab9eee54efa8f0222ff488e24` |tree|
| `git diff --cached bbf4a31798848b1ab9eee54efa8f0222ff488e24 --name-only` |Empty; current index matches parent's staged-candidate identity|
| SHA256 of first execution plan |a0f4aa0178d333d8caa344f3cbde9f9d28114e7f7c054631cd0162976afef4f3|
| SHA256 of explicitly supplied controlled-refactor SKILL.md |569a4c272adcaeab2e32b69c89c15783c04cee4893242d067eda8e851b1d372f|

No checkpoint commit exists. Parent attempted normal-hook commit and was rejected
on Knip findings and machine-specific absolute evidence paths. Parent holds
original path/index/worktree snapshots in its thread storage; this teammate must
not stage, reset or commit. HEAD alone is not the actual operation baseline: the
reviewed staged candidate above contains the accepted first-round implementation.

## Inherited green operation evidence

Source and exact executed command records:
[first execution result](../result.md), [command ledger](../logs/final-commands.json)
and [browser summary](../logs/final-browser-summary.json). Parent owns portability
edits to those reports; recorded results do not change.

| Executed check | Final recorded result |
| --- | --- |
| `bun run build:all` |Exit0; domain/shared/server/MCP/cloud/frontend|
| `bun run validate:ts:all` |Exit0;6packages|
| Root tooling `bunx tsc --noEmit -p tsconfig.json` |Exit0|
| Server full Jest with explicit forceExit |Exit0;85suites/1043passed/8skipped|
| Shared full suite (existing forceExit setting) |Exit0;94suites/1264passed|
| CLI build/test |Exit0/0;280passed|
| MCP build/default suite |Exit0/0;18suites/251passed; excluded integration fixtures are not covered|
| Cloud local suite, no Worker edits |Exit0;117passed|
| Module fixtures / real scan |Exit0/0;10fixtures;316sources/1132edges/0violations/6exact compatibility exceptions|
| Server lint /14affected shared files /root tooling lint |Exit0/0/0|
| Selected parent Chromium wrapper lanes |Exit0 each;118passed/9expected or existing skips/0unexpected/0flaky|
| Natural real-runtime resource probe |Exit0; construction adds0resources; stop ends SSE and drains deferred observation, returns0owned resources and unchanged signal handlers|
| Owner docs |17documents lint clean;83relative file links/0broken;6Mermaid blocks rendered|

Critical preservation cases include whole-candidate ticket rejection before
write/publication; ignored-only zero writes; one successful post-write publication;
existing-epic demotion/close rejection and busy/descriptor error mapping; real
request-context overlap; canonical project id/path effects; auth/preview/private
404, search provenance/scoring/limits, worktree identity and real disposal drains.
Astra accepted the final first-round source and HTTP owner move.

Inherited qualifications remain: full server without forceExit completed
assertions but retained seven pre-existing Supertest TCPSERVERWRAP handles;
intermediate HTTP501 auth results were not reproduced in focused/full subsequent
runs and their root cause is unestablished. Known test-lib timeout output is not
runtime-owned disposal evidence. Browser evidence is selected Chromium only, not
all E2E/deployed cloud. No cache, distributed-writer or performance guarantee.

## Parent-executed static baseline (RED)

These are parent-reported executions, not fresh teammate reruns. Parent retains
the raw outputs and will supply portable evidence references in round2 result.

| Gate | Baseline result / classification |
| --- | --- |
| Whole root Knip |Exit1; six unused files, unlisted fs-extra in combined mutation test, dynamic jest-dom dependency finding and four named-export findings|
| Frontend lint |Exit1;19errors|
| CLI lint |Exit1;9errors|
| Shared lint |Exit1;9errors|
| Server, MCP, domain-contracts and cloud linters |Each exit0|
| Existing decoder convention gate |Exit1;12unmatched+2stale baseline findings; advisory classification only, outside cleanup mutation scope|
| Normal checkpoint commit |Rejected by normal hooks; no commit, no bypass|

The six Knip files are the old ConfigController and old routes/docs, documents,
pins, search and projects. The exact21-file retirement is broader source-backed
cleanup, not just deletion of whatever Knip reports.

jest-dom is a false-positive dependency finding: frontend/src/test-setup.ts has
an ordered synchronous createRequire loader calling the actual package after
registration. Parent preserves this behavior and adds one exact dynamic-load
exception. fs-extra already exists in the workspace and its real-source test use
needs honest server development dependency/type declarations; metadata-only lock
refresh installs no packages.

StagedTicketValidationError, ExternalIdentity, BuiltinTemplate and
TicketContentContext are published shared exported names. Knip alone cannot
establish external disuse. Parent preserves each name/signature and adds precise
@public JSDoc; installed Knip honors @public by default. No broad ignore or public
API deletion is authorized.

## Baseline uncertainty and first executable step

Read-only inventory includes ordinary imports, dynamic module-path strings,
file-existence guards, jest.mock paths, package exports and physical-source scans.
Two extra callers beyond the original23-file proposal are included in the plan:
CloudCreationRecovery dynamic router setup and MCP's simple consistency fixture.

Both MCP consistency files are excluded by default Jest configuration. Their
explicit invocation has not been executed in this read-only planning phase;
characterize before changing these fixtures after parent acknowledges the plan.
Keep harness/config failures distinct from behavior regressions and do not claim
these files were covered by the251default MCP test count.

First-round plan stays immutable. Round2 backend mutation remains paused at the
parent coordination boundary. No new user approval, agent, broad suite, dependency
installation, hook bypass or user-server restart was requested or performed.
