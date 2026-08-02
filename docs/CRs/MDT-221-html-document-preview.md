---
code: MDT-221
status: Proposed
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

- `server/builders/TreeBuilder.ts` — document discovery extension handling.
- `server/services/DocumentService.ts` — path validation, configured document path checks, raw file resolution.
- `server/controllers/DocumentController.ts` — raw document response handling.
- `server/routes/documents.ts` — authenticated raw document route.
- `server/security/apiAuth.ts` — confirm no broad exemption is added for raw documents.
- `server/types/tree.ts` — document kind/type metadata exposed to clients.
- `src/components/DocumentsView/FileTree.tsx` — document metadata type and HTML file icon/display handling.
- `src/components/DocumentsView/DocumentsLayout.tsx` — viewer selection by document kind.
- `src/components/DocumentsView/MarkdownViewer.tsx` — remains markdown-only.
- `src/components/DocumentsView/HtmlSandboxViewer.tsx` — new sandboxed HTML preview component.
- `src/components/MarkdownContent/useMarkdownProcessor.ts` — remains the sanitizer owner for markdown HTML only.
- `tests/e2e/` and `server/tests/` — route security, raw serving, and preview behavior coverage.

### Scope

- In scope:
  - Discover `.html` and `.htm` files under configured document paths.
  - Add extension-derived document kind metadata for at least `markdown`, `html`, and `unsupported`.
  - Keep markdown rendering behavior unchanged for `.md` files.
  - Add an authenticated path-style raw document route for HTML preview and relative asset loading.
  - Reuse existing `..`, project-root containment, and configured `documentPaths` guards for every raw request.
  - Serve raw files with correct `Content-Type`, `X-Content-Type-Options: nosniff`, and a restrictive CSP appropriate for sandboxed previews.
  - Render HTML through a dedicated iframe component with `sandbox` tokens that exclude `allow-same-origin`.
  - Support normal relative assets referenced by HTML when those assets are inside configured document paths and project containment.
  - Add tests that prevent route bypass, path traversal, MIME confusion, and unsafe iframe sandbox token combinations.
- Out of scope:
  - Editing or saving HTML.
  - Public unauthenticated raw document access.
  - Signed share URLs for raw document previews.
  - PDF, image, SVG, video, or general binary viewer UI.
  - Broad document asset browser redesign.
  - Cloud-sharing UX polish for HTML previews.
  - Advanced CSP compatibility tuning for arbitrary third-party HTML applications.
  - `allow-same-origin` on executable HTML previews.

## 2. Decision

### Chosen Approach

- Add authenticated raw document serving plus a sandboxed iframe HTML viewer.

### Rationale

- A real `iframe src` URL lets browser-relative resources resolve without rewriting HTML text.
- The existing `/api` auth gate and project visibility checks remain the first access boundary.
- Server-side containment checks apply to the HTML file and every relative subresource request.
- An iframe without `allow-same-origin` blocks previewed scripts from reading parent DOM, cookies, and local storage.
- Keeping `MarkdownViewer` markdown-only avoids mixing sanitizer-based display with executable HTML runtime behavior.
- A document kind discriminator lets future viewers reuse the route and selection model without HTML-specific branching everywhere.

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| Authenticated path-style raw route plus sandboxed iframe | Serve raw bytes from a guarded virtual document root and render with isolated iframe | ACCEPTED - Supports working multi-file HTML while preserving the API boundary |
| `iframe srcdoc` with fetched HTML text | Fetch HTML as text and inject into `srcdoc` | Reject - Relative assets do not resolve for multi-file HTML |
| DOMPurify plus inline React render | Sanitize and inject HTML inside the app DOM | Reject - Scripts and event handlers are stripped, so working HTML stops working |
| Open original in a new browser tab only | Serve or open raw file outside Documents View | Reject - Does not meet Documents View preview requirement |
| Shadow DOM render | Isolate styles but keep same JavaScript origin | Reject - Does not create a security boundary |
| Public unauthenticated raw route | Let iframe and subresources load without session credentials | Reject - Conflicts with API auth, read sessions, and cloud/share threat model |

