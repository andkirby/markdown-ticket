# Tasks

## Task List

- [x] Create badge variants and types (`TASK-1`)
  Owns: `ART-badge-types`, `ART-badge-variants`, `ART-badge-variants-test`
  Makes Green: `TEST-badge-variants`
- [x] Create StatusBadge component (`TASK-2`)
  Owns: `ART-status-badge`, `ART-status-badge-test`
  Makes Green: `TEST-status-badge`
- [x] Create PriorityBadge component (`TASK-3`)
  Owns: `ART-priority-badge`, `ART-priority-badge-test`
  Makes Green: `TEST-priority-badge`
- [x] Create TypeBadge component (`TASK-4`)
  Owns: `ART-type-badge`, `ART-type-badge-test`
  Makes Green: `TEST-type-badge`
- [x] Create ContextBadge component (`TASK-5`)
  Owns: `ART-context-badge`, `ART-context-badge-test`
  Makes Green: `TEST-context-badge`
- [x] Create RelationshipBadge component (`TASK-6`)
  Owns: `ART-relationship-badge`, `ART-relationship-badge-test`
  Makes Green: `TEST-relationship-badge`
- [x] Create Badge module index (`TASK-7`)
  Owns: `ART-badge-index`
  Makes Green: -
- [x] Migrate ProjectView to use StatusBadge (`TASK-8`)
  Owns: `ART-project-view`
  Makes Green: `TEST-badge-e2e-compat`, `TEST-no-duplicate-funcs`
- [x] Migrate TicketAttributeTags to Badge module (`TASK-9`)
  Owns: `ART-ticket-attribute-tags`
  Makes Green: `TEST-no-duplicate-funcs`
- [x] Migrate TicketAttributes to Badge module (`TASK-10`)
  Owns: `ART-e2e-list-view`, `ART-ticket-attributes`
  Makes Green: `TEST-badge-e2e-compat`, `TEST-badge-single-source`, `TEST-no-duplicate-funcs`, `TEST-typescript-validation`

## Artifact Ownership Summary

| Artifact ID | Owning Task IDs |
|---|---|
| `ART-badge-index` | `TASK-7` |
| `ART-badge-types` | `TASK-1` |
| `ART-badge-variants` | `TASK-1` |
| `ART-badge-variants-test` | `TASK-1` |
| `ART-context-badge` | `TASK-5` |
| `ART-context-badge-test` | `TASK-5` |
| `ART-e2e-list-view` | `TASK-10` |
| `ART-priority-badge` | `TASK-3` |
| `ART-priority-badge-test` | `TASK-3` |
| `ART-project-view` | `TASK-8` |
| `ART-relationship-badge` | `TASK-6` |
| `ART-relationship-badge-test` | `TASK-6` |
| `ART-status-badge` | `TASK-2` |
| `ART-status-badge-test` | `TASK-2` |
| `ART-status-variants` | - |
| `ART-ticket-attribute-tags` | `TASK-9` |
| `ART-ticket-attributes` | `TASK-10` |
| `ART-type-badge` | `TASK-4` |
| `ART-type-badge-test` | `TASK-4` |

## Makes Green Summary

| ID | Task IDs |
|---|---|
| `TEST-badge-e2e-compat` | `TASK-8`, `TASK-10` |
| `TEST-badge-single-source` | `TASK-10` |
| `TEST-badge-variants` | `TASK-1` |
| `TEST-context-badge` | `TASK-5` |
| `TEST-no-duplicate-funcs` | `TASK-8`, `TASK-9`, `TASK-10` |
| `TEST-priority-badge` | `TASK-3` |
| `TEST-relationship-badge` | `TASK-6` |
| `TEST-status-badge` | `TASK-2` |
| `TEST-type-badge` | `TASK-4` |
| `TEST-typescript-validation` | `TASK-10` |
