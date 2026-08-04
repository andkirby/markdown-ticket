---
code: MDT-221
status: In Progress
dateCreated: 2026-08-02T14:26:12.184Z
type: Feature Enhancement
priority: High
relatedTickets: MDT-156,MDT-160,MDT-199
---

# Preview HTML documents safely

## 1. Description

### Requirements Scope

`full`

### Problem

- `server/builders/TreeBuilder.ts` discovers only `**/*.md`, so `.html` documents in configured document paths are invisible.
- `server/services/DocumentService.ts#getDocumentContent` rejects non-`.md` paths and returns UTF-8 strings only, so executable HTML and sibling assets cannot be served.
- `src/components/DocumentsView/MarkdownViewer.tsx` always fetches text from `/api/documents/content` and renders through the markdown pipeline.
- Same-origin executable HTML would be able to issue credentialed `/api/*` requests if rendered directly in the React tree.
- Multi-file HTML depends on relative `href`, `src`, `img`, and `fetch` URLs resolving against a stable document root.

### Affected Artifacts

- `server/builders/TreeBuilder.ts` — document discovery extension handling (glob-based path).
- `server/strategies/PathSelectionStrategy.ts` — document discovery extension handling (directory-walk path used by the path-selection UI; same `.html`/`.htm` change as TreeBuilder, otherwise the PathSelector modal cannot offer HTML files to configure).
- `server/services/DocumentService.ts` — path validation, configured document path checks, raw file resolution.
- `server/controllers/DocumentController.ts` — raw document response handling.
- `server/routes/documents.ts` — authenticated raw document route.
- `server/security/apiAuth.ts` — add only a narrow GET raw-preview exemption from normal API auth.
- `server/security/documentPreviewToken.ts` — internal short-lived preview-token signing and validation.
- `server/types/tree.ts` — document kind/type metadata exposed to clients.
- `server/services/fileWatcher/PathWatcherService.ts` — document-change parity for HTML files.
- `src/components/DocumentsView/FileTree.tsx` — document metadata type and HTML file icon/display handling.
- `src/components/DocumentsView/DocumentsLayout.tsx` — viewer selection by document kind.
- `src/components/DocumentsView/MarkdownViewer.tsx` — remains markdown-only.
- `src/components/DocumentsView/HtmlSandboxViewer.tsx` — new sandboxed HTML preview component.
- `src/components/MarkdownContent/useMarkdownProcessor.ts` — remains the sanitizer owner for markdown HTML only.
- `tests/e2e/` and `server/tests/` — route security, raw serving, and preview behavior coverage.

### Scope

- In scope:
  - Discover `.html` and `.htm` files under configured document paths.
  - Add server-derived document kind metadata for at least `markdown` and `html`.
  - Treat unknown file kinds as unsupported at the viewer boundary, not as a persisted tree category.
  - Keep markdown rendering behavior unchanged for `.md` files.
  - Add an owner-only preview-token mint endpoint for selected HTML documents.
  - Add a path-style raw document route that accepts a short-lived internal preview token.
  - Add a narrow GET-only normal API auth exemption for `/api/documents/raw-preview/*`.
  - Reject every raw preview request in the raw-preview handler unless preview-token validation succeeds.
  - Put the preview token in the path prefix so relative asset URLs inherit the same token scope.
  - Reuse existing `..`, project-root containment, and configured `documentPaths` guards for every raw request.
  - Scope each preview token to one project, one HTML document directory, allowed raw paths, and a short TTL.
  - Serve raw files with a hand-rolled MIME map, `X-Content-Type-Options: nosniff`, and the pinned CSP in this ticket.
  - Render HTML through a dedicated iframe component with `sandbox` tokens that exclude `allow-same-origin`.
  - Support normal relative assets referenced by HTML when those assets remain inside the token-scoped document directory, configured document paths, and project containment.
  - Keep CSS, JavaScript, image, and font assets servable but invisible in the Documents View tree.
  - Exclude the repository root `index.html` from HTML discovery when `project.document.paths` includes `./`.
  - Extend document-change handling so selected HTML previews refresh on external `.html` and `.htm` edits.
  - Add tests that prevent route bypass, path traversal, MIME confusion, and unsafe iframe sandbox token combinations.
