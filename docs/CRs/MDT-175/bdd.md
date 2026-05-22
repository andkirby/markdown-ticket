# BDD: MDT-175

> Canonical BDD projection: [bdd.trace.md](./bdd.trace.md)

## Overview

BDD scenarios describe observable browser title behavior from the user's perspective. Internal title formatting, hook names, and component ownership are deferred to architecture.

## Scenario Notes

### Root Project View Title
- Scenario: `project_view_title_reflects_context`
- Covers: `BR-1.1`
- Intent: board, listing, and documents root history entries use project code plus area label.

### Ticket Title
- Scenario: `ticket_title_reflects_active_ticket`
- Covers: `BR-1.2`
- Intent: opening the main ticket document uses ticket code plus ticket H1/title.

### Ticket Subcontext Title
- Scenario: `ticket_subcontext_title_reflects_active_subdocument`
- Covers: `BR-1.7`
- Intent: ticket subdocuments and special ticket subtabs append the active label to the main ticket title.

### Document Title
- Scenario: `document_title_reflects_active_document`
- Covers: `BR-1.3`
- Intent: opening a project markdown document uses project code plus document H1/title/name.

### Restore Parent Title
- Scenario: `closing_content_restores_parent_title`
- Covers: `BR-1.4`
- Intent: closing content does not leave the closed content title behind.

### Modal Stale Title Prevention
- Scenario: `modal_context_avoids_stale_title`
- Covers: `BR-1.5`
- Intent: modal-only flows do not corrupt the underlying page context title.

### Project Switch Title
- Scenario: `project_switch_updates_title`
- Covers: `BR-1.6`
- Intent: switching project context updates the browser title.

## Coverage Boundary

- Edge cases remain test-routed requirements and are verified in test plans.
- No scenario depends on a specific React hook, title separator, or component file.

## Verify

```bash
spec-trace validate MDT-175 --stage bdd
spec-trace render bdd MDT-175
```
