---
code: MDT-165
status: Implemented
dateCreated: 2026-05-15T13:30:20.245Z
type: Feature Enhancement
priority: Medium
---

# Migrate MarkdownContent from Showdown to markdown-it for labeled wireframe blocks

## 1. Description

### Requirements Scope
`full` — specific artifacts and concrete changes identified

### Problem
- Showdown fails to parse fenced code blocks with metadata in the info string (e.g., ` ```wireframe state:surface empty `), silently dropping or misrendering the metadata
- markdown-it correctly parses the full fence info string as `token.info`, enabling labeled wireframe code blocks
- Wireframe blocks with metadata (e.g., state, surface name) need a visible label rendered above the code block for context

### Affected Artifacts
- `src/components/MarkdownContent/useMarkdownProcessor.ts` (primary — replace Showdown converter with markdown-it)
- `src/components/MarkdownContent/domPurifyConfig.ts` (may need tag/attr updates for label `div`)
- `src/utils/markdownPreprocessor.ts` (pipeline integration, unchanged behavior)
- `src/utils/mermaid/core.ts` (Mermaid post-processing must remain compatible)
- `src/utils/syntaxHighlight.ts` (Prism highlighting must remain compatible)
- `package.json` (add markdown-it as direct dependency)

### Scope
- **Changes**: Replace Showdown with markdown-it in `useMarkdownProcessor.ts`; add custom fence renderer for wireframe blocks with metadata; add markdown-it + plugins as direct deps
- **Unchanged**: Preprocessing pipeline (`preprocessMarkdown` → render → `processMermaidBlocks` → `highlightCodeBlocks` → DOMPurify); Mermaid rendering; Prism highlighting; smart-link preprocessing; DOMPurify sanitization; all unrelated UI

## 2. Decision

### Chosen Approach
Migrate `useMarkdownProcessor.ts` from Showdown to markdown-it with a custom fence renderer that wraps wireframe blocks containing metadata in a labeled `div`.

### Rationale
- markdown-it already exists as a transitive dep and correctly preserves full info strings in `token.info`, which Showdown cannot do
- Custom fence renderer is a single plugin function — minimal, no framework overhead
- markdown-it has well-maintained plugins for tables, strikethrough, and task lists, matching Showdown's current feature set
- Pipeline shape remains identical: preprocess → render → mermaid → highlight → sanitize
- Escaping label text via markdown-it's built-in `escapeHtml` prevents XSS without extra dependencies

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **markdown-it + custom fence** | One plugin function for wireframe labels | **ACCEPTED** — minimal diff, preserves pipeline |
| Extend Showdown with custom extension | Patch Showdown to handle info strings | Showdown's extension API is fragile; info string parsing is non-trivial |
| Regex post-processing of Showdown output | Find wireframe blocks in HTML, inject labels | Fragile regex on HTML; brittle across edge cases |
| Unified/remark ecosystem | Full AST-based rendering | Massive migration scope; rewrites pipeline; no need for AST power |

## 4. Artifact Specifications

### New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| `src/utils/markdownItWireframePlugin.ts` | Utility | Custom markdown-it fence plugin rendering labeled wireframe blocks |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `src/components/MarkdownContent/useMarkdownProcessor.ts` | Rewrite render step | Replace `showdown.Converter` with `markdown-it` instance + wireframe plugin |
| `src/components/MarkdownContent/domPurifyConfig.ts` | Config update | Add `div` class `code-block-label`/`wireframe-label` to allowed attrs if needed |
| `package.json` | Dependency added | Add `markdown-it` as direct dependency; add `markdown-it-task-lists` (or equivalent) for task list support; remove `showdown` if no other consumer |

### Integration Points

| From | To | Interface |
|------|----|-----------|
| `useMarkdownProcessor` | `markdown-it` | `md.render(preprocessed)` replaces `converter.makeHtml()` |
| `markdown-it` | `markdownItWireframePlugin` | Plugin via `md.use(plugin)` |
| `useMarkdownProcessor` | `processMermaidBlocks` | HTML output from markdown-it fed to existing Mermaid processor |
| `useMarkdownProcessor` | `highlightCodeBlocks` | HTML output fed to existing Prism highlighter |

### Key Patterns
- Custom fence renderer: Override `md.renderer.rules.fence` to detect `wireframe` language + non-empty `token.info`, emit label div + code block
- Pipeline preservation: `preprocessMarkdown → md.render() → processMermaidBlocks → highlightCodeBlocks → DOMPurify.sanitize()`
- Heading anchors: Entire heading text is wrapped in `<a class="header-anchor" href="#slug">` making the full title clickable; `#` appears on hover via CSS `::after` (GitHub-style); `scroll-margin-top: 3rem` offsets headings below the sticky tab bar
- HTML parser guard: `useHtmlParser.ts` skips `<a class="header-anchor">` to prevent SmartLink wrapping of heading permalinks

## 5. Acceptance Criteria

### Functional
- [x] `useMarkdownProcessor.ts` uses markdown-it instead of Showdown
- [x] ` ```wireframe state:surface empty ` renders as `<div class="code-block-label wireframe-label">state:surface empty</div><pre><code class="language-wireframe">...</code></pre>`
- [x] Plain ` ```wireframe ` (no metadata) renders as normal code block without label
- [x] Tables render correctly (markdown-it `table` plugin enabled)
- [x] Strikethrough (`~~text~~`) renders correctly with `<s>` tag
- [x] Task lists (`- [ ]` / `- [x]`) render correctly with `markdown-it-task-lists` plugin
- [x] Mermaid blocks produce markup compatible with `processMermaidBlocks` in `src/utils/mermaid/core.ts`
- [x] Prism syntax highlighting works on fenced code blocks via `highlightCodeBlocks`
- [x] Smart-link preprocessing (`preprocessMarkdown`) continues to work unchanged
- [x] DOMPurify sanitization allows the new label markup
- [x] Heading titles are clickable — entire heading text wrapped in `<a class="header-anchor" href="#slug">`
- [x] `#` permalink symbol appears on heading hover via CSS `::after` (hidden by default)
- [x] HTML parser skips `header-anchor` links to prevent SmartLink wrapping
- [x] Anchor navigation scrolls headings below sticky tab bar (`scroll-margin-top: 3rem`)

### Non-Functional
- [x] Label text is HTML-escaped via `escapeHtml` (no XSS vector)
- [x] No change to rendering performance for non-wireframe content
- [x] `showdown` removed from direct dependencies

### Testing
- Unit: `markdown-it` renders `wireframe state:surface empty` fence as labeled block
- Unit: Normal code blocks still render with `<pre><code>` structure
- Unit: Mermaid fence output remains compatible with `processMermaidBlocks`
- Unit: Tables render with `<table>` structure
- Unit: Task lists render with checkbox input elements
- Unit: Strikethrough renders with `<s>` tags
- Unit: Heading anchor wraps entire title text in clickable link
- Unit: `scroll-margin-top` applied to elements with `[id]` in `.prose`
- E2E: 4/4 scenarios GREEN

## 6. Verification

### How to Verify
- `bun run validate:ts` passes with no new errors
- Frontend unit tests pass (80/80)
- `bun run build` succeeds
- Visual: wireframe code block with metadata shows label above code in rendered markdown
- Visual: heading titles are clickable, `#` appears on hover, scrolls below sticky tab bar

### Verifiable Artifacts
- `src/components/MarkdownContent/useMarkdownProcessor.ts` imports markdown-it, not showdown
- `src/utils/markdownItWireframePlugin.ts` exists and exports a markdown-it plugin function
- `package.json` lists `markdown-it` as direct dependency
- Existing test suite passes without regression

## 7. Deployment

- Standard frontend build — no server changes
- `bun install` to pick up new direct dependency
- No configuration changes required

---

> Requirements trace projection: [requirements.trace.md](./MDT-165/requirements.trace.md)
>
> Requirements notes: [requirements.md](./MDT-165/requirements.md)
>
> BDD trace projection: [bdd.trace.md](./MDT-165/bdd.trace.md)
>
> BDD notes: [bdd.md](./MDT-165/bdd.md)
>
> Architecture trace projection: [architecture.trace.md](./MDT-165/architecture.trace.md)
>
> Architecture notes: [architecture.md](./MDT-165/architecture.md)
>
> Tests trace projection: [tests.trace.md](./MDT-165/tests.trace.md)
>
> Tests notes: [tests.md](./MDT-165/tests.md)