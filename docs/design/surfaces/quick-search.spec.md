# Quick Search

Cmd/Ctrl+K modal for finding tickets and projects without leaving the current route.

Related artifacts:
- Interaction contract: `quick-search.interactions.md`
- Review mockups: `quick-search.mockups.md`
- Project browser contract: `project-browser.spec.md`
- Document search boundary: `documents-view-navigation.spec.md`

## Owns

- Quick Search modal composition and visible chrome.
- Search scope bar labels, order, and visibility.
- Result groups for tickets, projects, and future documents.
- Empty, loading, error, and selected-result presentation.
- Responsive and accessibility requirements for the Quick Search surface.

## Does Not Own

- Project browser card layout, filtering rules, or project-selector rail behavior.
- Documents View tree filtering, document title extraction, or full-text indexing.
- Backend search endpoint shape beyond the UI states needed to consume it.
- Detailed ranking algorithms; only user-visible ordering guarantees are specified here.
- Modal primitive internals. Shared modal behavior is owned by `src/MODALS.md`.

## Composition

```text
QuickSearchModal
├── Modal[size=xl, constrained body]
│   ├── SearchInput
│   │   ├── SearchIcon
│   │   ├── InputField
│   │   └── ModeIndicator[conditional]
│   ├── SearchScopeBar
│   │   ├── ScopeTab[All]
│   │   ├── ScopeTab[Tickets]
│   │   └── ScopeTab[Projects]
│   └── QuickSearchResults
│       ├── CrossProjectTickets[conditional]
│       ├── CurrentProjectTickets[conditional]
│       ├── Projects[conditional]
│       ├── Documents[future, hidden until wired]
│       ├── LoadingState[conditional]
│       ├── ErrorState[conditional]
│       └── EmptyState[conditional]
```

## Children

| Child | Component | Spec | Conditional |
|-------|-----------|------|-------------|
| Modal | `src/components/ui/Modal.tsx` | `src/MODALS.md` | always while open |
| SearchInput | `src/components/QuickSearch/QuickSearchInput.tsx` | this spec | always |
| SearchScopeBar | `src/components/QuickSearch/SearchScopeBar.tsx` | this spec | always |
| QuickSearchResults | `src/components/QuickSearch/QuickSearchResults.tsx` | this spec | always |
| ProjectResultRow | `src/components/QuickSearch/ProjectResultRow.tsx` | `project-browser.spec.md` for project identity rules | when project results exist |
| DocumentResultRow | `src/components/QuickSearch/DocumentResultRow.tsx` | `documents-view-navigation.spec.md` for document-search boundary | future document search |

## Source / Verification Anchors

These refs are drift anchors, not a code inventory. Keep them short and update them only when the owning surface, behavior model, style contract, or verification surface changes.

| Anchor | Path | Why It Exists |
|--------|------|---------------|
| Surface owner | `src/components/QuickSearch/QuickSearchModal.tsx` | modal composition and lifecycle |
| Result rendering | `src/components/QuickSearch/QuickSearchResults.tsx` | visible groups, rows, and remote states |
| Behavior model | `src/hooks/useQuickSearch.ts`, `src/hooks/useSearchScope.ts` | query filtering and scope state |
| Style contract | `src/components/QuickSearch/quick-search.css` | semantic search classes only |
| Verification | `src/components/QuickSearch/__tests__/`, `tests/e2e/quick-search/modal.spec.ts`, `tests/e2e/scoped-search.spec.ts` | keyboard, scope, and result behavior |

## Layout

- Quick Search uses the shared `Modal` with `size="xl"` and `ModalBody` using `modal__body--constrained`.
- The search input occupies the first modal section.
- The scope bar sits directly below the input and above all results.
- Results scroll inside `QuickSearchResults`; the modal shell does not grow as results change.
- Section headers are compact, uppercase labels above each visible result group.
- Result rows use the shared `.search-result` styling and must keep keyboard-selected and hover states visually distinct.

## Scopes

