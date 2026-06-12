# Copy Document Path — Wireframes

[[ Markdown Ticket | Board | List | Documents | Projects | Settings ]]

## File Tree Row: Default

```wireloom
window "File Tree — File Row Default":
  panel:
    row:
      icon name="file" id="file-icon"
      text "Getting Started" id="file-title"
      spacer
      icon name="copy" id="copy-btn"
      icon name="star" id="fav-btn"

annotation "File icon at --muted-foreground" target="file-icon" position=left
annotation "Copy button: muted, opacity 0.5, always visible" target="copy-btn" position=top
annotation "Fav star button follows copy button" target="fav-btn" position=right
```

## File Tree Row: Hover on Copy Button

```wireloom
window "File Tree — Copy Button Hover":
  panel:
    row:
      icon name="file"
      text "Getting Started"
      spacer
      icon name="copy" id="copy-hover" bold
      icon name="star"

annotation "Copy button brightens to --foreground, opacity 1 on hover" target="copy-hover" position=top
```

## File Tree Row: Copied Feedback

```wireloom
window "File Tree — Copied Feedback":
  panel:
    row:
      icon name="file"
      text "Getting Started"
      spacer
      icon name="check" id="check-icon"
      icon name="star"

annotation "Check icon replaces Copy for 1.2s, --primary color" target="check-icon" position=top
```

## Toast Notification

```wireloom
window "Toast — Path Copied":
  panel:
    row:
      icon name="check-circle" id="toast-icon"
      text "Path copied" bold id="toast-title"
    text "docs/guides/setup.md" muted id="toast-desc"

annotation "Sonner toast, bottom-right, 2000ms duration" target="toast-title" position=right
annotation "Description shows the copied path for verification" target="toast-desc" position=bottom
```

## Fav Row with Copy

```wireloom
window "Favs — File Row with Copy":
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
        icon name="star" id="fav-star"

annotation "Copy button same position in Fav rows" target="fav-copy" position=top
annotation "Active fav star after copy button" target="fav-star" position=right
```

## Recent Row with Copy

```wireloom
window "Recent — File Row with Copy":
  panel:
    row:
      text "Recent" bold muted
    panel:
      row:
        icon name="file"
        text "Configuration Guide"
        spacer
        icon name="copy" id="recent-copy"

annotation "Copy button present on Recent rows (no fav star)" target="recent-copy" position=top
```

## Folder Row: No Copy Button

```wireloom
window "File Tree — Folder Row (No Copy)":
  panel:
    row:
      icon name="chevron-down"
      icon name="folder" id="folder-icon"
      text "guides" id="folder-name"

annotation "Folder rows do not render CopyPathButton" target="folder-name" position=right
```

## Annotation Reference

| Element | Token / Class | Notes |
|---------|---------------|-------|
| Copy icon default | `.copy-path-btn__icon`, `--muted-foreground` | opacity 0.5, w-4 h-4 |
| Copy icon hover | `.copy-path-btn__icon:hover`, `--foreground` | opacity 1 |
| Check icon (copied) | `.copy-path-btn__icon--copied`, `--primary` | replaces Copy for 1.2s |
| Copy button wrapper | `.copy-path-btn` | p-0, no background, cursor-pointer |
| Focus ring | `ring-2 ring-ring rounded-sm` | keyboard navigation |
| Pressed feedback | `scale(0.92)`, opacity 0.7 | active/pressed state |
| Toast | `useToast().success()` | sonner, bottom-right, 2000ms |
