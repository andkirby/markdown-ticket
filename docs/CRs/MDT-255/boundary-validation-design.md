# MDT boundary validation upgrade: investigation and design

Read-only investigation, 2026-10-22. Source snapshot: HEAD `82528a68` plus the existing working tree. No implementation, ticket, dependency, configuration, or runtime changes were made. Examples and schema names marked **new** are proposals. Line references describe this snapshot.

## Decision

Use Zod at each adapter boundary: one typed `parseRequest(schema, raw, res, source)` function for Express, and one `defineTool(schema, handler)` registry for MCP. Validate complete mutation payloads before calling any mutation service. Keep domain rules, authorization, filesystem containment, and normalization in their existing owners.

Ship CR writes and MCP mutations first, project/config writes next, then remaining writes and file ingress; finish with read requests and browser ingress. Add a static boundary convention check immediately, with a fixed inventory of legacy exceptions that shrinks each phase. No new validation library or transport rewrite is needed.

### Findings that affect this decision

- The two cited search controllers are the direct controller `safeParse` sites. They are not the entire runtime coverage: pins, favorites, selector state, config values, templates, MCP config, and some project-file loads already use schemas downstream.
- MCP tool argument objects have no Zod parsing. There are partial manual checks: project keys, CR keys, modes/status/type, template data, and section operations. Thus “zero schema validation of tool arguments” is accurate; “zero validation of any kind” is not. See [mcp-server/src/utils/validation.ts:16](mcp-server/src/utils/validation.ts:16), `:37`, `:52` and the MCP inventory below.
- `safeValidateMcpServerConfig` has a current production caller at [mcp-server/src/config/index.ts:98](mcp-server/src/config/index.ts:98); retain it. No symbol named `validateCRFrontmatter` exists in current production source; the schema is `TicketFrontmatterSchema`, with legacy alias `CRSchema` ([domain-contracts/src/ticket/schema.ts:22](domain-contracts/src/ticket/schema.ts:22)). Do not schedule deletion of a nonexistent export.
- `ConfigRepository` is live: [server/repositories/ConfigRepository.ts:20](server/repositories/ConfigRepository.ts:20), constructed by [server/services/DocumentService.ts:65](server/services/DocumentService.ts:65) and [server/services/TreeService.ts:29](server/services/TreeService.ts:29). Validate its ingress without folding a repository-consolidation refactor into this work.
- PUT CR currently calls `updateCRPartial`, just like PATCH ([server/controllers/ProjectController.ts:897](server/controllers/ProjectController.ts:897), `:832`). Preserve partial semantics.
- PATCH can write status before processing attributes ([server/services/TicketService.ts:368](server/services/TicketService.ts:368)). A mixed request must pass complete shape validation before that first write; merely validating each field immediately before its individual service call is insufficient.

## A. Input inventory

Classification: **Z** = Zod schema validation; **C** = cast-only at ingress; **D** = destructured/accessed without schema validation. **M** appended to C/D means some manual/delegated checking exists. **W** = durable mutation, credential/session issuance, or write-affecting input; **R** = read path; **E** = transient logging/event state. Existing service checks are recorded rather than credited as complete boundary validation.

The HTTP tables enumerate every `req.body`, `req.params`, and `req.query` consumption found in all current `server/routes/*.ts` and `server/controllers/*.ts`. Repeated reads in the same endpoint are grouped and individually referenced. Inline server mounts and MCP HTTP ingress are included separately. Endpoints that consume none of these sources need no invented payload schema.

### Express project and CR boundaries

All entries below are in `server/controllers/ProjectController.ts` unless another file is named. Canonical reference input must accept project IDs as well as codes; do not apply `ProjectCodeSchema` to every `projectId`.

| Site / consumed input | File:line | Handling and destination | Risk | Suggested schema |
|---|---|---|---|---|
| Project search body | [server/controllers/ProjectController.ts:159](server/controllers/ProjectController.ts:159) | Z, `SearchRequestSchema` → ticket search | R | Existing schema; standardize error details |
| List projects `query.bypassCache` | [server/controllers/ProjectController.ts:201](server/controllers/ProjectController.ts:201) | D, equality to `'true'` → discovery | R | New `BypassCacheQuerySchema`; preserve equality behavior |
| Read config `params.projectId` | [server/controllers/ProjectController.ts:220](server/controllers/ProjectController.ts:220) | D+M, presence + visible-project lookup | R | New `ProjectRefParamsSchema` |
| Create project body | [server/controllers/ProjectController.ts:266](server/controllers/ProjectController.ts:266) | C → shared `ProjectManager.createProject`; manual name/code/path checks downstream | W | New `RegisterProjectInputSchema`, derived from project primitives; current create schema is a different shape |
| Update project `params.code`, body | [server/controllers/ProjectController.ts:290](server/controllers/ProjectController.ts:290), `:298` | C+M; name/description/repository checked, `active` copied at :328 → project service/manager | W | New `ProjectRefParamsSchema` + compatible project-update boundary variant |
| Sharing `params.code`, body | [server/controllers/ProjectController.ts:384](server/controllers/ProjectController.ts:384), `:399` | C+M; mode, boolean rotation, server-owned shareId checked → sharing service | W | New `UpdateProjectSharingInputSchema` using `ProjectSharingModeSchema`; forbid supplied `shareId` |
| Enable `params.code` | [server/controllers/ProjectController.ts:442](server/controllers/ProjectController.ts:442) | D+M, presence → manager | W | `ProjectRefParamsSchema` |
| Disable `params.code` | [server/controllers/ProjectController.ts:471](server/controllers/ProjectController.ts:471) | D+M, presence → manager | W | `ProjectRefParamsSchema` |
| Directories `query.path` | [server/controllers/ProjectController.ts:500](server/controllers/ProjectController.ts:500), `:528` | D/C → `authorizeFilesystemPath`; containment enforced downstream | R | New optional scalar `FilesystemPathQuerySchema`; retain authorization |
| Filesystem tree `query.projectId` | [server/controllers/ProjectController.ts:554](server/controllers/ProjectController.ts:554) | D+M, truthiness → `TreeService.getPathSelectionTree` | R | New `ProjectRefQuerySchema` |
| Configure documents body `{projectId,documentPaths}` | [server/controllers/ProjectController.ts:582](server/controllers/ProjectController.ts:582) | D+M, truthiness + array check → `configureDocuments`, watcher refresh; document patch schemas downstream | W | New `ConfigureDocumentsInputSchema`, compose `DocumentPathsPatchSchema` |
| List CRs `params.projectId` | [server/controllers/ProjectController.ts:630](server/controllers/ProjectController.ts:630) | D+M, presence + visibility → metadata listing | R | `ProjectRefParamsSchema` |
| Unified tickets `params.projectId` | [server/controllers/ProjectController.ts:662](server/controllers/ProjectController.ts:662) | D+M, presence + visibility → ticket service | R | `ProjectRefParamsSchema` |
| Projections `params.projectId`, `query.after/limit` | [server/controllers/ProjectController.ts:686](server/controllers/ProjectController.ts:686), `:702`, `:703` | D+M; parseInt/String, integer/range checks → projection feed | R | New `ProjectionQuerySchema` + project params; characterize existing numeric parsing |
| Get CR `params.projectId/crId` | [server/controllers/ProjectController.ts:725](server/controllers/ProjectController.ts:725) | D+M, presence + visibility → ticket adapter | R | New `TicketRefParamsSchema` |
| Create CR params + body | [server/controllers/ProjectController.ts:773](server/controllers/ProjectController.ts:773), `:774` | C+M → server `TicketService.createCR`; only selected fields forwarded at service :314 | W | New REST create projection derived from corrected `CreateTicketInputSchema` |
| PATCH CR params + body | [server/controllers/ProjectController.ts:815](server/controllers/ProjectController.ts:815), `:816` | C+M, nonempty check → `updateCRPartial` | W | New `PatchTicketInputSchema`, includes status and accepted level aliases |
| PUT CR params + body | [server/controllers/ProjectController.ts:886](server/controllers/ProjectController.ts:886), `:887` | C → same partial-update service | W | Same `PatchTicketInputSchema`; no replacement requirements |
| Subdocument params `{projectId,crId,subDocName}` | [server/controllers/ProjectController.ts:922](server/controllers/ProjectController.ts:922), `:923` | D/C+M, presence + visibility → location/subdocument services | R | New `SubdocumentRefParamsSchema`; retain namespace/path policy |
| Trace metadata params | [server/controllers/ProjectController.ts:954](server/controllers/ProjectController.ts:954) | D+M, presence + visibility → trace service | R | `TicketRefParamsSchema` |
| Trace store params | [server/controllers/ProjectController.ts:987](server/controllers/ProjectController.ts:987) | D+M, presence + visibility → trace service | R | `TicketRefParamsSchema` |
| Delete CR params | [server/controllers/ProjectController.ts:1025](server/controllers/ProjectController.ts:1025) | D+M, presence → delete service | W | `TicketRefParamsSchema` |
| Shared visible-project resolver `query.bypassCache` | [server/controllers/ProjectController.ts:1063](server/controllers/ProjectController.ts:1063) | D, equality to `'true'`; also used by document visibility middleware | R | Reuse parsed `BypassCacheQuerySchema` result |