| Scope | Label | Visible Now | Result Groups |
|-------|-------|-------------|---------------|
| `global` | `All` | yes | current-project tickets, cross-project tickets when syntax triggers them, project matches |
| `tickets` | `Tickets` | yes | current-project tickets, cross-project tickets when syntax triggers them |
| `projects` | `Projects` | yes | project matches only |
| `documents` | `Documents` | no | future document results only |

Documents are intentionally hidden from the scope bar until document search is wired. The result component may contain document-row support before the scope is visible.

## Result Groups

| Group | When Visible | User Action |
|-------|--------------|-------------|
| Cross-Project Results | ticket-key query or `@CODE query` returns remote ticket results | select ticket and navigate with target project code |
| Current Project | current scope permits tickets and local ticket results exist | select ticket in current project |
| Projects | `All` or `Projects` scope has project matches | select project and close modal |
| Documents | future document search returns matches and `Documents` scope is visible | open document in Documents View |

Group order is cross-project tickets, current-project tickets, projects, then documents. Keyboard selection follows the same order.

## States

| State | Trigger | Visible Contract |
|-------|---------|------------------|
| closed | `isOpen=false`, Escape, backdrop click, or selection | modal unmounted |
| opened | Cmd/Ctrl+K | query cleared, scope reset to `All`, input focused, first selectable result selected |
| filtering | plain text query | local ticket and project matches update immediately |
| scoped | user clicks scope tab or presses Tab / Shift+Tab | active scope tab changes and non-matching groups are hidden |
| cross-project loading | ticket-key or `@CODE query` search is pending | skeleton rows appear in cross-project group |
| cross-project error | remote ticket search fails | concise error with retry action |
| invalid project | `@CODE query` uses unknown loaded project code | project-not-found empty state; no remote search is required |
| empty | no visible result group has rows | concise empty message for active scope |
| selected | keyboard index points at a row | selected row uses `data-selected="true"` treatment |

## Accessibility

- The modal must follow `src/MODALS.md` requirements unless that shared contract is explicitly revised.
- The scope bar uses `role="tablist"` and scope buttons use `role="tab"` with `aria-selected`.
- The results container uses `role="listbox"`.
- Selectable result rows use `role="option"` and `aria-selected`.
- Escape closes the modal through the shared modal behavior.
- The focused input remains the primary keyboard target while arrow keys and Enter operate the selected result.

## Responsive

| Breakpoint | Contract |
|------------|----------|
| `< 640px` | modal keeps page gutters, input and tabs remain single-column, results scroll within the constrained body |
| `>= 640px` | same composition, wider result rows may show more title/project context |

## Semantic Style Anchors

Only keep class names that express durable composition or state. Exact token values remain owned by CSS and theme files.

| Element | Semantic Anchor | Contract |
|---------|-----------------|----------|
| Modal shell | `Modal`, `ModalBody`, `modal__body--constrained` | shared modal primitive owns backdrop, focus trap, and scroll lock |
| Result row | `.search-result` | one row pattern covers hover, focus-visible, and keyboard-selected states |
| Result group label | `.search-section-header` | keeps ticket, project, and future document groups visually separate |
| Scope bar | `.search-scope-bar`, `.search-scope-bar__tab` | visible tab state is the source of truth for active scope |
| Mode badge | `.search-mode-badge` | query syntax context stays secondary to the visible scope tabs |
| Remote state | `.search-skeleton-bar`, `.search-error-text`, `.search-retry-link` | loading, error, and retry are scoped to remote ticket lookup |

## Maintenance Rules

- Keep this file focused on the durable surface contract. Put precedence, query syntax, and keyboard dispatch details in `quick-search.interactions.md`.
- Do not add phase plans to this spec. If behavior is not implemented, mark it as future or keep it out.
- Do not add full-text document search here. Document search starts from filename/title/path metadata unless a separate design changes that boundary.
- If a scope becomes visible or hidden, update the scope table, mockups, and tests together.
