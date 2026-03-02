# Requirements: MDT-093

**Source**: [MDT-093](../MDT-093-add-sub-document-support-with-sticky-tabs-in-ticke.md)
**Generated**: 2026-03-02

## Overview

This feature adds sub-document navigation to ticket view so users can move between the main ticket and related documents without leaving the current reading context. The system must support ordered top-level documents, grouped folder-backed entries such as `prep/`, `poc/`, and `part-*`, nested tab rows, sticky navigation, deep linking, and realtime synchronization with file changes.

## Behavioral Requirements

### BR-1: Sub-Document Discovery and Top-Level Ordering

**Goal**: Users can discover the main ticket and its related top-level documents in a predictable order.
**Delivery Timing**: Now

1. WHEN a ticket has related sub-document files or folders, the system shall expose `main` plus discovered top-level entries for navigation.
2. WHEN no custom order is configured, the system shall order recognized top-level entries as `requirements`, `domain`, `architecture`, `poc`, `tests`, `tasks`, `debt`.
3. WHEN `.mdt-config.toml` defines `project.ticketSubdocuments`, the system shall order matching top-level entries according to that configuration.
4. WHEN discovered top-level entries are not named in the configured or default order, the system shall append them after ordered entries using natural ascending name order.
5. WHILE a ticket has no related sub-document entries, the system shall omit sub-document navigation and display only the main ticket document.

### BR-2: Hierarchical Folder Navigation

**Goal**: Users can navigate grouped and nested document sets without flattening the hierarchy into one overcrowded row.
**Delivery Timing**: Now

1. WHEN sub-document navigation is shown, the system shall present top-level files and folders in the primary tab row.
2. WHEN a folder entry is selected, the system shall reveal that folder's children in the next tab row.
3. WHEN a nested folder entry is selected, the system shall reveal another tab row for the next folder level.
4. WHEN grouped folders such as `prep/`, `poc/`, or `part-*` are present, the system shall present them as grouped navigation entries rather than flattened descendant names.
5. WHILE a folder entry is selected, the system shall preserve the currently displayed document content until a descendant file entry is selected.

### BR-3: Document Selection and Content Rendering

**Goal**: Users can switch between ticket-related documents while keeping content readable and navigation visible.
**Delivery Timing**: Now

1. WHEN a user selects `main` or a file entry, the system shall load and display the corresponding markdown document.
2. WHILE selected document content is loading, the system shall display loading feedback in the content area.
3. WHILE the user scrolls ticket content, the system shall keep sub-document navigation visible.
4. WHILE sticky navigation is active, the system shall avoid layout shift that disrupts reading or navigation.

### BR-4: Deep Linking and Reload Behavior

**Goal**: Users can share and reopen direct links to specific sub-documents, including nested ones.
**Delivery Timing**: Now

1. WHEN a user selects a non-main document, the system shall update the URL hash to the selected relative document path.
2. WHEN a user selects a nested document, the system shall encode the nested path in the URL hash using slash-separated folder segments.
3. WHEN a page loads with a valid sub-document hash, the system shall reopen the required folder levels and display the targeted document.
4. IF the URL hash references a document path that no longer exists, THEN the system shall fall back to `main`.

### BR-5: Realtime Synchronization and Failure Recovery

**Goal**: Users see sub-document navigation stay aligned with filesystem changes without losing basic navigation.
**Delivery Timing**: Now

1. WHEN the underlying sub-document structure changes, the system shall update the visible navigation to match the current files and folders.
2. IF the active document is removed by a realtime update, THEN the system shall switch the visible document to `main`.
3. IF a selected document fails to load, THEN the system shall display an error in the content area without removing available navigation.
4. WHILE realtime update delivery is unavailable, the system shall continue to allow manual navigation using the last successfully loaded structure.

### BR-6: API and Documentation Contract

**Goal**: The feature exposes enough structured data for hierarchical navigation and keeps the public API documented.
**Delivery Timing**: Now

1. WHEN the ticket detail API returns sub-document metadata, the system shall represent files and folders in a hierarchical structure sufficient to render ordered multi-row navigation.
2. WHEN the individual sub-document retrieval API returns a document, the system shall include `code`, `content`, `dateCreated`, and `lastModified`.
3. WHEN sub-document API changes are delivered, the system shall publish matching OpenAPI documentation for those changes.

## Constraints

| Concern | Requirement |
|---------|-------------|
| C1: Discovery Source | Sub-documents are discovered from ticket-related files and directories, not created synthetically in the UI |
| C2: Ordering Authority | Ordering comes from backend discovery plus project configuration, not client-side resorting |
| C3: UI Primitive | Sub-document navigation uses `shadcn` Tabs |
| C4: Hash Stability | Deep links use stable relative document paths in the URL hash |
| C5: Realtime Fallback | Realtime delivery failure does not block manual navigation |
| C6: Rendering Pipeline | Existing markdown rendering remains the content rendering pipeline for sub-documents |
| C7: Performance | Tab switching begins content loading within 100ms |
| C8: Payload Size | Sub-document parsing supports markdown files up to 1MB |
| C9: Visual Stability | Sticky navigation does not create disruptive layout shift |
| C10: API Documentation | OpenAPI documentation is updated for sub-document API changes |

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | architecture.md (Data Model / Discovery), tasks.md (Implementation) |
| C2 | architecture.md (Selection Logic / API Contract), tasks.md (Ordering) |
| C3 | architecture.md (UI Composition), tasks.md (UI implementation) |
| C4 | architecture.md (Routing / State), tests.md (deep-link scenarios) |
| C5 | architecture.md (Error Philosophy), tests.md (absence and failure cases) |
| C6 | architecture.md (Rendering Path), tasks.md (integration scope) |
| C7 | architecture.md (Runtime Prereqs / Error Philosophy), tests.md (performance checks) |
| C8 | architecture.md (Runtime Limits), tests.md (large-file coverage) |
| C9 | architecture.md (UI Layout), tests.md (sticky behavior) |
| C10 | architecture.md (API Surface), tasks.md (docs updates) |

## Non-Ambiguity Table

| Concept | Final Semantic (chosen truth) | Rejected Semantic | Why |
|---------|-------------------------------|-------------------|-----|
| Default ordered set | `requirements`, `domain`, `architecture`, `poc`, `tests`, `tasks`, `debt` | Older order without `domain` or `poc` | Matches current ticket scope |
| API structure | Hierarchical metadata for files and folders | Flat string array only | Required for folder-backed and nested tab rows |
| Folder tab behavior | Selecting a folder reveals the next row and keeps current content until a descendant file is selected | Selecting a folder auto-loads synthetic folder content | Folders act as grouped navigation containers |
| Nested deep-link format | URL hash stores slash-separated relative document path | Flat hash with only leaf filename | Needed to reopen nested folder rows deterministically |
| Grouped folders | `prep/`, `poc/`, and `part-*` remain grouped top-level entries | Flatten descendants into one primary row | Preserves hierarchy and keeps the primary row readable |
| Missing document target | Fall back to `main` | Leave stale/empty selection active | Gives a stable recovery path |
| Unordered extra entries | Append after configured/default entries using natural ascending name order | Arbitrary filesystem order | Makes ordering predictable |

## Configuration

| Setting | Description | Default | When Absent |
|---------|-------------|---------|-------------|
| `project.ticketSubdocuments` | Ordered list of top-level sub-document names to prioritize | `requirements`, `domain`, `architecture`, `poc`, `tests`, `tasks`, `debt` | Use the default ordered list, then append remaining entries in natural ascending name order |

---
*Generated by /mdt:requirements*
