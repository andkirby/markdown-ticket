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
    │   ├── RepositoryUrlField
    │   └── ProjectAccentPreferenceField (per-user dropdown)
    └── Footer
        ├── CancelButton
        └── SubmitButton ("Update Project")
```

## Children

| Child | Component | Spec | Conditional |
|-------|-----------|------|-------------|
| Modal shell | `src/components/AddProjectModal/AddProjectModal.tsx` | this file | `editMode=true` |
| Form field | `src/components/AddProjectModal/components/FormField.tsx` | — | all fields |
| Accent picker | existing dropdown/combobox pattern | `project-browser.spec.md` | edit mode only |
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
- Field order is fixed: name, code, path, tickets directory, description, repository URL, project accent.
- Edit mode hides the `Global Config Only` checkbox and path browse button.
- Project accent is visually grouped after shared project metadata and labeled as a personal preference.
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
| accent dropdown open | User opens Project Accent | Menu opens with preset colors plus custom hex option |
| accent changed | User selects a preset color | Preview mark updates immediately; preference is saved through the user-preference path, not project metadata |
| custom hex selected | User chooses custom color | Hex input appears beside preview and helper link |
| invalid hex | Backend rejects submitted custom value | Field shows validation error; previous valid accent remains applied |

## Editable Fields

| Field | Editable | Persistence |
|-------|----------|-------------|
| Project Name | yes | project update API field `name` |
| Description | yes | project update API field `description` |
| Repository URL | yes | project update API field `repository` |
| Project Accent | yes | current user's project accent preference |
| Project Code | no | — |
| Project Path | no | — |
| Tickets Directory | no | — |

## Project Accent Preference

- Label: `Project accent`
- Helper copy: `Only visible to you.`
- Control: dropdown/combobox with 16 preset accent options plus a custom hex option.
- Options: Navy, Azure, Turquoise, Forest, Olive, Gold, Copper, Tangerine, Coral, Crimson, Raspberry, Plum, Violet, Indigo, Brown, Graphite.
- Custom option label: `Custom hex`
- Custom hex input accepts values like `#2563EB`; backend must validate the hex value before persisting it.
- Invalid custom values show field-level validation and do not update the stored preference.
- Each option shows a color swatch and text label; the selected option shows a checkmark.
- The closed control shows the selected swatch, selected color name, and a small project-code preview mark.
- `Default` may be shown as a first option if implementation supports returning to deterministic fallback.
- Add a secondary text link labeled `choose color` next to the custom hex input.
- `choose color` opens `https://share.google/ATp6ypatbFk69dC91` in a new tab/window with `target="_blank"` and `rel="noopener noreferrer"`.
- The preference must not be submitted as project metadata and must not write to `.mdt-config.toml`, global project registry, CLI config, or MCP-visible project behavior.
- Do not offer project-folder image discovery in this form. Future personal image support should use explicit upload/select-and-copy into user-owned preference storage.

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
| Accent swatches | proposed project accent tokens | per-user project identity preview |

## Classes used

| Element | Class | Source |
|---------|-------|--------|
| Modal overlay | centered modal pattern | `src/MODALS.md` |
| Form controls | inline Tailwind utilities | `src/STYLING.md` |
| Read-only fields | `bg-gray-50 dark:bg-gray-700 cursor-not-allowed` | existing `FormField` pattern |
| Accent dropdown | existing dropdown/combobox pattern | use swatches instead of status badges |

## Extension notes

- Project identity and filesystem location remain immutable until the backend supports explicit migration behavior.
- Add new editable fields only if `PUT /api/projects/{code}/update` accepts and validates them.
- Project Accent is the exception: it is editable in this form but persists as a user preference, not through `PUT /api/projects/{code}/update`.
- Folder browsing and the `Global Config Only` checkbox must not appear in edit mode.
- The shared path tooltip still contains creation/configuration guidance in edit mode; change the component copy before tightening this spec.
- The current success dialog still renders `Create Another` in edit mode; hide it in a follow-up UI cleanup if edit mode should only expose `Done`.
