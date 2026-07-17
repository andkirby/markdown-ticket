# UX Design: MDT-168

**Journey intent**: An owner wants to manage configuration (document discovery,
global/user settings, project metadata, and guarded identity changes) from the
owning surface that matches their intent — without the app becoming a raw TOML
editor. They need to see what is editable vs guarded vs read-only, get clear
field errors before saving, and trust that changes persist safely with the
visible state refreshing afterward.

**Surfaces**:

- Documents settings / `PathSelector` (`src/components/DocumentsView/PathSelector.tsx`) — owns `project.document.*`.
- Settings modal (`src/components/SettingsModal.tsx` + new owned sections) — owns global/system + stable user preferences.
- Project Edit form (`src/components/AddProjectModal/`) — owns safe metadata + guarded operations.

## State Coverage

| State                    | Documents settings                                                                                                                       | Settings (global/user)                                                                                                                                 | Project Edit                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Loading                  | skeleton over tree + controls while config + tree fetch                                                                                  | section spinner while backend config loads                                                                                                             | existing form load                                                               |
| Empty                    | no document paths selected; hint to pick folders                                                                                         | defaults shown with "default" tag                                                                                                                      | n/a                                                                              |
| Loaded/editable          | paths tree + excludeFolders chips + maxDepth number input                                                                                | editable fields with current effective value                                                                                                           | name/description/repository/active editable                                      |
| Staged/unsaved           | selected paths + pending excludeFolders/maxDepth shown as pending                                                                        | staged backend edits show "unsaved" indicator + Save                                                                                                   | existing save button                                                             |
| Saving                   | Save disabled + spinner; tree not refetched until success                                                                                | Save disabled + spinner                                                                                                                                | existing                                                                         |
| Success                  | tree + watchers refresh; confirmation toast; effective values reflect saved                                                              | confirmation toast; values reflect saved; browser-only prefs untouched                                                                                 | existing; project list refresh                                                   |
| Validation error         | field-level error under offending field (path invalid, maxDepth out of 1–10, excludeFolders invalid); Save stays enabled only when valid | field-level error per selector (link flags, discovery bounds 1–50, user prefs)                                                                         | existing field errors                                                            |
| Disallowed/guarded       | fileOnly/readOnly selectors never rendered                                                                                               | guarded selectors (discovery.searchPaths, system.cacheTimeout/logLevel) render with warning + confirm; ui.autoRefresh/refreshInterval render read-only | code/ticketsPath render with "guarded" badge + require explicit confirm workflow |
| Permission: read-only    | entire Documents save UI hidden; tree read-only                                                                                          | backend-config sections hidden; only browser-only controls shown (existing)                                                                            | form not mounted                                                                 |
| Permission: backend down | sections show "backend unavailable" with retry; browser-only controls still work                                                         | same                                                                                                                                                   | existing                                                                         |
| Permission: locked       | dropped entirely (existing)                                                                                                              | dropped entirely                                                                                                                                       | dropped entirely                                                                 |

## Interactions

- **Documents settings**: existing path-tree toggle selection is unchanged. New
  `excludeFolders` chip input (add/remove) and `maxDepth` number input (1–10)
  stage into a pending patch; Save sends the typed document patch and, on
  success, refreshes tree + watchers. Removing a path or lowering maxDepth
  converges the tree without stale folders.
- **Settings**: backend-backed global/user sections use a staged-edit model
  (consistent with the existing Project Accents staging pattern): edits stage
  locally, a single Save persists via the config API client, field errors map
  to the offending selector, and a success toast confirms. Browser-only
  controls (theme, default view, density, event history, document tree
  recents/sort) keep their existing immediate-persist behavior and never call
  the backend config API.
- **Project Edit**: name/description/repository/active save as today. Code and
  ticketsPath fields display with a "Guarded" badge; activating the guarded
  workflow opens a confirmation step (warning copy + consequences) before the
  operation-specific mutation runs.
- **Keyboard/navigation**: all new controls are native form controls
  (`<input type="number">`, chip input with removable buttons) reachable by Tab
  and operable by keyboard; Save submits on Enter.

## Accessibility / Responsive

- Field errors are associated with their inputs via `aria-describedby` /
  `aria-invalid`; the exposure label (editable/guarded/readOnly) is exposed as
  visible text, not color-only.
- Guarded warnings use both an icon and text, not color alone.
- Existing responsive behavior of Settings/Documents/Project Edit is preserved;
  new controls inherit the same container widths and density classes.

## Alternatives Considered

- **Expand SettingsModal into one backend config form** — rejected: mixes
  backend state with localStorage, creates a persistence monolith (assess
  mismatch 5). Chosen: focused owned sections behind `useBackendConfig`.
- **Expose guarded fields as normal inputs** — rejected: code/path changes are
  high-impact and multi-file. Chosen: explicit confirmation workflow.
- **Show fileOnly selectors as disabled** — rejected: they invite confusion and
  imply editability. Chosen: omit entirely from UI (BR-1.2).

## Reviewer Gate

**Reviewer**: self-review against `mdt-pipeline-e2e` UX gate contract +
`mdt-ux-designer` surface conventions + PRE_IMPLEMENT.md capability checklist.

**Verdict**: approved (with required durable-doc updates below).

**Required changes (must resolve before durable-doc update)**:

1. Add a capability boundary for backend-backed config sections to
   `settings.spec.md` (mount only when `canUseOwnerEndpoints`).
2. Add the new Documents `excludeFolders`/`maxDepth` editable controls + their
   capability boundary to `documents-path-selector.spec.md` (owner/admin only).
3. Record the guarded workflow for code/ticketsPath in `project-edit-form.spec.md`
   including the confirmation step and read-only display.
4. Add backend-denial coverage note for read-only direct API calls per
   PRE_IMPLEMENT.md form checklist.

**Durable docs to update** (after approval):

- `docs/design/surfaces/settings.spec.md` — capability boundary + backend-config section description.
- `docs/design/surfaces/documents-path-selector.spec.md` — excludeFolders/maxDepth editable controls + capability.
- `docs/design/surfaces/project-edit-form.spec.md` — guarded workflow note.

These durable updates are performed in the implementation phase alongside the
code, not in this draft. No durable doc is changed to describe draft history —
they describe final behavior.
