# Architecture: MDT-252

## Overview

Use an optional stored-reference value plus a derived reference view, extending existing ticket/configuration/search boundaries. The local Markdown ticket remains authoritative; a pure shared resolver turns explicit instance-scoped refs and project configuration into safe external destinations and display labels. This is an additive adapter design with a bounded redesign of local-key-only search routing.

## Live owner fit and structure

Existing owners are domain-contracts ticket entity/frontmatter/input/view/search schemas; shared MarkdownService and TicketService; ProjectConfigLoader and its raw-preserving ProjectConfigReadFile contract; server TicketService/SearchController; thin CLI/MCP adapters; TicketAttributeTags, CompactTicketHeader and QuickSearchResults. Concrete existing/proposed file paths are in the canonical architecture trace. New runtime owners:

- `domain-contracts/src/ticket/external-reference.ts`: provider/config/reference-view schemas only; no filesystem or UI-default logic.
- `shared/services/externalReferences.ts`: pure identity parsing, per-entry configuration validation, safe resolution and configured display labels.
- `shared/services/ticket/referenceFrontmatter.ts`: YAML refs extraction/replacement and serialization, preserving neighboring frontmatter/content.
- `shared/services/ticket/referenceMutations.ts`: operand-only add/replace normalization, exact-only removal and ordered/idempotent list changes.
- `shared/services/ticket/referenceSearch.ts`: one shared external-ref matching/score/provenance policy consumed by frontend filtering and server searches.
- `frontend/src/components/Badge/ExternalReferenceBadges.tsx` and TrackerIcon: reusable native links/details; no local-key normalization or tracker business rules.

## Canonical runtime flows

### Create/write/read

CLI/MCP/HTTP input -> canonical input schema -> shared TicketService -> explicit refs operand normalization against the current project's tracker configuration -> reference-frontmatter writer -> real Markdown file. Unrelated writes retain refs bytes. Reads parse refs through the refs-specific YAML boundary -> normalizeTicket/metadata -> shared TicketService attaches derived `externalRefs` from configuration -> server/browser/MCP consumers. Derived destinations are never persisted into frontmatter.

The current Markdown parser reads scalar lines and cannot parse array refs. Reuse installed `yaml` 2.9.1 as a direct shared dependency for the refs field only, with bounded YAML alias handling; retain legacy handling of other fields. Read both block and inline arrays and emit JSON-quoted YAML arrays. Exact raw unsupported strings, Unicode, commas, colons and order must survive unrelated edits. Do not replace the entire legacy frontmatter parser in this ticket.

### Configuration and unavailable state

ProjectConfigLoader keeps the existing raw-preserving file read contract. Optional root tracker tables are retained as opaque per-entry values in file schemas; each entry is separately checked by TrackerConfigSchema in the shared resolver. A bad optional entry cannot invalidate the whole project, and unrelated config edits preserve raw entries. Settings remain fileOnly; update the canonical exposure inventory consumed by inspect:config.

Resolution parses the explicit instance and full identifier first, validates that instance only, substitutes supported encoded placeholders, then validates the final URL scheme/credentials/origin. Context paths are retained by joining beneath the configured base path, not by absolute-path URL resolution. Unsupported provider/identifier, absent instance/default context, unsafe template and invalid URL return an explicit unavailable reason and no href. Stored shorthand is unavailable on reads even if defaultRepo is later added; only an explicit replacement/add operand can become a canonical stored identity.

### Presentation

TicketCard -> TicketAttributeTags -> existing wrapping badge flow (A), with refs after relationships and before worktree. The shared component uses `.badge` data-attribute chrome, neutral surface and link-text tokens, vendor glyph, configured display label and new-tab arrow. Details always remain available, including <=2 refs and unavailable-only refs; reuse Radix Popover with bounded width/height and real focusable targets. Preserve current swimlane Show badges gate and add a preserving one-time per-badge preference migration.

CompactTicketHeader shows the complete reference set independently of board preferences. Existing mutation interfaces supply editing; this ticket does not introduce a new card mutation form. Search results likewise always show refs independently of board preferences. Search result containers must allow links/buttons as siblings of their local-selection affordance, never nested inside a native button. Keyboard routing ignores nested external controls instead of selecting the local result.