### Other Express controllers and route-local inputs

| Site / consumed input | File:line | Current handling | Risk | Suggested schema |
|---|---|---|---|---|
| Unified search body | [server/controllers/SearchController.ts:29](server/controllers/SearchController.ts:29) | Z, `UnifiedSearchRequestSchema` | R | Existing; shared structured error formatter |
| Config patch `{selector,value}` | [server/controllers/ConfigController.ts:103](server/controllers/ConfigController.ts:103) | D+M envelope; selector checked, value Z-validated by [server/services/config/ConfigApplicationService.ts:192](server/services/config/ConfigApplicationService.ts:192) using `strictPatchValidator` | W | New `ConfigPatchEnvelopeSchema`; keep selector allowlist/exposure and value validation in application service |
| Discover documents `query.projectId` | [server/controllers/DocumentController.ts:94](server/controllers/DocumentController.ts:94) | D+M, truthiness → document service | R | `ProjectRefQuerySchema` |
| Document content `query.projectId/filePath` | [server/controllers/DocumentController.ts:126](server/controllers/DocumentController.ts:126) | D+M, truthiness → document service/path policy | R | New `DocumentContentQuerySchema` |
| Document favorites body | [server/controllers/DocumentController.ts:187](server/controllers/DocumentController.ts:187) | D+M project string; Z downstream in [server/services/DocumentFavStateService.ts:37](server/services/DocumentFavStateService.ts:37) | W | New envelope `{projectId,...DocumentFavStateSchema.shape}`; preserve eligibility checks |
| Preview token body | [server/controllers/DocumentController.ts:238](server/controllers/DocumentController.ts:238) | D+M strings + HTML extension → token issuance | W | New `PreviewTokenInputSchema`; existing capability checks first |
| Raw preview `params.token`, wildcard path | [server/controllers/DocumentController.ts:273](server/controllers/DocumentController.ts:273), `:275` | C+M; token cryptography + document containment/MIME gates | R | Server-local transport params schema; retain 403 token/policy failures |
| Pin state body | [server/controllers/PinController.ts:40](server/controllers/PinController.ts:40) | Z delegated: [server/services/PinStateService.ts:54](server/services/PinStateService.ts:54) → `validatePinState` | W | Existing `PinStateSchema` at adapter; keep known-project rule |
| Document visibility middleware query/body projectId | [server/routes/documents.ts:19](server/routes/documents.ts:19), `:21`, `:22` | D+M scalar string selection, query wins → visibility resolver | R/W | Reuse endpoint-parsed project reference; do not accidentally change precedence |
| Filesystem exists body `{path}` | [server/routes/system.ts:260](server/routes/system.ts:260) | D+M string check + path authorization | R | New `FilesystemExistsInputSchema` |
| Selector-state body | [server/routes/system.ts:630](server/routes/system.ts:630), `:636` | Z via `safeValidateSelectorState`, atomic JSON write | W | Existing `SelectorStateSchema`; retain defaults, add issues |
| Owner login body.token | [server/routes/auth.ts:62](server/routes/auth.ts:62) | D+M via `readSubmittedToken` :151, timing-safe match | W/session | Server-local token body schema; shape errors 400, credential rejection stays 401 |
| Read-token exchange body.token | [server/routes/auth.ts:79](server/routes/auth.ts:79) | Same scalar extraction, scope/token checks | W/session | Same token shape; retain authentication result semantics |
| Invite exchange `params.code` | [server/routes/readTokens.ts:24](server/routes/readTokens.ts:24) | D+M presence, token-store consumption | W/session | Server-local invite params schema; invalid credentials stay 401 |
| Create read-token body fields | [server/routes/readTokens.ts:82](server/routes/readTokens.ts:82), `:83`, `:84` | D+M `readString`, `readStringArray`, optional string → token store normalization | W | New access-domain token creation input; preserve nullable/optional expiry |
| Create invite `params.tokenId` | [server/routes/readTokens.ts:107](server/routes/readTokens.ts:107), `:109` | D → store lookup; owner permission checked | W | Server-local opaque tokenId params schema |
| Revoke token `params.tokenId` | [server/routes/readTokens.ts:129](server/routes/readTokens.ts:129), `:131` | D → revoke/store + ephemeral invite cleanup | W | Same tokenId params schema |
| Invite body.origin helper | [server/routes/readTokens.ts:146](server/routes/readTokens.ts:146) | D+M optional-string extraction, origin allowlist resolution | W | Server-local invite body schema; preserve absent-body behavior |
| Share exchange `params.shareId` | [server/routes/share.ts:14](server/routes/share.ts:14) | D → sharing/session lookup | W/session | Server-local opaque share params schema |
| Backend logs query `{lines,filter}` | [server/routes/devtools.ts:202](server/routes/devtools.ts:202), `:203` | D+M parseInt + upper clamp; filter used as string | R | Server-local `LogQuerySchema` |
| Log stream query.filter | [server/routes/devtools.ts:238](server/routes/devtools.ts:238) | D → stream metadata | R | Same optional scalar filter schema |
| Frontend log ingestion body.logs | [server/routes/devtools.ts:368](server/routes/devtools.ts:368) | D+M array-only; entries unchecked before buffering | E/write | Server-local `FrontendLogBatchSchema` |
| Frontend log query | [server/routes/devtools.ts:404](server/routes/devtools.ts:404), `:405` | D+M parseInt/clamp, string use | R | `LogQuerySchema` |
| Dev log ingestion body.logs | [server/routes/devtools.ts:485](server/routes/devtools.ts:485) | D+M active-mode/rate gate + array-only | E/write | Server-local `DevLogBatchSchema` |
| Dev log query | [server/routes/devtools.ts:548](server/routes/devtools.ts:548), `:549` | D+M parseInt/clamp, string use | R | `LogQuerySchema` |
| Inline cloud-sync status `params.id` | [server/server.ts:415](server/server.ts:415), `:421` | D → stream-manager lookup | R | `ProjectRefParamsSchema` |
| Config adapter binding `query.projectId` | [server/server.ts:451](server/server.ts:451) | D+M string-or-undefined before side-effect targeting | W-affecting | `ProjectRefQuerySchema`, optional in global/user scope |