## 4. Artifact Specifications

### New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| `src/components/DocumentsView/HtmlSandboxViewer.tsx` | Component | Render HTML previews in a sandboxed iframe |
| `src/components/DocumentsView/HtmlSandboxViewer.test.tsx` | Unit test | Prove iframe sandbox tokens exclude unsafe combinations |
| `server/tests/api/document-raw.test.ts` | API test | Prove raw route auth, containment, MIME, and CSP behavior |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `server/builders/TreeBuilder.ts` | Discovery extended | Include `.html` and `.htm` files under configured document paths |
| `server/types/tree.ts` | Contract extended | Add document kind metadata for file nodes |
| `server/services/DocumentService.ts` | Method added | Resolve raw document files with shared containment and document-path validation |
| `server/controllers/DocumentController.ts` | Handler added | Stream or send raw document bytes with headers |
| `server/routes/documents.ts` | Route added | Add authenticated `GET /api/documents/raw/:projectId/*documentPath` route |
| `src/components/DocumentsView/FileTree.tsx` | Type updated | Carry document kind metadata and render appropriate file icon/state |
| `src/components/DocumentsView/DocumentsLayout.tsx` | Viewer selection added | Select `MarkdownViewer`, `HtmlSandboxViewer`, or unsupported state by document kind |
| `src/components/DocumentsView/MarkdownViewer.tsx` | Responsibility narrowed | Keep markdown rendering unchanged and do not handle HTML |
| `server/security/apiAuth.ts` | Policy verified | Do not add a broad exemption for raw document routes |
| `docs/CONFIG_SPECIFICATION.md` | Documentation updated | Document supported document file kinds and raw-preview security boundary |

### Integration Points

| From | To | Interface |
|------|----|-----------|
| `TreeBuilder` | Documents API | File nodes include kind metadata |
| `DocumentsLayout` | `HtmlSandboxViewer` | Selected file path, project ID, refresh/deleted state |
| `HtmlSandboxViewer` | Raw route | `iframe src` points at authenticated path-style raw document URL |
| Raw route | `DocumentService` | Shared normalized path and document-path containment validation |
| Raw route | Express response | MIME type, `nosniff`, CSP, and binary-safe body |
| Raw HTML subresources | Raw route | Browser resolves relative URLs under the same guarded virtual document root |

### Key Patterns

- Strategy/discriminator pattern: `DocumentFile.kind` selects a focused viewer component.
- Sandbox pattern: untrusted HTML runs in an iframe with restricted capabilities.
- Virtual document-root proxy: raw route maps project-relative paths to guarded filesystem reads.
- Defense in depth: client iframe sandbox plus server auth, path containment, MIME, `nosniff`, and CSP.

## 5. Acceptance Criteria

### Functional

- [ ] `.html` and `.htm` files under configured document paths appear in Documents View.
- [ ] Existing `.md` discovery, selection, markdown rendering, tabs, favorites, and timestamps continue to work.
- [ ] Selecting an HTML file renders an iframe preview instead of the markdown renderer.
- [ ] HTML iframe `src` uses a path-style URL whose directory is the browser base for relative subresources.
- [ ] HTML files that reference relative CSS, JavaScript, and image assets load those assets when they remain inside configured document paths.
- [ ] Raw requests for files outside configured document paths return `403`.
- [ ] Raw requests using `..`, absolute paths, encoded traversal, or project-root escapes return `403`.
- [ ] Raw requests for unknown projects return `404`.
- [ ] Raw requests without valid owner/read session credentials do not disclose file contents.
- [ ] Unsupported file kinds render a non-preview state and do not call the markdown renderer.

### Security

- [ ] `HtmlSandboxViewer` iframe uses `sandbox` without `allow-same-origin`.
- [ ] Tests fail if `allow-scripts` and `allow-same-origin` are combined for document previews.
- [ ] Raw route stays behind the existing `/api` auth middleware.
- [ ] No broad exemption is added to `server/security/apiAuth.ts` for `/api/documents/raw/*`.
- [ ] Raw route sets `X-Content-Type-Options: nosniff`.
- [ ] Raw HTML responses set a CSP that preserves sandbox isolation and does not grant parent-origin access.
- [ ] Previewed HTML cannot read parent `window`, parent DOM, or parent local storage in browser coverage.
- [ ] Previewed HTML cannot perform owner-only mutation without the existing owner-intent protections.

