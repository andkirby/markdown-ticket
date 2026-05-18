---
code: MDT-173
status: In Progress
dateCreated: 2026-05-18T14:33:40.639Z
type: Feature Enhancement
priority: High
---

# Implement markdown typography variants

## 1. Description

### Requirements Scope
`full`

### Problem
- `src/components/MarkdownContent/index.tsx` applies one default `prose prose-sm max-w-none` class to all primary markdown reading surfaces.
- `src/styles/prose.css` styles code, tables, anchors, Mermaid, and Wireloom but does not define durable typography rhythm for headings, paragraphs, lists, blockquotes, tables, or reading-width variants.
- `src/components/DocumentsView/MarkdownViewer.tsx` renders full documents without a document-specific prose measure, causing wide desktop lines and broken mobile reading with the persistent navigation pane.
- `src/components/TicketViewer/index.tsx` renders ticket markdown without an explicit compact ticket prose contract, so section rhythm and timestamp spacing are implicit.

### Affected Artifacts
- `src/components/MarkdownContent/index.tsx` - prose variant class contract and default behavior.
- `src/styles/prose.css` - markdown typography, rich content styling, and prose variants.
- `src/components/DocumentsView/MarkdownViewer.tsx` - document prose variant usage and viewer content measure.
- `src/components/DocumentsView/documents-view.css` - document viewer layout and responsive reading behavior.
- `src/components/TicketViewer/index.tsx` - ticket prose variant usage and timestamp/content spacing.
- `src/components/MarkdownContent/*.test.tsx` - renderer and class contract coverage.
- `src/components/DocumentsView/*.test.tsx` - document viewer variant and responsive behavior coverage.
- `src/components/TicketViewer/*.test.tsx` - ticket viewer variant and timestamp/content coverage.
- `docs/design/surfaces/markdown-content.spec.md` - source UX contract.
- `docs/design/surfaces/markdown-content.mockups.md` - source UX review artifact.

### Scope
- Changes: implement the markdown typography variants defined by `docs/design/surfaces/markdown-content.spec.md`.
- Changes: apply the document variant in Documents View and the ticket variant in Ticket Viewer.
- Changes: improve markdown styling for headings, paragraphs, lists, task lists, links, inline code, code blocks, tables, blockquotes, rules, images, Mermaid fallback, and Wireloom fallback.
- Changes: make Documents View mobile reading single-pane or otherwise prevent the persistent tree from squeezing the markdown preview.
- Unchanged: markdown parsing pipeline, SmartLink classification, Mermaid rendering logic, Wireloom rendering logic, ticket data model, document file discovery, and backend APIs.

## 2. Decision

### Chosen Approach
Add scoped `.prose--document`, `.prose--ticket`, and `.prose--compact` modifiers in `src/styles/prose.css` and apply them from existing viewer components.

### Rationale
- `src/STYLING.md` already assigns prose and markdown rendering to `src/styles/prose.css`, so variant classes fit the existing CSS architecture.
- `MarkdownContent` remains the shared rendering component while viewers choose density through `className` composition.
- `DocumentsView` and `TicketViewer` need different reading density, so a single global `.prose` rhythm would regress one surface.
- Tokenized CSS keeps dark mode and code-theme behavior aligned with `src/styles/design-tokens.css`.
- Viewer-owned layout remains separate from prose internals, matching the `STYLING.md` component boundary.

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|----------------|--------------|
| **Chosen Approach** | Add scoped prose modifier classes and apply them from viewers | **ACCEPTED** - Reuses `prose.css` and keeps viewer layout separate |
| Global `.prose` rewrite only | One rhythm for every markdown consumer | Rejected because documents and ticket modals need different density |
| Inline Tailwind overrides in each viewer | Viewer components own markdown descendant styling | Rejected because markdown internals become duplicated and hard to keep tokenized |
| Add a new markdown renderer component per surface | Split renderer by consumer | Rejected because parsing, SmartLink, Mermaid, and Wireloom behavior should stay shared |
| Defer mobile layout | Only improve desktop typography | Rejected because live review showed Documents View mobile reading is currently squeezed and overlapping |

## 4. Artifact Specifications