`routes/projects.ts`, `search.ts`, `pins.ts`, and most of `documents.ts` delegate to the sites above. `routes/config.ts` delegates request-specific adapter binding and controller work. `routes/docs.ts` consumes no body/params/query. [server/routes/sse.ts:50](server/routes/sse.ts:50) consumes origin/session context, not query payload. Bodyless status/health/cache-clear/config-clear/log-start/log-stop endpoints add no data shape to validate. Existing headers/cookies/origin/session checks remain separate security boundaries, not schema bypasses.

### MCP: all ten tool argument objects

Common ingress: `MCPTools.handleToolCall(name,args)` at [mcp-server/src/tools/index.ts:80](mcp-server/src/tools/index.ts:80). It casts arguments before service resolution at :100–:101 and :130–:131. JSON input-schema declarations in [mcp-server/src/tools/config/allTools.ts:31](mcp-server/src/tools/config/allTools.ts:31) onward advertise shapes; they are not invoked as validators here. Stdio validates the SDK request envelope, not the selected tool's advertised schema ([mcp-server/src/transports/stdio.ts:35](mcp-server/src/transports/stdio.ts:35)).

| Tool / raw arguments | Dispatch and handler file:line | Handling and flow into shared | Risk | Suggested schema |
|---|---|---|---|---|
| `list_projects {}` | [mcp-server/src/tools/index.ts:85](mcp-server/src/tools/index.ts:85); [mcp-server/src/tools/handlers/projectHandlers.ts:32](mcp-server/src/tools/handlers/projectHandlers.ts:32), `:153` | Arguments ignored → shared `ProjectService.listProjects/getProjectCRs` | R | MCP-local empty object; preserve tolerated extra keys |
| `get_project_info {key}` | [mcp-server/src/tools/handlers/projectHandlers.ts:36](mcp-server/src/tools/handlers/projectHandlers.ts:36), `:193` | Cast key; manual project-key normalization at :123 → shared project service | R | MCP-local envelope using compatible project-key input |
| `list_crs {project?,filters?}` | [mcp-server/src/tools/index.ts:105](mcp-server/src/tools/index.ts:105); [mcp-server/src/tools/handlers/crHandlers.ts:77](mcp-server/src/tools/handlers/crHandlers.ts:77) | Cast filters → `CRService.listCRs` :29 → shared `TicketService.listCRs` | R | MCP envelope + new `TicketFiltersInputSchema`; preserve fuzzy strings and string/array forms |
| `get_cr {project?,key,mode?}` | [mcp-server/src/tools/index.ts:108](mcp-server/src/tools/index.ts:108); [mcp-server/src/tools/handlers/crHandlers.ts:123](mcp-server/src/tools/handlers/crHandlers.ts:123) | Key normalization + manual mode enum → `CRService.getCR` → shared ticket service; attributes also parse markdown | R | MCP envelope; key string/shorthand + mode enum/default |
| `create_cr {project?,type,data}` | [mcp-server/src/tools/index.ts:111](mcp-server/src/tools/index.ts:111); [mcp-server/src/tools/handlers/crHandlers.ts:271](mcp-server/src/tools/handlers/crHandlers.ts:271) | Cast data; manual type + `TemplateService.validateTicketData` :286; content processing → `CRService.createCR` :329 → shared ticket service | W | MCP envelope using canonical create data with nested `type` optional, top-level `type` required |
| `update_cr_status {project?,key,status}` | [mcp-server/src/tools/index.ts:114](mcp-server/src/tools/index.ts:114); [mcp-server/src/tools/handlers/crHandlers.ts:392](mcp-server/src/tools/handlers/crHandlers.ts:392) | Key normalization + manual status enum → `CRService.updateCRStatus` → shared ticket service | W | MCP envelope + `CRStatusSchema` |
| `update_cr_attrs {project?,key,attributes}` | [mcp-server/src/tools/index.ts:117](mcp-server/src/tools/index.ts:117); [mcp-server/src/tools/handlers/crHandlers.ts:467](mcp-server/src/tools/handlers/crHandlers.ts:467) | Presence-only helper; null/undefined filtered, scalar values stringified → shared `TicketService.updateTicketAttributes` | W | MCP envelope + canonical attribute-input schema; accept existing aliases and intentional null no-op behavior |
| `delete_cr {project?,key}` | [mcp-server/src/tools/index.ts:120](mcp-server/src/tools/index.ts:120); [mcp-server/src/tools/handlers/crHandlers.ts:555](mcp-server/src/tools/handlers/crHandlers.ts:555) | Key normalization, existence check → `CRService.deleteCR` → shared ticket service | W | MCP envelope + compatible key input |
| `suggest_cr_improvements {project?,key}` | [mcp-server/src/tools/index.ts:123](mcp-server/src/tools/index.ts:123); [mcp-server/src/tools/handlers/crHandlers.ts:594](mcp-server/src/tools/handlers/crHandlers.ts:594) | Key normalization → `CRService.getCR`, shared template suggestions | R | Same key envelope |
| `manage_cr_sections {project?,key,operation,section?,content?}` | [mcp-server/src/tools/index.ts:128](mcp-server/src/tools/index.ts:128); [mcp-server/src/tools/handlers/sectionHandlers.ts:21](mcp-server/src/tools/handlers/sectionHandlers.ts:21) | Manual operation enum; legacy `update`→`replace`; weak required checks → local SectionService → CRService/shared MarkdownSectionService | R for list/get; W otherwise | MCP-local discriminated operation union: section required for get/mutations; content required for mutations; preserve `update` alias |

Handler paths abbreviated as `handlers/...` above are under `mcp-server/src/tools/`. Every CR/section envelope must validate optional `project` and `key` **before** `ProjectHandlers.resolveProject` ([mcp-server/src/tools/handlers/projectHandlers.ts:89](mcp-server/src/tools/handlers/projectHandlers.ts:89)), preserving explicit project → key-derived project → detected project → single-project fallback. Do not require explicit project universally.

Additional MCP transport inputs: HTTP JSON-RPC body at [mcp-server/src/transports/http.ts:158](mcp-server/src/transports/http.ts:158); tool name/arguments at :198–:199 and :644–:648. Both call the same dispatcher. Keep envelope validation local to transport; validate tool arguments once in the common registry. Reject null/array/primitive argument payloads before casts, and stop using truthiness defaults to hide a supplied invalid argument value. An absent `arguments` field may still normalize to `{}`.

### Files and configuration: parsed value → typed code

These are distinct trust boundaries even when the file was originally written by MDT. R/W means a read feeds a subsequent write. Preserve existing fallback/migration behavior; file failures do not become HTTP 400 merely because a loader is called during a request.