- Out of scope:
  - Editing or saving HTML.
  - Public unauthenticated raw document access.
  - Public signed share URLs for raw document previews.
  - Read-token or shared-session HTML preview.
  - PDF, image, SVG, video, or general binary viewer UI.
  - Broad document asset browser redesign.
  - Cloud-sharing UX polish for HTML previews.
  - Advanced CSP compatibility tuning for arbitrary third-party HTML applications.
  - `allow-same-origin` on executable HTML previews.

## 2. Decision

### Chosen Approach

- Add owner-minted internal preview tokens, token-scoped raw serving, and a sandboxed iframe HTML viewer.

### Rationale

- A real `iframe src` URL lets browser-relative resources resolve without rewriting HTML text.
- Owner authentication gates token minting before any HTML iframe URL exists.
- The raw preview route does not depend on SameSite cookies from the opaque iframe; it validates the path-scoped preview token instead.
- The normal API auth exemption is GET-only, path-specific, and not sufficient by itself to read any file.
- The raw-preview prefix is carved out of `isPublicReadRoute` in `server/security/accessPolicy.ts` so it does not inherit the broad `/api/documents` anonymous + read-session-readable grant. This is defense-in-depth: the handler's HMAC token check (gate G2) is the primary gate and works regardless; the carve-out prevents the route from being a quiet public-readable surface and prevents HEAD/OPTIONS method creep.
- Server-side containment checks apply to the HTML file and every relative subresource request.
- An iframe without `allow-same-origin` blocks previewed scripts from reading parent DOM, cookies, and local storage.
- `connect-src 'none'` blocks previewed scripts from using the raw token to call arbitrary network endpoints.
- Keeping `MarkdownViewer` markdown-only avoids mixing sanitizer-based display with executable HTML runtime behavior.
- A server-owned document kind discriminator lets future viewers reuse the route and selection model without duplicating extension rules in the UI.

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| Owner-minted preview token plus sandboxed iframe | Serve raw bytes from a guarded, token-scoped virtual document root and render with isolated iframe | ACCEPTED - Supports working multi-file HTML without relying on iframe cookies |
| Authenticated raw route using existing cookies only | Keep raw route behind normal `/api` cookie/session auth | Reject - Opaque sandboxed iframes do not reliably send SameSite Strict session cookies for subresources |
| `iframe srcdoc` with fetched HTML text | Fetch HTML as text and inject into `srcdoc` | Reject - Relative assets do not resolve for multi-file HTML |
| DOMPurify plus inline React render | Sanitize and inject HTML inside the app DOM | Reject - Scripts and event handlers are stripped, so working HTML stops working |
| Open original in a new browser tab only | Serve or open raw file outside Documents View | Reject - Does not meet Documents View preview requirement |
| Shadow DOM render | Isolate styles but keep same JavaScript origin | Reject - Does not create a security boundary |
| Public unauthenticated raw route | Let iframe and subresources load without a scoped preview token | Reject - Conflicts with API auth, read sessions, and cloud/share threat model |
| `allow-same-origin` iframe | Let iframe requests use normal same-origin cookies | Reject - Collapses the isolation boundary for executable same-origin HTML |

## 4. Artifact Specifications

