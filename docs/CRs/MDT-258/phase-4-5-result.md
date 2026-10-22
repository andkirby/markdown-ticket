# MDT-258 phases 4–5 result

Status: **READY for scoped review**. Implementation and focused gates pass;
full frontend TypeScript/build remains blocked by its documented setup errors.
The browser journey cannot launch the missing Chromium executable; the requested
Playwright API CRUD fallback passes. No full UI or full-suite readiness claim.
Ticket status is unchanged.

Baseline: `63eff014678abc9903132b745817b20b92341f2a`.
Mode: Execute; implementation and conventional commit explicitly authorized.
Plan SHA-256: `572598693f3261b664d8d45f3be314e88fb166a02d4ef1c9c5b6fd8e5cf8e8f6`.
Controlled-refactor skill SHA-256: `569a4c272adcaeab2e32b69c89c15783c04cee4893242d067eda8e851b1d372f`.
Plan: [phase-4-5-plan.md](phase-4-5-plan.md). Canonical acceptance owners:
the ticket phases 4/5 and [design §C](boundary-validation-design.md).

## Implemented boundaries

- Local project reads use a compatible persisted schema and its successful
  output. The schema validates against the existing entity acceptance rules
  while returning the raw input type: spelling, string counters, absent preview
  defaults, extensions and existing legacy migration triggers remain intact.
  Phase 2/3 write reload schemas and destination-preservation rules remain.
- Registry reads support minimal references, absent/partial metadata, legacy
  counters and extension siblings. Factory/discovery metadata fallback now
  explicitly handles absent metadata. Collision scans parse only their sharing
  identity projection, so unrelated invalid fields cannot hide a share ID.
- ConfigRepository has a tolerant field-extraction schema, retaining mixed-array
  filtering, integer-only depth extraction, legacy tickets paths and preview
  settings. The project storage adapter uses a separate raw display envelope,
  preserving malformed selector values for their existing consumer; strict
  write reloads remain separate. Its generic now describes parsed persisted
  data, replacing the LocalProjectConfig assertions. No filesystem policy moved.
- Shared markdown full/metadata reads and watcher frontmatter use a compatible
  schema. Existing H1 authority in markdown reads, date variants, defaults and
  relationship normalization remain. Watcher field selection retains its
  existing frontmatter-title behavior and serializes Date values to the same
  ISO wire form. Metadata reads still avoid full content processing.
- templates.json validates its root independently of entries. Invalid entries
  and missing template files are skipped individually; syntax/load failures
  retain fallback templates.
- Operation journals and pending projections validate consumed replay fields
  before recovery/publish. File identity must match the requested project or
  ticket number. Invalid shapes remain on disk and cannot trigger replay.
  Projection read-model files validate nested entries and retain rebuild/default
  behavior, always reloading as stale. Existing lock/credential/trace readers
  keep their explicit specialized or syntax-only contracts.
- Scoped Express read params/query, both search adapters, filesystem existence,
  log queries, document visibility, config selection and inline diagnostics use
  parseRequest. Arrays/objects cannot reach scalar services. Numeric parseInt,
  equality, bounds, log clamping, filtering and auth/path policy stay in their
  existing owners.
- All five MCP reads use registry validators alongside the five mutation tools.
  Fuzzy filters retain substring strings/arrays rather than entity-enum policy.
  The typed project-read callback retains the former dispatcher error policy,
  so loader/service execution failures are not reclassified as bad arguments.
- Browser SSE frames use a local discriminated schema. Unknown events and
  malformed known payloads do not reach dispatch or deduplication. Partial
  watcher ticket data stays supported; the EventBus type now reflects that
  existing wire shape. View validation stays route-local, with board defaults
  and carried-query encoding unchanged. No HTTP response DTO schemas added.

## Acceptance evidence

