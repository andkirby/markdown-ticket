---
code: MDT-062
title: Table of Contents (ToC) for Markdown Views
status: Implemented
dateCreated: 2025-10-04T16:20:20.191Z
type: Feature Enhancement
priority: Medium
phaseEpic: UI Enhancement
---

# Table of Contents (ToC) for Markdown Views

## Description

Implement an interactive Table of Contents (ToC) feature for markdown document and ticket views to improve navigation and user experience when viewing long documents.

## Rationale

Long markdown documents and tickets can be difficult to navigate without a clear overview of their structure. A ToC provides:
- Quick navigation to specific sections
- Visual overview of document structure
- Enhanced user experience for content consumption
- Better accessibility for document navigation

## Solution Analysis

### Technical Implementation
- Extract headings from markdown content using regex parsing
- Generate anchor IDs compatible with Showdown's `ghCompatibleHeaderId` setting
- Use IntersectionObserver API for real-time section highlighting
- Implement sticky positioning for persistent access
- Clean formatting symbols from heading text for better readability

### UI Components
1. **ToC Extraction Utility** (`utils/tableOfContents.ts`)
2. **ToC Component** (`components/shared/TableOfContents.tsx`)
3. **Integration** in MarkdownViewer and TicketViewer

## Implementation

### UI Requirements

#### ToC Button
- **Position**: Fixed bottom-right corner, above Event History button
- **Style**: Compact button with "ToC" label and expandable arrow (▶)
- **Behavior**: Toggle expand/collapse with smooth animation
- **Default State**: Expanded (shown)

#### ToC Dropdown
- **Positioning**: Expands upward from button (bottom-full)
- **Dimensions**:
  - Width: 320px (w-80)
  - Max Height: 65% of viewport height
  - Scrollable when content exceeds max height
- **Styling**:
  - Semi-transparent background with backdrop blur
  - Border and shadow for visual separation
  - Hierarchical indentation for heading levels (pl-4, pl-8, etc.)

#### Section Highlighting
- **Active Detection**: IntersectionObserver with 80% viewport detection area
- **Visual Feedback**:
  - Active sections: Primary color with bold font
  - Inactive sections: Muted foreground color
  - Hover states: Smooth color transitions

#### Navigation Behavior
- **Smooth Scrolling**: Click ToC items to smoothly scroll to sections
- **Sticky Positioning**: ToC remains accessible during document scrolling
- **Multi-highlight**: Multiple visible sections highlighted simultaneously

### Integration Points

#### Document Viewer
- **Location**: DocumentsView/MarkdownViewer
- **Scroll Container**: Custom ScrollArea component
- **Sticky Metadata**: File creation/update timestamps remain sticky

#### Ticket Viewer
- **Location**: Modal-based TicketViewer
- **Content**: Extract ToC from ticket markdown content
- **Header Level**: Start from H3 (headerLevelStart={3})

### Text Processing
- **Clean Formatting**: Remove markdown symbols from ToC text
  - Bold: `**text**` → `text`
  - Italic: `*text*` → `text`
  - Code: `` `text` `` → `text`
  - Links: `[text](url)` → `text`
  - Special characters: Remove underscores, tildes

## Acceptance Criteria

### Functional Requirements
- [ ] ToC button appears in bottom-right corner for documents with headings
- [ ] ToC expands/collapses with smooth animation
- [ ] Clicking ToC items smoothly scrolls to corresponding sections
- [ ] Multiple visible sections are highlighted simultaneously
- [ ] ToC works in both document viewer and ticket modal
- [ ] Formatting symbols are cleaned from ToC text
- [ ] ToC is scrollable when content exceeds 65% viewport height

#### Browser State Persistence
- **ToC Toggle State**: Remember the ToC button's show/hide state in browser localStorage
- **Per-View Persistence**: Maintain separate ToC state for different views (document view, ticket view)
- **Session Restoration**: Restore ToC visibility state when user returns to the application

**✅ IMPLEMENTED**: Browser State Persistence
- ToC toggle state is now persisted in localStorage with keys `markdown-ticket-toc-document` and `markdown-ticket-toc-ticket`
- Separate state maintained for document view and ticket view
- State restoration works when user returns to the application
- Implementation follows project patterns in `/src/config/tocConfig.ts`
### Visual Requirements
- [ ] ToC button positioned above Event History button
- [ ] Dropdown expands upward with proper spacing
- [ ] Hierarchical indentation reflects heading structure
- [ ] Active sections use primary color and bold font
- [ ] Semi-transparent background with backdrop blur
- [ ] Consistent styling with existing UI components

### Performance Requirements
- [ ] ToC generation is efficient for large documents
- [ ] IntersectionObserver properly cleans up on component unmount
- [ ] Smooth scrolling doesn't block UI interactions
- [ ] No layout shifts when ToC expands/collapses

### Accessibility Requirements
- [ ] ToC button has proper ARIA labels
- [ ] Keyboard navigation support for ToC items
- [ ] Screen reader compatibility for section navigation
- [ ] Focus management when navigating between sections
