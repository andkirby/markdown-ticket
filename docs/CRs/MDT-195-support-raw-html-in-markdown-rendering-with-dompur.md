---
code: MDT-195
status: Proposed
dateCreated: 2026-07-19T20:29:56.562Z
type: Feature Enhancement
priority: Medium
---

# Support raw HTML in markdown rendering with DOMPurify safety

## 1. Description

### Problem Statement
The markdown renderer escapes raw HTML at parse time, so authors cannot embed
HTML constructs that markdown has no syntax for. The motivating example:

```md
<a href="https://example.com" target="_blank">example-dot-com</a>
```

…renders as the literal escaped text `<a href="https://example.com" target="_blank">example-dot-com</a>`
instead of a clickable link.

### Current State
`useMarkdownProcessor.ts` configures markdown-it with `html: false`. This causes
the parser to escape *all* raw HTML at the token level, so authored HTML never
reaches the rest of the pipeline. The downstream safety layers — DOMPurify
allowlist (`domPurifyConfig.ts`) and SmartLink anchor reconstruction
(`useHtmlParser.ts` + `SmartLink/index.tsx`) — are already configured for safe
HTML support (`a`, `href`, `target`, `rel` are all allowlisted; SmartLink forces
`target="_blank" rel="noopener noreferrer"` on external links). Only the parser
flag is blocking.

### Desired State
- Authored raw HTML for allowlisted tags/attributes passes through to the DOM.
- Every XSS vector (script tags, event-handler attributes, dangerous URI schemes,
  disallowed tags) is stripped before render by DOMPurify — the project's
  designated security boundary
  (`docs/architecture/auth-and-sharing-architecture.md:295`).
- The motivating example renders as a clickable external link with the
  ExternalLink icon and `target="_blank" rel="noopener noreferrer"`.

### Rationale
Authors need occasional HTML constructs (e.g. `target="_blank"` anchors, `<kbd>`
keys) that markdown has no syntax for. The project already pays the cost of a
DOMPurify allowlist; flipping the parser flag unlocks the capability with no new
security surface.

### Impact Areas
- Frontend: `src/components/MarkdownContent/useMarkdownProcessor.ts` (single flag
  flip + explanatory comment)
- Tests: `src/components/MarkdownContent/useMarkdownProcessor.test.ts` (helper
  mirror, one regression-test replacement, new XSS-safety block)
- Consumers (`TicketViewer`, `DocumentsView/MarkdownViewer`) inherit the change
  automatically — they share `<MarkdownContent>`

## 2. Solution Analysis

### Approaches Considered
1. **Enable HTML, rely on DOMPurify** (chosen) — flip `html: false → html:true`.
   Existing allowlist already permits the user's `<a target=_blank>` example.
2. HTML + explicit DOMPurify hardening (`ALLOWED_URI_REGEXP`, `ADD_ATTR`
   tightening) — rejected: DOMPurify defaults already cover the threat model;
   additional config adds maintenance without measurable safety gain.
3. HTML + extended allowlist (`<b>`, `<i>`, `<u>`, `<kbd>`, `<mark>`, `<sub>`,
   `<sup>`, `<dl>`) — rejected as scope creep; file a follow-up if authors need
   more tags.

### Chosen Approach
Flip the single `html` flag in markdown-it. The three-layer threat model below
already enforces safety.

### Rejected Alternatives
- Hand-rolled HTML allowlist pass between markdown-it and DOMPurify — duplicates
  work DOMPurify already does.
- Switching to `rehype-raw` + `rehype-sanitize` — would require replacing
  markdown-it entirely; far out of scope.

## 3. Threat Model (Security)

Three layers between raw markdown and the rendered DOM:

1. **markdown-it `html: true`** — passes raw HTML through as parsed tokens (the
   only change in this CR).
2. **DOMPurify** (`useMarkdownProcessor.ts:115-118`) — final sanitization with
   explicit allowlist (`domPurifyConfig.ts`):
   - Strips `<script>`, `<iframe>`, `<object>`, `<embed>` (not in `ALLOWED_TAGS`)
   - Strips event-handler attributes (`onerror`, `onclick`, …) — not in
     `ALLOWED_ATTR`
   - Strips dangerous URI schemes on `href`/`src` (`javascript:`, non-image
     `data:`) via DOMPurify defaults
   - `ALLOWED_TAGS` already includes `a`, `img`, `code`, `div`, `span`;
     `ALLOWED_ATTR` already includes `href`, `target`, `rel`
