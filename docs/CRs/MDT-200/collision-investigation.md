# Ticket-key collision evidence — 2026-10-24

> **Historical checkpoint — October24 pre-fix investigation.** Code mechanisms, line numbers and
> deployment observations below describe that checkpoint. Current source fixes,
> accepted local evidence and open production gates are in [verification.md](verification.md).

## Verified incident and origin

- CLI created `MDT-258-bb-native-mdt-tools.md` at 15:09 Europe/Berlin despite
  existing MDT-258 and local keys through 261. The file was moved to MDT-262.
- Commit `8ea8b920af0741f1c76f825a71cff25431e02d90` moved the boundary-validation
  ticket from MDT-255 to MDT-258 and the Zod ticket from MDT-256 to MDT-259.
  Historical BB thread `thr_372qrxx3h9`, event 969, records the executed shell
  moves on 2026-10-22; event 2777 records direct file addition of MDT-260 at
  2026-10-24 11:18 Europe/Berlin. These destination numbers were not allocated
  through the create protocol.
- BB thread `thr_jp9pqhs8t3`, event 340, records CLI create returning MDT-257 at
  14:37 for the unfinished-template ticket. Event 388 records a Python local
  max+1 repair creating MDT-261 and restoring the unrelated real MDT-257.
- BB thread `thr_gfi6h9xfyk`, event 435, records CLI create returning MDT-258
  for the native-tools ticket; event 716 records its local move to MDT-262.
  Number repairs did not reassign cloud reservations or projections.

## Code mechanism

`cli/src/commands/create.ts:195` delegates to shared create;
`shared/services/TicketService.ts:541` reads CONFIG_DIR connection state and
uses cloud orchestration when enabled. `createLocalTicketWithNumber` at line
620 builds key+slug and applies `wx` only to that full filename. A second
slug with the same key therefore succeeds. `create-orchestrator.ts:76` reserves,
writes, acknowledges, then deletes the successful journal at line 109.

`cloud/src/cloudflare/d1/statements.ts:112` reads the cloud counter; its
UPDATE at line 198 advances by one. No filesystem high-water travels in
`domain-contracts/src/cloud-sync/coordinator.ts:47` ReserveRequest. D1 uniqueness
only sees its reservation rows, not manually introduced canonical files.

MCP bypass hypothesis is refuted: `mcp-server/src/services/crService.ts:37`
delegates create to shared create. Its line 53 number-scan wrapper is separate;
no production create caller of that wrapper was found. Installed dist code had
the same delegation and filename-only protection at investigation time.

## Evidence limits

The enabled connection named cloud project
`35863af3-8bca-4ceb-bc18-5c7bfb3e4188` at
`https://mdt-sync.constantapp.org`. Local journals had no remaining operation
for that UUID; successful journal deletion explains why this cannot establish
historical/current D1 counter values. A fresh 258 allocation implies next259
under current code, but no live reservation response/current D1 snapshot was
captured. Existing cloud projection/creation associations must be read before
any production repair. Current local max at investigation was 262 (floor263).

## Reproduction and next evidence

An isolated production-shared-create probe with mocked reservation258 and local
keys through262 wrote two MDT-258 slug files, acknowledged, and cleared its
journal; exact-path different content was rejected. Fifteen existing local
cloud allocation/provisioning cases passed. These results demonstrate the gap,
not production readiness. [poc.md](poc.md) adds a repeatable allocator/watcher
experiment and documents what it does and does not prove.
