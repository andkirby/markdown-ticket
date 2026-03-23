---
code: MDT-144
status: Implemented
dateCreated: 2026-03-21T01:11:11.513Z
type: Feature Enhancement
priority: Medium
implementationDate: 2026-03-23
implementationNotes: Implemented compact stacked ticket header with consistent dividers, sticky tab refinements, floating relative timestamp interaction, and focused frontend unit coverage for timestamp behavior.
---

# Compact ticket view header

## 1. Description

### Problem Statement
The ticket viewer modal header takes excessive vertical space (~180px for header + metadata), pushing content below the fold and reducing usable viewing area for the actual ticket content.

### Current State
- `ModalHeader` uses `p-6` (24px) padding with separate title row
- `TicketAttributes` renders in a separate `bg-gray-50` box with `p-5` padding
- Full timestamps displayed (e.g., "2025-03-21 09:15:32")
- Close button embedded in header row, taking layout space

### Desired State
- Compact top stack with equal vertical rhythm instead of one compressed strip
- Thin horizontal dividers between title, badges, sticky tabs, and content
- Sticky tab rows remain visible during scroll and avoid layout shift
- Relative timestamp floats in the content area's top-right corner instead of consuming its own row
- Timestamp defaults to `Updated ... ago`, falls back to `Created ... ago`, toggles on click, and shows localized datetime on hover

### Rationale
Users primarily want to read ticket content, not metadata. The previous attempt over-compressed one block while leaving the rest of the stack spacious, which made the layout feel uneven. A compact row system with consistent spacing improves scanability without making any single row feel cramped.

### Impact Areas
- `src/components/TicketViewer/index.tsx` - Main viewer component
- `src/components/TicketViewer/CompactTicketHeader.tsx` - Compact row stack for title and badges
- `src/components/TicketViewer/TicketDocumentTabs.tsx` - Sticky tab row density and hover treatment
- `src/components/shared/RelativeTimestamp.tsx` - Reusable relative timestamp interaction
- `src/components/ui/Modal.tsx` - Modal body padding override behavior

## 2. Solution Analysis

### Approaches Considered

1. **Collapse metadata into collapsible section** - Add expand/collapse for details
2. **Merge header + metadata into a compact stack** - Title row + badges row + sticky tabs
3. **Move metadata to sidebar** - Vertical layout with content area

### Trade-offs Analysis

| Approach | Pros | Cons |
|----------|------|------|
| Collapsible | Preserves all info | Extra click to see details |
| Compact stack | Keeps hierarchy while reducing dead space | Requires coordinated spacing across multiple rows |
| Sidebar | Good for complex metadata | Reduces horizontal content space |

### Chosen Approach
**Compact stacked header** with consistent dividers and a floating relative timestamp in the content area. This preserves hierarchy while removing the disconnected metadata block.

### Rejected Alternatives
- Collapsible: Adds interaction friction
- Sidebar: Takes horizontal space from markdown content

## 3. Implementation Specification

### Technical Requirements

#### 3.1 Compact Header Layout
Replace `ModalHeader` + `TicketAttributes` with a compact row stack:

- Row 1: Ticket code + title
- Row 2: Attribute badges
- Row 3+: Sticky tab rows, when sub-documents exist
- Content starts immediately below the last thin divider

Layout rules:
- Shared horizontal padding across title, badges, tabs, and content
- Thin divider between each major row using `border-b border-gray-200 dark:border-gray-700`
- Equal-feeling vertical spacing across the stack; avoid compressing only one row

#### 3.2 Floating Close Button
Move close button outside header flow so title width is not consumed by close affordance.

#### 3.3 Sticky Tabs
Keep tab rows sticky and visually aligned with the compact stack:

- Sticky state must preserve reading context without layout shift
- Inactive tabs may use subtle hover motion
- Active tabs remain visually anchored and should not "jump" on hover

#### 3.4 Relative Timestamp
Render a reusable relative timestamp inside the content area instead of the header stack:

- Position: top-right corner of the content block, floating over content chrome rather than taking layout space
- Default label: `Updated {relative time}` when `lastModified` exists
- Fallback label: `Created {relative time}` when `lastModified` is unavailable
- Interaction: click toggles between created and updated when both values exist
- Hover: show localized full datetime tooltip for the currently displayed value
- Presentation: semi-transparent by default, full opacity on hover

This behavior should be reusable in document views as a separate integration step.

### UI/UX Changes

| Element | Before | After |
|---------|--------|-------|
| Header structure | Separate modal header + metadata card | Compact stacked rows |
| Dividers | Inconsistent block boundaries | Thin divider between each major row |
| Tabs | Sticky, but visually detached | Sticky and integrated into the same row rhythm |
| Timestamps | Full datetime in metadata area | Floating relative timestamp with tooltip |
| Content start | Pushed down by header chrome | Starts immediately below the final divider |

### API Changes
None - all changes are presentational.

## 4. Acceptance Criteria

- [ ] Title row, badges row, and sticky tab rows use consistent spacing and thin dividers
- [ ] Ticket title remains the primary heading in the viewer
- [ ] Sticky tabs remain visible during scroll without disruptive layout shift
- [ ] Active tabs stay anchored; hover motion applies only to inactive tabs
- [ ] Relative timestamp appears in the content top-right corner without reserving its own row
- [ ] Timestamp defaults to updated, falls back to created, and toggles on click when both exist
- [ ] Tooltip shows localized full datetime for the currently displayed timestamp value
- [ ] Content starts immediately below the final divider
- [ ] Close control remains keyboard accessible and does not consume header layout width

## 5. Implementation Notes
- Implemented as a row-based top stack in `TicketViewer` using `CompactTicketHeader` plus sticky `TicketDocumentTabs`
- `ModalBody` now supports correct Tailwind padding overrides through `cn(...)`
- Relative timestamp behavior extracted into `RelativeTimestamp` for reuse by document views later
- Spec intentionally records stable UI rules, not micro-tuning such as individual spacing token changes

## 6. References

- `src/components/TicketViewer/index.tsx` - Current implementation
- `src/components/ui/Modal.tsx` - ModalHeader component
- `src/components/TicketViewer/CompactTicketHeader.tsx` - Header stack
- `src/components/TicketViewer/TicketDocumentTabs.tsx` - Sticky tabs
- `src/components/shared/RelativeTimestamp.tsx` - Reusable timestamp interaction
