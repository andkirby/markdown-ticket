---
code: MDT-152
status: Implemented
dateCreated: 2026-04-29T13:20:00.000Z
type: Feature Enhancement
priority: Medium
---

# Add Cross-Project Search

## 1. Description

### Requirements Scope
`full` — complete requirements specification with UX design.

### Problem
- Users cannot search for tickets across projects from a single entry point — must switch projects first
- ProjectBrowserPanel has no search capability, making project discovery difficult with many projects
- No way to quickly locate a known ticket (e.g., "ABC-42") without knowing which project it belongs to

### Affected Areas
- Frontend: QuickSearch modal (Cmd+K), ProjectBrowserPanel
- Backend: New search endpoints for cross-project queries
- Docs: UX specifications for search patterns

### Scope
- **In scope**:
  - Search input in ProjectBrowserPanel with client-side filtering
  - Cross-project ticket key search (e.g., "ABC-42") in QuickSearch
  - Project-scoped search with @syntax (e.g., "@ABC login") in QuickSearch
  - Loading states (spinner, skeleton) for async cross-project fetches
  - Mode indicators showing current search context
- **Out of scope**:
  - Full-text search across all projects (future enhancement)
  - Search history / recent searches
  - Saved search queries

## 2. Desired Outcome

### Success Conditions
- User can filter projects in ProjectBrowserPanel by typing project code or name
- User can find a specific ticket by key across all projects without switching context
- User can search within a specific project using @project syntax
- Loading states provide clear feedback during cross-project fetches
- Current project is excluded from ProjectBrowserPanel search results when query matches its code/name

### Constraints
- Must integrate with existing QuickSearch modal (MDT-136)
- Must integrate with existing ProjectBrowserPanel (MDT-129)
- Cross-project searches require backend fetch — cannot preload all tickets
- Must maintain keyboard navigation (arrows, Enter, Escape)
- Must follow existing modal/overlay patterns (MODALS.md)

### Non-Goals
- Not replacing the project switcher workflow
- Not adding global search across all ticket content
- Not implementing search result caching beyond current session

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Backend | What is the optimal endpoint design for cross-project search? | Must support ticket key lookup AND project-scoped search |
| Performance | What debounce duration for cross-project queries? | Recommended: 300ms (matches common patterns) |
| UX | How many results to show per project in cross-project mode? | Recommended: 5 per project, 15 max total |
| Caching | Should project tickets be cached client-side? | Recommended: Yes, 5 min TTL |

### Known Constraints
- Must use existing QuickSearch modal infrastructure
- Must use existing ProjectSelector components and patterns
- Must follow THEME.md design tokens
- Must follow STYLING.md conventions for any new CSS

### Decisions Deferred
- Implementation approach (determined by `/mdt:architecture`)
- Backend endpoint design (determined by `/mdt:architecture`)
- Task breakdown (determined by `/mdt:tasks`)

## 4. Acceptance Criteria

### Functional
- [ ] ProjectBrowserPanel shows search input when opened
- [ ] Typing in ProjectBrowserPanel filters projects by code/name (case-insensitive)
- [ ] Current project excluded from ProjectBrowserPanel search results
- [ ] QuickSearch detects ticket key pattern (CODE-NUM) and triggers cross-project search
- [ ] QuickSearch detects @project syntax and searches within specified project
- [ ] Cross-project search shows loading state (spinner + skeletons)
- [ ] Mode indicator displays current search mode (e.g., "In: ABC", "Searching: ABC-42")
- [ ] Results show project label for cross-project tickets
- [ ] Keyboard navigation works across all result sections

### Non-Functional
- [ ] Cross-project search debounce ≤300ms
- [ ] Loading skeleton renders within 50ms of fetch start
- [ ] No layout shift when results load

### Edge Cases
- [ ] Invalid project code in @syntax shows "Project not found" message
- [ ] Non-existent ticket key shows "Ticket not found" message
- [ ] Empty search results show appropriate empty state
- [ ] Network error during fetch shows retry option

## 5. Verification

### How to Verify Success
- Manual: Open ProjectBrowserPanel, type project name, verify filtering
- Manual: Open QuickSearch, type ticket key from another project, verify result appears
- Manual: Open QuickSearch, type "@ABC search", verify results from project ABC
- Automated: E2E tests for search modes and loading states
- Automated: Unit tests for pattern detection (ticket key, @syntax)

## 6. References

> Requirements trace projection: [requirements.trace.md](./MDT-152/requirements.trace.md)
> Requirements notes: [requirements.md](./MDT-152/requirements.md)
> Architecture trace projection: [architecture.trace.md](./MDT-152/architecture.trace.md)
> Architecture notes: [architecture.md](./MDT-152/architecture.md)

## Design Reference

See `docs/design/specs/project-browser.md` and `docs/design/specs/quick-search.md` for detailed UX specifications.
See `docs/design/mockups/project-browser.md` and `docs/design/mockups/quick-search.md` for wireframes.

### Query Syntax Summary

| Syntax | Example | Behavior |
|--------|---------|----------|
| `{text}` | `badge fix` | Search current project tickets |
| `{CODE}-{num}` | `ABC-42` | Find specific ticket across all projects |
| `@{CODE} {text}` | `@ABC login` | Search tickets in specific project |
