---
code: MDT-017
title: Implement URL-based state management for frontend routing and deep linking
status: Proposed
dateCreated: 2025-09-06T15:42:22.523Z
type: Feature Enhancement
priority: High
lastModified: 2025-09-07T00:20:40.485Z
---















# Implement URL-based state management for frontend routing and deep linking

## 1. Description

### Problem Statement
Add comprehensive URL-based state management to enable deep linking, browser navigation, and persistent view states including project selection, ticket viewing, sorting, and filtering

### Current State
Application uses localStorage for project selection persistence and React state for UI management. No URL-based routing exists - all navigation is programmatic. Users cannot:
- Bookmark specific project views or tickets
- Share direct links to tickets
- Use browser back/forward navigation
- Deep link to filtered/sorted views

### Desired State
Comprehensive URL-based state management with React Router enabling:
- Deep linking to any application state
- Browser navigation support
- Bookmarkable URLs
- Shareable ticket links
- URL-persisted sorting/filtering preferences
- "Save as default" sorting functionality

### Rationale
Essential for professional user experience - users need to bookmark specific views, share links to tickets, and have browser back/forward work naturally. Current localStorage-only approach doesn't support deep linking or sharing.

### Impact Areas
- Frontend Navigation
- State Management
- User Experience
- URL Structure
- Real-time Updates Integration

## 2. Solution Analysis

### Recommended Architecture
- **React Router v6**: Industry standard with excellent TypeScript support
- **Hierarchical URL structure**: `/project/{code}/ticket/{id}?sort=priority-desc`
- **Hybrid state management**: URL as single source of truth, React state for derived/transient state
- **SSE integration**: Real-time updates aware of current URL state

### URL Structure Design
```
# Dashboard
/                                    # Multi-project dashboard
├── ?sort={field}-{direction}        # Global sorting
├── ?filter={status}                 # Global filtering

# Project Views  
/project/{projectCode}               # Single project - Board view (default)
├── ?sort={field}-{direction}        # Project-specific sorting
├── ?filter={status}                 # Project-specific filtering
├── ?view=board                      # Explicit board view

/project/{projectCode}/list          # Single project - List view
├── ?sort={field}-{direction}        # List-specific sorting
├── ?filter={status}                 # List-specific filtering

/project/{projectCode}/documents     # Single project - Documents view
├── ?file={encodedPath}              # Specific document deep link

# Ticket Detail (Shareable)
/t/{ticketCode}                      # Ticket detail, returns to List
/t/{ticketCode}?board                # Ticket detail, returns to Board

# Error/Fallback
/404                                 # Not found page
/*                                   # Catch-all redirect to dashboard

# Note: Create functionality removed - no create routes needed
# All ticket creation happens via external tools/MCP
```

### State Management Approach
1. **URL-Driven State**: Route params, search params (single source of truth)
2. **Derived State**: Filtered/sorted data computed from URL + API data
3. **Transient State**: Loading, errors, drag-and-drop (React-only)
4. **Persistent State**: User defaults, preferences (localStorage/API)

## 3. Implementation Specification

### Phase 1: Router Foundation
- Install React Router v6
- Create route structure with TypeScript types
- Implement `useURLState` custom hook
- Update main navigation components

### Phase 2: State Integration
- Create `useURLAwareProjectData` hook
- Integrate URL state with existing data hooks
- Implement sorting/filtering from URL parameters
- Add deep linking support for tickets

### Phase 3: Advanced Features
- Implement "save as default" sorting functionality
- Enhance SSE service with URL state awareness
- Add comprehensive error handling and fallbacks
- Performance optimization for large datasets

### Phase 4: Testing and Polish
- Comprehensive navigation scenario testing
- URL validation and error handling
- Documentation and team training

### Technical Requirements
- React Router DOM v6.20.0+
- TypeScript route parameter types
- URL parameter encoding/decoding utilities
- Integration with existing SSE real-time updates
- localStorage integration for user defaults

## 4. Acceptance Criteria

### Core Functionality
- [ ] Users can bookmark any application state via URL
- [ ] Browser back/forward navigation works correctly
- [ ] Direct links to specific tickets work from external sources
- [ ] URL reflects current project, sorting, and filtering state

### View States
- [ ] Multi-project vs single-project view persisted in URL
- [ ] Selected project reflected in URL path
- [ ] Current view (Board/List/Documents) reflected in URL
- [ ] Board view accessible via `/project/{code}` (default) and `?view=board`
- [ ] List view accessible via `/project/{code}/list` and `?view=list`
- [ ] Documents view accessible via `/project/{code}/documents`
- [ ] Opened ticket shows in URL with deep linking support (both project-scoped and global)
- [ ] Opened document shows in URL with deep linking support

### Sorting and Filtering
- [ ] Sort parameters reflected in URL query string
- [ ] Changed sorting immediately updates URL
- [ ] Users can save current sort as default preference
- [ ] Default sorting applied automatically on page load
- [ ] URL changes don't break real-time SSE updates

### Error Handling
- [ ] Invalid URLs show helpful 404 pages
- [ ] Malformed parameters gracefully fallback to defaults
- [ ] Missing projects/tickets redirect appropriately

### Performance
- [ ] Large ticket lists don't cause performance degradation
- [ ] URL updates are debounced to prevent history pollution
- [ ] Real-time updates integrate smoothly with URL state

## 5. Implementation Notes

### Technical Concerns

**State Management Complexity**: The hybrid approach (URL + React state + localStorage + SSE) could create race conditions. When SSE updates come in, URL state might conflict with real-time data. Need careful state reconciliation strategy.

**Performance**: URL updates on every sort/filter change could spam browser history. Debouncing implementation needs to balance responsiveness with history pollution.

**SSE Integration**: Current real-time file watcher might not play well with URL-driven state. If a ticket updates via SSE while user is on a specific URL, we need to handle state reconciliation carefully without breaking navigation.

### Implementation Concerns

**Scope Creep**: This is a massive change touching every component. The "comprehensive" approach might be too ambitious for a single CR. Consider breaking into smaller incremental changes.

**Breaking Changes**: Current localStorage-based project selection will need migration strategy. Users might lose their preferences during transition.

**Testing Complexity**: The acceptance criteria list is extensive - this could take significant time to validate all edge cases and navigation scenarios.

### Alternative Approach

Consider more incremental implementation:
1. Start with basic project routing (`/project/{code}`) and ticket deep links (`/t/{code}`)
2. Add sorting/filtering URL parameters in separate CR
3. Add advanced features (save defaults, documents deep linking) in final phase

Current app works well - need to ensure URL routing doesn't introduce bugs for features that aren't broken.

## 6. References

### Related CRs
- MDT-012: Sortable ticket attributes with admin configuration
- References architectural guidance from software-architect-advisor

### Technical Dependencies
- React Router DOM v6
- TypeScript route definitions
- URL parameter handling utilities
- Integration with existing fileService and realtimeFileWatcher