| Site | File:line | Current handling | Risk | Suggested contract/action |
|---|---|---|---|---|
| Global TOML service load | [shared/services/project/ProjectConfigService.ts:65](shared/services/project/ProjectConfigService.ts:65) | `processConfig` manual normalization + Z for modern config; legacy branch manual | R/W-affecting | Existing `GlobalConfigSchema`; retain legacy migration/defaults |
| Legacy global config CLI load | [shared/tools/config-cli.ts:116](shared/tools/config-cli.ts:116) | Same `processConfig` | R/W | Same canonical parser |
| Global/user TOML route loads | [server/routes/system.ts:64](server/routes/system.ts:64), `:75` | Z via `validateGlobalConfig` / `validateUserConfig` | R | Retain tolerant read contracts |
| Global/user config adapters | [server/services/config/adapters/GlobalConfigStorageAdapter.ts:29](server/services/config/adapters/GlobalConfigStorageAdapter.ts:29); [server/services/config/adapters/UserConfigStorageAdapter.ts:28](server/services/config/adapters/UserConfigStorageAdapter.ts:28) | Z; fallback defaults | R/W | Retain; do not reuse tolerant `.catch()` readers for mutation validation |
| MCP config TOML | [mcp-server/src/config/index.ts:95](mcp-server/src/config/index.ts:95), `:98` | Z via `safeValidateMcpServerConfig`; uses parsed output, fallback defaults | R/startup | Already wired; retain |
| Local project TOML load | [shared/services/project/ProjectConfigService.ts:82](shared/services/project/ProjectConfigService.ts:82), `:84`; [shared/services/project/ProjectConfigLoader.ts:33](shared/services/project/ProjectConfigLoader.ts:33), `:35` | Z predicate via [shared/models/Project.ts:86](shared/models/Project.ts:86); returns original input, discarding parsed transforms | R/W migration | Use compatible `ProjectConfigSchema` parsed output only after normalization parity tests |
| Local migration helper load | [shared/services/project/ProjectConfigService.ts:178](shared/services/project/ProjectConfigService.ts:178) | Same schema predicate, legacy migration | R/W | Same parser and legacy fixture coverage |
| Registry list load | [shared/services/project/ProjectRegistry.ts:65](shared/services/project/ProjectRegistry.ts:65), `:68`, `:182` | TOML → unknown; guard only proves `project.path` string yet claims full `RegistryData` | R/W-affecting | Compatible persisted registry schema derived from `ProjectRegistryEntrySchema`, with legacy metadata handling |
| Project update registry reload | [shared/services/project/ProjectConfigService.ts:224](shared/services/project/ProjectConfigService.ts:224) | C `RegistryData` | R/W | Same persisted registry parser |
| Project update local reloads | [shared/services/project/ProjectConfigService.ts:241](shared/services/project/ProjectConfigService.ts:241), `:266` | C `ProjectConfig` before merge/write | R/W | Compatible `ProjectConfigSchema`, preserve siblings/extensions |
| Registry write-reference / visible update reloads | [shared/services/project/ProjectConfigService.ts:283](shared/services/project/ProjectConfigService.ts:283), `:328` | C `RegistryData` before resolution/write | R/W | Same persisted registry parser |
| Document patch local reload | [shared/services/project/ProjectConfigService.ts:373](shared/services/project/ProjectConfigService.ts:373) | C nested local config; patch itself strictly validated at :363 | R/W | Compatible local-file schema + existing document patch validation |
| Project config adapter reload | [server/services/config/adapters/ProjectConfigStorageAdapter.ts:32](server/services/config/adapters/ProjectConfigStorageAdapter.ts:32) | C `LocalProjectConfig`; comments claim upstream validation but parsed file is not checked here | R/W | Tolerant/passthrough persisted schema; strict local entity schema would lose compatibility |
| Document/tree config repository | [server/repositories/ConfigRepository.ts:42](server/repositories/ConfigRepository.ts:42) | `as any`, manual field filtering/defaults/legacy tickets path/preview settings | R/policy | Persisted config parser preserving existing extraction/fallback semantics; keep filesystem policy outside schemas |
| Directory roots config reload | [server/controllers/ProjectController.ts:505](server/controllers/ProjectController.ts:505) | C nested discovery settings → allowed filesystem roots | R/policy | Existing global config reader instead of local cast; retain defaults |
| Sharing registry reload/write | [server/security/projectSharing.ts:173](server/security/projectSharing.ts:173), `:223` | C registry/full or partial then sharing logic | R/W | Compatible persisted registry schema; preserve missing-registry behavior |
| CLI display TOML | [cli/src/utils/cliConfig.ts:59](cli/src/utils/cliConfig.ts:59) | C records + manual boolean/default checks | R | CLI-local presentation config schema, same defaults; no business logic moves into CLI |
| `templates.json` | [shared/services/TemplateService.ts:39](shared/services/TemplateService.ts:39), `:43` | Root JSON unchecked, each entry Z-validated; invalid entry skipped, load exception falls back | R/create-affecting | New root `z.record(z.unknown())` shape plus existing per-entry `TemplateConfigSchema` checks, retaining per-entry skip/fallback policy rather than all-or-nothing loading |
| Template markdown | [shared/services/TemplateService.ts:52](shared/services/TemplateService.ts:52) | Text → template content | R/create-affecting | String input only; no need to schema-validate a normalized Template/Suggestion result |
| Markdown ticket full parse | [shared/services/MarkdownService.ts:71](shared/services/MarkdownService.ts:71), `:187`, `:111` | Hand-written scalar frontmatter parser → manual `normalizeTicket` ([shared/models/Ticket.ts:84](shared/models/Ticket.ts:84)), no Zod | R/W-affecting | New compatible persisted frontmatter boundary variant derived from existing fields; preserve H1 authority, dates, relationship forms, legacy defaults |
| Markdown metadata fast path | [shared/services/MarkdownService.ts:416](shared/services/MarkdownService.ts:416) | Same parser → metadata normalization | R | Same persisted frontmatter parser; do not require full ticket body |
| File watcher frontmatter | [server/services/fileWatcher/index.ts:186](server/services/fileWatcher/index.ts:186) | gray-matter data → unchecked selected fields → SSE | R/event | Same compatible frontmatter projection before broadcasting |
| Selector state JSON | [server/routes/system.ts:86](server/routes/system.ts:86) | `sanitizeSelectorState` with per-entry schema/default logic | R | Retain existing sanitization contract |
| Favorites/pins JSON | [server/services/DocumentFavStateService.ts:99](server/services/DocumentFavStateService.ts:99); [server/services/PinStateService.ts:46](server/services/PinStateService.ts:46) | Z via `parse*OrDefault`, reset to empty on invalid file | R | Retain fallback, distinct from strict mutation parsing |
| Trace store JSON | [server/services/TraceStoreService.ts:38](server/services/TraceStoreService.ts:38) | JSON syntax only; deliberately returns `unknown` | R | Keep unknown until actual trace consumer validates; reuse trace owner schema if typed consumption is introduced |
| Read-token store JSON | [server/security/readTokenStore.ts:91](server/security/readTokenStore.ts:91), `:92` | Manual persisted-store/token/invite guards; fail closed | R/W/session | Derive equivalent access/store schemas in later phase; retain fail-closed policy |

### Browser ingress (lower priority)