3. **SmartLink** (`useHtmlParser.ts:17-47` + `SmartLink/index.tsx`) — every
   surviving `<a>` is rebuilt from scratch by React; external links are forced
   to `target="_blank" rel="noopener noreferrer"`. Any author-supplied
   `target`/`rel`/handlers are discarded because the element is reconstructed.

Net: safe tags reach the DOM; every XSS vector is stripped before render by
DOMPurify — the same library that is already the project's designated security
boundary (`MDT-156/security-audit-research.md`,
`docs/architecture/auth-and-sharing-architecture.md:295`).

### Out of Scope (filed separately)
Two pre-existing sanitization gaps unrelated to HTML support were identified
during investigation and deliberately left untouched per scope decision:
- `useMarkdownProcessor.ts:122-125` — catch block renders `error.message` to HTML
  without DOMPurify
- `DocumentsView/MarkdownViewer.tsx:208` — Prism-highlighted YAML frontmatter
  rendered via `html-react-parser` without DOMPurify

These should be filed as a follow-up idea/ticket.

## 4. Acceptance Criteria

- **AC-1**: `<a href="https://example.com" target="_blank">example-dot-com</a>`
  in markdown renders as a clickable external link with `target="_blank"`
  preserved through sanitization.
- **AC-2**: `<script>` tags are stripped before render.
- **AC-3**: Event-handler attributes (`onerror`, `onclick`) are stripped before
  render.
- **AC-4**: `javascript:` URIs on `href` are stripped before render.
- **AC-5**: Disallowed tags like `<iframe>` are stripped entirely before render.
- **AC-6**: Unknown tags like `<key>` are dropped (inner text preserved).
- **AC-7**: Existing pipeline tests (wireframe label XSS escaping, mermaid,
  prism, headings, preprocessor, task lists) continue to pass.
- **AC-8**: `bun test src/components/MarkdownContent/` and dependent suites
  (`MarkdownViewer.test.tsx`, `TicketViewer.test.tsx`,
  `markdownPreprocessor*.test.ts`) are green.

## 5. Implementation Notes

### Changes
- `src/components/MarkdownContent/useMarkdownProcessor.ts:40` — `html: false →
  html: true` with security-boundary comment.
- `src/components/MarkdownContent/useMarkdownProcessor.test.ts`:
  - `createProcessorMd()` helper: `html: false → html: true` (mirrors production)
  - Replaced test `'keeps angle-bracket placeholders as text instead of opening
    raw HTML tags'` with `'renders inline raw HTML in table cells (html: true
    regression)'` asserting the new correct behavior.
  - Added `describe('raw HTML support (html: true) + XSS safety')` block with 7
    tests covering AC-1 through AC-6.

### Verification
- `bun test src/components/MarkdownContent/useMarkdownProcessor.test.ts` — 27/27
  pass
- `bun test src/components/MarkdownContent/ src/components/DocumentsView/MarkdownViewer.test.tsx src/components/TicketViewer/TicketViewer.test.tsx` — 47/47 pass
- `bun test src/utils/markdownPreprocessor*.test.ts src/utils/markdownItWireframePlugin.test.ts src/utils/wireloomRenderer.test.ts` — 48/48 pass
- `bunx tsc --noEmit` — no errors in `MarkdownContent/*`
- `bunx eslint` on changed files — clean

## 6. References
- Originating investigation: pipeline analysis of `useMarkdownProcessor.ts` →
  DOMPurify → SmartLink.
- Security boundary policy: `docs/architecture/auth-and-sharing-architecture.md:295`
- DOMPurify audit: `docs/CRs/MDT-156/security-audit-research.md`
- SmartLink CR: `docs/CRs/MDT-059-implement-smart-link-conversion-for-markdown-conte.md`
- Render-pipeline consolidation: `docs/CRs/MDT-060-consolidate-duplicate-markdown-rendering-logic-int.md`