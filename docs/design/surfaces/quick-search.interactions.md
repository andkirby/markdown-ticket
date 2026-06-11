# Quick Search - Interactions

Durable interaction contract for Quick Search scope switching, query interpretation, result ordering, and keyboard dispatch.

Related spec: `quick-search.spec.md`
Related mockups: `quick-search.mockups.md`

## Owns

- Query interpretation for the Quick Search modal.
- Scope precedence between visible tabs and query syntax.
- Result-group ordering and keyboard selection dispatch.
- Remote ticket-search loading, retry, and cancellation behavior.

## Does Not Own

- Visual layout and spacing. See `quick-search.spec.md`.
- Project browser filtering outside Quick Search. See `project-browser.spec.md`.
- Document-tree search behavior. See `documents-view-navigation.spec.md`.
- Backend authorization and project visibility. Quick Search consumes already-visible projects.

## Scope Model

| Scope Value | Label | Included Local Results | Remote Ticket Search |
|-------------|-------|------------------------|----------------------|
| `global` | `All` | current-project tickets and projects | ticket-key and `@CODE query` syntax can trigger remote ticket search |
| `tickets` | `Tickets` | current-project tickets | ticket-key and `@CODE query` syntax can trigger remote ticket search |
| `projects` | `Projects` | projects only | remote ticket search is not shown |
| `documents` | `Documents` | future document matches | hidden until document search is wired |

The visible cycle is `All -> Tickets -> Projects -> All`. `Documents` remains out of the visible cycle until the Documents group has a real source.

## Query Interpretation

| Input | Parsed Mode | Contract |
|-------|-------------|----------|
| empty query | `current_project` | show initial current-project ticket results, up to the local result limit |
| plain text | `global`, `current_project`, or `projects_only` depending on active scope | filter visible local groups immediately |
| `{CODE}-{number}` | `ticket_key` | search for that ticket key across projects; keep current-project ticket results visible when the active scope permits tickets |
| `@{CODE} {query}` | `project_scope` | search tickets in the specified project code |
| `@{CODE}` with no query text | `current_project` fallback | do not issue remote search; project discovery remains visible through project results |
| unknown loaded project code in `@CODE query` | invalid project | show project-not-found state without issuing remote search |

Ticket-key matching is an accelerator, not a separate visual mode. It must not replace the visible scope tabs.

## Matching

| Result Type | Matching Rule | Limit |
|-------------|---------------|-------|
| current-project tickets | all whitespace-separated terms must match ticket key, key number, or title | `MAX_RESULTS = 10` |
| projects | all whitespace-separated terms must match project code or name word prefix | 10 |
| cross-project tickets | remote search request handles result set | max 5 per project, 15 total |

Ticket and project results must remain in separate groups even when the same plain-text query matches both.

## Result Ordering

Visible group order:

1. Cross-project tickets.
2. Current-project tickets.
3. Projects.
4. Documents.

Keyboard selection uses the same order. When a group is hidden by scope or has no rows, it contributes no selectable rows.

## Keyboard

| Key | Action |
|-----|--------|
| `Cmd+K` / `Ctrl+K` | open Quick Search from the app-level shortcut |
| `Escape` | close through shared modal behavior |
| `Tab` | cycle visible scopes forward |
| `Shift+Tab` | cycle visible scopes backward |
| `ArrowDown` | move selected index to the next visible selectable result |
| `ArrowUp` | move selected index to the previous visible selectable result |
| `Enter` | activate the selected visible result |

`Tab` is a scope command inside this modal, not normal focus traversal. If the modal accessibility model changes, this contract must be revisited with `src/MODALS.md`.

## Enter Dispatch

| Selected Row | Dispatch |
|--------------|----------|
| project row | call `onSelectProject(project)` and close modal |
| cross-project ticket row | call `onSelectTicket(ticket, targetProjectCode)` and close modal |
| current-project ticket row | call `onSelectTicket(ticket)` and close modal |
| document row | future: open document target and close modal |

Project rows are checked after the cross-project/current-ticket offset is computed, so keyboard selection must never activate a ticket from a project row index.

## Remote Ticket Search

| Trigger | Behavior |
|---------|----------|
| ticket-key query | debounce, then search by `mode: ticket_key` |
| `@CODE query` | debounce, then search by `mode: project_scope` and `projectCode` |
| query changes away from remote mode | cancel pending remote search |
| modal closes | cancel pending remote search |
| request succeeds | cache result for the hook TTL and show cross-project group |
| request fails | show retry action in the affected group |
| retry | re-run the last request |

The UI shows loading immediately after remote search is scheduled, even though the actual request is debounced.

## Empty States

| Context | Message Contract |
|---------|------------------|
| non-global active scope has no visible results | mention the active scope, for example `No results found in projects` |
| invalid `@CODE query` | identify the missing project code without leaking private project names |
| ticket-key remote search returns no rows | show a concise ticket-not-found message |
| project-scoped remote search returns no rows | show a concise no-tickets-in-project message |

## Maintenance Rules

- Do not add hidden repeated-key scope switching unless the active scope remains visibly selected.
- Do not blend project and ticket results into one mixed list.
- Do not promote Documents scope until document result sourcing and navigation are implemented.
- Keep remote ticket API details in code/contracts; this doc only records the user-visible interaction.
