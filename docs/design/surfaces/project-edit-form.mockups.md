# Project Edit Form — Wireframe Schema

Related spec: `project-edit-form.spec.md`

## Default State

```wireloom
window "Project Edit Form — Default":
  panel:
    row:
      text "Edit Project" bold id="form-title"
      spacer
      button "×" id="close-btn"
    divider
    text "Project Name *" id="name-label"
    input placeholder="Markdown Ticket" id="name-input"
    text "Project Code *" id="code-label"
    input placeholder="MDT" disabled id="code-input"
    row:
      text "Project Path *" id="path-label"
      icon name="gear" id="path-info"
    input placeholder="~/workspace/markdown-ticket" disabled id="path-input"
    icon name="lock" id="path-lock"
    row:
      text "Tickets Directory *" id="tickets-label"
      icon name="gear" id="tickets-help"
    input placeholder="docs/CRs" disabled id="tickets-input"
    text "Description"
    input placeholder="Markdown ticket dashboard" id="desc-input"
    text "Repository URL"
    input placeholder="https://github.com/..." id="repo-input"
    divider
    text "Project accent" id="accent-label"
    combo "Navy" id="accent-combo"
    row:
      avatar "MDT" id="accent-preview"
      text "Only visible to you." muted id="accent-help"
    divider
    row justify=end:
      button "Cancel" id="cancel-btn"
      button "Update Project" primary id="submit-btn"

annotation "Read-only: identity and filesystem fields cannot be changed" target="code-input" position=right
annotation "Path locked to project root" target="path-lock" position=right
annotation "Personal preference: not submitted as shared project metadata" target="accent-combo" position=right
```

## Variants

### Accent Dropdown Open

```wireloom
window "Project Edit Form — Accent Dropdown":
  panel:
    row:
      text "Edit Project" bold
      spacer
      button "×"
    divider
    text "... shared project fields above ..." muted
    text "Project accent"
    combo "Navy" id="accent-open"
    list:
      item "Default"
      item "Navy ✓"
      item "Azure"
      item "Turquoise"
      item "Forest"
      item "Gold"
      item "Crimson"
      item "Violet"
      item "Graphite"
      item "Custom hex..."
    text "Only visible to you." muted id="accent-personal-note"
    divider
    row justify=end:
      button "Cancel"
      button "Update Project" primary

annotation "Dropdown contains 16 preset swatch options plus Custom hex; Wireloom labels represent the menu shape." target="accent-open" position=right
annotation "Accent persists as user preference, not project config." target="accent-personal-note" position=bottom
```

### Custom Hex Accent

```wireloom
window "Project Edit Form — Custom Hex Accent":
  panel:
    row:
      text "Edit Project" bold
      spacer
      button "×"
    divider
    text "... shared project fields above ..." muted
    text "Project accent"
    combo "Custom hex" id="accent-custom"
    row:
      avatar "MDT" id="hex-preview"
      input placeholder="#2563EB" id="hex-input"
      button "choose color ↗" id="choose-color-link"
    text "Only visible to you." muted
    divider
    row justify=end:
      button "Cancel"
      button "Update Project" primary

annotation "Backend validates the custom hex before saving the user preference." target="hex-input" position=right
annotation "Opens https://share.google/ATp6ypatbFk69dC91 in a new tab." target="choose-color-link" position=bottom
```

### Custom Hex Validation Error

```wireloom
window "Project Edit Form — Invalid Hex":
  panel:
    row:
      text "Edit Project" bold
      spacer
      button "×"
    divider
    text "Project accent"
    combo "Custom hex"
    row:
      avatar "MDT"
      input placeholder="#2563EB" id="invalid-hex-input"
      button "choose color ↗"
    text "Enter a valid hex color, for example #2563EB." accent=danger id="hex-error"
    divider
    row justify=end:
      button "Cancel"
      button "Update Project" primary

annotation "Rejected value does not replace the previously saved accent." target="hex-error" position=right
```

### Submitting

```wireloom
window "Project Edit Form — Submitting":
  panel:
    row:
      text "Edit Project" bold
      spacer
      button "×"
    divider
    text "... fields remain visible with current values ..." muted
    divider
    row justify=end:
      button "Cancel"
      button "Updating..." primary disabled id="submitting-btn"

annotation "Submit button disabled during request; fields stay editable" target="submitting-btn" position=right
```

### Success

```wireloom
window "Project Edit Form — Success":
  panel:
    icon name="check" id="success-icon"
    text "Project Updated Successfully!" bold id="success-text"
    row justify=end:
      button "Done" primary

annotation "Success confirmation replaces form" target="success-icon" position=top
```

### Mobile

```wireloom
window "Project Edit Form — Mobile":
  panel:
    row:
      text "Edit Project" bold
      spacer
      button "×"
    divider
    text "Project Name *"
    input placeholder="Markdown Ticket"
    text "Project Code *"
    input placeholder="MDT" disabled
    text "Project Path *"
    input placeholder="/Users/..." disabled
    text "Tickets Directory *"
    input placeholder="docs/CRs" disabled
    text "Description"
    input placeholder="text area"
    text "Repository URL"
    input placeholder="https://..."
    text "Project accent"
    combo "Navy"
    text "Only visible to you." muted
    divider
    row justify=end:
      button "Cancel"
      button "Update Project" primary
```

## Annotations

| Element | Token | Class | Notes |
|---------|-------|-------|-------|
| Backdrop | — | `bg-black/50` | Matches modal standard |
| Modal surface | `--card` | `bg-white dark:bg-gray-800` | Existing modal surface |
| Header/footer border | `--border` | `border-gray-200 dark:border-gray-700` | Separates fixed regions |
| Read-only fields | `--muted` | `bg-gray-50 dark:bg-gray-700 cursor-not-allowed` | Identity/filesystem fields cannot be changed |
| Accent dropdown | proposed project accent tokens | dropdown/combobox with swatches | Personal project identity preference |
| Custom hex input | `--ring`, `--destructive` | form input validation state | Backend validates before persistence |
| Choose color link | link style | `target="_blank" rel="noopener noreferrer"` | Opens external color helper |
| Accent preview | project accent token | compact avatar/mark | Same visual family as ProjectSelector accent marks |
| Success icon | green semantic utility | `bg-green-100 text-green-600` | Existing success dialog style |

## Current Implementation Notes

- Submit disables only the submit button while showing `Updating...`; form fields are not disabled during the request.
- The shared project path tooltip still includes creation-oriented global config and auto-discovery guidance in edit mode.
- Edit-mode success should offer `Done` only; creation actions belong to the add-project flow.
- Project accent is an addition to the existing edit form.
- Do not auto-discover images from the project folder for the accent control.
- Custom hex is an alternate path for users who need a color outside the preset palette.
- `choose color` opens `https://share.google/ATp6ypatbFk69dC91` in a new tab.
