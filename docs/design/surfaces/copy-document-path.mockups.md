# Copy Document Path — Wireframes

[[ Markdown Ticket | Board | List | Documents | Projects | Settings ]]

## File Tree Row: Default (no hover)

```wireloom
window "File Tree — File Row (no hover)":
  panel:
    row:
      icon name="file" id="file-icon"
      text "Getting Started" id="file-title"
      spacer
      icon name="star" id="fav-hidden"

annotation "Fav star and copy button are hidden (opacity: 0) — only visible on row hover" target="fav-hidden" position=right
```

## File Tree Row: Hover — Unfavorited

```wireloom
window "File Tree — Hover, Unfavorited":
  panel:
    row:
      icon name="file" id="file-icon"
      text "Getting Started" id="file-title"
      spacer
      icon name="copy" id="copy-btn"
      icon name="star" id="fav-btn"

annotation "Copy button fades in via group-hover" target="copy-btn" position=top
annotation "Inactive fav star also fades in via group-hover" target="fav-btn" position=right
```

## File Tree Row: Hover — Favorited

```wireloom
window "File Tree — Hover, Favorited":
  panel:
    row:
      icon name="file" id="file-icon"
      text "Getting Started" id="file-title"
      spacer
      icon name="copy" id="copy-btn"
      icon name="star" id="fav-active" bold accent

annotation "Active fav star is always visible (data-active), even without hover" target="fav-active" position=right
annotation "Copy button still appears on hover" target="copy-btn" position=top
```

## File Tree Row: No Hover — Favorited

```wireloom
window "File Tree — No Hover, Favorited":
  panel:
    row:
      icon name="file" id="file-icon"
      text "Getting Started" id="file-title"
      spacer
      icon name="star" id="fav-active" bold accent

annotation "Only the active fav star shows — copy button is hidden" target="fav-active" position=right
```

## File Tree Row: Copied Feedback

```wireloom
window "File Tree — Copied Feedback":
  panel:
    row:
      icon name="file"
      text "Getting Started"
      spacer
      icon name="check" id="check-icon" accent
      icon name="star"

annotation "Check icon replaces Copy for 1.2s, --primary color" target="check-icon" position=top
```

## Folder Row: Hover

```wireloom
window "File Tree — Folder Row Hover":
  panel:
    row:
      icon name="chevron-down"
      icon name="folder" id="folder-icon"
      text "guides" id="folder-name"
      spacer
      icon name="copy" id="folder-copy"
      icon name="star" id="folder-fav"

annotation "Folder rows also show copy button on hover" target="folder-copy" position=top
annotation "Copy works for folder paths too (e.g. docs/guides/)" target="folder-copy" position=bottom
```

## Toast Notification

```wireloom
window "Toast — Path Copied":
  panel:
    row:
      icon name="check-circle" id="toast-icon"
      text "Path copied" bold id="toast-title"
    text "docs/guides/setup.md" muted id="toast-desc"

annotation "Sonner toast, 2000ms duration" target="toast-title" position=right
annotation "Description shows the copied path for verification" target="toast-desc" position=bottom
```

## Fav Row: Hover

```wireloom
window "Favs — File Row Hover":
  panel:
    row:
      text "Favs" bold muted
      spacer
      text "Show all" muted
    panel:
      row:
        icon name="file"
        text "API Reference" id="fav-file"
        spacer
        icon name="copy" id="fav-copy"
        icon name="star" id="fav-star" bold accent

annotation "Copy button appears on hover; fav star is always visible (active)" target="fav-copy" position=top
annotation "All fav stars are active (data-active)" target="fav-star" position=right
```

## Recent Row: Hover

```wireloom
window "Recent — File Row Hover":
  panel:
    row:
      text "Recent" bold muted
    panel:
      row:
        icon name="file"
        text "Configuration Guide"
        spacer
        icon name="copy" id="recent-copy"

annotation "Copy button appears on hover (no fav star on recent rows)" target="recent-copy" position=top
```

## Annotation Reference

| Element | Token / Class | Notes |
|---------|---------------|-------|
| Copy icon | `.copy-path-btn__icon`, `--muted-foreground` | 12px (w-3 h-3), hidden by default |
| Copy icon hover | `.copy-path-btn__icon:hover`, `--foreground` | visible via `group:hover` |
| Check icon (copied) | `.copy-path-btn__icon--copied`, `--primary` | replaces Copy for 1.2s, `data-copied` keeps visible |
| Copy button wrapper | `.copy-path-btn` | p-0, opacity 0, transition 0.15s |
| Fav star (inactive) | `.fav-star-btn--document` | opacity 0, visible on `group:hover` |
| Fav star (active) | `.fav-star-btn--document[data-active]` | opacity 1 always |
| Focus ring | `ring-2 ring-ring rounded-sm` | keyboard navigation |
| Pressed feedback | `scale(0.9)` | active/pressed state |
| Toast | `useToast().success()` | sonner, 2000ms |
