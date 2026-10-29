# Round2 compatibility inventory

Read-only investigation; mutation intent is the [exact plan](plan.md). Preserve
external HTTP/CLI/MCP behavior and actual published shared contracts. Remove
internal old HTTP imports rather than preserving obsolete constructors for tests.

| Surface | Actual callers/promise | Proposed disposition |
| --- | --- | --- |
| server/controllers and server/routes |19files; production common app already imports modules; internal fixtures and one mixed route wrapper use old paths; server package entry is its executable, with no exported controller/route contract |Delete all19; migrate25listed test/helper files and retain behavioral assertions|
| Old ProjectController aggregate |Project/ticket/system/document/search methods combined only for old callers; getter service locator feeds old SearchController |Delete aggregate, service-locator getters and old constructor; instantiate independent actual owner in each fixture|
| Old SearchController |One regression fixture uses old ProjectController-shaped constructor; production injects shared search |Delete old wrapper; keep project-and-ticket results assertions through direct operations|
| ProjectServiceAdapter |Only runtime constructs it; app passes it to modules and exposes it to tests; it forwards shared methods, returns nested underlying discovery and constructs an unused manager |Delete; use the same shared catalog directly, update clearCache, spies and pin/favorite fixtures|
| Shared SearchService aggregate-only third port |Only old SearchController consumes it; ordinary production search uses two application ports |Remove third-port delegation; preserve normal shared search rules/results|
| TicketController fallback-controller parameter |Old aggregate passes it; production injects TicketService directly; existing missing-service501negative fixture remains meaningful |Remove fallback-controller branch/parameter; retain unavailable response and normal direct service path tests|
| TicketService test mock-path re-export |Generic Jest alias reaches a one-line re-export of actual shared code |Delete file; add exact real-source mapping before generic mock mapping|
| Other test mocks |ProjectService fake actively supports existing API tests; WorktreeService mock appears superseded by explicit source mapper and predates this cleanup |Retain; no blanket mock rewrite/deletion from Knip alone|
| ProjectConfigLoader |ProjectScanner and ProjectDiscoveryService use it; shared contract tests cover its distinct tolerant migration/read policy; shared package exports service subpaths |Retain published named boundary and exact discovery behavior; no redirect to strict ordinary reads|
| Shared TicketService |CLI/MCP/server consumers use public facade; typed query/mutation delegations coexist with real create/cloud/recovery/identity orchestration |Retain public facade/signatures; smaller facade is not automatically redundant|
| Server TicketService |Resolves project references, adapts REST supported fields/results/errors/defaults, merges projection view and exposes recovery/search operations |Retain meaningful application/transport adaptation|
| Eight module index.ts barrels |Common app and cross-capability consumers use public entrypoints; checker forbids private cross-capability edges |Retain deliberate module interface; do not bypass barrels to satisfy unused-export metrics|
| Config storage adapters |Project adapter translates selector-storage contract to one shared owner; global/user adapters retain different storage semantics |Retain; thinness is not duplication of policy|
| FileWatcher facade |Owns real event/lifecycle/subscription coordination; runtime/E2E/tests use it |Retain; remove only ten unused compatibility members below|
| Test application factory |Explicit quiet/cache/watcher settings and injected pre-auth seam delegate to common app |Retain launcher; no duplicated graph|

## Exact dead watcher compatibility members

Source: server/services/fileWatcher/index.ts. No repository runtime/test/tooling
caller was found for these facade members (same-named internals in PathWatcher,
SSEBroadcaster and lifecycle owners are retained):

```text
eventQueue getter
worktreeService getter
clients getter
debounceTimers getter
initFileWatcher
getWorktreeWatcherId
handleRegistryEvent
getProjectPath
broadcastFileChange
sendSSEEvent
```

Keep watchers/worktreeWatchers (real watcher/runtime tests), watchPaths and
handleFileEvent (SSEProjectionFanout fixture), and the ordinary provisioning,
client/heartbeat/broadcast/stop operations. No replacement diagnostics framework.

## Caller migration consequences

- Mixed project fixtures become actual ProjectController, TicketController,
  SystemController and DocumentConfigurationController fixtures by operation;
  no recreated aggregate class or weakening of validation/no-effect assertions.
- Route imports move to modules/config, access, realtime, system and tickets.
  CloudCreationRecovery.test.ts must update both existsSync guard and dynamic
  modulePath string; static import-only inventory would miss this dependency.
- Both MCP backend-consistency files require migration: the full fixture imports
  old ProjectController/router; the simple fixture names old routes/projects in
  jest.mock. Both are excluded by default and require explicit baseline evidence.
- The acceptedWrites data in ProjectController.compatibility.test.ts remains;
  compatibility filenames describe preserved payload contracts, not a requirement
  to keep the retired controller constructor.
- Direct app.locals.projectService changes only internal nested discovery access:
  projects tests spy on the direct service; pin/favorite service tests receive
  that service directly. Sharing cache clear must use the same actual instance.

## Tooling and documentation consequences

OpenAPI already scans module sources; remove its two obsolete old-route globs.
Drop old controller/route tsconfig and Jest coverage globs, retaining module
coverage. Config-thin/DevLog/OpenAPI field scanners already target actual owners;
keep assertions and correct stale config-thin descriptions. The six exact
structural compatibility exceptions all disappear; checker prevention fixtures
remain meaningful even when they synthesize old paths.

No current decoder identities require relocation for the listed backend changes.
The decoder manifest and cloud journal are outside scope; keep known12+2 visible
and reject any new finding. Any later exact refinement needs parent review.

Owner updates are the four exact docs in plan.md: retire old HTTP compatibility
promises, describe direct catalog injection/retained lifecycle surface, and fix
stale preference-storage extension guidance. Parent owns first-round portable
artifact reconciliation and public @public annotations; their separate34-file
allowlist does not overlap backend writes. No production/test creates planned.
