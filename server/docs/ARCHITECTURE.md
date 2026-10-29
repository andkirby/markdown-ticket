# Architecture: Server

The local Express backend is a capability-based modular monolith. Reusable ticket,
project and search operations live in `shared/`; HTTP admission, response mapping
and process lifecycle live in `server/`.

## Composition and lifecycle

`server/server.ts` is the executable: it loads environment files, configures logging
and API documentation, owns the HTTP listener/sockets and installs process signal
handlers. `createApplication()` in `server/app.ts` constructs the common production
and test HTTP graph without listening or starting background work.

`server/bootstrap/createRuntime.ts` constructs services and owns explicit
`start()` / `stop()` handles. Start registers lazy watcher metadata and the registry
watcher, refreshes identity observation, starts the SSE heartbeat and activates
eligible cloud streams only under the existing rollout flag. Stop is idempotent,
detaches owned callbacks, cancels registration retry waits, ends active SSE
responses and stops scheduling new work immediately. It drains active identity
observations, stream activation/persistence, interval-owned journal flushes,
watcher provisioning/discovery, document refresh and already-started watcher
closure. Concurrent startup cannot acquire resources after disposal. A failed start disposes
partially initialized resources. A stopped handle is terminal; construct a new one
to start another runtime.

The test factory is a small launcher over this builder. Its cache setting and
optional pre-auth control router are explicit test inputs. The isolated E2E launcher
awaits runtime start and disposal and owns its listener sockets. API documentation
is an injected router because its OpenAPI generator uses the executable's ESM
location; tests can construct the application without that presentation adapter.

## Capability owners

| Public entrypoint | HTTP responsibility | Application/data owner |
| --- | --- | --- |
| `server/modules/projects/index.ts` | Project discovery/configuration, registration and sharing adapters | Shared ProjectService/ProjectManager and project config owner |
| `server/modules/tickets/index.ts` | Ticket CRUD, unified reads, subdocuments, trace reads, pins, identity, local cloud status and explicit recovery routes | Shared TicketService facade, query/mutation collaborators and existing identity/recovery services |
| `server/modules/search/index.ts` | Unified search and legacy project search request/response handling | Shared SearchService |
| `server/modules/documents/index.ts` | Document discovery/content, favorites, path configuration and preview | Retained DocumentService/TreeService/configuration operations |
| `server/modules/config/index.ts` | Configuration selector requests and per-request context | ConfigApplicationService; shared ProjectConfigService owns project files; global/user adapters remain separate |
| `server/modules/access/index.ts` | Sessions, share exchange and read-token management | Existing `server/security/` policy and stores |
| `server/modules/realtime/index.ts` | SSE admission and streaming | Existing fileWatcher lifecycle and broadcaster |
| `server/modules/system/index.ts` | Local status, filesystem/config/selector operations and devtools | SystemService and retained scoped services |

`server/modules/system/docs.ts` is the separate executable documentation adapter.
Internal callers import the capability entrypoints directly. The former
`server/controllers/` and `server/routes/` compatibility files and mixed
ProjectController/SearchController constructors have been retired. Each fixture
uses the actual operation's controller; controllers do not locate other
controllers.

The common graph injects SharedProjectService directly as the project catalog.
There is no forwarding ProjectServiceAdapter or nested discovery accessor.
Sharing cache effects and pin/favorite construction use that same catalog
instance. Shared/server TicketService facades, discovery's published config
loader, selector storage adapters and the watcher facade retain their distinct
application, public API and lifecycle responsibilities.

## Request flow

```text
HTTP → common app middleware → API auth → capability router/controller
     → shared application operation or retained server capability → data adapter
```

For example, a ticket patch is parsed at the ticket HTTP edge, projected to the
supported fields by the server facade, and submitted as one shared mutation.
The shared mutation validates all requested fields and both existing-epic and
candidate constraints before one local write and subsequent projection attempt.
Ignored-only patches retain their no-op behavior. Validation rejection changes
neither bytes nor publication attempts; post-write cloud delivery keeps its
existing journal/recovery semantics. There is no cross-store transaction or new
external-editor/process locking guarantee.

`server/http/projectAccess.ts` resolves project visibility from a catalog and the
existing access policy. Document routes receive this operation directly. Search
receives shared operations directly; ticket ranking/deduplication and project
scoring are not implemented by HTTP controllers.