| Site | File:line | Current handling | Risk | Suggested schema/action |
|---|---|---|---|---|
| SSE JSON frames | [frontend/src/services/sseClient.ts:132](frontend/src/services/sseClient.ts:132), `:45` | JSON + shallow `{type:string,data:object}` guard; nested ticket data unchecked | R/event | Frontend/shared transport-local discriminated event schema; unknown future events ignored, malformed known payload dropped |
| Document URL path / `?file=` | [frontend/src/components/DocumentsView/DocumentsLayout.tsx:246](frontend/src/components/DocumentsView/DocumentsLayout.tsx:246) | `sanitizePath` before selection | R | Retain path sanitizer; scalar query shape, backend containment remains authoritative |
| Document link `file` extraction | [frontend/src/components/SmartLink/documentDelivery.ts:30](frontend/src/components/SmartLink/documentDelivery.ts:30); [frontend/src/components/SmartLink/index.tsx:121](frontend/src/components/SmartLink/index.tsx:121) | URL parsing, path routed to document delivery | R | Same document route input policy |
| Project route projectCode / view / epic | [frontend/src/components/routes/ProjectRouteHandler.tsx:47](frontend/src/components/routes/ProjectRouteHandler.tsx:47), `:145`, `:150`, `:256` | Router strings; view allowlist/default via [frontend/src/components/routes/viewModeDerivation.ts:21](frontend/src/components/routes/viewModeDerivation.ts:21); epic string used as focus key | R/navigation | Route-local view enum + compatible reference input; preserve fallback to board |
| Carried `?view=` | [frontend/src/components/routes/viewModeDerivation.ts:57](frontend/src/components/routes/viewModeDerivation.ts:57) | URLSearchParams + encoding, no value allowlist at this site | R/navigation | Reuse view derivation, not a new global navigation contract |
| Invite path/query code | [frontend/src/components/routes/InviteRouteHandler.tsx:10](frontend/src/components/routes/InviteRouteHandler.tsx:10), `:20` | String choice → session exchange | W/session request | Route-local opaque-code schema; backend still validates |
| Share route shareId/query code | [frontend/src/components/routes/ShareRouteHandler.tsx:10](frontend/src/components/routes/ShareRouteHandler.tsx:10), `:25` | Router string/query presence → share/invite flow | W/session request | Same route-local shape validation |
| Trace iframe postMessage | [frontend/src/components/TicketViewer/TraceGraphShell.tsx:35](frontend/src/components/TicketViewer/TraceGraphShell.tsx:35) | Origin check and type discriminator → close action | E/UI | Retain origin check; no event.source check exists here. Tiny local message schema only if payload expands |
| Browser storage JSON | [frontend/src/config/localStoragePreferences.ts:32](frontend/src/config/localStoragePreferences.ts:32), [frontend/src/config/settingsPreferences.ts:140](frontend/src/config/settingsPreferences.ts:140), [frontend/src/config/filterPreferences.ts:33](frontend/src/config/filterPreferences.ts:33), [frontend/src/config/sorting.ts:106](frontend/src/config/sorting.ts:106), [frontend/src/config/sidePaneSessions.ts:52](frontend/src/config/sidePaneSessions.ts:52); [frontend/src/components/SwimlaneBoard/index.tsx:32](frontend/src/components/SwimlaneBoard/index.tsx:32); [frontend/src/components/ProjectSelector/useSelectorData.ts:314](frontend/src/components/ProjectSelector/useSelectorData.ts:314) | Mixed manual guards/sanitizers/defaults; selector map has a record cast | R/UI | Keep browser presentation schemas local; migrate on demand, preserving existing defaults |
| HTTP API response JSON | [frontend/src/services/dataLayer.ts:87](frontend/src/services/dataLayer.ts:87), `:113`, `:143`, `:173`, `:200`, `:233`, `:253`, `:265`, `:286`, `:383`; [frontend/src/hooks/useProjectManager.ts:31](frontend/src/hooks/useProjectManager.ts:31), [frontend/src/hooks/useConfig.ts:17](frontend/src/hooks/useConfig.ts:17), [frontend/src/hooks/usePathResolution.ts:41](frontend/src/hooks/usePathResolution.ts:41), [frontend/src/hooks/useTicketOperations.ts:56](frontend/src/hooks/useTicketOperations.ts:56), `:89`; [frontend/src/components/routes/inviteExchange.ts:33](frontend/src/components/routes/inviteExchange.ts:33), [frontend/src/components/routes/ShareRouteHandler.tsx:57](frontend/src/components/routes/ShareRouteHandler.tsx:57) | Mostly typed promises/casts or normalization, not complete schema validation | R/UI | Later response DTO schemas, especially ISO-date wire forms; do not feed JSON directly into Date-valued entity schemas |

### Additional monorepo ingress found during the sweep

These sites prevent the report from implying that fixing Express/MCP completes every trust boundary. They are follow-on work, not a cloud/CLI rewrite prerequisite.

| Site | File:line | Handling | Risk | Suggested action |
|---|---|---|---|---|
| Cloud connection TOML | [shared/services/cloud-sync/project-state-store.ts:175](shared/services/cloud-sync/project-state-store.ts:175) | Manual version/state/origin/interval validation | R/W-affecting | Preserve equivalent parser, optionally schema-back later |
| Machine credential TOML | [shared/services/cloud-sync/credential-store.ts:203](shared/services/cloud-sync/credential-store.ts:203) | Manual version/kind/nonempty secret fields; fail closed | R/auth | Preserve fail-closed validation; no secrets in errors |
| Cloud operation journal JSON / lock | [shared/services/cloud-sync/operation-journal.ts:83](shared/services/cloud-sync/operation-journal.ts:83), `:212` | Pending operation cast; lock PID type checked | R/W recovery | New pending-operation persisted schema; retain recovery/locking policy |
| Pending projection JSON | [shared/services/cloud-sync/projection-sync.ts:285](shared/services/cloud-sync/projection-sync.ts:285) | Cast `PendingProjection` | R/W cloud publish | New persisted pending-projection schema before replay |
| Projection read-model JSON | [shared/services/cloud-sync/CloudProjectionReadModel.ts:98](shared/services/cloud-sync/CloudProjectionReadModel.ts:98) | Partial cast/defaults; entries not deeply checked | R | New persisted read-model schema, existing rebuild/fallback policy |
| Projection stream state JSON | [shared/services/cloud-sync/projection-stream-state-store.ts:160](shared/services/cloud-sync/projection-stream-state-store.ts:160), `:182` | Manual state sanitizer | R/recovery | Keep equivalent parser |
| Token payload inspection | [shared/services/cloud-sync/access-credential-broker.ts:43](shared/services/cloud-sync/access-credential-broker.ts:43); [shared/services/cloud-sync/projection-stream-state-store.ts:124](shared/services/cloud-sync/projection-stream-state-store.ts:124) | Decoded JSON used for identity/fingerprint metadata | R/auth metadata | Narrow payload shape; decoding must not become credential verification |
| Cloud coordinator responses | [shared/services/cloud-sync/CloudSyncCoordinator.ts:225](shared/services/cloud-sync/CloudSyncCoordinator.ts:225), `:253`; [shared/services/cloud-sync/management-coordinator.ts:232](shared/services/cloud-sync/management-coordinator.ts:232), `:252`; [shared/services/cloud-sync/CloudProjectionClient.ts:312](shared/services/cloud-sync/CloudProjectionClient.ts:312), `:339` | Error/envelope/data casts; generic T not runtime proof | R/W-affecting | Response schemas owned with cloud coordination contracts; validate before reservation/publication decisions |
| Projection authorization response | [shared/services/cloud-sync/CloudProjectionSessionClient.ts:123](shared/services/cloud-sync/CloudProjectionSessionClient.ts:123), `:205` | Partial cast + selected grant/expiry/protocol checks | R/auth | Equivalent response schema |
| Cloud WebSocket stream | [shared/services/cloud-sync/CloudProjectionStreamClient.ts:228](shared/services/cloud-sync/CloudProjectionStreamClient.ts:228); [domain-contracts/src/cloud-sync/projection-stream.ts:266](domain-contracts/src/cloud-sync/projection-stream.ts:266) | Existing explicit envelope parser, deep forbidden-field checks | R/event | Retain existing contract parser; not an unvalidated cast-only edge |
| Cloud Worker HTTP bodies / params / query | [cloud/src/cloudflare/worker.ts:126](cloud/src/cloudflare/worker.ts:126), `:168`, `:185`, `:212`, `:245`, `:306`, `:366`; `:232`, `:233`; [cloud/src/cloudflare/http/router.ts:164](cloud/src/cloudflare/http/router.ts:164) | JSON object/size guard + use-case field validators; route regex params; integer query parser | W/R | Preserve current cloud protocol/errors; schema conversion can be separate work |
| Cloud JWT/JWKS | [cloud/src/cloudflare/access/jwt.ts:220](cloud/src/cloudflare/access/jwt.ts:220), `:238` | JSON casts within JWT validator; signature/claims checks separate | R/auth | Narrow shape validation without replacing cryptographic verification |
| Durable Object client ack JSON | [cloud/src/cloudflare/durable/ProjectProjectionHub.ts:246](cloud/src/cloudflare/durable/ProjectProjectionHub.ts:246), `:251` | Existing `isProjectionStreamClientAck` guard | E/recovery | Keep current explicit validator |
| Server signed session/preview JSON | [server/security/apiSession.ts:113](server/security/apiSession.ts:113), [server/security/readSession.ts:213](server/security/readSession.ts:213), [server/security/documentPreviewToken.ts:183](server/security/documentPreviewToken.ts:183) | Partial payload casts inside signature/expiry/scope verification | R/auth | Equivalent local payload schemas later; retain authentication errors |
| CLI argv / document-path JSON | [cli/src/index.ts:64](cli/src/index.ts:64); [shared/tools/project-cli.ts:116](shared/tools/project-cli.ts:116) | Commander parsing; JSON then shared project logic | W/R | Canonical shared request schemas at command-to-service boundary; CLI keeps parsing/rendering only |