### Non-Functional

- [ ] Raw serving is binary-safe and does not use UTF-8 string reads for non-markdown assets.
- [ ] MIME handling covers `.html`, `.htm`, `.css`, `.js`, `.mjs`, `.json`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`, `.ico`, `.woff`, and `.woff2` or rejects unsupported types explicitly.
- [ ] Large raw files are streamed or otherwise handled without loading unnecessary duplicate string copies.
- [ ] The implementation introduces no new runtime package unless the package is justified for MIME detection and covered by lockfile review.

### Testing

- Unit: `HtmlSandboxViewer.test.tsx` verifies iframe `sandbox`, `src`, deleted state, and unsupported unsafe token combination.
- Unit: `DocumentsLayout` or viewer-selection tests verify markdown, HTML, and unsupported kind routing.
- API: `document-raw.test.ts` verifies auth required, visible-project required, configured document path required, containment, MIME, `nosniff`, and CSP headers.
- API: `document-raw.test.ts` verifies relative asset requests are independently validated by the raw route.
- API: `document-raw.test.ts` verifies query-param preview URLs are not used for iframe HTML previews.
- Regression: `MarkdownViewer.test.tsx` continues to prove markdown rendering uses `/api/documents/content`.
- E2E: Documents View selects a fixture HTML file and renders visible iframe content.
- E2E: A fixture HTML file with sibling CSS/JS/image assets loads those assets in preview.
- E2E: Browser assertion proves preview script cannot access parent DOM or local storage.

## 6. Verification

### Automated

- `bun run --cwd server jest -- document-raw`
- Focused frontend tests for `HtmlSandboxViewer`, `DocumentsLayout`, and existing `MarkdownViewer` behavior.
- Focused Playwright test for Documents View HTML preview fixture.
- `bun run validate:ts`
- `bun run lint`

### Runtime

- Start the normal app runtime only when validation requires live browser behavior.
- Use a project fixture with `docs/html/index.html`, `docs/html/app.js`, `docs/html/style.css`, and `docs/html/image.png`.
- Verify iframe renders the HTML fixture, executes fixture script, and loads sibling assets.
- Verify fixture script reports failure when attempting parent DOM or storage access.
- Verify raw route responses for valid and invalid paths in browser devtools or API tests.

### Documentation

- Update `docs/CONFIG_SPECIFICATION.md` or the current document-view owner doc with supported document kinds.
- Document that HTML preview is read-only.
- Document that executable HTML preview is sandboxed and must not use `allow-same-origin`.
- Document that public/signed sharing of raw previews is deferred.

## 7. Deployment

### Delivery

- Local application deployment only.
- No database migration.
- No Cloudflare Worker change.
- No public route exposure.
- No project config migration unless a configurable document extension allowlist is introduced.

### Rollback

- Revert the raw document route, document kind metadata, and HTML viewer component.
- Markdown Documents View remains the fallback behavior.
- Existing `.md` tickets and documents remain unchanged.

## 8. Security Review Checklist

- [ ] Confirm raw route is mounted after `createApiAuthMiddleware` in `server/server.ts`.
- [ ] Confirm `ProjectController.ensureProjectVisible` or equivalent project visibility check gates raw route requests.
- [ ] Confirm every raw subresource request re-runs path normalization and containment checks.
- [ ] Confirm raw route path parameters cannot consume or normalize outside the intended project-relative document path.
- [ ] Confirm CSP and iframe sandbox are both present; neither is treated as the only boundary.
- [ ] Confirm `allow-same-origin` is absent from all executable document preview iframes.
- [ ] Confirm no route returns filesystem absolute paths in errors.
- [ ] Confirm tests include URL-encoded traversal strings.
