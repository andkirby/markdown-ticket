# UAT Refinement Brief — MDT-221 (Round 2)

## Objective

Close the ticket-view integration gap for HTML previews. MDT-221 shipped
sandboxed HTML preview in **Documents View** only; ticket directories that
contain HTML (e.g. `GPDE-012/diagrams/*.html`) show **nothing** in the ticket
view because `SubdocumentService` drops non-`.md` children and folders whose
children are all non-`.md`.

Trigger: `http://localhost:3075/prj/GPDE/ticket/GPDE-012` has a `diagrams/`
subfolder with `.html` files; nothing is shown.

## Approved Changes

1. **BR-1.14 added** — `.html`/`.htm` files inside a ticket directory (top
   level or subfolders) are discovered as ticket subdocuments and appear in
   the ticket view document tabs; non-document assets stay invisible (parity
   with BR-1.3); asset-only folders are not listed.
2. **BR-1.15 added** — selecting an HTML subdocument renders the sandboxed
   iframe preview through the same owner-minted preview token +
   `/api/documents/raw-preview` route as Documents View; the markdown renderer
   is not called and no subdocument text fetch is issued; `.html` deep links
   round-trip.
3. **C-2.25 added** — raw-preview serving accepts paths inside the project's
   tickets tree in addition to configured document paths (gate G7 extension);
   all other gates unchanged; minting stays owner-only and HTML-only.
4. **C-2.26 added** — subdocument name resolution maps `.html`/`.htm`-suffixed
   names to their real files (no `.md` suffix appended), under the existing
   traversal/containment/whitelist checks.
5. **C-2.1 refined in place** — the 403 rule now reads "outside configured
   document paths **and** outside the project's tickets tree".
6. **Defect folded in (BR-1.9 wiring)** — document watchers watch
   `**/*.{md,html,htm}` instead of `**/*.md`; the MDT-221 handler accepted
   `.html` events but the chokidar pattern never fired them, so the shipped
   "external HTML edit refreshes preview" criterion was inert.

## Changed Requirement IDs

| ID | Action | Why |
|---|---|---|
| BR-1.14 | additive | New capability: HTML subdocuments in ticket view tabs |
| BR-1.15 | additive | New capability: sandboxed preview + deep links in ticket view |
| C-2.25 | additive | New serving scope rule (tickets tree) + mint HTML-only guard |
| C-2.26 | additive | New resolution rule for HTML subdocument names |
| C-2.1 | refine_in_place | 403 scope now excludes the tickets tree |

## Affected Downstream Trace

- **requirements**: C-2.1 refined; BR-1.14, BR-1.15, C-2.25, C-2.26 added
- **bdd**: `ticket_html_subdocs_in_tabs`, `ticket_html_renders_sandboxed_preview`,
  `ticket_html_deep_link_round_trips` added
- **architecture**: ART-20..ART-24 added; OBL-21..OBL-24 added
- **tests**: 6 new plans (discovery, resolve, tickets-tree scope, mint
  html-only, viewer routing, path validation)
- **tasks**: TASK-16..TASK-18 (execution slices below)

## Execution Slices

### Slice 1 — Backend discovery + resolution (TASK-16)

- **Objective**: make HTML files in ticket directories exist as subdocuments.
- **Direct artifacts/files**:
  - `domain-contracts/src/ticket/subdocument.ts` — add optional
    `docKind?: 'markdown' | 'html'` to `SubDocument` (+ zod schema).
  - `shared/services/ticket/SubdocumentService.ts` — accept `.html`/`.htm` in
    `buildEntryFromPath` and `discoverFolderChildren` (extension-less `name`,
    extension-kept `filePath`, `docKind: 'html'`); keep the namespace
    machinery markdown-only; add the `.html`/`.htm` branch to `resolvePath`
    (exact file match, no `.md` appending).
  - `server/services/fileWatcher/PathWatcherService.ts` — document watcher
    pattern `**/*.md` → `**/*.{md,html,htm}` (document watchers only; ticket
    watchers stay markdown-only this round).
- **Direct GREEN targets**: TEST-subdoc-html-discovery, TEST-subdoc-html-resolve.
- **Impacted canonical task IDs**: TASK-16.

### Slice 2 — Raw-preview tickets-tree scope (TASK-17)

- **Objective**: let the token-scoped raw route serve ticket-tree HTML even
  when the tickets path is not under a configured document path.
- **Direct artifacts/files**:
  - `server/services/DocumentService.ts` — gate G7 admits
    `ticketsPath`-prefixed paths (empty ticketsPath admits nothing).
  - `server/controllers/DocumentController.ts` — `mintPreviewToken` rejects
    non-`.html`/`.htm` `filePath` targets (400).
- **Direct GREEN targets**: TEST-raw-preview-tickets-tree, TEST-mint-html-only.
- **Impacted canonical task IDs**: TASK-17.

### Slice 3 — Frontend ticket-view integration (TASK-18)

- **Objective**: render the sandboxed preview inside the ticket modal.
- **Direct artifacts/files**:
  - `frontend/src/utils/subdocPathValidation.ts` — `validateSubDocPath`
    accepts `.md`/`.html`/`.htm`; `apiPathToUrlPath` does not append `.md` to
    extension-carrying paths.
  - `frontend/src/components/TicketViewer/useTicketDocumentNavigation.ts` —
    `collectPaths` also admits the extension-full form
    (`diagrams/foo.html`) for `docKind: 'html'` entries.
  - `frontend/src/components/TicketViewer/index.tsx` — resolve the selected
    subdocument; for `docKind === 'html'` render `HtmlSandboxViewer` with
    `projectId` and `${ticketsPath}/${subdocument.filePath}`, skip the
    markdown content fetch, keep the tabs/loading states.
- **Direct GREEN targets**: TEST-ticketviewer-html-routing,
  TEST-subdocpath-html-validation.
- **Impacted canonical task IDs**: TASK-18.

## Security Posture (what does NOT change)

- iframe `sandbox="allow-scripts"` hardcoded, never `allow-same-origin`.
- Token in the iframe src path prefix; TTL ≤ 300s; docDir-scoped; HMAC.
- `connect-src 'none'`, `img-src 'self' data:`, `default-src 'none'` hold in
  every configuration.
- Mint endpoint stays behind owner-authenticated `/api` middleware;
  read-token/shared sessions still cannot mint.
- Ticket-tree raw serving adds **no new read scope**: ticket bytes were
  already readable as text through the CR subdocument API by any
  project-visible user; the executable-preview risk is what the
  token/CSP/sandbox chain governs, and that chain is unchanged.

## Validation

- `spec-trace validate MDT-221 --stage all` — PASS (all 5 stages, r2).
- `bun run --cwd server jest -- subdocuments document-raw SubdocumentService`
- `bun test frontend/src/utils/subdocPathValidation.test.ts` +
  `TicketViewer` unit tests
- `bun run validate:ts`, `bun run lint`
- Live: GPDE-012 ticket view shows `diagrams/` tabs and renders
  `coverage-dataflow.html` in the sandboxed iframe.

## Watchlist

- **Ticket-view HTML SSE refresh** — ticket watchers (`**/*.md`) do not emit
  `ticket:subdocument:changed` for HTML; previews refresh on reopen/tab
  switch only. Deferred (would widen ticket-watcher noise).
- **Basename collisions** — `foo.md` + `foo.html` in one folder produce two
  subdocuments with the same extension-less `name`; markdown wins tab
  dedupe. Rare; documented behavior.

## Open Decisions

None — all r1 open decisions were settled by TASK-14 (config schema,
hostname-only allowlist, `.mdt-config.toml` persistence).