Environment-variable parsing, cookies/headers, filesystem path authorization, SDK protocol envelopes, and SQL row conversion are separate existing adapters. This design does not claim Zod coverage of those entire subsystems or exhaustively audit their authentication logic. The complete per-consumption inventory claim is for the requested Express body/params/query files and all MCP tools; ancillary families above are explicitly grouped.

## B. Chosen patterns and schema ownership

### Schema placement and compatibility rules

1. Domain input shapes live in the existing `ticket/input.ts`, `project/input.ts`, `app-config/input.ts` (new where needed), or access input modules. Infer paired types using `z.infer`/`z.output`; derive variants with pick/omit/partial/extend. Keep the current const-object/explicit-array enum convention.
2. Keep transport envelopes in their adapters: MCP `{project,key,type,data}`, Express path/query objects, devtools logs, JSON-RPC, SSE frames, and browser URL state. The MDT-101 scope explicitly excludes transport-only payloads from domain contracts ([docs/CRs/MDT-101-create-domain-contracts-package-with-zod-schemas-a.md:137](docs/CRs/MDT-101-create-domain-contracts-package-with-zod-schemas-a.md:137)). Canonical fields and semantic input variants are imported from domain-contracts.
3. Do not wire existing entity/input schemas unchanged. `CreateTicketInputSchema` currently requires priority, omits `component`/`slug`, inherits email-only assignee, title trim and a 200-character maximum ([domain-contracts/src/ticket/input.ts:76](domain-contracts/src/ticket/input.ts:76); [domain-contracts/src/ticket/frontmatter.ts:33](domain-contracts/src/ticket/frontmatter.ts:33)). MCP accepts plain assignee strings, missing priority, and treats long titles as warnings ([shared/services/TemplateService.ts:497](shared/services/TemplateService.ts:497), `:519`). Correct/derive compatible boundary variants before use. Update OpenAPI's schema mapping ([server/openapi/schemas.ts:439](server/openapi/schemas.ts:439), `:443`) to the REST variants.
4. Existing `CreateProjectInputSchema` requires `id`, `code`, and `ticketsPath`, and has no `path` ([domain-contracts/src/project/schema.ts:387](domain-contracts/src/project/schema.ts:387)). Actual manager input requires `name/path`, permits generated code/default ticketsPath, and accepts `globalOnly`, `createProjectPath`, `documentPaths`, `maxDepth` ([shared/tools/ProjectManager.ts:25](shared/tools/ProjectManager.ts:25)). Add the correct semantic registration input instead of forcing the wrong shape on the route.
5. PATCH schema must include status, priority, level, phaseEpic, assignee, and string/array relationships, matching actual forwarding ([server/services/TicketService.ts:368](server/services/TicketService.ts:368)). Keep level aliases `e/t` (`:387`); MCP attribute priority aliases remain service-normalized. `UpdateTicketInputSchema` alone cannot represent REST PATCH because it lacks status and has different date/attribute semantics. Do not silently enable currently ignored fields such as REST implementationNotes by broadening adapter forwarding.
6. Preserve optionality, no-op updates, unknown-field policy, null clearing/no-op conventions, normalization and defaults. Use `.strip()` for historically ignored extras; `.passthrough()` for file extensions or inputs whose unknown keys must reach an existing rejection rule. Do not blanket `.strict()` all objects. Explicitly model every known accepted field before stripping. Nonempty PATCH is evaluated with the existing semantics, including unknown-only bodies if they currently return a no-op success.
7. File read contracts are distinct from mutation contracts. Do not put `.catch(default)` on write input schemas. Persisted files may need optional legacy fields and passthrough keys; strict `LocalProjectConfigSchema`/`ProjectRegistryEntrySchema` cannot automatically replace tolerant readers. Returning parsed output also changes transforms compared with the existing predicate; characterize first.
8. Reject wrong runtime shapes before services; continue to let services enforce stateful invariants. Schema validation does not make status+attribute updates transactionally atomic against later business-rule failure. That existing transactional question is outside this shape-validation upgrade.

### Express: typed parse result, directly in the controller

Pick a small explicit helper over middleware. Middleware would require controller-wide `res.locals` typing or request augmentation, and the existing controllers catch their own errors. A throwing parser would currently risk turning Zod failures into generic 500s. A discriminated parse result both narrows data and returns a 400 before those catch blocks can remap it.

The same function handles body, params, and query; consumers only use its successful `data`. The `BoundarySchema<T>` alias below is a pure type exported by domain-contracts (`z.ZodType<T, z.ZodTypeDef, unknown>`). Thus server needs no direct runtime Zod import or new runtime dependency.

```typescript
// Proposed server/http/parseRequest.ts
import type { BoundarySchema } from '@mdt/domain-contracts'
import type { Response } from 'express'

export function parseRequest<T>(
  schema: BoundarySchema<T>,
  raw: unknown,
  res: Response,
  source: 'body' | 'params' | 'query',
) {
  const result = schema.safeParse(raw)
  if (!result.success) {
    res.status(400).json({
      error: 'Bad Request',
      code: 'VALIDATION_ERROR',
      message: 'Invalid request input',
      source,
      issues: result.error.issues.map(({ code, path, message }) => ({
        code, path, message,
      })),
    })
  }
  return result
}

// Proposed replacement inside ProjectController.createCR.
// RestCreateTicketInputSchema is a REST-local projection of the
// compatibility-corrected canonical create-input fields.
const params = parseRequest(ProjectRefParamsSchema, req.params, res, 'params')
if (!params.success) return
const body = parseRequest(RestCreateTicketInputSchema, req.body, res, 'body')
if (!body.success) return

// Existing availability checks / try-catch / success response remain.
const result = await this.ticketService.createCR(
  params.data.projectId,
  body.data,
)
res.status(201).json(result)
```

