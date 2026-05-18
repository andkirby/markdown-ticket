# Markdown Content

Reusable typography and rich-content contract for rendered markdown in ticket and document surfaces.

## Composition

```text
MarkdownContent
├── ProseContainer
│   ├── Headings
│   ├── Paragraphs
│   ├── Lists
│   ├── TaskLists
│   ├── Links
│   ├── InlineCode
│   ├── CodeBlocks
│   ├── Tables
│   ├── Blockquotes
│   ├── HorizontalRules
│   ├── MermaidDiagram
│   └── WireloomFrame
└── PostRenderEnhancements
    ├── HeadingAnchors
    ├── SmartLinks
    ├── MermaidRenderer
    └── LinkValidation
```

## Children

| Child | Component | Spec | Conditional |
|-------|-----------|------|-------------|
| MarkdownContent | `src/components/MarkdownContent/index.tsx` | this spec | always for rendered markdown |
| MarkdownViewer | `src/components/DocumentsView/MarkdownViewer.tsx` | `documents-view-file-updates.spec.md` | documents route |
| TicketViewer | `src/components/TicketViewer/index.tsx` | `ticket-viewer.spec.md` | ticket modal |
| TableOfContents | `src/components/shared/TableOfContents.tsx` | owning viewer spec | when headings exist |
| SmartLink | `src/components/SmartLink` | — | when rendered markdown contains links |

## Source files

| Type | Path |
|------|------|
| Renderer | `src/components/MarkdownContent/index.tsx` |
| Markdown pipeline | `src/components/MarkdownContent/useMarkdownProcessor.ts` |
| Parser options | `src/components/MarkdownContent/useHtmlParser.ts` |
| Prose CSS | `src/styles/prose.css` |
| Base typography | `src/styles/base.css` |
| Tokens | `src/styles/design-tokens.css` |

## Variants

| Variant | Consumer | Class Contract | Purpose |
|---------|----------|----------------|---------|
| document | Documents View | `.prose.prose--document` | Reading-first full markdown documents |
| ticket | Ticket Viewer | `.prose.prose--ticket` | Dense ticket body inside modal |
| compact | Small previews or constrained panes | `.prose.prose--compact` | Short excerpts without large section rhythm |

Default `MarkdownContent` may keep the current base `prose` class, but every primary reading surface should opt into one of these variants.

## Typography Rules

- Body text uses Inter, `--foreground`, and a comfortable line height.
- Document variant body text should read at 15-16px with line-height near 1.65.
- Ticket variant body text should stay compact at 14-15px with line-height near 1.55-1.65.
- Document reading width should be constrained around `72ch` while preserving full-width overflow handling for tables, diagrams, and code blocks.
- Ticket content may use `max-w-none` because the modal width is already constrained.
- Headings use the existing base weight family but own their markdown spacing inside `.prose`.
- Heading rhythm should separate sections more than paragraphs do: larger top margin, smaller bottom margin.
- First rendered heading has no top margin.
- Paragraphs use consistent bottom spacing and should not rely on browser defaults.
- Lists align with paragraphs, keep readable indentation, and preserve nested list hierarchy.
- Task-list checkboxes align with the first text baseline and do not add extra left jitter.
- Blockquotes use a left border, muted foreground, and no decorative quote marks.
- Horizontal rules use `--border` and enough vertical margin to separate sections.

## Rich Content Rules

| Element | Rule |
|---------|------|
| Links | Use primary color, underline on hover/focus, and preserve SmartLink affordances |
| Inline code | Subtle muted background, small border radius, no forced full-word breaking unless it would overflow |
| Code blocks | Token-aware background, border, 8px radius or less, horizontal scroll, clear vertical rhythm |
| Tables | Horizontal scroll wrapper behavior, visible cell padding, header tint, row dividers, no cramped default table layout |
| Mermaid | Preserve existing diagram renderer; diagram surface should not inherit inline-code chrome |
| Wireloom | Preserve existing rendered SVG behavior; pending/error states use theme tokens instead of hard-coded colors |
| Images | Max width 100%, auto height, rounded only when the image is a content figure |

## Layout

- `.prose` owns markdown internals only; outer viewer components own pane padding and scrolling.
- Documents View gives the prose block a readable measure and keeps large artifacts scrollable inside the viewer.
- Ticket Viewer keeps the timestamp above or beside content without covering the first heading.
- The Table of Contents is an external navigation affordance, not part of markdown flow.
- Long links, file paths, and identifiers may wrap, but normal words should not break letter-by-letter.

## States

| State | Trigger | Visual Change |
|-------|---------|---------------|
| default document | selected markdown document renders | readable document rhythm, constrained measure, rich content styled |
| default ticket | ticket body renders | compact rhythm inside modal content padding |
| anchor hover | user hovers a heading with id | low-emphasis heading permalink appears |
| focused link | keyboard focus on markdown link | visible focus ring or underline treatment using `--ring` |
| wide table | table exceeds content width | horizontal scroll without page-level overflow |
| long code block | code line exceeds content width | code block scrolls horizontally; prose column does not widen |
| empty markdown | no body content | owning viewer renders its empty state; markdown surface renders nothing |
| dark mode | root has `.dark` | all prose, code, table, and diagram fallback colors use theme tokens |

## Responsive

| Breakpoint | Change |
|------------|--------|
| < 640px | Document variant fills available viewer width; content panel must not sit beside a persistent tree |
| < 640px | H1/H2 scale down enough to avoid overlap with viewer actions and timestamps |
| < 640px | ToC opens as an overlay/sheet and must not cover the active paragraph by default |
| 640-1024px | Documents may keep two panes only if the prose column remains at least 48ch |
| > 1024px | Documents use readable measure with artifact overflow; ticket modal keeps compact rhythm |

## Tokens used

| Element | Token | Usage |
|---------|-------|-------|
| prose text | `--foreground` | body and headings |
| secondary text | `--muted-foreground` | captions, blockquotes, helper text |
| links | `--primary` | markdown links and heading anchors |
| borders | `--border` | tables, blockquotes, code blocks, rules |
| code background | `--code-bg` | inline and block code |
| code text | `--code-fg` | inline and block code |
| selection | `--code-selection` | code selection background |
| focus | `--ring` | keyboard focus treatment |

## Classes used

| Element | Class | Source |
|---------|-------|--------|
| base prose | `.prose` | `src/styles/prose.css` |
| document prose | `.prose--document` proposed | document reading variant |
| ticket prose | `.prose--ticket` proposed | ticket modal reading variant |
| compact prose | `.prose--compact` proposed | short preview variant |
| heading anchor | `.header-anchor` | markdown-it-anchor output |
| frontmatter disclosure | `.document-frontmatter` | Documents View file updates spec |
| wireloom render | `.wireloom`, `.wireloom-pending`, `.wireloom-error` | existing markdown rendering |

## Extension notes

- Do not put global markdown spacing into `src/styles/base.css`; markdown rhythm belongs under `.prose`.
- Do not style `.prose` with app-shell assumptions such as sidebar widths or modal padding.
- Do not rely on hard-coded light colors in markdown fallback states; use design tokens.
- If a new markdown consumer needs different density, add a named variant instead of overriding individual descendants inline.
