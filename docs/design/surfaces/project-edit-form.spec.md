# Project Edit Form

Modal form for editing mutable project metadata while keeping identity and filesystem fields locked.

## Composition

```text
AddProjectModal (editMode=true)
├── Backdrop
└── ModalContainer
    ├── Header
    │   ├── Title ("Edit Project")
    │   └── CloseButton
    ├── ScrollArea
    │   ├── ProjectNameField
    │   ├── ProjectCodeField (read-only)
    │   ├── ProjectPathField (read-only, path status icon)
    │   ├── TicketsDirectoryField (read-only)
    │   ├── DescriptionField
    │   └── RepositoryUrlField
    └── Footer
        ├── CancelButton
        └── SubmitButton ("Update Project")
```

## Children

| Child | Component | Spec | Conditional |
|-------|-----------|------|-------------|
| Modal shell | `src/components/AddProjectModal/AddProjectModal.tsx` | this file | `editMode=true` |
| Form field | `src/components/AddProjectModal/components/FormField.tsx` | — | all fields |
| Folder browser | `src/components/AddProjectModal/components/FolderBrowserModal.tsx` | — | hidden in edit mode |

## Source files

| Type | Path |
|------|------|
| Component | `src/components/AddProjectModal/AddProjectModal.tsx` |
| Form hook | `src/components/AddProjectModal/hooks/useProjectForm.ts` |
| E2E | `tests/e2e/project/management.spec.ts` |

## Layout

- Centered modal, max width `max-w-2xl`, max height `calc(100dvh - 100px)`.
- Header and footer are fixed inside the modal; form content scrolls.
- Field order is fixed: name, code, path, tickets directory, description, repository URL.
- Edit mode hides the `Global Config Only` checkbox and path browse button.
- Primary action stays right aligned beside Cancel.

## States

| State | Trigger | Visual Change |
|-------|---------|---------------|
| default | Open from HamburgerMenu > Edit Project | Form is prefilled from selected project |
| immutable fields | Edit mode | Code, project path, and tickets directory are read-only with disabled cursor styling |
| dirty close | Cancel or close with form data present | Confirm discard dialog appears |
| submitting | Update button clicked | Submit button label changes to `Updating...`; submit button disabled |
| success | Update request succeeds | Success dialog says `Project Updated Successfully!`; `Done` refreshes project data |
| validation error | Invalid editable field | Field border/error text follows `FormField` error style |

## Editable Fields

| Field | Editable | Persistence |
|-------|----------|-------------|
| Project Name | yes | project update API field `name` |
| Description | yes | project update API field `description` |
| Repository URL | yes | project update API field `repository` |
| Project Code | no | — |
| Project Path | no | — |
| Tickets Directory | no | — |

**Note**: Project accent preferences have been moved to Settings > Appearance > Project Accents. See `settings.spec.md`.

## Responsive

| Breakpoint | Change |
|------------|--------|
| < 640px | Modal keeps `mx-4`, content scrolls within viewport |
| >= 640px | Modal uses `max-w-2xl`; footer actions remain horizontal |

## Tokens used

| Element | Token | Usage |
|---------|-------|-------|
| Backdrop | — | `bg-black/50` per `MODALS.md` |
| Modal background | `--card` | light/dark modal surface |
| Border | `--border` | header/footer and input borders |
| Focus ring | `--ring` | focused inputs |
| Error | `--destructive` | validation errors |

## Classes used

| Element | Class | Source |
|---------|-------|--------|
| Modal overlay | centered modal pattern | `src/MODALS.md` |
| Form controls | inline Tailwind utilities | `src/STYLING.md` |
| Read-only fields | `bg-gray-50 dark:bg-gray-700 cursor-not-allowed` | existing `FormField` pattern |

## Extension notes

- Project identity and filesystem location remain immutable until the backend supports explicit migration behavior.
- Add new editable fields only if `PUT /api/projects/{code}/update` accepts and validates them.
- Folder browsing and the `Global Config Only` checkbox must not appear in edit mode.
- The current success dialog still renders `Create Another` in edit mode; hide it in a follow-up UI cleanup if edit mode should only expose `Done`.
