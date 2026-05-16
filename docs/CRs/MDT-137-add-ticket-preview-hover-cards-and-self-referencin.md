---
code: MDT-137
status: Proposed
dateCreated: 2026-03-10T18:35:45.433Z
type: Feature Enhancement
priority: Medium
phaseEpic: UI/UX
---

# Add ticket preview hover cards and self-referencing links

## 1. Description

### Requirements Scope
`full` — Complete specification with concrete artifacts

### Problem
- RelationshipBadge (`src/components/Badge/RelationshipBadge.tsx`) shows ticket codes without preview, requiring navigation to see ticket details
- SmartLink (`src/components/SmartLink.tsx`) renders self-references as clickable links, creating confusing UX when viewing a ticket that references itself
- No visual feedback when clicking relationship badges to locate tickets in board/list views

### Affected Artifacts
- `src/components/Badge/RelationshipBadge.tsx` (wrapping with HoverCard)
- `src/components/SmartLink.tsx` (self-reference detection)
- `src/utils/linkProcessor.ts` (extract targetCode from links)

### Scope
- **Changes**: Add HoverCard to RelationshipBadge, create TicketPreviewCard component, add currentViewedTicket prop to SmartLink, create useHighlightTicket hook
- **Unchanged**: Existing badge styling, SmartLink routing for non-self references

## 2. Decision

### Chosen Approach
Wrap RelationshipBadge with HoverCard containing TicketPreviewCard, add prop-based self-reference detection to SmartLink.

### Rationale
- Reuses existing HoverCard component (`src/components/UI/hover-card.tsx`) and TicketAttributeTags (`src/components/TicketAttributeTags.tsx`) - minimal new code
- Prop-based currentViewedTicket provides explicit control without URL coupling
- w-96 width matches ticket card visual density for consistency
- Highlight action uses existing data-ticket-key selector pattern

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **HoverCard + Prop-based self-ref** | Explicit prop, reusable components | **ACCEPTED** - Clear data flow, testable |
| Tooltip instead of HoverCard | Simpler, no interaction | No space for badges and click actions |
| URL-based self-reference | useParams() in SmartLink | Couples component to routing, harder to test |
| Popover with close button | Explicit dismiss | Hover is more natural for quick preview |

## 4. Artifact Specifications
### New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| `src/components/TicketPreviewCard.tsx` | Component | Compact ticket preview with SmartLink, title, TicketAttributeTags |
| `src/hooks/useHighlightTicket.ts` | Hook | Scroll and highlight ticket in current view using data-ticket-key selector |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `src/components/Badge/RelationshipBadge.tsx` | Refactored | New `RelationshipLinkWithPreview` sub-component wraps each link with HoverCard; fetches ticket via `dataLayer.fetchTicket()` on hover |
| `src/components/SmartLink.tsx` | Prop added | `currentViewedTicket?: string` for self-reference detection |
| `src/utils/linkProcessor.ts` | Property added | Extract `targetCode` from TICKET/CROSS_PROJECT links |

### Integration Points

| From | To | Interface |
|------|----|-----------|
| RelationshipLinkWithPreview | `dataLayer.fetchTicket()` | `(projectCode, ticketCode) → Promise<Ticket>` |
| RelationshipLinkWithPreview | TicketPreviewCard | `ticket: Ticket, onHighlight: () => void` |
| TicketPreviewCard | SmartLink | `link, currentProject, currentViewedTicket` |
| TicketPreviewCard | TicketAttributeTags | `ticket: Ticket` |
| useHighlightTicket | DOM | `document.querySelector('[data-ticket-key="${code}"]')` |

### Data Flow

```text
Hover on link (e.g., "MDT-100")
    ↓
RelationshipLinkWithPreview.handleHover()
    ↓
dataLayer.fetchTicket(projectCode, "MDT-100")
    ↓
TicketPreviewCard renders with fetched ticket
    ↓
Click card body → useHighlightTicket.highlight()
    ↓
Scroll + animate element with data-ticket-key="MDT-100"
```

### Key Patterns

- **Fetch on hover**: Lazy load ticket data only when user hovers; cache in component state
- **Component reuse**: TicketPreviewCard reuses TicketAttributeTags for badge display
- **Prop-based self-ref**: `currentViewedTicket` passed explicitly from parent (not URL coupling)
- **CSS animation**: `ring-2 ring-blue-500 animate-pulse` for highlight effect (2s duration)
## 5. Acceptance Criteria
### Functional

- [ ] Hovering on individual ticket link (e.g., "MDT-100") in RelationshipBadge shows HoverCard
- [ ] HoverCard width is w-96 (384px)
- [ ] TicketPreviewCard displays: code (SmartLink), title, badges (status/priority/type/worktree)
- [ ] Ticket data fetched via `dataLayer.fetchTicket(projectCode, ticketCode)` on first hover
- [ ] Fetched ticket cached in component state (no re-fetch on subsequent hovers)
- [ ] SmartLink click in preview navigates to ticket detail `/prj/:code/ticket/:ticketCode`
- [ ] Card body click in Board view scrolls to and highlights ticket card
- [ ] Card body click in List view scrolls to and highlights ticket row
- [ ] Card body click in Documents view opens ticket detail
- [ ] SmartLink with `currentViewedTicket` matching link's targetCode renders as non-clickable span
- [ ] Cross-project ticket links fetch from correct project (extract project from code)
- [ ] Loading state shows skeleton while fetching ticket data

### Non-Functional

- [ ] HoverCard openDelay: 100ms, closeDelay: 100ms (existing defaults from hover-card.tsx)
- [ ] Highlight animation: `ring-2 ring-blue-500 animate-pulse`, 2 seconds duration
- [ ] No layout shift when HoverCard appears

### Testing

- Unit: `RelationshipLinkWithPreview` calls `dataLayer.fetchTicket` on hover
- Unit: `TicketPreviewCard` renders SmartLink with correct props
- Unit: `SmartLink` renders span when `currentViewedTicket === targetCode`
- Unit: `useHighlightTicket` finds element by data-ticket-key and calls scrollIntoView
- Integration: RelationshipBadge + HoverCard + TicketPreviewCard renders ticket preview
- E2E: Hover relationship link, verify preview appears with ticket data
- E2E: Click preview card body, verify scroll + highlight in Board view
- E2E: In ticket detail, verify self-reference is non-clickable span
## 6. Verification

### By CR Type
**Feature**: Artifacts exist and tests pass
- TicketPreviewCard.tsx exports component
- useHighlightTicket.ts exports hook
- SmartLink accepts currentViewedTicket prop
- RelationshipBadge wraps content in HoverCard

### View Behavior Verification
| View | Card Body Click | Expected Result |
|------|-----------------|-----------------|
| Board | Scroll + highlight | Card scrolls into view, shows ring animation |
| List | Scroll + highlight | Row scrolls into view, shows ring animation |
| Documents | Navigate to detail | Opens /prj/:code/ticket/:ticketCode |
| Ticket Detail | Navigate to detail | Opens linked ticket detail |

## 7. Deployment

### Simple Changes
- Frontend-only, no backend changes
- No configuration changes required
- Deploy with standard `bun run build`
