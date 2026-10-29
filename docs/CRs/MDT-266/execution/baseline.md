# MDT-266 execution baseline

Captured 2026-10-29 at `4c8ae15be10ef02626f2c0513e23b3909df92448` in the supervised checkout `.`.
Initial dirt: only parent-owned untracked MDT-266 ticket/preparation documents. No production mutation, staging, commit, dependency install or existing-server restart occurred during S0.

## Executed checks

All log links are relative to this directory. Commands ran from the repository root.

| Command | Exit / executed result | Evidence |
| --- | --- | --- |
| `bun run build:all` | 0; domain, shared, server, MCP, cloud and frontend builds pass | [build](logs/s0-build-all.log) |
| `bun run --cwd shared jest --runInBand` | 0; 92 suites, 1,253 tests pass; package config explicitly force-exits | [shared](logs/s0-shared.log) |
| `bun run --cwd server jest --runInBand` before new regressions | Completed summary: 80 passing suites, 2 failing suites; 1,012 passing, 2 failing, 8 skipped tests. Did not naturally exit; owned Jest PID 18232 terminated with SIGTERM after summary | [server](logs/s0-server.log) |
| `bun run --cwd server jest --runInBand --forceExit` after S0 tests | 1; 81 passing, 3 failing suites; 1,014 passing, 4 failing, 8 skipped tests. This diagnostic exit flag is not teardown evidence | [diagnostic rerun](logs/s0-server-forced-exit.log) |
| `bun run --cwd cli test` | 0; 280 tests across 35 files | [CLI](logs/s0-cli.log) |
| `bun run --cwd mcp-server jest --runInBand` | 0; 18 suites, 251 tests | [MCP](logs/s0-mcp.log) |
| `bun run --cwd cloud test` | 0; 117 tests across 21 files; no Worker edits | [cloud](logs/s0-cloud.log) |
| `bun run validate:ts:all` | 0 after correcting only new test fixture types; all six configured workspaces pass. Initial fixture-only errors retained | [final types](logs/s0-types-corrected-fixtures.log), [initial fixture errors](logs/s0-types.log) |
| `bun run --cwd server lint` | 0 after correcting three statement-layout errors in the new config test | [server lint](logs/s0-server-lint-corrected-fixtures.log) |
| `bun run --cwd shared lint` | 1; nine pre-existing style/import errors in seven test files | [shared lint](logs/s0-shared-lint.log) |
| `bun run check:boundaries` | 1; 12 unmatched sites, two stale exceptions; separate request/decoder convention gate | [decoder gate](logs/s0-boundaries.log) |

The original server failures are distinct from new expected-red regressions:

- `tests/integration/api.test.ts`: GET ticket expected 200, received 501 from an incomplete test/controller graph. Absent in the diagnostic rerun; classify as baseline graph/order sensitivity, not fixed source behavior.
- `tests/unit/ticketOpenApi.boundaries.test.ts`: stale expected create-field set omits existing supported `refs`. Preserve the actual API; update this assertion only as part of affected contract verification, adding explicit refs assertions.
- Shared lint: ProjectService.resolve, DependencyGraph, blocksWriteRejection, proseScanner, project-management/configuration-validation, its helpers/test-utils, and utils/projectDetector tests. Do not sweep these unrelated files.
- Decoder gate: two route admission delegations, eight cloud operation-journal decoder/cast sites, referenceOperands and staged-validation decoder/cast sites; two obsolete acquireLock identities. No architecture enforcement is inferred. Relocate existing identities only when moving their owning source; do not add blanket exemptions.

## Corrective regressions

`bun run --cwd server jest --runInBand --runTestsByPath tests/integration/combined-ticket-mutation.test.ts tests/integration/config-request-context.test.ts` exits 1: three expected failures, one passing valid mutation. [Exact red result](logs/s0-regressions.log). Repeated with `--detectOpenHandles`: same three failures, one pass, exit 1 and no reported retained handle [diagnostic](logs/s0-regressions-handles.log).