### Search redesign

Keep local key normalization solely in the local-key lookup. Shared reference matching scores full/raw identifier, bare external identifier and numeric queries without changing stored data. Bare numbers include local/Jira/git issue numbers; #number matches a complete repository issue number, including unconfigured repository-shaped refs, and excludes local/Jira-only identities and different complete numbers. Board filtering and current-project Quick Search use the same ref match predicate. Key-shaped cross-project lookup also searches refs across eligible projects, includes both local/external provenance, deduplicates local project+ticket identity and ranks exact matches above partials. Project-scoped and unified HTTP search reuse that policy; current-project results retain their own section without duplicating a ticket. No fuzzy auto-opening is introduced.

## Program Design

Signature-only contracts (canonical shape details in domain-contracts):

```typescript
resolveExternalReferences(refs: readonly string[], trackers: unknown): ExternalReference[]
mutateReferences(current: readonly string[], operation: AttrOperation, trackers: unknown): string[]
readReferenceFrontmatter(yaml: string): string[] | undefined
writeReferenceFrontmatter(markdown: string, refs: readonly string[]): string
referenceMatchScore(refs: readonly string[] | undefined, query: string): number
ticketSearchProvenance(ticket: SearchableTicket, query: string): Array<'local-key' | 'external-ref' | 'text'>
```

`Ticket.refs` stores optional raw string arrays. `Ticket.externalRefs` is an optional derived array with raw ref, explicit instance, provider when known, full key, display key, optional safe URL and unavailable reason. Extend browser unified-ticket and search contracts so adapters do not strip these fields. Project tracker config stays raw-preserving at the file boundary and typed per entry at interpretation. No new network protocol, cloud projection field, polling, tracker API or server restart is needed.

Least-confident seams and invalidation evidence: (1) scalar legacy frontmatter plus block refs: real round-trip tests must prove no neighboring fields/content change; (2) existing search rows are native buttons: real keyboard/popover tests must prove no nested interactive elements or parent navigation; (3) project config storage adapters: an unrelated configuration update must retain invalid/unknown tracker tables. If source evidence invalidates one, revise this owner artifact and downstream task scope rather than inventing another owner during implementation.

## Invariants and boundaries

- C1/C2/C11: local keys and raw external identity remain independent; configured labels never drive URL identity.
- C3/C4/C5: only supported encoded HTTP(S), credential-free, configured-origin issue URLs; preserve base paths and GitLab subgroups; no merge-request inference.
- C6/C13: normalize only new add/replacement operands; remove only exact stored strings, including raw/expanded coexistence.
- C7/C10/C14: absent/invalid optional trackers never hide projects or erase unknown data. No-config tickets keep their existing behavior.
- C8/C9: native link semantics, real focus, text/target floors, touch-accessible full details, and preserving preference migration.
- C12: no external tracker API requests; browser navigation occurs only on explicit link activation.
- CLI remains input/output only. Domain contracts remain pure. Runtime resolver/search/mutation logic has one shared owner each. Tests use real files/config/API/browser behavior; fixtures are not runtime code.

## Extension and rollback

Add future providers only through an explicit schema/parser/resolver branch with round-trip and destination tests; unknown refs already survive. Owner/full-namespace badge modes remain deferred. Existing seeded numbering never infers refs. Rollback removes optional UI/resolution/search consumers while retaining refs in Markdown and tracker tables in TOML; no destructive migration is required.

## Approval and verification

The user authorized autonomous implementation and selected A with configured shortening and numeric/search-badge requirements. These choices retain the existing ownership architecture and additive local interfaces; no additional product or deployment approval is needed. Codex passed requirements semantics and the final UI concept; final implementation review remains mandatory. Baseline `bun run build:all` passed. Initial real HTTP acceptance is RED because refs are missing from reads, not because infrastructure cannot start. Test/verification tasks must finish the complete negative, transport and browser coverage before readiness is claimed.