Keep auth/capability gates ahead of input handling where currently authoritative. Preserve established 403/404 policy outcomes and 401 credential rejections. Shape errors on authorized application requests become 400 with `issues`; schema checking is not a replacement for token verification. Add issues to existing config error responses while retaining `selector`/`field` metadata ([server/controllers/ConfigController.ts:131](server/controllers/ConfigController.ts:131)). Invalid JSON syntax remains a transport parser error; add consistent JSON error handling for that case rather than fabricating Zod issues.

### MCP: parse once in a typed tool registry, before resolution

Pick a registry wrapper rather than repeated parsing inside positional handler methods. Parsing only in `handleCreateCR(project,type,data)` is too late: the dispatcher already used unchecked project/key fields. The wrapper validates the **whole object**, then calls a typed callback. Existing positional classes can remain internal delegates; do not add a second schema pass to every method.

```typescript
// Proposed mcp-server/src/tools/defineTool.ts
import { z } from 'zod'
import { JsonRpcErrorCode, ToolError } from '../utils/toolError.js'

export function defineTool<S extends z.ZodTypeAny>(
  schema: S,
  run: (args: z.output<S>) => Promise<string>,
) {
  return {
    schema,
    invoke: async (raw: unknown): Promise<string> => {
      const result = schema.safeParse(raw)
      if (!result.success) {
        throw ToolError.protocol(
          'Invalid tool arguments',
          JsonRpcErrorCode.InvalidParams,
          {
            code: 'VALIDATION_ERROR',
            issues: result.error.issues.map(({ code, path, message }) => ({
              code, path, message,
            })),
          },
        )
      }
      return run(result.data)
    },
  }
}

// Proposed registry entry in MCPTools construction; envelope stays MCP-local.
const updateStatusArgs = z.object({
  project: ProjectReferenceInputSchema.optional(),
  key: TicketKeyInputSchema,
  status: CRStatusSchema,
})

const updateStatusTool = defineTool(updateStatusArgs, async (args) => {
  const project = await this.projectHandlers.resolveProject(
    args.project,
    this.detectedProject,
    args.key,
  )
  return this.crHandlers.handleUpdateCRStatus(project, args.key, args.status)
})

// Registry stores all ten entries; unrecognized names keep -32601.
// Dispatch calls registry[name].invoke(rawArgs), never casts args fields.
```

`TicketKeyInputSchema` accepts the existing string shorthand and lowercase forms; normalization remains in the shared key normalizer. `ProjectReferenceInputSchema` preserves the current MCP project-key acceptance/normalization rather than reusing a stricter persisted code regex.

Keep MCP's existing `zod` dependency: MCP-local envelope construction now makes it a real runtime import. Stdio returns JSON-RPC `-32602` with `error.data.issues` ([mcp-server/src/transports/stdio.ts:100](mcp-server/src/transports/stdio.ts:100)). Both HTTP call branches already preserve `ToolError.data` ([mcp-server/src/transports/http.ts:262](mcp-server/src/transports/http.ts:262), `:678`) and currently use HTTP 200 for JSON-RPC protocol errors (:266). Preserve that MCP convention; REST uses HTTP 400. Changing MCP protocol errors to HTTP 400 would be a separate transport behavior change.

Keep `allTools.ts` descriptions/advertised JSON schemas for now. No converter dependency is required. Add parity checks for registered tool names, required envelope keys, and enum values; runtime registry schemas are the validation authority. Full generated JSON-schema/OpenAPI unification can follow separately.

## C. Independently shippable phases

| Phase | Work | Acceptance criteria and narrow verification |
|---|---|---|
| 0 — Infrastructure and compatibility fixtures | Add helper/type exports, structured issue format, MCP wrapper, baseline CI guard. Record current accepted payloads and service-call arguments before wiring. | Helper tests prove scalar/array/null/undefined errors, nested issue paths, no raw values in error objects, and successful output inference. Baseline guard passes unchanged code but rejects seeded new bypasses. No endpoint behavior changes. |
| 1 — CR writes and MCP mutation trust boundary | Wire REST create/PATCH/PUT/delete params and all MCP mutation envelopes, including section modifications and project/key context. Correct canonical ticket input variants first. | Valid REST create without priority still defaults Medium; PUT remains partial; relationships accept string/array; accepted level/priority/key aliases remain; assignee plain strings and existing long-title behavior remain. Invalid nested fields/status/arrays/null/scalars give structured 400 or MCP -32602. Mixed `{status: valid, priority: {bad:true}}` makes zero mutation-service calls. Failed parse performs no project resolution or filesystem mutation in MCP. Verify stdio and both HTTP dispatch branches preserve issues. Contract tests + controller/Supertest + MCP dispatcher tests with service spies. |
| 2 — Project and config writes | Wire project create/update/enable/disable/sharing; configure-documents; config envelope + existing selector validator; validate reloads used by these write paths before mutation. | Generated project code/default paths still work; flags/document paths/maxDepth survive; boolean `active` is checked; sharing IDs remain server-generated. Existing selector exposure restrictions and field/selector error metadata survive. Invalid file reload or invalid input leaves destination files unchanged; siblings/extensions remain. Use temp-file integration tests, shared project/config suites, and targeted API tests. |
| 3 — Remaining mutation/session envelopes | Standardize pins/favorites/selector-state; preview issuance, token/create/invite/revoke/share envelopes; transient log batches. | Existing known-project/favorite-eligibility rules and fallback readers unchanged. Empty pin/favorite sets work. Credential failures stay 401; auth denials stay 403; shape failures carry structured 400. Bodyless invite requests still work. Malformed log entries never enter buffers. Test schema errors separately from permission/business errors. |
| 4 — Remaining persisted-file ingress | Compatible local/registry/global/MCP/template/frontmatter readers; watcher frontmatter; journal/pending-projection replay schemas. Existing validated readers may need only coverage/guard registration. | Modern and legacy configs, extension keys, minimal registry entries, H1 title precedence, date variants, relationship formats, metadata fast paths, per-template skip/fallback, and pins/favorites reset-on-bad-file all retain behavior. Parsed output is used where typing crosses the boundary. Corrupt journals cannot drive replay writes. No mass file migrations or startup rewrites. Loader tests with representative fixtures and temp files. |
| 5 — Read requests and browser ingress | All remaining Express params/query/search helpers; MCP read tools; SSE payloads and URL inputs. Optional later response/storage contracts remain adapter-local. | Every MCP advertised tool has one validator entry. Every non-baselined raw Express body/params/query read uses the helper. Query arrays/objects never reach scalar services. Existing pagination/default/clamp behavior, fuzzy filters, view defaults, and unknown-SSE-event behavior stay characterized. Read-boundary focused tests; one existing CRUD journey through the repo E2E wrapper confirms valid UI payload parity. |

Each phase builds domain-contracts before dependent packages, then runs focused tests and `bun run validate:ts`. Run the affected package builds and normal required lint/check gates before landing. No claim of full-suite, browser, or real-model readiness follows from this read-only report. Do not restart user servers; implementation tests should use isolated fixtures and the documented E2E wrapper.

