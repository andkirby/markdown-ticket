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
- Modal primitive internals. Shared modal behavior is owned by `frontend/src/MODALS.md`.

## Composition

```text
QuickSearchModal
└── Modal[dialog, constrained body]
    ├── SearchInput[icon, query, effective location]
    ├── SearchToolbar
    │   ├── SearchScopeBar[All, Tickets, Projects]
    │   └── AllProjectsToggle[ticket scopes only]
    ├── QuickSearchResults[scrollable]
    │   ├── RemoteTickets[explicit syntax or toggle]
    │   ├── CurrentProjectTickets[local location]
    │   ├── Projects[entity/location rules]
    │   └── Loading / Error / Empty states
    └── QuickSearchFooter[keyboard status, optional help]
```

## Children

| Child | Component | Spec | Conditional |
|-------|-----------|------|-------------|
| Modal | `frontend/src/components/ui/Modal.tsx` | `frontend/src/MODALS.md` | always while open |
| SearchInput | `frontend/src/components/QuickSearch/QuickSearchInput.tsx` | this spec | always |
| SearchScopeBar | `frontend/src/components/QuickSearch/SearchScopeBar.tsx` | this spec | always |
| Location control | All projects button in `QuickSearchModal.tsx` | this spec | All/Tickets entity scope |
| QuickSearchFooter | `frontend/src/components/QuickSearch/QuickSearchFooter.tsx` | this spec | always |
| QuickSearchResults | `frontend/src/components/QuickSearch/QuickSearchResults.tsx` | this spec | always |
| ProjectResultRow | `frontend/src/components/QuickSearch/ProjectResultRow.tsx` | `project-browser.spec.md` for project identity rules | when project results exist |
| DocumentResultRow | `frontend/src/components/QuickSearch/DocumentResultRow.tsx` | `documents-view-navigation.spec.md` for document-search boundary | future document search |

## Source / Verification Anchors

These refs are drift anchors, not a code inventory. Keep them short and update them only when the owning surface, behavior model, style contract, or verification surface changes.

| Anchor | Path | Why It Exists |
|--------|------|---------------|
| Surface owner | `frontend/src/components/QuickSearch/QuickSearchModal.tsx` | modal composition and lifecycle |
| Result rendering | `frontend/src/components/QuickSearch/QuickSearchResults.tsx` | visible groups, rows, and remote states |
| Behavior model | `frontend/src/hooks/useQuickSearch.ts`, `frontend/src/hooks/useSearchScope.ts` | query filtering and scope state |
| Style contract | `frontend/src/components/QuickSearch/quick-search.css` | semantic search classes only |
| Verification | `frontend/src/components/QuickSearch/__tests__/`, `tests/e2e/quick-search/modal.spec.ts`, `tests/e2e/scoped-search.spec.ts` | keyboard, scope, and result behavior |

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
| `global` | `All` | yes | current-project tickets, cross-project tickets when explicit syntax or All projects enables remote location, project matches |
| `tickets` | `Tickets` | yes | current-project tickets, cross-project tickets when explicit syntax or All projects enables remote location |
| `projects` | `Projects` | yes | project matches only |
| `documents` | `Documents` | no | future document results only |

Documents are intentionally hidden from the scope bar until document search is wired. The result component may contain document-row support before the scope is visible.

## Result Groups

| Group | When Visible | User Action |
|-------|--------------|-------------|
| Cross-Project Results | full-key, `@CODE query` or enabled All projects numeric/text search returns tickets | select ticket and navigate with target project code |
| Current Project | current scope permits tickets and local ticket results exist | select ticket in current project |
| Projects | `All` or `Projects` scope has project matches | select project and close modal |
| Documents | future document search returns matches and `Documents` scope is visible | open document in Documents View |

Group order is cross-project tickets, current-project tickets, projects, then documents. Keyboard selection follows the same order.

Cross-project ticket results keep the ticket key and title on the first row. A second wrapping metadata row contains project code/name and grouped external-reference badges. Reference badges follow the project name. Match-type labels are omitted; matching visible text is highlighted. When the available width cannot fit project context and badges together, the badges wrap below the project context without horizontal scrolling. Short context may remain inline on a narrow screen. External links/details stay siblings of the native ticket-selection button; activating them never opens the local ticket. Current-project title results retain their reference row without repeating project context.


