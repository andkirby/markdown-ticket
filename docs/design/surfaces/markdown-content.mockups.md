# Markdown Content — Wireframe Schema

Related spec: `markdown-content.spec.md`

## Document Reading

```wireloom
window "Markdown Content — Document Reading":
  panel:
    row:
      col 300:
        text "Documents navigation" bold id="doc-nav"
        text "See documents-view-navigation.mockups.md" muted
      col fill:
        row justify=end id="doc-meta":
          text "Updated 1 week ago" muted size=small
        text "# Project Documents" bold id="doc-h1"
        text "This folder contains durable documentation for the TypeScript vocabulary extraction app." id="doc-p"
        text "## Local Environment" bold id="doc-h2"
        text "Use `.env` for local provider selection:"
        section "Code block" id="doc-code":
          text "LLM_PROVIDER=openrouter" size=small
          text "OPENROUTER_API_KEY_FILE=/absolute/path/to/key" size=small
        list:
          item "`ARCHITECTURE.md` - target TypeScript app architecture."
          item "`CLOUDFLARE_DEPLOYMENT.md` - deployment wrapper plan."

annotation "Document prose uses a readable measure instead of filling every pixel" target="doc-h1" position=right
annotation "Heading rhythm separates sections; paragraphs stay calm" target="doc-h2" position=right
annotation "Code blocks are readable artifacts with horizontal scroll when needed" target="doc-code" position=right
annotation "Navigation shell is not part of prose styling" target="doc-nav" position=bottom
```

## Ticket Reading

```wireloom
window "Markdown Content — Ticket Reading":
  panel:
    row:
      text "MDT-042 • Fix login redirect" bold id="ticket-title"
      spacer
      button "×"
    divider
    row:
      chip "Proposed"
      chip "Medium"
      chip "Bug"
    divider
    row justify=end:
      text "Updated 2h ago" muted size=small id="ticket-meta"
    text "### Problem" bold id="ticket-h"
    text "Users are redirected to the board before session validation completes."
    text "### Acceptance Criteria" bold
    list:
      item "[ ] Invalid sessions remain on login"
      item "[ ] Valid sessions preserve the requested route"

annotation "Ticket prose is denser than document prose but still owns markdown rhythm" target="ticket-h" position=right
annotation "Timestamp must not overlap the first heading" target="ticket-meta" position=left
```

## Rich Markdown

```wireloom
window "Markdown Content — Rich Markdown":
  panel:
    text "## Implementation Notes" bold
    text "Inline `code` should be visible without overpowering the paragraph." id="inline-code"
    section "Table" id="table":
      row:
        text "Area" bold
        text "Decision" bold
      row:
        text "Renderer"
        text "markdown-it"
      row:
        text "Links"
        text "SmartLink"
    section "Blockquote" id="quote":
      text "Use a quiet left border and muted text."
    section "Wide rendered artifact" id="diagram":
      row justify=end:
        button "⛶" id="artifact-zoom"
      text "Rendered Wireloom or Mermaid output uses available document pane width."

annotation "Tables need padding, borders, header treatment, and horizontal overflow" target="table" position=right
annotation "Blockquotes use tokenized border and muted text" target="quote" position=right
annotation "Rendered diagrams can use full document pane width while prose stays readable" target="diagram" position=right
annotation "Wireloom uses the shared zoom/fullscreen inspection affordance" target="artifact-zoom" position=top
annotation "Inline code should avoid global break-all behavior" target="inline-code" position=right
```

## Mobile Document Reading

```wireloom
window "Markdown Content — Mobile Document":
  navbar:
    leading:
      button "Docs"
    center:
      text "README.md" bold
    trailing:
      button "ToC"
  panel:
    row justify=end:
      text "Updated 1 week ago" muted size=small
    text "# Project Documents" bold id="mobile-h1"
    text "This folder contains durable documentation for the TypeScript vocabulary extraction app."
    text "## Local Environment" bold
    section "Code block" id="mobile-code":
      text "LLM_PROVIDER=openrouter" size=small
      text "OPENROUTER_API_KEY_FILE=/absolute/path/to/key" size=small

annotation "Mobile viewer shows one primary pane; tree navigation moves behind a control" target="mobile-h1" position=bottom
annotation "Long code scrolls inside the code block, not the page" target="mobile-code" position=top
```

## Annotations

| Element | Token | Class | Notes |
|---------|-------|-------|-------|
| Document prose | `--foreground` | `.prose.prose--document` proposed | Reading-first rhythm and measure |
| Ticket prose | `--foreground` | `.prose.prose--ticket` proposed | Modal density, compact headings |
| Code block | `--code-bg`, `--code-fg`, `--border` | `.prose pre` | Scrollable artifact with tokenized color |
| Inline code | `--code-inline-fg` | `.prose :not(pre) > code` | Slight color only, no background or border, no letter-by-letter breaking |
| Table | `--border`, `--muted` | `.prose table` | Padded cells and horizontal overflow |
| Blockquote | `--border`, `--muted-foreground` | `.prose blockquote` | Quiet callout treatment |
| Wide artifact | `--border`, `--background` | `.wireloom__diagram`, `.wireloom__fullscreen-button` | Native-width rendered artifact with horizontal scroll and zoom inspection |