## API authentication boundary

`server/security/apiAuth.ts` owns API auth configuration, credential extraction,
route exemptions and token comparison. The common app mounts browser auth/share
exchange routes before the protected `/api` gate, then mounts capability routers.
New protected endpoints belong after this gate. Existing local-host bypass policy
is unchanged and remains part of RuntimeConfig.

Public API exemptions are `GET /api/status`, `GET /api/health`, and GET-only
`/api/documents/raw-preview/*`. Preview handlers enforce their own HMAC token; the
raw-preview prefix does not inherit anonymous document-read grants. Protected
credentials remain Bearer and X-API-Key. Vite frontend-log middleware is a separate
boundary. Existing access/error envelopes are retained.

## Dependency enforcement

`bun run check:modules` resolves local/workspace imports and checks package
direction, public capability entrypoints, controller dependencies, pure-policy I/O,
project-writer ownership and runtime cycles. Type-only imports obey ownership
rules but do not create runtime cycles. The compatibility exception manifest
`scripts/module-boundary-exceptions.json` is empty; stale exceptions fail.
`bun run test:modules` exercises rejecting and permitted fixtures. The existing
`check:boundaries` request/decoder convention check remains a separate gate.

## HTML Document Preview (MDT-221)

Sandboxed HTML documents (`.html`/`.htm`) are previewed in an opaque-origin
iframe. Because the iframe cannot send the `SameSite=Strict` owner session
cookie on subresource requests, the preview is credentialled by a short-lived
(≤300s), directory-scoped HMAC **preview token** instead.

- **Mint** (`POST /api/documents/preview-token`): owner-only. Rejects read-token
  and shared sessions. Mints a token scoped to the directory of the selected
  HTML file so relative subresources resolve under the same scope.
- **Serve** (`GET /api/documents/raw-preview/:token/*`): the token lives in the
  PATH (not a query param) so relative assets inherit it. The handler runs the
  full gate chain — HMAC signature → expiry → project lookup → token docDir
  scope → configured document-paths containment → project-root containment →
  MIME lookup → headers — then streams bytes (`createReadStream`, binary-safe).
- **Headers**: the global `securityHeaders` middleware sets
  `X-Frame-Options: DENY` on every response; the raw-preview handler overrides
  to `SAMEORIGIN` so the iframe can load (DENY blocks same-origin framing too).
  The canonical pinned CSP is `sandbox allow-scripts; default-src 'none';
  connect-src 'none'` (full strict string asserted as `PINNED_CSP_STRICT` in
  `server/tests/api/document-raw.test.ts`). `allow-same-origin` is forbidden in
  both the CSP sandbox directive and the iframe sandbox attribute. The CSP is
  strict by default; a project opts in to external domains and `unsafe-eval`
  via `[project.document.preview]` config (`allowedExternalDomains`,
  `allowUnsafeEval`). The non-negotiable directives (`connect-src 'none'`,
  `img-src 'self' data:`, `default-src 'none'`) hold in every configuration.
  See `docs/CRs/MDT-221/security-tradeoffs.md` for the full rationale.

See `docs/CRs/MDT-221/architecture.md` for the gate-order rationale and the
two-path (mint vs serve) security model.

Cloud-bound ticket creation and projection publishing stay in the shared
`TicketService`; the server is a thin HTTP adapter. Cloudflare credentials
remain server-side.

The source frontend consumes `/api/projects/:id/tickets/unified` and ordinary
`/api/events` changes; it does not poll the legacy projection feed. MDT-226's
backend stream/read model is implemented behind the documented rollout gate,
with deployed acceptance still separate.

`createCloudCreationRecoveryRouter` validates pure domain requests and forwards
through the server facade to shared recovery policy. Inspection is read-only;
resume and verified terminal archival require explicit owner requests.
Public/read sessions cannot use these routes, including HEAD/OPTIONS.
Watcher/startup identity observation uses non-interactive read-only claim checks
and a bounded cache; diagnostic GET reads that cache only. It never resumes
creation or repairs a manual file. See the canonical
[cloud recovery contract](../../docs/architecture/cloud-sync/data-and-consistency.md#explicit-local-creation-recovery)
and [operator procedure](../../docs/architecture/cloud-sync/operations.md#explicit-retained-creation-recovery-mdt-200).