Compatibility fixtures are a release gate, not permission to treat accidental arbitrary-object acceptance as valid business input. Preserve meaningful accepted input values/forms; reject structurally invalid values. Where a current intentional behavior is odd but supported (MCP null attribute no-op, empty/no-op project updates, fuzzy read filters, numeric parse/clamp semantics), encode it explicitly rather than tightening policy incidentally.

## D. Cheap regression prevention

Use one small TypeScript-AST convention checker, run with Bun and the already installed TypeScript package. Prefer it to a regex “contains safeParse” test: such a test passes when a parser result is ignored or a different field is validated.

1. Add proposed `scripts/check-boundary-validation.ts` and a checked-in legacy manifest. Scan production `server/**/*.ts`, MCP transport/dispatch/handler files, and registered file-ingress modules; exclude tests, fixtures, generated output and OpenWiki. Discover route callback/controller request bindings, including renamed parameters and aliases, not just the literal identifier `req`.
2. Restrict **every** request body/params/query source read to the direct raw argument of the canonically imported `parseRequest`. Handle property access, literal element access (`request['body']`), optional access, and destructuring. Reject raw-source aliases/destructuring/assignment or casts outside the helper; do not attempt general taint analysis. Approved request delegation to controllers/security helpers is enumerated by import/symbol, so passing a whole Request to a new arbitrary service is also flagged for review.
3. For phased migration, baseline exact source-site identities: relative file + enclosing function/route + normalized source expression + occurrence/count. Existing checks not yet converted are exceptions with reason and target phase. A new read, duplicate read, changed expression, new function, or new route cannot borrow a file-wide exemption. Fail on new exceptions and on unused stale exceptions; manifest expansion requires explicit review, never automatic regeneration in CI.
4. Require that MCP registry keys equal advertised `TOOL_NAMES`; entries are built through the real imported `defineTool`, not same-name local functions. Ban raw tool-argument member access/casts outside the wrapper/legacy exception sites. The dispatcher accepts `unknown`; registered callbacks receive inferred data only. Unknown tool names are rejected before lookup. Include both HTTP branches in the scan.
5. For TOML/JSON/frontmatter, maintain a finite decoder-site registry: loader, parser/schema, fallback policy and fixture test. New decoded-to-typed casts at file ingress fail the checker. Syntax-only/unknown-returning readers such as trace JSON are explicit cases, not forced through an entity parser. Migrate legacy entries as phase 4 lands; do not ban all JSON parsing in application code.
6. A few checker fixtures must prove failures for `req.body as T`, aliases, destructuring, bracket access, parsing followed by reuse of raw input, a new tool missing from the registry, and a new typed TOML/JSON cast. Prove passes for helper parsing and existing approved guards. This checks a constrained convention; it is not a proof of arbitrary dataflow safety or schema completeness. Behavioral tests prove schema meaning.
7. Add `check:boundaries` to the root `check` script alongside current TypeScript/lint/shared-import checks (`package.json`). The current `.github/workflows/` only contains OpenWiki refresh, so add a dedicated pull-request/push boundary job using the repo's Bun/lockfile conventions. Run `bun install --frozen-lockfile`, then `bun run check:boundaries` and the small checker-fixture suite. No servers, generated builds, or full E2E suite needed for this guard. Optionally invoke the same command from existing lefthook checks; hooks alone are insufficient CI enforcement.

No codemod is necessary. A later codemod may assist mechanical rewrites, but cannot establish correctness or replace the guard. Avoid new size/range limits as part of this convention check; add them only when the existing contract requires them.

## E. Dead export and dependency disposition

| Export/dependency | Evidence | Decision |
|---|---|---|
| `validateTicket` | [domain-contracts/src/ticket/validation.ts:12](domain-contracts/src/ticket/validation.ts:12); no production consumer | Delete wrapper and barrel export. Entity validation is not create-input validation; use schemas directly at actual boundaries. |
| `validateProjectConfig` in domain-contracts | [domain-contracts/src/project/validation.ts:32](domain-contracts/src/project/validation.ts:32); no production consumer of this wrapper | Delete wrapper. Preserve `ProjectConfigSchema`. Do not confuse it with live [shared/models/Project.ts:86](shared/models/Project.ts:86) same-name predicate; migrate that predicate separately when replacing raw-returning loaders. |
| `validateProject` / `safeValidateProject` | [domain-contracts/src/project/validation.ts:16](domain-contracts/src/project/validation.ts:16), `:24`; no production consumers of these exports | Delete wrappers; avoid forcing normalized runtime ProjectSchema onto file/input shapes. The MCP class method with the same name is unrelated and live. |
| `validateLocalProjectConfig` | [domain-contracts/src/project/validation.ts:36](domain-contracts/src/project/validation.ts:36); no production consumer | Delete wrapper; keep local config schema for its intended strict shape. |
| `validateCRFrontmatter` | No current symbol found in domain-contracts/shared/server/MCP source | No deletion available. Wire a compatible frontmatter schema/parser, not an assumed export. Keep existing `TicketFrontmatterSchema` / `CRSchema` compatibility surface in scope only if consumer checks justify it. |
| `validateTemplateConfig`, `safeValidateTemplateConfig` | [domain-contracts/src/template/validation.ts:17](domain-contracts/src/template/validation.ts:17), `:25`; only re-export shims/tests | Delete wrappers; retain existing live `TemplateConfigSchema.safeParse` usage at [shared/services/TemplateService.ts:43](shared/services/TemplateService.ts:43). Add root shape checking without breaking per-entry recovery. |
| `validateTemplate`, `validateValidationResult`, `validateSuggestion` | [domain-contracts/src/template/validation.ts:33](domain-contracts/src/template/validation.ts:33), `:41`, `:49`; no production consumers | Delete wrappers and re-exports from [shared/models/Types.ts:69](shared/models/Types.ts:69) onward; keep schema/types. These are generated internal results, not an identified external input edge. |
| `safeValidateMcpServerConfig` | Production import at [mcp-server/src/config/index.ts:5](mcp-server/src/config/index.ts:5), call :98 | Already wired: retain and cover. |
| Global/user/selector/pin/favorite validators | Live callers recorded above | Retain; standardize adapter error shape, not indiscriminate wrapper removal. |
| MCP `zod` dependency | Declared in `mcp-server/package.json`; no current source import of zod | Retain and use for MCP-local envelope schemas/registry. If that pattern were abandoned, delete the unused dep instead. No additional validation library. |
| `ConfigRepository` | Live DocumentService/TreeService construction | Retain and validate ingress. Correct any owner-document deletion claim when implementation evidence is reconciled; consolidation is separate work. |

Remove wrapper-only tests and update public barrels in the same cleanup commit, retain meaningful schema tests, and rebuild all consumers. Check package exports and any release compatibility obligations before deleting public API names; no evidence of external consumers is asserted here. Cleanup can ship with phase 0 or its owning schema phase; do not create runtime callers solely to justify dead wrappers.

## Investigation verification

Evidence came from current owner instructions (`docs/PRE_IMPLEMENT.md`, `docs/SKILLS.md`, `domain-contracts/AGENTS.md`), MDT-101/MDT-099 documents, route/controller enumeration, handler/transport tracing, schema/import searches, file decoder searches, and the installed MCP SDK request-handler implementation. No tests or builds were run because this task changes no implementation. Existing unrelated dirty files were preserved. The report is stored in thread storage rather than the repository.