### New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| None | n/a | Reuse existing renderer, CSS, viewer, and test files |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `src/styles/prose.css` | CSS expanded | Add `.prose--document`, `.prose--ticket`, `.prose--compact`, and tokenized descendant styles |
| `src/components/MarkdownContent/index.tsx` | Class contract updated | Preserve default rendering while allowing stable variant classes from consumers |
| `src/components/DocumentsView/MarkdownViewer.tsx` | Variant applied | Render document markdown with `.prose--document` |
| `src/components/DocumentsView/documents-view.css` | Layout updated | Add readable measure and responsive single-pane preview behavior |
| `src/components/TicketViewer/index.tsx` | Variant applied | Render ticket markdown with `.prose--ticket` and avoid timestamp overlap |
| `src/components/MarkdownContent/useHtmlParser.ts` | Link focus compatibility checked | Preserve SmartLink replacement and heading-anchor behavior |
| `src/components/MarkdownContent/useMarkdownProcessor.ts` | Pipeline compatibility checked | Preserve markdown-it plugin behavior |
| `src/components/MarkdownContent/useMarkdownProcessor.test.ts` | Tests updated | Verify markdown output remains compatible with new prose classes |
| `src/components/DocumentsView/MarkdownViewer.test.tsx` | Tests updated | Verify document prose variant is applied |
| `src/components/TicketViewer` tests | Tests updated | Verify ticket prose variant is applied |
| `tests/e2e` relevant document/ticket specs | E2E updated | Cover desktop and mobile markdown reading surfaces if existing tests fit |

### Integration Points

| From | To | Interface |
|------|----|-----------|
| `MarkdownViewer` | `MarkdownContent` | `className` includes `.prose--document` |
| `TicketViewer` | `MarkdownContent` | `className` includes `.prose--ticket` |
| `MarkdownContent` | `useMarkdownProcessor` | Existing markdown string to sanitized/rendered HTML pipeline |
| `MarkdownContent` | `SmartLink` | Existing anchor replacement through `getHtmlParserOptions()` |
| `prose.css` | `design-tokens.css` | `--foreground`, `--muted-foreground`, `--primary`, `--border`, `--code-*`, `--ring` |
| Documents View layout | TableOfContents | Mobile ToC must not cover active reading content by default |

### Key Patterns
- CSS modifier pattern: `.prose--document`, `.prose--ticket`, `.prose--compact` follow `src/STYLING.md` structural modifier guidance.
- Tokenized theme pattern: markdown colors use existing CSS variables from `src/styles/design-tokens.css`.
- Viewer boundary pattern: pane padding, scrolling, and mobile layout stay in viewer CSS; markdown descendants stay in `prose.css`.
- Shared renderer pattern: `MarkdownContent` keeps one parsing/rendering pipeline for tickets and documents.
- Reading measure pattern: document prose targets about `72ch`; tablet two-pane layout is allowed only when the prose column remains at least `48ch`.
- Word wrapping pattern: long links, file paths, and identifiers may wrap, but normal words must not break letter-by-letter.

## 5. Acceptance Criteria

### Functional
- [ ] `src/styles/prose.css` defines `.prose--document`, `.prose--ticket`, and `.prose--compact` modifiers.
- [ ] Document prose body text reads at 15-16px with line-height near 1.65.
- [ ] Ticket prose body text reads at 14-15px with line-height near 1.55-1.65.
- [ ] `src/styles/prose.css` defines explicit markdown rhythm for headings, paragraphs, lists, task lists, blockquotes, horizontal rules, links, inline code, code blocks, tables, and images.
- [ ] Task-list checkboxes align with the first text baseline and do not add extra left jitter.
- [ ] Long links, file paths, and identifiers wrap without forcing normal words to break letter-by-letter.
- [ ] `src/styles/prose.css` uses theme tokens for prose text, links, borders, code, selection, fallback Wireloom states, and focus treatment.
- [ ] Markdown links expose hover and keyboard focus treatment using `--primary` and `--ring`.
- [ ] `src/components/DocumentsView/MarkdownViewer.tsx` renders markdown with the document prose variant.
- [ ] Documents View constrains document reading width while allowing tables, diagrams, and code blocks to scroll inside the viewer.
- [ ] Documents View mobile preview does not keep a persistent tree beside the markdown content.
- [ ] Documents View mobile preview does not overlap the first heading with timestamp, controls, or ToC.
- [ ] `src/components/TicketViewer/index.tsx` renders markdown with the ticket prose variant.
- [ ] Ticket Viewer keeps compact ticket section rhythm and prevents timestamp overlap with the first rendered heading or paragraph.
- [ ] SmartLink, heading anchors, Mermaid diagrams, Wireloom blocks, images, and syntax-highlighted code still render after the styling changes.

### Non-Functional
- [ ] Styling follows `src/STYLING.md` class taxonomy and CSS location rules.
- [ ] No markdown typography rules are added to `src/styles/base.css` except existing global heading defaults.
- [ ] No backend, ticket model, document discovery, or markdown parsing behavior changes are introduced.
- [ ] Dark mode keeps readable contrast for prose, links, code blocks, tables, blockquotes, Mermaid fallback, and Wireloom fallback.
- [ ] Layout changes do not create page-level horizontal scrolling on desktop or mobile.

