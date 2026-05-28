# Documents Path Selector Modal Upgrade

## Architecture Assessment

The current architecture is good for this scope.

- `PathSelector` stays a configuration modal and owns only local UI state: selected paths, expanded paths, loading, and metadata display.
- Backend filesystem rules remain behind `/api/filesystem`, so ticket-path exclusion, ignored folders, and depth limits are not duplicated in the browser.
- Project config remains the source of truth for selected document paths, tickets path, and max depth.
- E2E coverage is the right regression layer because the behavior spans project config, filesystem tree loading, tooltip rendering, and modal interaction.

## UX Decision

Default collapsed is correct, but selected nested paths must remain reachable on first load.

For a selected path like `aa/bb/cc`, the modal expands only ancestors:

```text
aa
└── bb
    └── cc
```

`aa` and `aa/bb` are open so the selection is visible. `cc` remains collapsed so the modal does not become an expanded file browser.

## Plan Update

Do not auto-open the selector when a project has no configured document paths. First load should show a friendly empty state with a `Configure document paths` button. That button opens the same selector modal as the sidebar configuration action.

The sidebar configuration action should use a gear/settings icon because it changes Documents View configuration, not document content.

## Remaining Boundary

If this surface grows again, split the path-selection tree into a dedicated endpoint such as:

```text
GET /api/projects/:projectId/path-selection-tree
```

That would make the contract clearer than the current general `/api/filesystem` route.