- Real SharedTicketService source, real test-lib project/ticket and real filesystem: `{status: In Progress, phaseEpic: TEST-999}` rejects missing epic after changing status from Proposed to In Progress and invoking the actual projection-publication seam once. Regression asserts original bytes and zero attempts, with a call-through publication spy.
- Real config adapter write paused after persistence but before effects: overlap another project's successful request, then separately a rejected request. The first request incorrectly refreshes the second project in both cases. This authorizes the separately scoped immutable request-context correction before S4 preservation.
- Valid combined status/priority/assignee update preserves Markdown body and passes.

## Concurrency and resource limits

`bun docs/CRs/MDT-266/execution/logs/s0-config-competing-writes.ts` exits 0. [Probe source](logs/s0-config-competing-writes.ts), [result](logs/s0-config-competing-writes.log): two actual adapters through canonical/symlink alias paths write the same physical config; a paused snapshot replacement loses the intervening second edit. Atomic rename is not serializability. No new cross-process, worktree-alias or external-editor lock guarantee is authorized or claimed. Ticket reads/inventory and subsequent writes also remain separate operations; rejection atomicity is confined to validation before one local persistence operation, not a multi-store transaction.

FileWatcher construction itself starts no heartbeat; production currently registers signals and constructs its graph at module import, while test composition differs and watcher integration is fire-and-forget. S2/S6 must explicitly establish construction/start/stop observations. Existing watcher, broadcaster, registration, identity-observation, projection-stream and journal tests cover preserved component behavior; their passing counts are included in the broad results above. These counts do not prove new factory teardown.

## Browser evidence supplied by parent

Parent executed the unchanged graph using the isolated `bun run test:e2e` wrapper, Chromium, one worker:

- Smoke infrastructure (4), quick-search/modal (27), config persistence (3), HTML preview (4), late-registration SSE (2): exit 0, 40 passing, 8 auth-gated skipped, 0 failed; 35.58 seconds. Five active files, 48 selected cases.
- `MDT_E2E_AUTH_ENABLED=true API_SECURITY_AUTH=true API_LOCAL_HOST_BYPASS=false API_AUTH_TOKEN=<isolated test-only token> bun run test:e2e -- tests/e2e/auth/session-unlock.spec.ts --project=chromium --workers=1 --reporter=line,json`: exit 0, 8 passing, no failures/skips; 7.9 seconds.
- An earlier auth invocation left the default local-host bypass enabled and failed 5/8. Parent retained it as an invocation mismatch, then corrected the environment without source edits.
- Parent verified wrapper ports released. No existing user server restarted.

Durable parent evidence: `${BB_THREAD_STORAGE}/mdt266-browser-baseline-final.md`, `mdt266-baseline-e2e.log`, `mdt266-baseline-e2e-summary.json`, and `mdt266-baseline-auth-enforced.{log,json}`. Parent owns final broad browser repetition; coordinate before writing shared browser reports.

## Invariant owners and readiness

| Slice | Baseline owner / evidence | S0 readiness |
| --- | --- | --- |
| S1 | New real-source regression; existing epic, reference, namespace, identity and REST compatibility tests | READY for explicit correction; current failure is the authorized target |
| S2 | Source route/admission inventory in server.ts/test factory; existing API/auth/preview tests and parent browser baseline | READY for common graph extraction; new lifecycle guarantees require new tests |
| S3 | Existing projects.search/search APIs, shared reference search and parent modal/browser tests | READY; preserve scoring, ties, filters, dedupe and differing limits/errors |
| S4 | Shared ProjectConfigService/document patch, server StorageAdapters/AtomicFailure/GuardedOperations/config tests; reproduced request race and alias write probe | READY after independent request-context correction; no stronger concurrent writer claim |
| S5 | Full shared suite including epic, attrs, references, worktrees, identity, cloud recovery; CLI and MCP suites | READY behind retained facade imports and error contracts |
| S6 | Existing watcher, stream, observation, credential and journal suites plus parent SSE/auth/browser tests | READY for wiring only; runtime ownership must be measured post-change |
| S7 | Existing decoder failures classified; source dependency inspection and canonical docs read | READY to add distinct structural fixtures/scan, reconcile final owner claims |

Known failures remain explicitly tracked. No deployed cloud, universal performance or full-browser-suite readiness claim is made.
