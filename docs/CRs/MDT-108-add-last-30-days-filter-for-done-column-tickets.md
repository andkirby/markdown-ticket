---
code: MDT-108
status: Proposed
dateCreated: 2025-12-28T08:43:24.168Z
type: Feature Enhancement
priority: Medium
---

# Add last 30 days filter for Done column tickets

## 1. Description

### Requirements Scope
`full` — Generate EARS + FR + NFR specs

### Problem
- Done column contains many old tickets, making it difficult to focus on recently completed work
- Users need a way to filter out stale tickets that haven't been updated within the last 30 days
- No existing visual indicator or control for ticket age filtering

### Affected Areas
- Frontend: Board view toolbar/filter controls area
- Frontend: Ticket filtering logic in board view state management
- Frontend: Icon assets (new filter button icon)

### Scope
- **In scope**: Add visual toggle button and filtering logic for tickets older than 30 days in Done column
- **Out of scope**: Archive process, deletion of old tickets, filtering for other columns

## 2. Desired Outcome

### Success Conditions
- When the "30 days" filter button is visible, users can toggle it to show/hide tickets older than 30 days
- When the filter is ON (default), Done column only shows tickets updated within the last 30 days
- When the filter is OFF, Done column shows all tickets regardless of age
- The button uses an icon with "30" number, no text label
- The button styling matches the rejected button (light orange background, orange border)
- The button is positioned next to the rejected button in the toolbar

### Constraints
- Must use existing button styling patterns from rejected/on hold buttons
- Must integrate with existing board view filtering/state management
- Must handle edge cases: tickets with no update date, future dates
- Icon file exists at `designs/icon_30days.png` and must be converted to .webp
- Filter state should persist during session (reset on page refresh acceptable)

### Non-Goals
- Not adding archive functionality
- Not changing how other columns work
- Not modifying existing rejected/on hold button behavior
- Not adding user preference persistence across sessions (unless already exists)

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Timestamp source | Which ticket field determines "last updated" date? | Use existing `lastModified` or similar field from CR type |
| State persistence | Should filter state persist across page reloads? | If no existing persistence mechanism, session-only is acceptable |
| Edge cases | How to handle tickets with missing/invalid dates? | Default to showing or hiding based on safety preference |
| Icon sizing | What are the exact dimensions for the converted .webp icon? | Match existing icon dimensions in toolbar |

### Known Constraints
- Must reuse existing button component patterns from rejected/on hold buttons
- Must not break existing board view functionality
- Icon asset must be converted from PNG to .webp format
- Filter logic must apply only to Done column tickets

### Decisions Deferred
- Implementation approach (filter location in code, state management pattern)
- Exact component structure (determined by `/mdt:architecture`)
- Test specifications (determined by `/mdt:tests`)
- Task breakdown (determined by `/mdt:tasks`)

## 4. Acceptance Criteria

### Functional (Outcome-focused)
- [ ] User can see a "30" icon button next to the rejected button in the board view
- [ ] Clicking the button toggles between showing/hiding tickets older than 30 days in Done column
- [ ] When filter is ON, only tickets updated within last 30 days appear in Done column
- [ ] When filter is OFF, all tickets appear in Done column regardless of age
- [ ] Button visual state indicates whether filter is active or inactive
- [ ] Filter is ON by default when page loads

### Non-Functional
- [ ] Button styling matches rejected button (colors, spacing, hover states)
- [ ] Filter operation completes instantly without UI lag (<100ms perceived)
- [ ] Icon displays clearly at all screen sizes (responsive)
- [ ] .webp icon file is properly sized and optimized

### Edge Cases
- What happens when a ticket has no update date: Default to showing it (assume recent)
- What happens when a ticket has a future date: Treat as recent (show it)
- What happens when Done column is empty: Button still visible but has no effect
- What happens when user toggles rapidly: Each toggle processes correctly without race conditions

## 5. Verification

### How to Verify Success
- **Manual verification**: 
  1. Load board view with tickets in Done column
  2. Verify "30" button appears next to rejected button with orange styling
  3. Verify filter is ON by default (old tickets hidden)
  4. Click button to toggle OFF, verify all Done tickets appear
  5. Click button to toggle ON, verify only recent Done tickets appear
  6. Check button styling matches rejected button in all states (default, hover, active)

- **Automated verification**: 
  - Unit tests for date filtering logic (30-day boundary, edge cases)
  - Component tests for button rendering and toggle behavior
  - Integration tests for filter state management

- **Icon verification**: 
  - Confirm `designs/icon_30days.png` converted to .webp
  - Confirm .webp dimensions match existing toolbar icons
  - Confirm icon displays correctly in light and dark themes (if applicable)