## States

| State | Trigger | Visible Contract |
|-------|---------|------------------|
| closed | `isOpen=false`, Escape, backdrop click, or selection | modal unmounted |
| opened | Cmd/Ctrl+K | query cleared, scope reset to `All`, input focused, first selectable result selected |
| filtering | plain text query | local ticket and project matches update immediately |
| scoped | user selects an entity tab using click or tab-list arrows | active scope tab changes and non-matching groups are hidden |
| cross-project loading | explicit syntax or All projects numeric/text search is pending | skeleton rows appear in cross-project group |
| cross-project error | remote ticket search fails | concise error with retry action |
| invalid project | `@CODE query` uses unknown loaded project code | project-not-found empty state; no remote search is required |
| empty | no visible result group has rows | concise empty message for active scope |
| selected | keyboard index points at a row | selected row uses `data-selected="true"` treatment |

## Accessibility

- The modal must follow `frontend/src/MODALS.md` requirements unless that shared contract is explicitly revised.
- The scope bar uses `role="tablist"` and scope buttons use `role="tab"` with `aria-selected`.
- The results container is a labelled region containing ordinary lists.
- Result rows use native primary buttons and sibling external links/details controls. Selection uses data-selected treatment; primary buttons expose aria-current.
- Quick Search supplies dialog semantics and an accessible name. Its keyboard hook wraps first/last Tab stops and restores the connected opener on close; portalled reference popovers keep their own native focus handling.
- Escape closes the modal through the shared modal behavior.
- From the input, arrows/Enter select/open results and native Tab reaches controls. Scope tabs use one tab stop with Left/Right/Home/End navigation. F6 focuses the selected primary action; native Tab reaches reference controls. Shift+F6 returns to the input, preserving query and scope. With no result, F6 retains input focus. Concise primary help is described by the input and remains below results; an expandable Keyboard shortcuts control explains optional action focus.

## Responsive

| Breakpoint | Contract |
|------------|----------|
| `< 640px` | modal keeps page gutters, input and tabs remain single-column, results scroll within the constrained body |
| `>= 640px` | same composition, wider result rows may show more title/project context |

## Semantic Style Anchors

Only keep class names that express durable composition or state. Exact token values remain owned by CSS and theme files.

| Element | Semantic Anchor | Contract |
|---------|-----------------|----------|
| Modal shell | `Modal`, `ModalBody`, `modal__body--constrained` | shared modal owns backdrop/Escape/scroll lock; Quick Search keyboard hook owns Tab boundaries and opener restoration |
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

## Search Location and Match Visibility

The toolbar below the input contains entity tabs and a separate All projects pressed toggle. Location defaults to the current project on every open; without a current project it defaults to all projects. Numbers, #numbers, reference identifiers and ordinary text remain local unless the user enables All projects. Full ticket keys and @CODE query syntax are explicit lookup accelerators; the input context badge states the effective location. Switching the toggle preserves input and entity type. Explicit @CODE ticket queries suppress project-discovery groups. In All, project matches obey location; the explicit Projects tab remains a global project-discovery entry point and hides the ticket-location control.

Match highlights mark literal case-insensitive substrings in visible ticket keys/titles, project labels/names and external short labels, including overflow. Exclude @CODE syntax from the highlight query. Keep exact content and accessible identities; a highlight must not replace status/priority glyphs or turn native links into row actions. Selected row and match highlight have distinct treatments in light and dark themes.

Only the middle results region scrolls. Arrow selection follows the visible row with nearest alignment while input focus remains. The bottom status bar remains outside that scroller and shows Move, Open, Controls and Close hints; expanded Keyboard shortcuts explains F6 Focus selected result and Shift+F6 Back to search. Help is available in loading, error and empty states. No new global shortcuts.

Returning-user walkthrough (design reasoning): open Cmd/Ctrl+K → see In: current project and the unpressed All projects toggle → enter 20 → only current tickets → enable All projects → same query across projects → Enter opens selected local ticket. The existing Projects tab remains discoverable for project navigation. Narrow layouts wrap toolbar/footer controls without horizontal scrolling.
