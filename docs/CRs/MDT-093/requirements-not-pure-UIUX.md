# Requirements: MDT-093

**Source**: [MDT-093](../../../docs/CRs/MDT-093-add-sub-document-support-with-sticky-tabs-in-ticke.md)
**Generated**: 2025-12-11
**CR Type**: Feature Enhancement

## Introduction

The system currently displays single markdown documents without sub-document support or navigation within long ticket documents. This feature will add sub-document parsing with a tabbed UI component featuring sticky positioning to improve navigation and organization of related content within tickets.

## Requirements

### Requirement 1: Sub-Document Discovery API

**Objective**: As a user, I want the system to discover and list sub-documents related to a ticket, so that I can navigate between related documents efficiently.

#### Acceptance Criteria

1. WHEN client requests GET `/api/projects/:id/crs/:crId/subdocuments`,
   the `CrController` shall return array of sub-document metadata within 200ms.

2. WHEN `CrService.getSubDocuments()` is called,
   the `DocumentService` shall scan ticket directory for related .md files excluding the main ticket.

3. WHILE parsing sub-document metadata,
   the `SubDocumentService` shall extract titles from filenames and validate file existence.

### Requirement 2: Tabbed Navigation UI

**Objective**: As a user, I want tabbed navigation for sub-documents, so that I can quickly switch between related content without losing context.

#### Acceptance Criteria

1. WHEN `TicketView` component receives sub-document data,
   the `TicketTabs` component shall render tabs with sub-document titles in DOM order.

2. WHILE tabs container is rendered,
   the `TicketTabs` component shall maintain sticky positioning at viewport top with CSS `position: sticky`.

3. WHEN user clicks a tab,
   the `useSubDocuments` hook shall load corresponding content via `fileService.fetchSubDocument()` within 100ms.

### Requirement 3: URL State Management

**Objective**: As a user, I want the selected sub-document reflected in the URL, so that I can share direct links and maintain state on reload.

#### Acceptance Criteria

1. WHEN user selects a tab,
   the `TicketTabs` component shall update URL hash fragment with document identifier.

2. WHEN page loads with existing hash fragment,
   the `useSubDocuments` hook shall select and load the corresponding sub-document on initialization.

3. WHILE sub-document content is loading,
   the `TicketTabs` component shall display loading indicator without hiding selected tab.

### Requirement 4: Content Rendering and Performance

**Objective**: As a user, I want sub-document content to render quickly and handle large files, so that navigation remains responsive.

#### Acceptance Criteria

1. WHEN sub-document content is fetched,
   the `TicketView` component shall render markdown using existing markdown processing pipeline.

2. IF sub-document file exceeds 1MB,
   the `fileService` shall reject fetch operation and display error message in tab content area.

3. WHILE parsing markdown content,
   the `MarkdownService` shall complete processing within 50ms for files under 100KB.

### Requirement 5: Error Handling and Edge Cases

**Objective**: As a user, I want graceful handling of errors when sub-documents are unavailable, so that the main ticket remains accessible.

#### Acceptance Criteria

1. IF sub-document fetch fails due to network error,
   the `useSubDocuments` hook shall display retry button with error message.

2. IF sub-document file is deleted after discovery,
   the `TicketTabs` component shall show "Not Found" message with option to refresh sub-document list.

3. IF no sub-documents exist for a ticket,
   the `TicketView` component shall render single document without tabs container.

---

## Artifact Mapping

| Req ID | Requirement Summary | Primary Artifact | Integration Points |
|--------|---------------------|------------------|-------------------|
| R1.1 | Sub-document API endpoint | `server/controllers/crController.js` | `CrService`, `DocumentService` |
| R1.2 | Directory scanning for .md files | `server/services/DocumentService.js` | `CrService.getSubDocuments()` |
| R1.3 | Metadata extraction and validation | `shared/models/SubDocument.ts` | `SubDocumentService` |
| R2.1 | Tab rendering with titles | `src/components/TicketTabs.tsx` | `TicketView`, `useSubDocuments` |
| R2.2 | Sticky positioning implementation | `src/components/TicketTabs.tsx` | CSS styling, viewport calculations |
| R2.3 | Tab selection and content loading | `src/hooks/useSubDocuments.ts` | `fileService.fetchSubDocument()` |
| R3.1 | URL hash fragment updates | `src/components/TicketTabs.tsx` | browser history API |
| R3.2 | Hash-based initial tab selection | `src/hooks/useSubDocuments.ts` | `TicketView` initialization |
| R3.3 | Loading state management | `src/hooks/useSubDocuments.ts` | `TicketTabs` loading UI |
| R4.1 | Markdown content rendering | `src/components/TicketView.tsx` | existing markdown pipeline |
| R4.2 | Large file size validation | `src/services/fileService.ts` | fetchSubDocument method |
| R4.3 | Performance benchmarks | `shared/services/MarkdownService.ts` | content processing |
| R5.1 | Network error handling | `src/hooks/useSubDocuments.ts` | error state management |
| R5.2 | Missing file handling | `src/components/TicketTabs.tsx` | error display UI |
| R5.3 | No sub-documents fallback | `src/components/TicketView.tsx` | conditional rendering |

## Traceability

| Req ID | CR Section | Acceptance Criteria |
|--------|------------|---------------------|
| R1.1-R1.3 | Section 1 Description | API endpoint discovery |
| R2.1-R2.3 | Section 1 Description | Tabbed navigation UI |
| R3.1-R3.3 | Section 4 Integration Points | URL routing with hash |
| R4.1-R4.3 | Section 5 Non-Functional | Performance requirements |
| R5.1-R5.3 | Section 5 Testing | Error handling |

## Non-Functional Requirements

### Performance
- WHEN user switches tabs, the `useSubDocuments` hook shall load content within 100ms.
- WHILE parsing markdown files under 100KB, the `MarkdownService` shall complete within 50ms.

### Reliability
- IF sub-document fetch fails, the system shall provide retry mechanism within 3 attempts.
- WHEN sub-document is deleted, the system shall handle gracefully without crashing main view.

### Consistency
- The `TicketTabs` component shall follow existing shadcn design patterns and theme configuration.
- WHILE tabs are sticky, the system shall prevent layout shift in viewport.

---
*Generated from MDT-093 by /mdt:requirements*