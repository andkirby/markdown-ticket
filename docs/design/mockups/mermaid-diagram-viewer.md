# Mermaid Diagram Viewer — Wireframe Schema

Related spec: `specs/mermaid-diagram-viewer.md`

## Inline State

```wireframe
┌────────────────────────────────────────────────────────┐
│ MarkdownContent                                       │
│                                                        │
│ Paragraph text above diagram.                         │
│                                                        │
│ ┌──────────────────────────────────────────────────┐   │
│ │ MermaidContainer                                 │   │
│ │ [fullscreen-icon]                                │   │
│ │                                                  │   │
│ │              ┌──────────────┐                    │   │
│ │              │ Start        │                    │   │
│ │              └──────┬───────┘                    │   │
│ │                     │                            │   │
│ │              ┌──────▼───────┐                    │   │
│ │              │ Render       │                    │   │
│ │              └──────────────┘                    │   │
│ └──────────────────────────────────────────────────┘   │
│                                                        │
│ Paragraph text below diagram.                         │
└────────────────────────────────────────────────────────┘
```

## Overlay Fit State

```wireframe state:mermaid-viewer overlay-fit
┌────────────────────────────────────────────────────────────┐
│ MermaidDiagramViewer                                      │
│ [exit-fullscreen-icon]                                    │
│                                                            │
│                                                            │
│              ┌──────────────────────────────┐              │
│              │ Start                        │              │
│              └──────────────┬───────────────┘              │
│                             │                              │
│              ┌──────────────▼───────────────┐              │
│              │ Render                       │              │
│              └──────────────┬───────────────┘              │
│                             │                              │
│              ┌──────────────▼───────────────┐              │
│              │ Done                         │              │
│              └──────────────────────────────┘              │
│                                                            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Zoomed State

```wireframe state:mermaid-viewer zoomed
┌────────────────────────────────────────────────────────────┐
│ MermaidDiagramViewer                                      │
│ [exit-fullscreen-icon]                                    │
│                                                            │
│       ┌────────────────────────────────────────────┐       │
│       │ Start                                      │       │
│       └────────────────────┬───────────────────────┘       │
│                            │                               │
│       ┌────────────────────▼───────────────────────┐       │
│       │ Render                                     │       │
│       └────────────────────┬───────────────────────┘       │
│                            │                               │
│       ┌────────────────────▼───────────────────────┐       │
│       │ Done                                       │       │
│       └────────────────────────────────────────────┘       │
│                                                            │
│ wheel up/down changes scale; aspect ratio is preserved     │
└────────────────────────────────────────────────────────────┘
```

## Panning State

```wireframe state:mermaid-viewer panning
┌────────────────────────────────────────────────────────────┐
│ MermaidDiagramViewer                                      │
│ [exit-fullscreen-icon]                                    │
│                                                            │
│ cursor: grabbing                                          │
│                                                            │
│                     ┌──────────────────────────────┐       │
│                     │ Start                        │       │
│                     └──────────────┬───────────────┘       │
│                                    │                       │
│                     ┌──────────────▼───────────────┐       │
│                     │ Render                       │       │
│                     └──────────────┬───────────────┘       │
│                                    │                       │
│                     ┌──────────────▼───────────────┐       │
│                     │ Done                         │       │
│                     └──────────────────────────────┘       │
│                                                            │
│ drag delta moves diagram in same direction                 │
└────────────────────────────────────────────────────────────┘
```

## Mobile Overlay State

```wireframe viewport:mobile
┌──────────────────────────────┐
│ MermaidDiagramViewer         │
│ [exit-fullscreen-icon]       │
│                              │
│                              │
│      ┌────────────────┐      │
│      │ Start          │      │
│      └───────┬────────┘      │
│              │               │
│      ┌───────▼────────┐      │
│      │ Render         │      │
│      └───────┬────────┘      │
│              │               │
│      ┌───────▼────────┐      │
│      │ Done           │      │
│      └────────────────┘      │
│                              │
│ touch drag pans; pinch zooms │
└──────────────────────────────┘
```

## Exit State

```wireframe state:mermaid-viewer exit
┌────────────────────────────────────────────────────────┐
│ MarkdownContent                                       │
│                                                        │
│ ┌──────────────────────────────────────────────────┐   │
│ │ MermaidContainer                                 │   │
│ │ [fullscreen-icon]                                │   │
│ │              ┌──────────────┐                    │   │
│ │              │ Start        │                    │   │
│ │              └──────┬───────┘                    │   │
│ │              ┌──────▼───────┐                    │   │
│ │              │ Render       │                    │   │
│ │              └──────────────┘                    │   │
│ └──────────────────────────────────────────────────┘   │
│                                                        │
│ inline flow and page scroll restored                   │
└────────────────────────────────────────────────────────┘
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