### Testing
- Unit: `MarkdownContent` or consumer tests verify document and ticket variant class application.
- Unit: markdown rendering tests verify headings, links, task lists, code blocks, tables, images, Mermaid, and Wireloom output remain present.
- Unit: Documents View tests verify selected markdown uses document prose and frontmatter still renders above body.
- Unit: Ticket Viewer tests verify selected ticket content uses ticket prose and loading/error states still render.
- E2E or Playwright: desktop Documents View screenshot verifies readable document measure and no text/control overlap.
- E2E or Playwright: mobile Documents View screenshot verifies preview is not squeezed by persistent navigation and ToC does not cover initial reading position.
- E2E or Playwright: Ticket Viewer screenshot verifies compact prose and timestamp placement.

## 6. Verification

### By CR Type
- Feature: `src/styles/prose.css` contains the three prose variants, density targets, reading-measure rules, and tokenized markdown descendant styles.
- Feature: Documents View and Ticket Viewer call `MarkdownContent` with the expected prose variant class names.
- Feature: unit tests covering viewer class contracts pass.
- Feature: Playwright visual checks for desktop document, mobile document, and ticket viewer pass without overlap or page-level horizontal scroll.

### Metrics
- Verify artifacts exist and tests pass; no performance metric is targeted by this CR.

## 7. Deployment

### Simple Changes
- Deploy as a normal frontend change.
- No database migration required.
- No backend configuration required.
- Rollback by reverting the frontend styling and viewer class changes.

## 8. Implementation Plan

### Phase 1: Prose CSS Foundation
- Modify `src/styles/prose.css`.
- Add `.prose--document`, `.prose--ticket`, and `.prose--compact`.
- Move markdown rhythm into `.prose` descendants, not `src/styles/base.css`.
- Define paragraph, heading, list, task-list, blockquote, horizontal-rule, table, image, link, inline-code, and code-block styles.
- Replace hard-coded Wireloom pending/error fallback colors with existing theme tokens.
- Keep Mermaid and Wireloom artifact behavior scrollable inside the prose container.

### Phase 2: Viewer Integration
- Modify `src/components/DocumentsView/MarkdownViewer.tsx`.
- Pass `className="prose prose--document max-w-none dark:prose-invert"` or equivalent class composition to `MarkdownContent`.
- Modify `src/components/TicketViewer/index.tsx`.
- Pass `className="prose prose--ticket max-w-none dark:prose-invert"` or equivalent class composition to `MarkdownContent`.
- Keep `headerLevelStart={3}` behavior in Ticket Viewer unchanged.
- Preserve existing frontmatter disclosure placement above document markdown.

### Phase 3: Documents View Layout
- Modify `src/components/DocumentsView/documents-view.css`.
- Add a readable document content measure around `72ch` without blocking wide artifacts from scrolling.
- Ensure tablet two-pane layout is used only when the prose column remains at least `48ch`.
- Change mobile Documents View so preview mode is not squeezed beside a persistent navigation tree.
- Ensure timestamp, toolbar controls, and ToC do not overlap the first heading or first paragraph.

### Phase 4: Ticket Viewer Layout
- Keep Ticket Viewer content compact inside the modal.
- Ensure the floating timestamp does not cover the first rendered heading or paragraph.
- Preserve subdocument loading and error states.
- Preserve document tab behavior and ToC behavior.

### Phase 5: Unit Tests
- Update `src/components/DocumentsView/MarkdownViewer.test.tsx` to assert document prose variant class usage.
- Add or update Ticket Viewer tests to assert ticket prose variant class usage.
- Update markdown rendering tests to confirm headings, task lists, links, code blocks, tables, images, Mermaid, and Wireloom output still render.
- Keep existing SmartLink replacement tests passing.

### Phase 6: Visual Verification
- Run frontend validation for changed TypeScript files.
- Run focused unit tests for MarkdownContent, Documents View, and Ticket Viewer.
- Run Playwright checks for:
  - desktop Documents View reading measure;
  - mobile Documents View preview without tree squeeze or overlap;
  - Ticket Viewer timestamp and compact prose layout.
- Capture screenshots for the three visual checks when manually reviewing.

### Phase 7: Implementation Guardrails
- Do not change markdown-it plugins, preprocessing, SmartLink classification, Mermaid rendering logic, or Wireloom rendering logic.
- Do not add markdown typography rules to `src/styles/base.css`.
- Do not introduce backend changes.
- Do not solve unrelated Documents View navigation behavior beyond the mobile reading requirement in this CR.
