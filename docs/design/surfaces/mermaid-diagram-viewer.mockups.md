# Mermaid Diagram Viewer — Wireframe Schema

Related spec: `mermaid-diagram-viewer.spec.md`

## Inline State

```wireloom
window "Mermaid Diagram Viewer — Inline":
  panel:
    text "Paragraph text above diagram." id="pre-text"
    panel id="mermaid-container":
      row:
        spacer
        icon name="star" id="fullscreen-btn"
      text "Start → Render" id="diagram-inline"
    text "Paragraph text below diagram." id="post-text"

annotation "MermaidContainer holds button and rendered diagram" target="mermaid-container" position=right
annotation "Fullscreen button: top-left overlay control" target="fullscreen-btn" position=top
```

## Overlay Fit State

```wireloom
window "Mermaid Diagram Viewer — Overlay Fit":
  panel:
    icon name="star" id="exit-fullscreen-fit"
    text "Start → Render → Done" id="diagram-fit"

annotation "exit-fullscreen-icon button" target="exit-fullscreen-fit" position=top
annotation "Diagram fits within 90% viewport with 5% padding" target="diagram-fit" position=right
```

## Zoomed State

```wireloom
window "Mermaid Diagram Viewer — Zoomed":
  panel:
    icon name="star" id="exit-fullscreen-zoom"
    text "Start → Render → Done" id="diagram-zoomed"
    text "wheel up/down changes scale; aspect ratio preserved" muted id="zoom-note"

annotation "Zoom via mouse wheel, aspect ratio preserved" target="zoom-note" position=bottom
```

## Panning State

```wireloom
window "Mermaid Diagram Viewer — Panning":
  panel:
    icon name="star" id="exit-fullscreen-pan"
    text "cursor: grabbing" muted id="cursor-note"
    text "Start → Render → Done" id="diagram-panning"
    text "drag delta moves diagram in same direction" muted id="pan-note"

annotation "cursor: grabbing while dragging" target="cursor-note" position=right
```

## Mobile Overlay State

```wireloom
window "Mermaid Diagram Viewer — Mobile":
  panel:
    icon name="star"
    text "Start → Render → Done" id="diagram-mobile"
    text "touch drag pans; pinch zooms" muted id="touch-note"

annotation "Native touch: drag to pan, pinch to zoom" target="touch-note" position=bottom
```

## Exit State

```wireloom
window "Mermaid Diagram Viewer — Exit":
  panel:
    text "Paragraph text above diagram."
    panel id="mermaid-container-exit":
      row:
        spacer
        icon name="star" id="fullscreen-btn-exit"
      text "Start → Render"
    text "inline flow and page scroll restored" muted id="exit-note"

annotation "Returns to inline flow, scroll position restored" target="exit-note" position=bottom
```

## Annotations

| Element | Token / Color | Class / Pattern | Notes |
|---------|---------------|-----------------|-------|
| Inline markdown | `--background`, `--foreground` | `.prose` | Existing MarkdownContent style |
| Mermaid container | Existing document flow | `.mermaid-container` | Holds button and rendered diagram |
| Overlay surface | `white` / `#111827` | `data-overlay-enabled="true"` | Same container becomes fixed viewport overlay |
| Fullscreen button | `bg-black/20`, hover `bg-black/30` | `.mermaid-fullscreen-btn` | Top-left overlay control |
| Diagram transform target | none | `.mermaid` | `display: inline-block` only while zoom is active |
| Fit padding | 5% viewport margin | constants-based scale | Diagram starts within 90% viewport |
| Cursor | browser cursor | `grab` / `grabbing` | Applies while zoom/pan handlers are active |
| Touch behavior | native pointer handling | `touch-action: none` while active | Enables custom pan/pinch |

## Implementation Notes

| Requirement | Current Behavior |
|-------------|------------------|
| Native fullscreen | Not used |
| Body scroll | Locked while overlay is active, restored on exit |
| Escape | Closes viewer and stops propagation |
| Click outside | Not supported; full viewport is the diagram interaction surface |
| Focus trap | Not implemented |
