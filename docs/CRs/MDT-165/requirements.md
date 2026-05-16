# Requirements: MDT-165

**Source**: [MDT-165](../MDT-165-markdown-it-wireframe.md)
**Generated**: 2026-05-15

## Overview

MDT-165 migrates the markdown rendering pipeline from Showdown to markdown-it, enabling labeled wireframe code blocks with metadata in the fence info string. The migration touches the rendering step, heading ID generation, table-of-contents extraction, Mermaid post-processing regex, and all Showdown consumers. 11 behavioral requirements, 5 constraints, and 5 edge cases are specified.

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | architecture.md (Security / Wireframe Plugin), tests.md (XSS escaping tests) |
| C2 | architecture.md (Performance), tests.md (benchmark comparison) |
| C3 | architecture.md (Dependency Changes), tasks.md (remove showdown) |
| C4 | architecture.md (Pipeline Shape), tests.md (integration test) |
| C5 | architecture.md (Heading ID Plugin), tests.md (slug parity tests) |
| (via BR-11) | architecture.md (TOC Extraction), tests.md (TOC heading extraction tests) |

## Non-Ambiguity Table

| Concept | Final Semantic (chosen truth) | Rejected Semantic | Why |
|---------|-------------------------------|-------------------|-----|
| Wireframe label content | Full `token.info` string (everything after `wireframe` in the fence info) | Only parsed key-value pairs (e.g., `state:surface`) | Simpler, preserves raw metadata for display; parsing can be added later if needed |
| Heading ID slug format | GitHub-compatible: lowercase, hyphens for spaces, strip non-alphanumeric (matching Showdown's `ghCompatibleHeaderId`) | markdown-it-anchor default slug (may differ in Unicode or edge-case handling) | Must match existing TOC anchor navigation and in-document links |
| Pipeline step boundary | `preprocessMarkdown` returns markdown string; markdown-it renders to HTML string; remaining steps operate on HTML | Merging preprocessing into markdown-it plugin chain | Preserves existing step isolation; preprocessor protects code blocks from link conversion which must happen before rendering |
| Showdown removal scope | Full removal: `useMarkdownProcessor.ts`, `tableOfContents.ts`, both test files, and `package.json` dependency | Keep as devDependency for test assertions | No consumer remains after migration; keeping it adds dead dependency weight |
| Task list plugin output | Must produce `<input type="checkbox">` with `disabled` and `checked` attributes inside `<li>` elements | Any checkbox markup variant | DOMPurify whitelist only allows these specific attributes on `<input>` |
| Strikethrough output | `<s>` tag (markdown-it default) | `<del>` tag (Showdown output) | DOMPurify config updated to allow `<s>`; test assertions updated |
| Heading anchor rendering | Entire heading text wrapped in `<a class="header-anchor">`, `#` via CSS `::after` on hover | Separate permalink `#` link after heading text | Clickable title is more intuitive; CSS hover avoids visual noise |
| Heading scroll offset | `scroll-margin-top: 3rem` on `.prose [id]` | No offset | Sticky tab bar covers headings at viewport top; offset ensures visibility |

## Open Questions

None. All semantic conflicts resolved in Non-Ambiguity Table above.

---
*Rendered by /mdt:requirements via spec-trace*
