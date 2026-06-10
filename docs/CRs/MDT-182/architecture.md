# Architecture: MDT-182

**Source**: [MDT-182](../MDT-182-wireloom-annotation-toggle.md)
**Updated**: 2026-06-10

## Overview

MDT-182 adds a client-side annotation view toggle to rendered Wireloom blocks. The architecture is a **DOM post-processing layer** that operates on the rendered SVG output without modifying the Wireloom package or source Markdown.

## Key Design Decision: Callout Circle Detection

**Problem**: Wireloom's SVG renderer does **not** output `id` attributes on elements, so annotation targets cannot be matched by ID lookup.

**Solution**: Wireloom renders each annotation as a visual triplet in the SVG:
1. `<line>` — connector from target to callout box
2. `<circle>` — small dot on the target element
3. `<rect>` + `<text>` — callout box with annotation text

The circles' `cx`/`cy` directly give the target positions. Colors are auto-detected from the SVG structure (not hardcoded), making the system resilient to theme changes and Wireloom version updates.

## Module Boundaries

### `src/utils/wireloomAnnotationToggle.ts`
**Owner**: All annotation toggle logic.

**Exports**:
- `addAnnotationToggle(wrapper, source, parseFn)` — adds toggle to a Wireloom wrapper
- `reapplyCompactMode(wrapper, source, parseFn)` — re-applies compact after theme re-render
- `computeMarkerPositions(svgRoot, annotations)` — auto-detects colors, tags callout elements, returns positions + colors
- `extractAnnotations(source, parseFn)` — parses annotations from Wireloom source

**Key internals**:
- `detectCalloutColors(svgRoot)` — walks SVG backward to find the last rounded rect, extracts fill/stroke/dot colors
- `tagCalloutElements(svgRoot)` — marks all callout SVG elements with `data-wireloom-callout` for CSS hiding
- `showTooltip()` / `hideTooltip()` — manages a single `position: fixed` tooltip on `document.body`
- `switchToCompact()` / `switchToCallout()` — mode transitions with full cleanup

### `src/utils/wireloomRenderer.ts`
Calls `addAnnotationToggle()` and `reapplyCompactMode()` after rendering.

### `src/components/MarkdownContent/domPurifyConfig.ts`
Allows `data-annotation-mode`, `data-annotation-index`, `data-wireloom-callout`, `data-callout-*` attributes.

### `src/styles/wireloom-annotations.css`
Styled via CSS custom properties (`--wl-dot`, `--wl-box-fill`, `--wl-box-stroke`, `--wl-text`) set on the wrapper from auto-detected colors. No theme-specific color tables.

## Auto-Detection Flow

```
1. Wireloom renders SVG with callouts (colors vary by theme)
2. detectCalloutColors() walks SVG children backward:
   - Finds last <rect> with rx > 0 (callout box)
   - Extracts box fill, box stroke
   - Walks back further to find <circle> → dot color
3. tagCalloutElements() tags all callout elements:
   - Finds all rects matching box colors
   - Walks backward from each to find its <circle> and <line>
   - Tags all <text> elements after each rect until non-text sibling
   - Sets data-wireloom-callout on all tagged elements
4. findCalloutCircles() returns circles by dot color
5. Marker positions = circle cx/cy as fractions of viewBox
6. Colors set as CSS custom properties on wrapper
```

## Tooltip Architecture

```
- Single shared tooltip element on document.body (id="wireloom-tooltip-portal")
- position: fixed — escapes all overflow containers
- Positioned via getBoundingClientRect() on the marker
- CSS custom properties copied from wrapper on each show
- pointer-events: none — does not intercept mouse events
```

## State Management

- **Storage**: `data-annotation-mode="callout|compact"` on `.wireloom` wrapper
- **Default**: No attribute = callout mode
- **Persistence**: In-memory only; resets on page reload
- **Theme change**: Renderer re-renders SVG → `reapplyCompactMode()` detects new colors, recreates markers
- **One tooltip rule**: Hovering a marker always clears any pinned state first

## Event Handlers (document-level)

| Handler | Scope | Trigger | Action |
|---------|-------|---------|--------|
| Click dismiss | `document` | Click outside any marker | Hide tooltip, clear active |
| Escape dismiss | `document` | Escape key | Hide tooltip, clear active |
| Scroll dismiss | `document` | Any scroll | Hide tooltip, clear active |
| Marker hover | Per marker | mouseenter | Clear active, show tooltip |
| Marker leave | Per marker | mouseleave | Hide tooltip (unless pinned) |
| Marker focus | Per marker | focus | Show tooltip |
| Marker blur | Per marker | blur | Hide tooltip (unless pinned) |
| Marker click | Per marker | click | Toggle pin state |

## Invariants

1. **Source immutability**: Toggle never modifies Markdown or Wireloom source
2. **Graceful degradation**: Parse failure or empty annotations → no toggle shown
3. **Per-block isolation**: Each `.wireloom` wrapper is independent
4. **SVG structure untouched**: Callout elements hidden via CSS, never removed
5. **No Wireloom package changes**: All logic is in MDT presentation layer
6. **One tooltip at a time**: Hovering always clears pinned state
7. **Auto-detected colors**: No hardcoded theme color tables

---
*Updated post-implementation to reflect verified architecture*
