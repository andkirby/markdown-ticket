# Requirements: MDT-165

**Source**: [MDT-165](../MDT-165-markdown-it-wireframe.md)
**Generated**: 2026-05-15

## Overview

MDT-165 migrates the markdown rendering pipeline from Showdown to markdown-it, enabling labeled wireframe code blocks with metadata in the fence info string. The migration touches the rendering step, heading ID generation, table-of-contents extraction, Mermaid post-processing regex, Wireloom fenced-block rendering, and all Showdown consumers. 13 behavioral requirements, 6 constraints, and 6 edge cases are specified.

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
| Mermaid rendering source | Browser rendering uses decoded Mermaid fence source preserved separately from the mutated DOM node | Let Mermaid read escaped markdown-it HTML from `.mermaid` DOM | Prevents valid diagrams with quotes or escaped entities from rendering Mermaid syntax-error fallback |
| Wireloom render defaults | MDT owns explicit Wireloom defaults at the integration boundary: `theme: "default"` in light mode, `theme: "dark"` in dark mode, and compact annotation line wrapping before render | Rely on implicit package defaults or require authors to hand-wrap every long annotation | Wireloom is pre-1.0; central defaults make future package changes and 0.7.0 behavior auditable |

## Open Questions

None. All semantic conflicts resolved in Non-Ambiguity Table above.

## UAT Refinement: Mermaid Render Source

UAT on 2026-05-22 found that raw Mermaid code from `docs/CRs/MDT-157/architecture.md` was valid in external Mermaid editors and `mdopen`, but MDT displayed Mermaid's syntax-error fallback. The approved refinement keeps `BR-6` in place and clarifies that Mermaid blocks must preserve decoded fence source separately from rendered DOM before browser rendering.

Affected requirement:

- `BR-6`: refined in place. Mermaid compatibility means browser diagrams render from preserved decoded source, not from markdown-it escaped DOM text.

## UAT Refinement: Wireloom 0.7.0 Defaults

UAT on 2026-06-08 found that the Wireloom integration exists in the markdown-it/post-render pipeline and `wireloom` is upgraded to `^0.7.0` from upstream commit `bc075376`, but Wireloom behavior needs to be explicit in the ticket rather than living only in implementation notes.

Approved changes:

- Add first-class support requirements for `wireloom` fenced blocks rendering as inline SVG.
- Centralize MDT-owned Wireloom render defaults so the app does not rely on implicit package defaults.
- Compact long Wireloom annotation bodies before render so callouts wrap and do not expand the whole SVG unnecessarily.
- Keep the existing no-crash markdown rendering contract when Wireloom source is malformed or the package cannot load.

Affected requirement IDs:

- `BR-12`: added. Wireloom fenced blocks render as inline SVG through the shared markdown pipeline with explicit MDT defaults.
- `BR-13`: added. Malformed Wireloom source shows a useful inline error and does not crash the markdown surface.
- `C6`: added. Wireloom render defaults, including theme and compact annotation layout, are centralized at the integration boundary.
- `Edge-6`: added. Missing/unloadable Wireloom falls back to escaped plain code.

---
*Rendered by /mdt:requirements via spec-trace*