| ID | Result and evidence |
| --- | --- |
| P4-A | PASS: pre-wiring temp-file fixtures for both local loaders, modern raw values/partial previews, legacy migration, global migration/defaults and minimal registry; final fixtures add real discovery with absent metadata and legacy registry counters/sharing/extensions. Modern reads leave file bytes unchanged. Existing project write/reload suites remain green. |
| P4-B | PASS: H1 beats frontmatter title; date-only, ISO, offset and Date-object forms; comma strings and mixed relationship arrays retain normalizer output. Full and metadata paths agree; a spy proves metadata extraction never calls processContentForDisplay. Watcher temp-file test checks selected fields and date wire output. |
| P4-C | PASS: valid template survives invalid/missing siblings; syntax failure uses fallback. Temp-file pins/favorites tests prove reset on malformed JSON and bad schemas without rewriting either file. |
| P4-D | PASS: ten corrupt operation-journal cases make zero reserve, local-write or acknowledgement calls. Six corrupt pending-projection cases make zero publish calls during flush. Four corrupt/mismatched read-model cases rebuild without rewriting. Existing valid recovery/create/projection suites pass. |
| P5-A | PASS: ten advertised names equal ten registry names with no duplicates; required keys checked for all five new read schemas, complementing mutation parity. Invalid read envelopes fail before resolution. Tests preserve raw fuzzy filter strings, aliases and get modes, plus project execution-error classification. |
| P5-B | PASS: structured params/queries reject before service calls. Tests retain bypassCache exact equality, projection defaults/decimal-prefix parsing/ranges, log default/NaN/zero/hex/clamp behavior, and case-insensitive log filtering. Real shared ticket files prove fuzzy OR-array and AND-facet behavior. |
| P5-C | PASS: local SSE tests prove unknown/malformed frames cannot poison dedupe IDs, valid partial payload dispatch and duplicate suppression, document/subdocument defaults. Existing route derivation tests retain view defaults and carried-query encoding. |
| P5-D | PASS via authorized fallback: browser launch fails because installed Playwright lacks its Chromium headless-shell executable. One API-only Playwright journey through the repo wrapper passes create, persisted read, update, list and delete with valid UI-shaped payloads. Browser rendering is unverified. |
| R-A | PASS: manifest strictly shrinks, zero added/altered surviving legacy identities; checker and adversarial fixtures pass. Only one raw request-read exception remains: the existing MCP HTTP protocol envelope. Explicit Request delegations and specialized decoder cases remain reviewed baselines. |
| R-B | PASS for scoped package builds/tests/lint; repository-wide TS and root build have only the named frontend setup baseline. Vite bundling passes independently. No full-suite claim. |

## Executed verification

Complete command outputs, including intermediate failures, are retained in this
thread's `mdt258-45` artifact directory (@thread:thr_6gd22mgnsa). Commands below
run from the repository root. Shared tests use an isolated temporary CONFIG_DIR;
all Jest lanes are serial and force-exit where needed.

| Command / lane | Final result |
| --- | --- |
| `bun run --cwd domain-contracts build` | PASS, exit 0, including existing equality/migration checks. |
| `bun test ./domain-contracts/src` | PASS: **377 tests / 26 files / 876 assertions**, baseline 373. |
| Shared focused Jest, command below | PASS: **162 tests / 13 suites**, zero skips. |
| Server focused Jest, command below | PASS: **221 tests / 16 suites**, zero skips. |
| MCP focused Jest, command below | PASS: **83 tests / 4 suites**, zero skips. |
| Frontend isolated Bun tests, command below | PASS: **24 tests / 2 files / 41 assertions**. |
| `bun run check:boundaries` | PASS: **152 identities / 160 occurrences / 25 decoder modules**. |
| `bun run test:boundaries` | PASS: **46 tests / 98 assertions**. |
| Shared, server, MCP, CLI and cloud package builds | PASS, exit 0 for each. |
| `bun run validate:ts:all` | Baseline failure, exit 1: five packages pass; frontend test-setup.ts TS2306 and TS2322 only. |
| `bun run build` | Baseline frontend tsc failure at the same two setup diagnostics. |
| `bun run --cwd frontend vite build` | PASS; existing chunk-size warning only. |
| `bun run test:e2e -- tests/e2e/ticket/boundary-crud.spec.ts --project=chromium` | Browser attempt blocked before test actions: Chromium executable missing. |
| Same wrapper/spec with `--grep 'API CRUD fallback'` | PASS: **1 API CRUD journey**, exit 0, isolated ports/config and teardown. |
| Strict tsc for checker/tests; owning-package ESLint over changed TS | PASS, zero lint warnings. E2E TS is ignored by root ESLint; Playwright executes the fallback spec. |
| Scoped markdownlint and staged whitespace checks | PASS. |

Focused commands:

```bash
CONFIG_DIR=<isolated-temp> bun run --cwd shared test --runInBand phase45-compatibility ProjectConfigService ProjectDiscoveryService MarkdownService project-write ProjectDocumentPatch configureDocumentsByPath operation-journal recovery projection-sync CloudProjectionReadModel create-orchestrator
bun run --cwd server jest --runInBand Phase45 Phase23 ProjectController ConfigRepository StorageAdapters pins document-favs fileWatcherService config-side-effects search filesystem-boundary --forceExit
bun run --cwd mcp-server jest --runInBand read-boundaries mutation-boundaries boundary-compatibility transport-boundaries --forceExit
bun test --isolate ./frontend/src/services/sseClient.test.ts ./frontend/src/components/routes/viewModeDerivation.test.ts
bunx tsc --noEmit --target ES2022 --module ESNext --moduleResolution bundler --types bun --esModuleInterop --skipLibCheck --strict scripts/check-boundary-validation.ts scripts/check-boundary-validation.test.ts
```

## Manifest delta

**209 → 152 identities; 220 → 160 occurrences.** Removed exactly **57** existing
identities: 32 request reads, five tool reads, one tool cast, twelve decoder calls
and seven decoder casts. **Zero additions; surviving legacy records identical.**
The finite decoder registry grows **23 → 25 modules** to cover the previously
cast-only pending-projection and read-model loaders. These are validated module
registrations, not new exceptions. Registration liveness now counts validated
as well as legacy decoder calls; migrated modules remain protected. Narrow
canonical-parser recognition and gray-matter `.data` handling have rejection
fixtures for fake imports, shadowing, ignored safeParse and raw reuse.

## Adaptations, reconciliation and remaining work

1. Config predicates discarded normalized copies. Applying those copies would
   trim codes/IDs/paths and introduce preview defaults. The persisted local
   contract therefore uses the canonical validator with its raw input type;
   callers consume the successful persisted parse. Shared ProjectConfig now
   names that raw type. Registry factories retain their historical counter
   pass-through instead of adding numeric coercion.
2. Minimal metadata requires optional access in the existing factory/discovery
   owners. Settings display and document extraction require different tolerant
   schemas: display retains raw selector values, extraction retains per-field
   filtering/defaults. Existing write reloads remain strict and fail closed.
3. Both search helpers and the remaining filesystem-exists body were migrated
   with the read envelopes. Two existing missing-param assertions now check
   structured issue responses instead of the retired message-only shape.
4. No mass migration, new startup rewrite, on-disk format, auth/path policy,
   dependency, MDT-259 shim, ticket status or renumbering change. Trace JSON,
   lock PID, credential/token inspection and existing guarded readers remain
   explicit cases rather than forced entity schemas.
5. Self-review compared the patch against local/global config specifications,
   server architecture, frontend route architecture and event-system ownership.
   Normative documentation impact remains NONE: formats, ownership, valid-input
   behavior and runtime topology remain true. This plan/report are the durable
   ticket-owned evidence. No performance improvement is claimed.
6. Intermediate verification corrections: the new baseline template fixture
   initially omitted its required title field; it was corrected before wiring.
   The new E2E fixture initially looked for `code` rather than the existing
   `crCode` response field. One retry overlapped my domain rebuild and failed
   package resolution; the later isolated wrapper run passed. No baseline tests
   were disabled or relaxed to accommodate implementation failures.
7. The root check script and `.github/workflows/boundary-validation.yml` already
   run the boundary guard/fixtures. They are unchanged. Remaining ticket CI work:
   un-ignore/triage Knip workspaces and gate normal/production scans; adopt
   no-unsafe-type-assertion in server/MCP without unreviewed policy changes;
   delete the §E dead ticket/project/local-config/template wrappers and update
   barrels/wrapper-only tests after export compatibility review. Retain the live
   MCP config validator and live global/user/selector/pin/favorite readers.
   Type-equality gates remain in place. Specialized baseline cases and later
   HTTP response/browser-storage contracts remain explicit follow-up scope.
   The CLI presentation loader remains outside the user-enumerated targets;
   its two existing decoder exceptions are unchanged.

Final production/test changes match the bounded mutation intent, including the
in-scope search helper and typed display/EventBus adaptations above. Only the
plan/report are added as tracked artifacts; large logs stay in thread storage.
All initial unrelated worktree changes remain outside the scoped commit.
