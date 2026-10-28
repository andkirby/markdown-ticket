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
| `global` | `All` | current-project tickets and projects | All projects toggle, full-key and `@CODE query` syntax enable remote tickets |
| `tickets` | `Tickets` | current-project tickets | All projects toggle, full-key and `@CODE query` syntax enable remote tickets |
| `projects` | `Projects` | projects only | remote ticket search is not shown |
| `documents` | `Documents` | future document matches | hidden until document search is wired |

The visible entity tabs are All, Tickets and Projects. Left/Right and Home/End select tabs; native Tab traverses controls. Documents remains hidden until document search has a real source.

## Query Interpretation

| Input | Parsed Mode | Contract |
|-------|-------------|----------|
| empty query | `current_project` | show initial current-project ticket results, up to the local result limit |
| numbers, refs or plain text | `current_project` by default; remote with All projects | search current-project tickets immediately; toggle broadens every query term |
| `{CODE}-{number}` | `ticket_key` | search local/external identity across projects in one deduplicated ranked list |
| `@{CODE} {query}` | `project_scope` | search tickets in the specified project code |
| `@{CODE}` with no query text | `current_project` fallback | do not issue remote search; project discovery remains visible through project results |
| unknown loaded project code in `@CODE query` | invalid project | show project-not-found state without issuing remote search |

Ticket-key matching is an accelerator, not a separate visual mode. It must not replace the visible scope tabs.

## Matching

| Result Type | Matching Rule | Limit |
|-------------|---------------|-------|
| current-project tickets | all whitespace-separated terms must match ticket key, key number, title or stored refs | `MAX_RESULTS = 10` |
| projects | all whitespace-separated terms must match project code or name word prefix | 10 |
| cross-project tickets | AND terms with exact identities before partial matches; deduplicate by project and ticket | max 5 per project, 15 total |

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
| `Tab` / `Shift+Tab` | native control/link traversal |
| Left/Right, Home/End on scope tabs | select the adjacent/first/last entity tab |
| `F6` | focus selected result primary action; empty results retain input focus |
| `Shift+F6` | return to search input without resetting query/scope |
| `Tab` / `Shift+Tab` in results | native traversal among primary, reference and details controls |
| `ArrowDown` in input | move selected index to the next visible selectable result |
| `ArrowUp` in input | move selected index to the previous visible selectable result |
| `Enter` | activate the selected visible result |

`Tab` follows native focus order. Entity tabs use roving focus and Left/Right/Home/End. The bottom visible hint is described by the input. F6 transfers focus into result actions, where native Tab traversal applies; Shift+F6 returns to search. Reference popover Escape closes that popover and restores its invoking control.

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
| full ticket key, or nonempty numbers/text with All projects enabled | debounce, then use existing cross-project search |
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

## MDT-136 location precedence

1. Projects entity tab searches known projects; it does not issue ticket requests.
2. @CODE query restricts tickets to the named project, independently of All projects.
3. A full ticket key explicitly enables local/external cross-project identity lookup.
4. Otherwise All projects enables cross-project numeric and text queries using AND terms.
5. Otherwise use current-project loaded tickets only. No current project defaults to all-project location.

The toggle preserves the query and entity filter; reopening resets query, selection and location. Query/location/entity changes reset selection and hide stale remote results while loading; remote errors/hidden groups have no selectable remote rows. Search count, click/Enter dispatch and selection indices use identical visible groups. No partial match opens automatically. Arrow selection stays inside the scroller with nearest alignment; the footer and input do not move. Native Tab does not cycle entity scope. Optional F6/Shift+F6 remain compatible and are explained in the footer disclosure. @CODE syntax is excluded from highlighting.
