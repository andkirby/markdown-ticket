# Documents Path Selector — Wireframe Schema

Related spec: `documents-path-selector.spec.md`

## Default Collapsed

```wireloom
window "Select Document Paths — Default":
  panel:
    text "Select Document Paths" bold id="title"
    text "Choose the files and folders you want to include in the documents view." muted
    row id="meta-row":
      text "Max depth: 5" muted
      icon name="info" id="info-icon"
    row id="toolbar":
      button "Expand all"
      button "Collapse all"
    tree id="path-tree":
      node "docs" collapsed id="docs-node"
      node "research" collapsed
      node "README.md"
    row:
      text "2 items selected" muted
      spacer
      button "Cancel"
      button "Save Selection" primary

annotation "Header metadata shows configured maxDepth." target="meta-row" position=right
annotation "Info tooltip owns ticket-path exclusion copy." target="info-icon" position=right
annotation "Default tree renders root rows collapsed." target="docs-node" position=right
```

## Directory Expanded

```wireloom
window "Select Document Paths — Directory Expanded":
  panel:
    text "Select Document Paths" bold
    text "Choose the files and folders you want to include in the documents view." muted
    row:
      text "Max depth: 5" muted
      icon name="info"
    row:
      button "Expand all"
      button "Collapse all"
    tree:
      node "docs" id="docs-expanded":
        node "design" collapsed
        node "README.md"
      node "research" collapsed
    row:
      text "3 items selected" muted
      spacer
      button "Cancel"
      button "Save Selection" primary

annotation "Chevron toggles expansion only; checkbox owns selection." target="docs-expanded" position=right
```

## Selected Nested Path

```wireloom
window "Select Document Paths — Selected Nested Path":
  panel:
    text "Select Document Paths" bold
    text "Choose the files and folders you want to include in the documents view." muted
    row:
      text "Max depth: 5" muted
      icon name="info"
    row:
      button "Expand all"
      button "Collapse all"
    tree:
      node "aa":
        node "bb":
          node "cc" collapsed selected id="selected-nested"
      node "docs" collapsed
    row:
      text "1 item selected" muted
      spacer
      button "Cancel"
      button "Save Selection" primary

annotation "Ancestors expand so the selected path is visible; selected folder itself remains collapsed." target="selected-nested" position=right
```

## Empty Or Error

```wireloom
window "Select Document Paths — Empty":
  panel:
    text "Select Document Paths" bold
    text "Choose the files and folders you want to include in the documents view." muted
    row:
      text "Max depth: 5" muted
      icon name="info"
    row:
      button "Expand all" disabled
      button "Collapse all" disabled
    panel id="empty-state":
      text "No selectable document paths found." muted
    row:
      text "0 items selected" muted
      spacer
      button "Cancel"
      button "Save Selection" primary disabled

annotation "Error state uses the same frame with destructive text." target="empty-state" position=right
```

## Tooltip Open

```wireloom
window "Select Document Paths — Tooltip Open":
  panel:
    text "Select Document Paths" bold
    text "Choose the files and folders you want to include in the documents view." muted
    row:
      text "Max depth: 5" muted
      icon name="info" id="ticket-tooltip-trigger"
    panel:
      text "docs/CRs is excluded automatically because it is the ticket area."

annotation "Tooltip text uses configured ticketsPath, not hardcoded copy." target="ticket-tooltip-trigger" position=right
```
