# Requirements

Ticket: `MDT-093`

## Overview

This feature adds sub-document navigation to ticket view so users can move between the main ticket and related documents without leaving the current reading context. The system must support ordered top-level documents, grouped folder-backed entries such as prep/, poc/, and part-*, nested tab rows, sticky navigation, deep linking, and realtime synchronization with file changes.

## Behavioral Requirements

### BR-1

- `BR-1.1` [bdd] WHEN a ticket has related sub-document files or folders, the system shall expose main plus discovered top-level entries for navigation.
- `BR-1.2` [bdd] WHEN no custom order is configured, the system shall order recognized top-level entries as requirements, domain, architecture, poc, tests, tasks, debt.
- `BR-1.3` [bdd] WHEN .mdt-config.toml defines project.ticketSubdocuments, the system shall order matching top-level entries according to that configuration.
- `BR-1.4` [bdd] WHEN discovered top-level entries are not named in the configured or default order, the system shall append them after ordered entries using natural ascending name order.
- `BR-1.5` [bdd] WHILE a ticket has no related sub-document entries, the system shall omit sub-document navigation and display only the main ticket document.

### BR-2

- `BR-2.1` [bdd] WHEN sub-document navigation is shown, the system shall present top-level files and folders in the primary tab row.
- `BR-2.2` [bdd] WHEN a folder entry is selected, the system shall reveal that folder's children in the next tab row.
- `BR-2.3` [bdd] WHEN a nested folder entry is selected, the system shall reveal another tab row for the next folder level.
- `BR-2.4` [bdd] WHEN grouped folders such as prep/, poc/, or part-* are present, the system shall present them as grouped navigation entries rather than flattened descendant names.
- `BR-2.5` [bdd] WHILE a folder entry is selected, the system shall preserve the currently displayed document content until a descendant file entry is selected.

### BR-3

- `BR-3.1` [bdd] WHEN a user selects main or a file entry, the system shall load and display the corresponding markdown document.
- `BR-3.2` [bdd] WHILE selected document content is loading, the system shall display loading feedback in the content area.
- `BR-3.3` [bdd] WHILE the user scrolls ticket content, the system shall keep sub-document navigation visible.
- `BR-3.4` [bdd] WHILE sticky navigation is active, the system shall avoid layout shift that disrupts reading or navigation.
- `BR-3.5` [bdd] WHEN a user clicks a sub-document tab, the system shall preload content before switching tabs to prevent layout shift

### BR-4

- `BR-4.1` [bdd] WHEN a user selects a non-main document, the system shall update the URL path to the selected document with .md extension
- `BR-4.2` [bdd] WHEN a user selects a nested document, the system shall encode the nested path in the URL path using slash-separated folder segments with .md extension
- `BR-4.3` [bdd] WHEN a page loads with a valid sub-document path, the system shall reopen the required folder levels and display the targeted document
- `BR-4.4` [bdd] IF the URL path references a document path that no longer exists, THEN the system shall fall back to main

### BR-5

- `BR-5.1` [bdd] WHEN the underlying sub-document structure changes, the system shall update the visible navigation to match the current files and folders.
- `BR-5.2` [bdd] IF the active document is removed by a realtime update, THEN the system shall switch the visible document to main.
- `BR-5.3` [bdd] IF a selected document fails to load, THEN the system shall display an error in the content area without removing available navigation.
- `BR-5.4` [bdd] WHILE realtime update delivery is unavailable, the system shall continue to allow manual navigation using the last successfully loaded structure.

### BR-6

- `BR-6.1` [tests] WHEN the ticket detail API returns sub-document metadata, the system shall represent files and folders in a hierarchical structure sufficient to render ordered multi-row navigation.
- `BR-6.2` [tests] WHEN the individual sub-document retrieval API returns a document, the system shall include code, content, dateCreated, and lastModified.
- `BR-6.3` [tests] WHEN sub-document API changes are delivered, the system shall publish matching OpenAPI documentation for those changes.

## Constraints

- `C1` [tests] Sub-documents are discovered from ticket-related files and directories, not created synthetically in the UI.
- `C2` [tests] Ordering comes from backend discovery plus project configuration, not client-side resorting.
- `C3` [tests] Sub-document navigation uses shadcn Tabs.
- `C4` [tests] Deep links use path-based URLs with .md extension for stable, shareable references to sub-documents
- `C5` [tests] Realtime delivery failure does not block manual navigation.
- `C6` [tests] Existing markdown rendering remains the content rendering pipeline for sub-documents.
- `C7` [tests] Tab switching begins content loading within 100ms.
- `C8` [tests] Sub-document parsing supports markdown files up to 1MB.
- `C9` [tests] Sticky navigation does not create disruptive layout shift.
- `C10` [tests] OpenAPI documentation is updated for sub-document API changes.
- `C-11` [tests] Sub-document URL paths must end with .md extension for security and format consistency
- `C-12` [tests] Sub-document URL paths must not contain .. (double dot) to prevent path traversal attacks
- `C-13` [tests] The system shall maintain backward compatibility by redirecting hash-based URLs to path-based URLs automatically

## Edge Cases

_No edge cases recorded._

## Route Policy Summary

| Route | Count | IDs |
|---|---:|---|
| bdd | 23 | `BR-1.1`, `BR-1.2`, `BR-1.3`, `BR-1.4`, `BR-1.5`, `BR-2.1`, `BR-2.2`, `BR-2.3`, `BR-2.4`, `BR-2.5`, `BR-3.1`, `BR-3.2`, `BR-3.3`, `BR-3.4`, `BR-3.5`, `BR-4.1`, `BR-4.2`, `BR-4.3`, `BR-4.4`, `BR-5.1`, `BR-5.2`, `BR-5.3`, `BR-5.4` |
| tests | 16 | `BR-6.1`, `BR-6.2`, `BR-6.3`, `C1`, `C2`, `C3`, `C4`, `C5`, `C6`, `C7`, `C8`, `C9`, `C10`, `C-11`, `C-12`, `C-13` |
| clarification | 0 | - |
| not_applicable | 0 | - |
