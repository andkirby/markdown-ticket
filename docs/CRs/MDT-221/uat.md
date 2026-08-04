# UAT Refinement Brief — MDT-221

## Objective

Replace the hardcoded CSP stopgap (external CDN allowlist + `unsafe-eval` baked
into `RAW_PREVIEW_CSP`) with a **per-project, opt-in configuration model** so
each project's HTML preview security posture is a conscious owner decision,
not a global default. Strict by default; relaxed only when the project config
says so.

This is the configuration deliverable that the operator-facing question
*"how to configure this per project"* maps to.

## Approved Changes

1. **C-2.13 refined in place** — the strict CSP is now the *default*, not the
   only option. Non-negotiable directives (`connect-src 'none'`, `img-src 'self'`,
   `default-src 'none'`, no `allow-same-origin`) hold in every configuration.
2. **C-2.23 added** — `[project.document.preview].allowedExternalDomains`
   (array of hostnames, default empty) controls which external script/style/font
   origins the preview CSP allows.
3. **C-2.24 added** — `[project.document.preview].allowUnsafeEval` (boolean,
   default false) controls whether `'unsafe-eval'` is added to `script-src`.
4. **BR-1.13 added** — when a selected HTML references external origins or eval
   not yet allowed, the user is *told which domains/capabilities need attention*
   so the opt-in is conscious.

## Changed Requirement IDs

| ID | Action | Why |
|---|---|---|
| C-2.13 | refine_in_place | Strict CSP becomes the default; was the only option |
| C-2.23 | additive | New config field `allowedExternalDomains` |
| C-2.24 | additive | New config field `allowUnsafeEval` |
| BR-1.13 | additive | New surfacing behavior (needs-approval list) |

## Affected Downstream Trace

- **requirements**: C-2.13 refined; C-2.23, C-2.24, BR-1.13 added
- **bdd**: `unconfigured_domains_surfaced` scenario added
- **architecture**: OBL-19 (dynamic CSP derivation), OBL-20 (scan + surfacing);
  ART-19 (`domain-contracts/src/project/schema.ts` for config schema)
- **tests**: 4 new plans (strict-by-default, allowed-domains, unsafe-eval-optin,
  needs-approval-surfaced)
- **tasks**: TASK-14, TASK-15 (the two execution slices below)

## Execution Slices

### Slice 1 — Per-project preview config + dynamic CSP (TASK-14)

- **Objective**: replace the hardcoded `RAW_PREVIEW_CSP` constant with
  per-request CSP derived from project config. Strict by default.
- **Direct artifacts/files**:
  - `domain-contracts/src/project/schema.ts` — add `[project.document.preview]`
    schema: `allowedExternalDomains: string[]` (default `[]`),
    `allowUnsafeEval: boolean` (default `false`).
  - `server/services/DocumentService.ts` — `resolveRawPreviewPath` reads the new
    config fields and returns them alongside `{projectPath, resolvedPath, mime}`.
  - `server/controllers/DocumentController.ts` — delete `RAW_PREVIEW_CSP`;
    build the CSP string per-request from config. The non-negotiable invariants
    stay hardcoded; only `script-src`/`style-src`/`font-src` grow with config.
  - `server/tests/api/document-raw.test.ts` — replace the strict-string
    assertion with config-driven assertions (TEST-csp-strict-by-default,
    TEST-csp-allowed-domains, TEST-csp-unsafe-eval-optin).
- **Direct GREEN targets**: TEST-csp-strict-by-default, TEST-csp-allowed-domains,
  TEST-csp-unsafe-eval-optin.
- **Impacted canonical task IDs**: TASK-14 (this slice), and the strict-CSP
  deviation test (currently red) turns green because the default-config project
  now legitimately gets the strict CSP.
- **Why**: this is the core config model. Without it, the relaxations are a
  global default with no per-project control.

### Slice 2 — Needs-approval surfacing + dialog (TASK-15)

- **Objective**: when a file references external origins/capabilities not in
  the project config, tell the user which ones need attention.
