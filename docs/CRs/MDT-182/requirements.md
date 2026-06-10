# Requirements: MDT-182

**Source**: [MDT-182](../MDT-182-wireloom-annotation-toggle.md)
**Updated**: 2026-06-10

## Overview

MDT-182 adds an annotation view toggle to rendered Wireloom blocks, allowing users to switch between the current always-visible callout view and a compact numbered-marker view. Compact mode keeps annotation-heavy mockups visually small while preserving full annotation access via hover, focus, and click interactions.

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | architecture.md (Rendering Pipeline / SVG Bounds), tests.md (dimension assertion) |
| C2 | architecture.md (Accessibility / Interaction Model), tests.md (keyboard + screen reader tests) |
| C3 | architecture.md (Error Handling), tests.md (malformed source test) |
| C4 | architecture.md (Error Handling / Fallback), tests.md (missing Wireloom test) |
| C5 | architecture.md (State Persistence), tests.md (theme-switch test) |
| C6 | architecture.md (State Persistence), tests.md (fullscreen toggle test) |

## Business Rules

| ID | Rule |
|----|------|
| BR-1.1 | Blocks with annotations show a toggle control; blocks without annotations show no toggle |
| BR-1.2 | Default mode is callout — Wireloom's standard rendered callout boxes, unchanged |
| BR-1.3 | Clicking toggle switches to compact mode: callout boxes hidden, numbered markers appear at annotation target positions |
| BR-1.4 | Hovering a compact marker shows a tooltip with the annotation text |
| BR-1.5 | Clicking a compact marker pins the tooltip; clicking again, clicking elsewhere, scrolling, or pressing Escape dismisses it |
| BR-1.6 | Hovering another marker unpins any currently active marker — only one tooltip visible at a time |
| BR-1.7 | Markers and tooltip visually match Wireloom's callout color scheme (auto-detected from SVG, theme-aware) |
| BR-1.8 | Tooltip escapes the Wireloom block's overflow boundary — never clipped by the SVG container |
| BR-1.9 | Each block's toggle is independent; toggling one block does not affect others |
| BR-1.10 | Compact mode survives theme changes — markers reappear with correct colors for the new theme |
| BR-1.11 | Source Markdown is never modified |

## Non-Ambiguity Table

| Concept | Final Semantic | Rejected Semantic | Why |
|---------|----------------|-------------------|-----|
| Toggle scope | Per Wireloom block — each block has its own independent toggle | Global per document or per session | Per-block is more flexible for mixed mockup pages |
| Annotation mode persistence | In-memory only, resets on page reload | localStorage or URL-param persistence | Must not mutate markdown; no server-side storage implied |
| Compact marker positioning | Markers placed at the same SVG coordinates as Wireloom's callout target dots (circles) | Custom re-positioned layout or element ID lookup | Wireloom doesn't output element IDs; circles are the only reliable position source |
| Tooltip positioning | `position: fixed` on `document.body`, positioned via `getBoundingClientRect()` | `position: absolute` inside the wrapper | Absolute positioning clips at overflow boundaries |
| Color scheme | Auto-detected from rendered SVG callout elements, set via CSS custom properties | Hardcoded per-theme color tables | Fragile; Wireloom may change colors across versions |
| Dismiss behavior | Click elsewhere, scroll, Escape, or hover another marker | Explicit close button on tooltip | Keeps marker UX lightweight |
| "One tooltip" rule | Only one tooltip visible at a time; hovering always clears pinned state | Multiple simultaneous tooltips | Avoids visual clutter and state confusion |
| Callout element detection | Structural: find callout rects by rounded corners + late position in SVG, derive all other elements by walking siblings | Color-matching with hardcoded hex values | Theme colors vary; structural detection is resilient |

## Resolved Open Questions

| ID | Question | Resolution |
|----|----------|------------|
| OQ-1 | Should marker number sequencing restart at 1 per block or be globally unique? | Per-block, restart at 1 |
| OQ-2 | How to derive marker coordinates from rendered SVG? | Detect callout circles in SVG (Wireloom renders `<circle>` dots at target positions). Read `cx`/`cy` attributes, convert to viewport fractions. Wireloom does not output element IDs. |
| OQ-3 | How to identify callout elements for hiding? | Auto-detect colors by finding the last rounded rect in the SVG, then tag all related siblings (line, circle, rect, texts) with `data-wireloom-callout`. CSS hides them. |
| OQ-4 | How to prevent tooltip clipping? | Tooltip lives on `document.body` as `position: fixed`, positioned via `getBoundingClientRect()` on the marker. Escapes all overflow containers. |

---
*Updated post-implementation to reflect verified architecture*
