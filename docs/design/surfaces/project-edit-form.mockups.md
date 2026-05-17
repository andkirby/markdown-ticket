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
    row justify=end:
      button "Cancel" id="cancel-btn"
      button "Update Project" primary id="submit-btn"

annotation "Read-only: identity and filesystem fields cannot be changed" target="code-input" position=right
annotation "Path locked to project root" target="path-lock" position=right
```

## Variants

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
| Success icon | green semantic utility | `bg-green-100 text-green-600` | Existing success dialog style |

## Current Implementation Notes

- Submit disables only the submit button while showing `Updating...`; form fields are not disabled during the request.
- The shared project path tooltip still includes creation-oriented global config and auto-discovery guidance in edit mode.
- Edit-mode success should offer `Done` only; creation actions belong to the add-project flow.