### New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| `src/components/DocumentsView/HtmlSandboxViewer.tsx` | Component | Render HTML previews in a sandboxed iframe |
| `src/components/DocumentsView/HtmlSandboxViewer.test.tsx` | Unit test | Prove iframe sandbox tokens exclude unsafe combinations |
| `server/security/documentPreviewToken.ts` | Security helper | Sign and validate short-lived preview tokens scoped to project and document directory |
| `server/tests/api/document-raw.test.ts` | API test | Prove raw route auth, containment, MIME, and CSP behavior |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `server/builders/TreeBuilder.ts` | Discovery extended | Include `.html` and `.htm` files under configured document paths |
| `server/builders/TreeBuilder.ts` | Discovery filtered | Exclude root `index.html` from Documents View HTML discovery |
| `server/strategies/PathSelectionStrategy.ts` | Discovery extended | Apply the same `.html`/`.htm` file filter as TreeBuilder so the PathSelector modal can offer HTML files for configuration (otherwise HTML files are undiscoverable in the UI even after the TreeBuilder change) |
| `server/types/tree.ts` | Contract extended | Add server-derived document kind metadata for file nodes |
| `server/services/DocumentService.ts` | Method added | Resolve raw document files with shared containment and document-path validation |
| `server/controllers/DocumentController.ts` | Handler added | Stream or send raw document bytes with headers |
| `server/controllers/DocumentController.ts` | Handler added | Mint preview tokens for owner-authenticated HTML selections |
| `server/routes/documents.ts` | Route added | Add owner-authenticated `POST /api/documents/preview-token` endpoint |
| `server/routes/documents.ts` | Route added | Add token-authenticated `GET /api/documents/raw-preview/:token/*documentPath` route |
| `server/services/fileWatcher/PathWatcherService.ts` | Filter extended | Emit document-change events for `.html` and `.htm` files |
| `src/components/DocumentsView/FileTree.tsx` | Type updated | Carry document kind metadata and render appropriate file icon/state |
| `src/components/DocumentsView/DocumentsLayout.tsx` | Viewer selection added | Select `MarkdownViewer`, `HtmlSandboxViewer`, or unsupported state by document kind |
| `src/components/DocumentsView/MarkdownViewer.tsx` | Responsibility narrowed | Keep markdown rendering unchanged and do not handle HTML |
| `server/security/apiAuth.ts` | Policy extended | Add only a narrow GET exemption for `/api/documents/raw-preview/*` so token auth can run |
| `docs/CONFIG_SPECIFICATION.md` | Documentation updated | Document supported document file kinds and raw-preview security boundary |
| `server/docs/ARCHITECTURE.md` | Documentation updated | Reflect the new `/api/documents/raw-preview/*` prefix, its GET-only auth exemption, and the preview-token bridge in the auth-gate + route map (lines 13, 56-65, 90). This doc is the canonical "where do new `/api` routes go" reference future contributors use. |
| `server/openapi/schemas.ts` | Contract extended | Add optional `kind` to the `Document` schema (line 388); declare `PreviewTokenResponse` schema and the two new operations (`POST /api/documents/preview-token`, `GET /api/documents/raw-preview/{token}/{path}`) so the Redoc spec at `/api-docs` does not drift from reality. |
| `DEBUG.md` | Verified, no change | Confirmed during architecture: DEBUG.md is operational run/stop/observe procedures and does not enumerate routes or auth env vars, so the raw-preview prefix and preview-token secret do not require a doc update. |

### Integration Points

| From | To | Interface |
|------|----|-----------|
| `TreeBuilder` | Documents API | File nodes include server-derived kind metadata |
| `DocumentsLayout` | `HtmlSandboxViewer` | Selected file path, project ID, refresh/deleted state |
| `HtmlSandboxViewer` | Preview-token endpoint | Parent obtains a short-lived owner-minted token before rendering iframe |
| `HtmlSandboxViewer` | Raw preview route | `iframe src` points at token-scoped path-style raw preview URL |
| Raw preview route | `DocumentService` | Shared normalized path and document-path containment validation |
| Raw preview route | `documentPreviewToken` | HMAC validation of token TTL, project, selected HTML path, and document directory |
| Raw preview route | Express response | MIME type, `nosniff`, CSP, and binary-safe body |
| Raw HTML subresources | Raw preview route | Browser resolves relative URLs under the same guarded token prefix |