## REST boundary reconciliation

The existing server/http/ticketSchemas.ts explicit create pick is a required adapter boundary: add refs to that pick while preserving all other accepted REST fields. ProjectController already forwards the parsed object, so it needs no parallel mutation logic. This is an inventory correction to the documented create flow, not a new interface or owner.

Contract verification also includes domain-contracts/src/__tests__/contract-types.test.ts: independently authored exact create/config type snapshots must add the new optional fields without weakening equality assertions.

CLI structured get/list projection in cli/src/output/structured.ts explicitly forwards raw refs; MCP get metadata and attributes also retain refs. These are presentation boundaries, with no duplicate identity logic.

Review reconciliation: search uses ordinary lists in a labelled results region. Each ticket row has a native primary selection button with sibling external controls; project/document rows retain native buttons. Key-shaped results retain server ranking across all projects (including current), project-scope ranks before limits, and matchedBy supplies visible identity provenance. scripts/inspect-config.ts inventories file-only tracker settings; it exposes no new write API.

The existing tests/e2e/quick-search/modal.spec.ts assertions migrate from obsolete listbox aria-selected/current-only containers to native primary controls and the unified ranked identity result set. This retains navigation and deduplication coverage. Shared ticketSearchScore distinguishes exact local identity from local-number substrings so exact external matches outrank partial local keys.

Required-check reconciliation: validate:ts exposes pre-existing missing metadata/ticket/diagnostics in two server test fixtures and ignored scripts/_probe files entering tracked-tooling tsc. Repair only the fixture shapes (all assertions retained) and exclude scripts/_*/** from root tsc in accordance with scripts/AGENTS.md local-scratch policy. Do not modify the ignored scratch files or runtime behavior. These three concrete paths belong to TASK-3 so the originally required type gate can run green.

The same required-check repair includes mcp-server/src/tools/handlers/__tests__/create-diagnostics.test.ts: provide the already-required type on its existing create operand, preserving every diagnostic assertion. The server project fixture supplies all existing ProjectRuntimeFields, not a cast.

Keyboard focus is owned by QuickSearchModal and its ModalBody ref (shared Modal ignores its forwarded ref). A modal-scoped F6 handler queries only this search instance for the selected row primary control; Shift+F6 returns to its input. Empty results retain input focus. QuickSearchInput describes the visible hint. Native result controls retain ordinary Tab traversal; input-only Tab scope cycling remains. No app-global key listener or shared-modal change is needed.

Final boundary review corrections: affected-ticket metadata SSE must be followed by canonical dataLayer.fetchTicket so absent/add/replace/clear updates raw refs and derived URLs without reload. useProjectManager owns this refetch and project-switch guard; the watcher gains no URL policy. MCP attributes/metadata JSON must serialize structured refs unchanged even when MCP_SECURITY_SANITIZATION=true, retaining existing per-field sanitization. Handler-level enabled/disabled JSON round-trips and a browser live-write journey prove these boundaries.

The same live-update correction invalidates the existing five-minute cross-project response cache on local ticket create/update/delete events and refreshes an active query. Request versions/cache epochs prevent pre-invalidation responses from repopulating stale URLs. New input cancels its prior debounce; cancel clears the active request. Existing TTL, scope and retry behavior remain; no polling or external tracker calls are added.

Delayed-response guards extend to both boundaries: dataLayer.searchProjects accepts a local caller generation in its dedupe key (not the HTTP payload). The hook supplies a useId namespace plus cache epoch, so invalidated requests cannot reuse old in-flight HTTP promises, while equivalent same-generation requests still dedupe. useProjectManager compares a selection-generation ref, incremented on committed project identity transitions, alongside per-ticket versions to reject A→B→A stale completions. Browser tests hold actual HTTP response bodies to verify both races.

Popover focus is applied synchronously in the Radix onOpenAutoFocus lifecycle, where content is mounted. Deferring it to requestAnimationFrame could steal focus back after rapid Escape/Shift+F6. Physical keyboard repeat coverage verifies the correction without adding sleeps or weakening focus assertions.
