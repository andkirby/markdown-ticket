# Requirements: MDT-093

**Source**: [MDT-093](../../../docs/CRs/MDT-093-add-sub-document-support-with-sticky-tabs-in-ticke.md)
**Generated**: 2025-12-11
**CR Type**: Feature Enhancement

## Introduction

The system currently displays single markdown documents without sub-document support or navigation within long ticket documents. This feature will add a tabbed navigation UI that remains visible while scrolling, allowing users to easily switch between related documents within a ticket.

## Requirements

### Requirement 1: Tab Discovery and Display

**Objective**: As a user, I want to see all available sub-documents as tabs, so that I can discover and navigate to related content.

#### Acceptance Criteria

1. WHEN viewing a ticket with a sub-document directory structure,
   the system shall display tabs with "main" for the ticket document plus names of sub-documents (excluding file extensions).

2. WHEN tabs are displayed,
   they shall appear in the default order: main | requirements | architecture | tests | tasks | debt,
   OR in the custom order specified in `.mdt-config.toml` under `project.ticketSubdocuments`.

3. WHEN viewing a ticket with only the main document and no sub-document directory,
   the system shall not display any tabs.

4. WHILE viewing the ticket,
   the tabs shall remain visible and accessible at all times.

### Requirement 2: Sticky Tab Navigation

**Objective**: As a user, I want the tab bar to stay visible while scrolling, so that I can switch documents without returning to the top of the page.

#### Acceptance Criteria

1. WHEN user scrolls through a long document,
   the tab bar shall remain fixed at the top of the viewport.

2. WHILE the tab bar is sticky,
   it shall not obscure important content or create layout shifts.

3. WHEN the tab bar is sticky,
   it shall maintain proper spacing from viewport edges and other UI elements.

### Requirement 3: Tab Interaction and Content Switching

**Objective**: As a user, I want to click tabs to instantly switch between documents, so that I can navigate efficiently without losing context.

#### Acceptance Criteria

1. WHEN user clicks on a tab,
   the system shall display the corresponding document content immediately.

2. WHILE switching between tabs,
   the system shall show a loading indicator for documents that take time to load.

3. WHEN a tab is selected,
   it shall be visually distinct from unselected tabs.

### Requirement 4: Deep Linking and State Persistence

**Objective**: As a user, I want to share links to specific sub-documents, so that others can view the exact content I'm referring to.

#### Acceptance Criteria

1. WHEN user selects a tab other than "main",
   the URL shall update to include a hash fragment with the sub-document name.

2. WHEN a user visits a URL with a sub-document hash fragment,
   the system shall automatically select and display that sub-document if it exists.

3. WHEN a user visits a URL with a sub-document hash fragment but the sub-document no longer exists,
   the system shall display the "main" tab instead.

4. WHILE navigating between tabs,
   the browser's back/forward buttons shall work correctly to navigate document history.

### Requirement 5: Real-time Updates via Server Events

**Objective**: As a user, I want the tab interface to update automatically when documents are added or removed, so that I always see the current state without manual refresh.

#### Acceptance Criteria

1. WHEN backend sends an event that new sub-documents were added to the current ticket,
   the system shall automatically display the new tabs without user action.

2. WHEN backend sends an event that all sub-documents were deleted from the current ticket,
   the system shall remove the tab interface and show only the main document.

3. WHEN backend sends an event that a specific sub-document was deleted,
   IF that sub-document was currently selected,
   the system shall switch to the "main" tab and remove the deleted tab from the interface.

4. IF a document fails to load,
   the system shall display an error message within the content area.

5. IF a document is not found,
   the system shall offer options to refresh or navigate to available documents.

---

## User Experience Flows

| Flow | Description | Key Interactions |
|------|-------------|------------------|
| Initial Load - With Sub-docs | User opens ticket with sub-documents | GET `/api/projects/{projectId}/crs/{crId}` returns with `"subdocuments": ["requirements", "architecture", "tests", "tasks", "debt"]` |
| Initial Load - No Sub-docs | User opens ticket with only main document | GET `/api/projects/{projectId}/crs/{crId}` returns empty subdocuments array |
| Tab Navigation | User clicks on `tasks` tab | GET `/api/projects/{projectId}/crs/{crId}/tasks` returns tasks.md content |
| Document Response Format | Backend returns sub-document | Response includes: code, content, dateCreated, lastModified |
| Real-time Addition | Backend adds new sub-document while viewing | SSE event with updated subdocuments list triggers tab re-render |
| Real-time Removal | Backend deletes all sub-documents | SSE event with empty subdocuments array removes tab interface |
| Real-time Active Deletion | Backend deletes currently open sub-document | SSE event updates subdocuments list, system switches to "main" |

## Traceability

| Req ID | CR Section | Focus Area |
|--------|------------|------------|
| R1.1-R1.4 | Section 1 Description | Tab discovery, labeling, and conditional display |
| R2.1-R2.3 | Section 1 Description | Sticky positioning behavior |
| R3.1-R3.3 | Section 1 Description | Tab interaction patterns |
| R4.1-R4.4 | Section 1 Description | URL state management and fallback behavior |
| R5.1-R5.5 | Section 1 Description | Real-time updates and error handling UX |

## Non-Functional Requirements

### Performance
- WHEN user switches tabs, the new content shall begin loading within 100ms.
- WHEN content is loading, visual feedback shall appear within 50ms of user action.

### Visual Design
- WHILE tabs are displayed, they shall follow the existing design system and theme.
- WHILE tabs are sticky, they shall maintain consistent visual hierarchy with other UI elements.

### Accessibility
- WHEN using keyboard navigation, tabs shall be focusable and operable without a mouse.
- WHILE tabbing through the interface, focus shall remain visible and logical order shall be maintained.

---
*Generated from MDT-093 by /mdt:requirements*