### Key Patterns

- Server-owned discriminator pattern: `DocumentFile.kind` selects a focused viewer component.
- Sandbox pattern: untrusted HTML runs in an iframe with restricted capabilities.
- Token-scoped virtual document-root proxy: raw route maps project-relative paths to guarded filesystem reads.
- Defense in depth: owner-gated token minting, path-scoped raw token validation, client iframe sandbox, path containment, MIME, `nosniff`, and CSP.

### Pinned Headers

All raw HTML preview responses must set:

```text
Content-Security-Policy: sandbox allow-scripts; default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'
X-Frame-Options: SAMEORIGIN
```

- `allow-same-origin` is forbidden (in both the CSP `sandbox` directive and the iframe `sandbox` attribute).
- `connect-src 'none'` is required for v1.
- External network access is out of scope.
- Inline scripts and styles are allowed because the preview is already explicitly executable; network access remains blocked.
- `X-Frame-Options: SAMEORIGIN` is a required override. The global `securityHeaders` middleware (`server/security/originPolicy.ts:103-107`, mounted at `server/server.ts:150`) sets `X-Frame-Options: DENY` on every response; DENY blocks even same-origin framing, so the preview iframe would be refused by the browser. The raw-preview handler must override to `SAMEORIGIN` on its responses. All other routes keep `DENY`. See `architecture.md` gate G10.

> **⚠️ v1 deviation (recorded):** the strict CSP above is the canonical contract,
> but browser validation against a real working HTML file (`designs/board-zai/
> design3.html`) showed it cannot render Tailwind/Alpine/Google-Fonts-dependent
> HTML. v1 ships a documented deviation (external CDN allowlist + `unsafe-eval`
> in `script-src`). The deviation is recorded in
> `docs/CRs/MDT-221/security-tradeoffs.md`, kept visible by a failing strict-CSP
> integration test, and slated for a per-project opt-in configuration follow-up
> CR. The directives that remain non-negotiable in any configuration
> (`connect-src 'none'`, `img-src 'self' data:`, no `allow-same-origin`,
> `default-src 'none'`) are asserted as invariants and still pass.

## 5. Acceptance Criteria

### Functional

- [ ] `.html` and `.htm` files under configured document paths appear in Documents View.
- [ ] Root `index.html` does not appear when `project.document.paths` includes `./`.
- [ ] CSS, JavaScript, image, and font assets used by HTML are servable but do not appear as selectable Documents View files.
- [ ] Existing `.md` discovery, selection, markdown rendering, tabs, favorites, and timestamps continue to work.
- [ ] Selecting an HTML file renders an iframe preview instead of the markdown renderer.
- [ ] Selecting an HTML file first mints an owner-only internal preview token.
- [ ] HTML iframe `src` uses `/api/documents/raw-preview/:token/*documentPath`.
- [ ] Relative subresources resolve under the same preview-token path prefix.
- [ ] HTML files that reference relative CSS, JavaScript, and image assets load those assets when they remain inside the token-scoped directory and configured document paths.
- [ ] External edits to a selected `.html` or `.htm` file refresh the HTML preview through the document-change path.
- [ ] Raw requests for files outside configured document paths return `403`.
- [ ] Raw requests using `..`, absolute paths, encoded traversal, or project-root escapes return `403`.
- [ ] Raw requests for unknown projects return `404`.
- [ ] Raw preview requests without a valid unexpired preview token do not disclose file contents.
- [ ] Read-token and shared-session users cannot mint HTML preview tokens in v1.
- [ ] Unknown file kinds render a non-preview state and do not call the markdown renderer.
- [ ] `documentFilenameTabModel` remains markdown-only; HTML sibling tabs are out of scope.
- [ ] The HTML preview iframe fills the documents-view preview panel (full width and height below the app header), matching the markdown viewer's panel-filling behavior; it must not collapse to its intrinsic 300×150 default. (BR-1.12)

