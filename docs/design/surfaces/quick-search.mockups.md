# Quick Search - Mockups

Related spec: `quick-search.spec.md`
Related interactions: `quick-search.interactions.md`

These mockups show the review states for the durable Quick Search contract. Small hover-only or color-only differences belong in the spec state tables, not as separate full-window examples.

## All Scope

```wireloom
window "Quick Search - All Scope":
  panel:
    input placeholder="Search tickets or projects..." type=search id="qs-input"
    row id="scope-tabs":
      chip "All" selected id="scope-all"
      chip "Tickets"
      chip "Projects"
    divider
    section "Current Project":
      list:
        slot "MDT-179   Add scoped global search" active id="ticket-result"
        item "MDT-176   Auth session unlock"
    section "Projects":
      list:
        item "Summary Link" id="project-result"
        item "Transcription Player"

annotation "All shows ticket and project groups without blending them into one mixed list." target="scope-all" position=right
annotation "Keyboard selection follows visible group order." target="ticket-result" position=right
annotation "Project rows stay visually separate from ticket rows." target="project-result" position=right
```

## Tickets Scope

```wireloom
window "Quick Search - Tickets Scope":
  panel:
    input placeholder="badge fix" type=search id="ticket-query"
    row:
      chip "All"
      chip "Tickets" selected id="scope-tickets"
      chip "Projects"
    divider
    section "Current Project":
      list:
        slot "MDT-140   Badge color update" active id="ticket-selected"
        item "MDT-142   Update badge styles"
        item "MDT-155   Badge hover states"

annotation "Tickets scope hides project matches even when project names also match." target="scope-tickets" position=right
annotation "Selected treatment is shared for mouse and keyboard result rows." target="ticket-selected" position=right
```

## Projects Scope

```wireloom
window "Quick Search - Projects Scope":
  panel:
    input placeholder="sum li" type=search id="project-query"
    row:
      chip "All"
      chip "Tickets"
      chip "Projects" selected id="scope-projects"
    divider
    section "Projects":
      list:
        slot "SL   Summary Link" active id="project-sl"
        item "SLTTS   Summary Link TTS"

annotation "Project search is discoverable through the same command palette entrypoint." target="scope-projects" position=right
annotation "Project code and name are enough here; card layout remains owned by project-browser.spec.md." target="project-sl" position=right
```

## Ticket Key Lookup

```wireloom
window "Quick Search - Ticket Key Lookup":
  panel:
    input placeholder="ABC-42" type=search id="ticket-key-query"
    row:
      chip "All" selected
      chip "Tickets"
      chip "Projects"
    divider
    text "Searching: ABC-42" muted id="mode-badge"
    section "Cross-Project Results":
      list:
        slot "ABC-42   Auth service refactor" active id="cross-ticket":
          text "ABC   Another Project" muted size=small
    section "Current Project":
      list:
        item "MDT-042   Local ticket with matching number"

annotation "Ticket-key syntax is an accelerator inside the visible scope model." target="mode-badge" position=right
annotation "Cross-project ticket rows include project context." target="cross-ticket" position=right
```

## Remote Loading And Error

```wireloom
window "Quick Search - Remote Loading":
  panel:
    input placeholder="@ABC login redirect" type=search id="remote-query"
    row:
      chip "All" selected
      chip "Tickets"
      chip "Projects"
    divider
    text "In: ABC" muted id="project-mode"
    section "Project Results":
      spinner "Searching..." id="loading"
      text "----------" muted
      text "----------------" muted

annotation "Remote ticket lookup shows skeleton rows inside the affected group only." target="loading" position=right
```

```wireloom
window "Quick Search - Remote Error":
  panel:
    input placeholder="@ABC login redirect" type=search
    row:
      chip "All" selected
      chip "Tickets"
      chip "Projects"
    divider
    section "Project Results":
      text "Search failed: Network error" id="remote-error"
      button "Retry" id="retry"

annotation "Retry stays local to the failed remote-ticket group." target="retry" position=right
annotation "The modal remains open so the user can revise the query." target="remote-error" position=right
```

## Empty State

```wireloom
window "Quick Search - Empty Projects":
  panel:
    input placeholder="zzznothing" type=search
    row:
      chip "All"
      chip "Tickets"
      chip "Projects" selected id="empty-projects-tab"
    divider
    text "No results found in projects" muted id="empty-message"

annotation "Empty copy names the active non-global scope." target="empty-message" position=right
```

## Mobile

```wireloom
window "Quick Search - Mobile":
  panel:
    input placeholder="badge fix" type=search id="mobile-input"
    row id="mobile-tabs":
      chip "All" selected
      chip "Tickets"
      chip "Projects"
    divider
    section "Current Project":
      list:
        slot "MDT-136   Fix login" active
        item "MDT-140   Badge color"
        item "MDT-142   Badge styles"

annotation "Mobile keeps the same scope model; only available width changes." target="mobile-tabs" position=bottom
```

## Annotations

| Element | Semantic Pattern | Notes |
|---------|------------------|-------|
| Modal shell | `Modal` + `modal__body--constrained` | Shared modal primitive owns backdrop and scroll lock |
| Scope bar | `.search-scope-bar` | Visible mode switcher; no hidden repeated-shortcut-only mode |
| Result group | `.search-section-header` | Keeps tickets, projects, and future documents distinct |
| Result row | `.search-result` | Shared row shape for keyboard and mouse selection |
| Remote state | `.search-skeleton-bar`, `.search-error-text`, `.search-retry-link` | Loading/error/retry are scoped to remote ticket lookup |

## Maintenance Rules

- Keep this file to canonical review states: All, Tickets, Projects, ticket-key lookup, remote loading/error, empty, and mobile.
- Do not add separate full-window examples for hover, selected, badge color, or minor row styling.
- If Documents becomes visible, add one Documents-scope mockup and update `quick-search.spec.md`.
