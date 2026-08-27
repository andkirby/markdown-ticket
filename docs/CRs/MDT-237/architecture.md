# Architecture: MDT-237 — Inline-code .md references as clickable links

## Overview

Extend the existing markdown linkification pipeline so that inline-code spans whose entire content is a `.md` document reference convert to the same resolved links plain-text references already produce, and give SmartLink a per-project document-existence signal so dead references render visibly broken. All navigation, URL building, scope validation, and rendering machinery stays as built by MDT-150/165.

**Pattern**: pipeline-stage classifier extension. The preprocessor's protection stage gains a classify branch; nothing downstream changes shape.

**Assess carry-forward**: Option 1 (Integrate As-Is) — both mismatch points (unconditional inline-code protection, existence flagging) get concrete structural responses below; no redesign needed.

## Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| D1 | Render-side detection only; no authoring convention introduced or enforced | Existing docs already use the convention; CR requires no reformatting (BR-1.1 context) |
| D2 | Conversion happens inside `protectInlineCode` (`src/utils/markdownPreprocessor.ts`) | Single seam; fenced blocks are already protected upstream (BR-3.1); the span regex is exact so no new tokenizer |
| D3 | Qualifying spans are re-emitted as `__LINK_PLACEHOLDER_n__` entries containing `[`ref.md`](resolvedUrl)` | Link placeholders restore **last**, after ticket-key conversion — prevents nested re-linkification corruption (the bug class MDT-150 Step 1.5 guards against) |
| D4 | Qualification = whole-span content matches `isRelativeMarkdownHref` (anchor allowed) AND `enableDocumentLinks` AND `sourcePath`+`projectCode` available | Reuses the accepted plain-text reference shape; no resolution context → verbatim (today's behavior) |
| D5 | Existence flagging via new `src/utils/documentExistenceCache.ts`; SmartLink renders DOCUMENT links with `data-link-type="broken"` when the cache knows the target is missing | Keeps MDT-150 C4 spirit (no per-link security/existence logic in URL building); one deduped `GET /api/documents` per project per session satisfies C5 |
| D6 | Traversal/out-of-scope blocking: no new code | Converted links are ordinary markdown links; `LinkNormalizer`/`classifyAndNormalizeLink` already block and flag (BR-2.2) |
| D7 | Existence flag applies to DOCUMENT-classified targets only; TICKET-classified refs keep current destination-level not-found handling | Ticket list state differs per view; scope stays bounded |
| D8 | Project-root fallback (UAT 2026-08-24): when the document index proves the ref names an existing project file (e.g. 'src/THEME.md'), resolve to the documents route; '..'-prefixed refs are never re-anchored | The docs tree excludes the tickets area by design, so ticket-relative existence is unverifiable — the knowable interpretation wins (BR-2.4) |
| D9 | Link config precedence (UAT 2026-08-24): localStorage override > CONFIG_DIR/config.toml [links] (via /api/config/global) > built-in defaults | Global config.toml was advertised but never consumed by rendering; now merged in getLinkConfig() (C6) |

## Canonical Runtime Flow

```mermaid
flowchart LR
  A[raw markdown] --> B[protectExistingLinks]
  B --> C[protectCodeBlocks]
  C --> D[protectInlineCode+classify]
  D -- span is solely .md ref --> E[resolveDocumentRef -> link placeholder]
  D -- genuine code --> F[verbatim inline-code placeholder]
  E --> G[convertTicketReferences]
  F --> G
  G --> H[convertDocumentReferences]
  H --> I[restore: code, inline, links last]
  I --> J[markdown-it render + DOMPurify]
  J --> K[SmartLink: classify + normalize + existence]
  K -->|exists| L[react-router Link, no reload]
  K -->|missing| M[broken span, flagged]
```

## Ownership

| Behavior | Owner module |
|----------|--------------|
| Span qualification + conversion | `src/utils/markdownPreprocessor.ts` |
| URL resolution | `resolveDocumentRef` (unchanged, MDT-150) |
| Existence signal | `src/utils/documentExistenceCache.ts` (new) |
| Broken rendering + client-side nav | `src/components/SmartLink/index.tsx` (existence branch added) |

## Structure

```
src/utils/markdownPreprocessor.ts          # modified: classify branch in protectInlineCode
src/utils/documentExistenceCache.ts        # proposed: per-project deduped doc index + subscribe
src/utils/documentExistenceCache.test.ts   # proposed: unit tests
src/utils/markdownPreprocessor.mdt237.test.ts # proposed: conversion/preservation unit tests
src/components/SmartLink/index.tsx         # modified: DOCUMENT existence -> broken styling
tests/e2e/ticket/inline-code-doc-links.spec.ts # proposed: Playwright acceptance
```

## Program Design (consequential bits)

```ts
// documentExistenceCache.ts (signatures only)
export interface DocumentIndex { has(filePath: string): boolean }
export function getCachedDocumentIndex(projectId: string): DocumentIndex | null // null while loading
export function subscribeDocumentIndex(projectId: string, cb: () => void): () => void
export function __testSeed(projectId: string, paths: string[]): void // test-only
```

- `protectInlineCode(markdown, state, ctx?)` gains an optional context param (`{ sourcePath, ticketKey, projectCode, ticketsPath, enableDocumentLinks }`); callers in `preprocessMarkdown` pass it through. Missing ctx ⇒ existing behavior, byte-identical.
- SmartLink: for `LinkType.DOCUMENT`, read cached index; `null` (loading/unknown) renders the normal link; known-missing renders the existing broken span (reuse L92-98 styling + `title="Document not found"`).
- Call order for a converted ref: `protectInlineCode` → `resolveDocumentRef` → link placeholder → restore → markdown-it → SmartLink `classifyAndNormalizeLink` → existence check → `<Link>`.
- Least-confident decision: D5 cache approach (evidence: DocumentsLayout L278 already consumes `GET /api/documents`; the endpoint returns the full tree). Invalidated if the endpoint proves rate-limited or the tree too large for a session cache — fallback is destination-level 404 flagging only.

## Architecture Invariants

1. Inline-code spans that are not solely a `.md` reference render byte-identically to today (BR-3.2, Edge-1).
2. Fenced code blocks are never touched (BR-3.1) — upstream protection unchanged.
3. Converted links are indistinguishable from plain-text-ref links after preprocessing (same URL builders, same SmartLink path) — one link pipeline, no fork (BR-4.1).
4. Existence checks never issue per-span network requests (C5).
5. No link URL is built outside `src/routes.ts` builders.

## Extension Rule

New convertible span shapes (e.g., other extensions) qualify only by extending `isRelativeMarkdownHref` / the qualification predicate — never by adding a second conversion pass.

## Rollback

Revert the classify branch in `protectInlineCode` (D2/D3) and the SmartLink existence branch (D5). The cache module is additive and inert without the SmartLink branch. No data migrations; no persisted state.

**Next**: UX gate, then `mdt:tests MDT-237`