### Security

- [ ] `HtmlSandboxViewer` iframe uses `sandbox` without `allow-same-origin`.
- [ ] Tests fail if `allow-same-origin` appears in a document preview iframe.
- [ ] Preview-token minting stays behind owner-authenticated `/api` middleware.
- [ ] Raw preview serving validates the internal preview token instead of relying on iframe cookies.
- [ ] `server/security/apiAuth.ts` adds only a GET exemption for `/api/documents/raw-preview/*`.
- [ ] The raw-preview handler rejects missing, expired, malformed, or tampered preview tokens before file resolution.
- [ ] Preview tokens expire within 5 minutes or less.
- [ ] Preview tokens are scoped to one project and one selected HTML document directory.
- [ ] Preview tokens cannot be used to read sibling files outside the token-scoped document directory.
- [ ] Raw preview route sets `X-Content-Type-Options: nosniff`.
- [ ] Raw preview route sets `X-Frame-Options: SAMEORIGIN` (overriding the global `DENY` from `securityHeaders`); all other routes keep `DENY`.
- [ ] Raw HTML responses set the pinned CSP from Section 4.
- [ ] Previewed HTML cannot read parent `window`, parent DOM, or parent local storage in browser coverage.
- [ ] Previewed HTML cannot perform owner-only mutation without the existing owner-intent protections.
- [ ] Previewed HTML cannot `fetch('/api/*')` because `connect-src 'none'` blocks script network access.

### Non-Functional

