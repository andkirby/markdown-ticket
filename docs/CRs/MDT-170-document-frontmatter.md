---
code: MDT-170
status: Implemented
dateCreated: 2026-05-17T21:30:01.075Z
type: Feature Enhancement
priority: Medium
---

# Render document frontmatter

## 1. Description

### Requirements Scope
full

### Problem
- Documents View currently renders leading markdown frontmatter as normal document content.
- Users need document metadata to be visible without polluting the rendered markdown body or table of contents.
- Code block styling should follow the app light/dark theme instead of always using a dark Prism theme.

### Affected Areas
- Frontend: Documents View markdown preview and frontmatter display.
- Styling: Markdown code block syntax highlighting, light/dark theme tokens, and Documents View component CSS.
- Tests: Frontend rendering and markdown processing behavior.
- Documentation: Documents View design/spec artifacts.

### Scope
- In scope: Detect valid leading `--- ... ---` frontmatter in document previews.
- In scope: Render valid frontmatter as a collapsed `Frontmatter` disclosure above the markdown body.
- In scope: Keep raw frontmatter escaped and syntax-highlighted as YAML.
- In scope: Remove valid frontmatter from the rendered markdown body and table of contents.
- In scope: Leave invalid, non-leading, or unterminated markers in normal markdown flow.
- In scope: Make Prism code blocks use app light/dark theme colors while preserving JetBrains Mono.
- Out of scope: Parsing frontmatter into editable fields.
- Out of scope: Writing or mutating document frontmatter.
- Out of scope: Changing ticket frontmatter behavior.

## 2. Desired Outcome

### Success Conditions
- A document with valid leading frontmatter shows a collapsed `Frontmatter` disclosure above the rendered body.
- Expanding the disclosure shows raw metadata text with YAML syntax highlighting.
- The rendered markdown body starts after the frontmatter markers.
- The document table of contents excludes frontmatter content.
- Files without valid leading frontmatter render as before.
- Code blocks use a light background in light mode and a dark background in dark mode.
- Code blocks keep the existing JetBrains Mono code font.

### Constraints
- Frontmatter detection must match mdopen behavior for leading standalone `---` markers.
- Frontmatter must be escaped as text and must not render embedded HTML.
- The UI must use native disclosure semantics where practical.
- Styling must follow `src/STYLING.md` and use theme tokens for reusable semantic colors.
- The implementation must not add a YAML parsing dependency for display-only metadata.

### Non-Goals
- Do not convert frontmatter into forms, badges, chips, or tables.
- Do not introduce a second markdown renderer.
- Do not change document discovery, routing, or file watching behavior.
- Do not change project or ticket metadata persistence.

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Frontmatter | Should future formats beyond YAML-like text be visually labeled differently? | Current requirement treats all leading metadata as raw text. |
| Highlighting | Which token colors should be tuned after visual review? | Must remain readable in light and dark themes. |
| Print | Should document frontmatter be included or excluded in print views later? | Current scope is screen preview only. |

### Known Constraints
- Must preserve markdown content safety by escaping frontmatter.
- Must preserve existing relative timestamp placement in Documents View.
- Must preserve existing markdown code fence processing.
- Must use project-owned CSS and design tokens rather than a global always-dark Prism theme.

### Decisions Deferred
- Any editable metadata surface is deferred to a separate CR.
- Any print-specific frontmatter behavior is deferred to a separate CR.
- Exact token color tuning after visual QA is deferred to implementation review.

## 4. Acceptance Criteria

### Functional
- [ ] Valid leading frontmatter is extracted before markdown rendering.
- [ ] Extracted frontmatter appears in a collapsed `Frontmatter` disclosure.
- [ ] Expanded frontmatter displays raw escaped text.
- [ ] Frontmatter code has YAML syntax highlighting.
- [ ] Markdown body does not include extracted frontmatter markers or metadata.
- [ ] Table of contents is generated from the markdown body only.
- [ ] Invalid, non-leading, or unterminated frontmatter markers remain in normal markdown content.
- [ ] Light theme code blocks use a light code surface.
- [ ] Dark theme code blocks use a dark code surface.
- [ ] Code blocks use JetBrains Mono.

### Non-Functional
- [ ] No new frontmatter parsing dependency is required.
- [ ] Syntax highlighting does not use unsafe raw HTML injection.
- [ ] CSS uses theme tokens for code colors.
- [ ] Component CSS follows existing Documents View class naming.

### Edge Cases
- Empty frontmatter block.
- CRLF line endings.
- Frontmatter containing HTML-like text.
- File beginning with text before `---`.
- Opening `---` without closing marker.
- Markdown body empty after valid frontmatter.

## 5. Verification

### How to Verify Success
- Manual verification: Open a document with leading frontmatter and confirm the disclosure appears above the body.
- Manual verification: Expand the disclosure and confirm YAML highlighting and escaped text.
- Manual verification: Toggle light/dark theme and confirm code block backgrounds follow the theme.
- Automated verification: Component tests cover valid frontmatter, escaped HTML-like metadata, and invalid marker behavior.
- Automated verification: Markdown processing tests continue to pass for code fences and syntax highlighting.
- Automated verification: TypeScript validation and production build pass.