- **Direct artifacts/files**:
  - `server/controllers/DocumentController.ts` — `mintPreviewToken` statically
    scans the selected HTML's `<script src>`/`<link href>`/`<img src>` for
    external origins; if any are not in `allowedExternalDomains`, or if the file
    uses eval-capable patterns and `allowUnsafeEval` is false, return
    `{ needsApproval: { domains: [...], unsafeEval: bool }, token: null }`
    instead of minting.
  - `src/components/DocumentsView/HtmlSandboxViewer.tsx` — handle the
    `needsApproval` response by showing a dialog listing the domains + the
    eval capability, with per-domain checkboxes and an "Allow selected" action
    that PUTs to a config endpoint and re-mints.
  - A new `PUT /api/documents/preview-config` endpoint (or extend the existing
    configure endpoint) to persist the owner's choices.
- **Direct GREEN targets**: TEST-needs-approval-surfaced,
  `unconfigured_domains_surfaced` scenario.
- **Impacted canonical task IDs**: TASK-15 (this slice).
- **Why**: makes the opt-in conscious. Without surfacing, the owner has to
  hand-edit TOML and know which domains their file wants — defeats the purpose.

## How to configure this per project (the operator answer)

After Slice 1 + 2 land, a project owner configures HTML preview relaxations in
`.mdt-config.toml`:

```toml
# .mdt-config.toml
[project.document.preview]
# External origins the project's HTML files may load script/style/font from.
# Empty by default — no external origins. Add hostnames (no scheme/path).
allowedExternalDomains = [
  "cdn.tailwindcss.com",     # Tailwind CDN JIT
  "cdn.jsdelivr.net",        # Alpine.js, etc.
  "fonts.googleapis.com",    # Google Fonts CSS
  "fonts.gstatic.com",       # Google Fonts files
]

# Allow eval-based frameworks (Alpine.js x-data, Tailwind CDN JIT).
# Default false. Set true only if the project's HTML uses such frameworks.
allowUnsafeEval = true
```

Behavior:
- **Default (no `[project.document.preview]` section)**: strict CSP. External
  origins blocked, eval blocked. HTML that depends on CDNs will not render
  correctly until the owner opts in.
- **On first preview of a file that needs more**: the dialog shows the file's
  external domains + whether it needs eval. The owner checks the ones they
  trust; those are persisted to `[project.document.preview]` and the preview
  re-mints with the relaxed CSP.
- **What never relaxes regardless of config**: `connect-src 'none'` (no API
  channel), `img-src 'self' data:` (no image beacons), the opaque-origin
  sandbox (no `allow-same-origin`).

## Validation

- `spec-trace validate MDT-221 --stage all` — PASS (all 5 stages).
- Slice 1 GREEN target: TEST-csp-strict-by-default (asserts default-config
  project gets the strict CSP string) + the two opt-in tests.
- Slice 2 GREEN target: TEST-needs-approval-surfaced.
- The currently-red strict-CSP deviation test (`PINNED_CSP_STRICT`) turns green
  once Slice 1 lands and the default-config project legitimately serves strict.

## Watchlist

- **Static scan coverage** — only catches literal `src=`/`href=` in the HTML;
  dynamically-injected resources (rare for design HTML) won't be surfaced until
  runtime CSP-violation events are wired (deferred).
- **Config drift** — the `[project.document.preview]` schema must stay in
  `domain-contracts` so CLI/MCP/server all validate identically.
- **Dialog UX** — the surfacing dialog must not become a nag loop; once
  domains are approved, subsequent previews mint immediately.

## Open Decisions

- **Where the whitelist persists** — `.mdt-config.toml` (per-project, committed)
  vs. a separate browser-side preference (per-user, not committed). Recommended:
  `.mdt-config.toml` so a team shares the decision. Confirm before Slice 2.
- **Scope of allowedExternalDomains** — hostname only (`cdn.tailwindcss.com`)
  vs. origin with scheme (`https://cdn.tailwindcss.com`). Recommended:
  hostname only (scheme forced to https in the CSP). Confirm before Slice 1.