- [ ] Raw serving is binary-safe and does not use UTF-8 string reads for non-markdown assets.
- [ ] MIME handling uses a small local map, not a new dependency.
- [ ] MIME map covers `.html`, `.htm`, `.css`, `.js`, `.mjs`, `.json`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`, `.ico`, `.woff`, and `.woff2` or rejects unsupported types explicitly.
- [ ] Large raw files are streamed or otherwise handled without loading unnecessary duplicate string copies.
- [ ] The implementation introduces no new runtime package.

### Testing

- Unit: `HtmlSandboxViewer.test.tsx` verifies iframe `sandbox`, `src`, deleted state, and unsupported unsafe token combination.
- Unit: `DocumentsLayout` or viewer-selection tests verify markdown, HTML, and unsupported kind routing.
- Unit: Preview-token helper tests verify TTL, tamper detection, project scoping, path scoping, and expiry.
- API: `document-raw.test.ts` verifies owner auth required for token minting, visible-project required, configured document path required, containment, MIME, `nosniff`, and CSP headers.
- API: `document-raw.test.ts` verifies read-token sessions cannot mint preview tokens.
- API: `document-raw.test.ts` verifies relative asset requests are independently validated by the raw preview route and token scope.
- API: `document-raw.test.ts` verifies query-param preview URLs are not used for iframe HTML previews.
- API: `document-raw.test.ts` verifies root `index.html` is not returned by discovery.
- Regression: `MarkdownViewer.test.tsx` continues to prove markdown rendering uses `/api/documents/content`.
- E2E: Documents View selects a fixture HTML file and renders visible iframe content.
- E2E: A fixture HTML file with sibling CSS/JS/image assets loads those assets in preview.
- E2E: Browser assertion proves preview script cannot access parent DOM or local storage.
- E2E: Browser assertion proves inline and external fixture scripts execute, but cannot complete `fetch('/api/status')` or another `/api/*` request.

## 6. Verification

### Automated

- `bun run --cwd server jest -- document-raw document-preview-token`
- Focused frontend tests for `HtmlSandboxViewer`, `DocumentsLayout`, and existing `MarkdownViewer` behavior.
- Focused Playwright test for Documents View HTML preview fixture.
- `bun run validate:ts`
- `bun run lint`

### Runtime

- Start the normal app runtime only when validation requires live browser behavior.
- Use a project fixture with `docs/html/index.html`, `docs/html/app.js`, `docs/html/style.css`, and `docs/html/image.png`.
- Verify iframe renders the HTML fixture, executes fixture script, and loads sibling assets.
- Verify fixture script reports failure when attempting parent DOM or storage access.
- Verify fixture script reports failure for `/api/*` fetch.
- Verify raw preview route responses for valid token, expired token, tampered token, and invalid paths.

### Documentation

- Update `docs/CONFIG_SPECIFICATION.md` or the current document-view owner doc with supported document kinds.
- Document that HTML preview is read-only.
- Document that executable HTML preview is sandboxed and must not use `allow-same-origin`.
- Document that public/signed sharing of raw previews is deferred.
- Document that read-token/shared-session HTML preview is deferred.

## 7. Deployment

### Delivery

- Local application deployment only.
- No database migration.
- No Cloudflare Worker change.
- No public route exposure.
- No project config migration unless a configurable document extension allowlist is introduced.
- No new package installation.

### Rollback

- Revert the preview-token helper, raw preview route, document kind metadata, and HTML viewer component.
- Markdown Documents View remains the fallback behavior.
- Existing `.md` tickets and documents remain unchanged.

## 8. Security Review Checklist

- [ ] Confirm preview-token mint endpoint is mounted after `createApiAuthMiddleware` in `server/server.ts`.
- [ ] Confirm raw-preview route has only a GET normal-API-auth exemption and performs preview-token validation before file resolution.
- [ ] Confirm preview-token mint endpoint rejects read-token/shared-session users.
- [ ] Confirm `ProjectController.ensureProjectVisible` or equivalent project visibility check gates preview-token mint requests.
- [ ] Confirm every raw preview subresource request re-runs token validation, path normalization, configured document path checks, token directory scoping, and project-root containment.
- [ ] Confirm raw preview route path parameters cannot consume or normalize outside the intended project-relative document path.
- [ ] Confirm root `index.html` is excluded from HTML discovery.
- [ ] Confirm assets are servable but invisible in the document tree.
- [ ] Confirm CSP and iframe sandbox are both present; neither is treated as the only boundary.
- [ ] Confirm `allow-same-origin` is absent from all executable document preview iframes.
- [ ] Confirm raw HTML responses include `connect-src 'none'`.
- [ ] Confirm no route returns filesystem absolute paths in errors.
- [ ] Confirm tests include URL-encoded traversal strings.

## 9. Clarifications / UAT History

### UAT Session 2026-08-03

**Trigger**: browser validation of `designs/board-zai/design3.html` showed the
strict pinned CSP blocks the real use case — design HTML depending on Tailwind
CDN, Alpine.js (jsDelivr), and Google Fonts cannot render. A stopgap relaxation
(external CDN allowlist + `unsafe-eval`) was applied to make it work; this UAT
session converts the stopgap into a proper per-project opt-in configuration.

**Approved changes**:
- C-2.13 refined in place: strict CSP is now the *default*, not the only option.
- C-2.23 added: `[project.document.preview].allowedExternalDomains` config.
- C-2.24 added: `[project.document.preview].allowUnsafeEval` config.
- BR-1.13 added: surface unconfigured domains/capabilities to the user.

**Changed requirement IDs**: C-2.13 (refine), C-2.23, C-2.24, BR-1.13 (add).
**Updated workflow documents**: `security-tradeoffs.md` (rationale + config
model), `uat.md` (execution brief), this section.
**`uat.md` written**: yes.
**Strict drift/lock used**: no (additive + refine-in-place; no removals).
**Execution slices**: TASK-14 (config schema + dynamic CSP), TASK-15
(scan + surfacing dialog). Implementation not yet started.
**Operator answer** ("how to configure per project"): see `uat.md` →
"How to configure this per project" — `[project.document.preview]` in
`.mdt-config.toml` with `allowedExternalDomains` and `allowUnsafeEval`, strict
defaults.
