# Architecture: @mdt/shared

Shared owns reusable application operations, policy, contracts adapters and named
I/O adapters used by REST, CLI and MCP. Canonical schemas/types belong to
`domain-contracts`; shared is not a pure domain package.

## Owners and public imports

| Owner | Responsibility |
| --- | --- |
| `models/` | Canonical contract re-exports and existing ticket/config normalization |
| `services/ProjectService.ts`, `services/project/` | Catalog/discovery, canonical project identity, worktree-aware scans, registry and project config operations |
| `services/project/ProjectConfigService.ts` | Project-file mutation and named read contracts; synchronous project updates, selector writes, document patches and legacy migration |
| `services/project/ProjectConfigLoader.ts` | Compatibility delegate for discovery's distinct tolerant migration read |
| `services/TicketService.ts` | Stable public facade and existing local/cloud creation, recovery, projection and identity-observation orchestration |
| `services/ticket/TicketQueryService.ts` | Ticket read/list/filter/sort/pagination and external-reference presentation |
| `services/ticket/TicketMutationService.ts` | Complete mutation validation/persistence ordering and attribute-batch composition, reusing epic/derived/reference rules |
| `services/ticket/TicketRepository.ts` | Ticket-specific persistence port |
| `services/ticket/MarkdownTicketRepository.ts` | Identified Markdown reads, byte-preserving field edits, rendering, exclusive creation/replay, rename and removal |
| `services/search/SearchService.ts` | Project scoring and ticket matching/ranking/ties/deduplication/limits, including retained unified grouping semantics |
| `services/ticket/TicketLocationResolver.ts`, identity/subdocument helpers | Existing physical ticket routing, ambiguity rejection and subdocument policy |
| `services/cloud-sync/` | Existing typed protocol clients, credentials, creation/projection journals, recovery, stream clients/read model; server owns activation |
| `tools/` | Existing project/config tooling over shared operations |
| `test-lib/` | Isolated filesystem/process fixtures and test launch utilities |

Existing `@mdt/shared/services/TicketService.js`, ProjectService and model imports
remain valid. The ticket facade constructs concrete collaborators for backward
compatibility and supplies capability dependencies and the existing publication
operation. New collaborators accept narrow injected operations/ports, without
Express objects or runtime watcher/client ownership.

## Persistence boundaries

Rejected complete ticket validation precedes any canonical write/publication.
Accepted local persistence and cloud publication remain separate steps, with the
existing explicit recovery/journal outcomes. Markdown content stays authoritative;
projections, diagnostic caches and journals do not become ticket bodies.

ProjectConfigService retains separate entrypoint contracts: ordinary reads validate
ticketsPath and may migrate legacy config; discovery reads preserve their distinct
migration cleanup; selector display is tolerant and selector write reload rejects
invalid existing data except missing files. Synchronous project operations and
registry-before-local ordering remain. An obsolete document section is treated by
its existing operation-specific policy. Global/user config, registry sharing, pins,
favorites and trace stores retain their separate authorities and storage semantics.

Atomic replacement prevents torn config replacement. It does not promise isolation
from other processes, aliases/worktrees or external editors, nor a transaction
spanning registry/local files or cloud state.

## Build and testing

`bun run build:shared` builds the package before consumers; `bun run dev:full`
includes it. `bun run --cwd shared test` exercises the owning package. File-backed
integration uses `shared/test-lib`; see its [guide](test-lib/write-tests-guide.md).
The repository's `check:modules` gate prevents shared transport/reverse imports and
search dependencies on ticket mutation/storage internals.
