---
code: MDT-057
title: Add syntax highlighting for code blocks in markdown viewer
status: Implemented
dateCreated: 2025-10-02T12:46:06.774Z
type: Feature Enhancement
priority: Medium
---

# Add syntax highlighting for code blocks in markdown viewer

## Description

The current markdown-to-HTML implementation uses Showdown with `ghCodeBlocks: true` but lacks syntax highlighting. Code blocks appear as plain text without language-specific coloring or formatting.

## Rationale

- Improves code readability in ticket content and documentation
- Essential for technical documentation with code examples
- Standard feature in modern markdown viewers
- Enhances developer experience when viewing tickets

## Solution Analysis

### Options Evaluated:
1. **Prism.js** (Recommended) - Lightweight, 2-8KB bundle
2. **Highlight.js** - Auto-detection, larger bundle
3. **Shiki** - VS Code themes, modern but heavy
4. **React Syntax Highlighter** - React wrapper

### Recommended Approach:
Integrate Prism.js with existing Showdown converter for minimal impact.

## Implementation
### Final Implementation:

1. **Installed Dependencies**:
   - `prismjs@1.30.0` - Core syntax highlighting library
   - `prism-themes@1.9.0` - Additional theme support

2. **Created Utilities**:
   - `src/utils/syntaxHighlight.ts` - Prism integration and code block highlighting
   - `src/styles/prism-theme-loader.ts` - Theme management (Darcula theme)

3. **Updated Components**:
   - Modified `MarkdownViewer.tsx` to call `loadPrismTheme()` and `highlightCodeBlocks()`
   - Modified `TicketViewer.tsx` to call `loadPrismTheme()` and `highlightCodeBlocks()`
   - Simplified Tailwind prose classes to avoid conflicts with Prism styling

4. **Language Support**:
   - JavaScript, TypeScript, JSX, TSX
   - Python, Bash, Go, PHP
   - JSON, YAML, CSS, SQL, Markdown

5. **Theme**:
   - Using Prism Darcula theme for both light and dark modes
   - Clean, static import - no complex CSS manipulation
## Acceptance Criteria
- [x] Code blocks display with syntax highlighting
- [x] Support for common languages (JS, TS, JSX, TSX, Python, Bash, JSON, YAML, Markdown, CSS, SQL, PHP, Go)
- [x] Works in both TicketViewer and DocumentsView
- [x] Maintains existing markdown functionality
- [x] Bundle size increase < 10KB
- [x] Dark/light theme compatibility (using Darcula theme for both modes)
