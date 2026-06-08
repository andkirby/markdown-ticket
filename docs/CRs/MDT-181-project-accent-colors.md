---
code: MDT-181
status: Implemented
dateCreated: 2026-06-06T15:52:14.196Z
type: Feature Enhancement
priority: Medium
---

# Add project accent colors

## 1. Description

### Requirements Scope
full

### Problem
- Project cards and selector chips are harder to recognize when many projects share similar text-only layouts.
- Users need a simple way to assign a personal visual identity to each project without requiring shared project branding.
- Project accent selection is a user preference and should not affect what other users see.
- Light and dark mode should not require separate user color choices that can drift apart.

### Affected Areas
- Frontend: Settings > Appearance > Project Accents color picker, project selector rail, and project browser cards.
- User preference storage: per-user project accent preference keyed by project identity.
- Tests: Settings modal accent control behavior, preference persistence, selector rendering, accessibility, and theme behavior.
- Documentation: project browser, project edit form, and preference storage guidance.

### Scope
- In scope:
  - Users can select one accent from a 16-color preset set in Settings > Appearance > Project Accents.
  - Users can alternatively enter a custom hex color in Settings.
  - Backend validates custom hex values before persistence.
  - The selected accent is stored as a user preference for that project and is not shared with other users.
  - Users can reset a project accent to the deterministic fallback from Settings.
  - The selected accent renders on selector chips and browser cards according to the chosen Style (Gradient, Flat, or Plate).
  - Plate style renders the project code as a colored badge with auto-computed foreground (light/dark) for WCAG contrast.
  - Autocolor toggle (default on): on = projects without a user-set accent get a deterministic fallback color; off = no accent for unconfigured projects.
  - When Autocolor is off, Reset fills the computed fallback hex into an empty input; user can delete the hex value to remove the accent entirely.
  - Accent changes in Settings are staged and persisted on explicit Save, not immediately on pick.
  - Browser cards can use a same-size filled identity treatment where the left identity area is filled by accent color or image.
  - Light and dark mode derive theme-appropriate rendering from the same stored accent selection.
- Out of scope:
  - Separate light-mode and dark-mode color selection by users.
  - Shared project/team accent configuration.
  - Writing accent selection to `.mdt-config.toml`, global project registry, shared project metadata, CLI config, or MCP-visible project behavior.
  - Automatically discovering or reading a project image from the project folder.
  - Uploaded image/logo persistence unless architecture explicitly scopes it as a personal visual preference.
  - Changing project access/status badge behavior.
  - Reworking project ordering, search, or favorite logic.

## 2. Desired Outcome

### Success Conditions
- Users can choose one of 16 preset project accent colors for a project.
- Users can choose a custom hex color when the preset palette is not enough.
- The Settings modal exposes a color picker dropdown for the current user's project accent preference.
- Project selector rail items remain compact while gaining stronger visual identity.
- Project browser cards remain the same row size while supporting a filled color/image identity area.
- Existing project cards without a user-configured accent receive stable fallback visual identities.
- Dark mode uses the same selected accent identity with adjusted contrast and surface treatment.

### Constraints
- Store one canonical project accent selection per user/project pair.
- Treat the accent as visual user preference, not shared project/team behavior.
- Do not persist the accent in project configuration, project metadata, shared services, CLI config, or MCP-visible project output.
- Derive light and dark presentation from the stored accent instead of storing separate theme colors.
- Preserve existing selector card information hierarchy: project code, name, description, favorite state.
- Do not add new access/status badges as part of this change.
- Keep fallback behavior deterministic for projects where the current user has not configured an accent.
- Preserve keyboard navigation, search behavior, and project switching behavior.

### Non-Goals
- Not a full project branding system.
- Not a shared project branding system visible to every user.
- Not a replacement for uploaded project logos or icons.
- Not a change to permissions, read-only visibility, or sharing behavior.
- Not a redesign of the project selector modal layout beyond project identity treatment.

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Palette | What exact 16 accent names and values should be canonical? | Must work on light and dark backgrounds with readable foreground text. |
| Custom hex | What exact hex formats should backend validation accept? | Must reject malformed, unsafe, transparent, or unreadable values before persistence. |
| Picker UI | What Project Edit form control pattern should host preset colors plus custom hex? | Must fit the existing edit form without making immutable project fields look editable. |
| Persistence | Which per-user storage tier should own the selected accent? | Must not write shared project configuration; may use browser-local storage or backend-owned per-user state if cross-browser persistence is required. |
| Defaults | How should projects without a user-selected accent receive fallback colors? | Must be stable across sessions and not require migration before rendering. |
| Image source | Should future image support use upload/select-and-copy into user-owned preference storage, or remain a separate shared branding CR? | Do not auto-read images from the project folder for this personal preference. |
| Image fallback | How should future uploaded image/logo and accent color priority be resolved? | Image support is out of scope unless scoped as personal visual preference. |
| Accessibility | What contrast thresholds apply to accent marks and filled identity areas? | Code/initials inside accent marks must stay readable. |

### Known Constraints
- Project browser and selector surfaces already render backend-filtered project lists.
- Project Edit form already owns mutable project metadata, but this control must be clearly personal preference rather than shared metadata.
- Visual-only preferences do not belong in `.mdt-config.toml`, global config, shared project behavior, CLI behavior, or MCP-visible project output.
- Project-folder images imply shared/versioned project branding and are not the right default for a personal project accent preference.
- Existing favorite star behavior must remain intact.
- Existing empty-state copy must remain unchanged.
- Project identity treatment should avoid adding extra metadata clutter.

### Decisions Deferred
- Exact preference storage owner and key shape.
- Exact custom hex validation contract and error copy.
- Exact CSS token naming and component structure.
- Whether future uploaded image support belongs in this preference path or a separate shared branding CR.
- If personal image support is included later, whether the UI copies an uploaded/selected file into user-owned preference storage rather than referencing the original project folder path.
- Automated test file placement and task breakdown.

## 4. Acceptance Criteria

### Functional
- [ ] User can select one accent from 16 available preset project accent colors in Settings > Appearance > Project Accents.
- [ ] User can alternatively enter a custom hex color in Settings.
- [ ] Settings shows a `choose color` link that opens `https://share.google/ATp6ypatbFk69dC91` in a new tab.
- [ ] Backend validates custom hex values before saving them.
- [ ] Invalid custom hex values show a field-level validation error and do not replace the previous valid accent.
- [ ] Accent selection is saved as the current user's preference for that project on explicit Save in Settings.
- [ ] Accent selection is not visible to other users unless they choose the same preference independently.
- [ ] User can reset a project accent to its deterministic fallback from Settings.
- [ ] Project selector rail displays the current user's configured project accent according to the selected Style (Gradient, Flat, or Plate).
- [ ] Project browser cards display the current user's configured accents without increasing normal card row height.
- [ ] Plate style renders the project code as a colored badge with auto-computed foreground for readable contrast.
- [ ] Filled identity treatment supports accent-color fill and uploaded-image fill while preserving card dimensions.
- [ ] Projects without current-user configured accents receive deterministic fallback accents (Autocolor on) or no accent (Autocolor off).
- [ ] Light and dark mode use the same stored accent choice with theme-appropriate contrast.
- [ ] Existing project search, selection, favorites, and ordering behavior continue to work.

### Non-Functional
- [ ] Accent marks meet readable contrast for project code or initials in light and dark mode. Plate style uses sRGB perceptual brightness to auto-select light or dark foreground text.
- [ ] Palette choice does not introduce layout shift in selector rail or browser cards.
- [ ] Accent persistence does not require users to reconfigure existing projects before using the selector.
- [ ] Custom hex input is constrained to backend-validated hex values.
- [ ] Accent persistence does not modify shared project configuration or project metadata.

### Edge Cases
- Current user has no configured accent for a project (Autocolor on → fallback applied; Autocolor off → no accent).
- Current user enters malformed custom hex.
- Current user opens the external color helper and returns without changing the value.
- Another user has a different configured accent for the same project.
- Project has no uploaded image or image fails to load.
- Previously selected personal image is missing from user-owned storage.
- Project folder contains possible logo/image files but the user has not selected one.
- Project has a long code or long name.
- User switches between light and dark mode.
- Read-only visitor can use or view their own local/personal accent preference without writing shared project configuration.
- Multiple projects select the same accent.

## 5. Verification

### How to Verify Success
- Manual verification:
  - Open Settings > Appearance > Project Accents.
  - Select a project from the dropdown and choose an accent from the palette or custom hex.
  - Select Custom hex, enter a valid hex, and confirm the preview/persistence.
  - Enter invalid hex and confirm backend validation error.
  - Click `choose color` and confirm it opens the color picker in a new tab.
  - Switch Style between Gradient, Flat, and Plate — verify each renders correctly on chips and cards.
  - Toggle Autocolor off, delete hex input for a project, save — verify no accent renders for that project.
  - With Autocolor off and empty input, click Reset — verify fallback hex fills into the input.
  - Configure several projects with different personal accents.
  - Open the selector rail and project browser.
  - Confirm the identity treatment improves recognition without changing card size.
  - Toggle light and dark mode and verify readable contrast.
  - Confirm the selected accent is not written to project configuration or shared project metadata.
- Automated verification:
  - Test user/project accent preference persistence and fallback behavior.
  - Test Settings color picker saves only user preference state on explicit Save.
  - Test custom hex validation rejects malformed values before persistence.
  - Test the `choose color` link uses `target="_blank"` with a safe external-link policy.
  - Test selector rail and browser card rendering with configured and fallback accents.
  - Test Plate style renders code badge with auto-contrast foreground.
  - Test Autocolor toggle: on produces fallback, off produces no accent for unconfigured projects.
  - Test Reset fills auto hex when Autocolor off and input empty.
  - Test read-only/shared project access does not write shared configuration when accent preference changes.
  - Test existing project browser search and selection behavior remains intact.
- Documentation verification:
  - Update design surface docs to describe the 16-color preset palette, custom hex option, Style dropdown, Autocolor toggle, Plate style, personal preference boundary, and single-accent theme derivation rule.

> Requirements trace projection: [requirements.trace.md](./MDT-181/requirements.trace.md)
>
> Requirements notes: [requirements.md](./MDT-181/requirements.md)
>
> BDD trace projection: [bdd.trace.md](./MDT-181/bdd.trace.md)
>
> BDD notes: [bdd.md](./MDT-181/bdd.md)
>
> Architecture trace projection: [architecture.trace.md](./MDT-181/architecture.trace.md)
>
> Architecture notes: [architecture.md](./MDT-181/architecture.md)
>
> Tests notes: [tests.md](./MDT-181/tests.md)
>
> Tests trace projection: [tests.trace.md](./MDT-181/tests.trace.md)

## 8. Clarifications

### UAT Session 2026-06-07

**Approved changes:**
- Move accent picker from Edit Project form to Settings > Appearance > Project Accents
- Fix persistence bug: stage changes locally, persist on explicit Save, Cancel discards
- Add "Reset to default" button per project to revert to deterministic fallback
- Remove "Your Project Accent" section from AddProjectModal

**Changed requirement IDs:** BR-1.1, BR-1.2, BR-1.3, BR-1.4, BR-1.5, BR-2.1, C7 (refine_in_place); BR-9.1 (additive_change)

**Updated workflow documents:** requirements.md, bdd.md, architecture.md, uat.md

**Trace revalidated:** requirements ✅, all stages rendered

**More implementation required:** Yes — 5 execution slices in uat.md

### UAT Session 2026-06-07 (round 2)

**Approved changes:**
- Add "Accent Colors" toggle (default on) — master on/off for accent marks
- Add "Gradient Accents" toggle (default on) — gradient fade vs flat stripe
- Chip gradient: 25px CSS gradient fade using `rgb(from var(...) r g b / ...)` relative color syntax
- Card gradient: 40% width gradient fade at 0.5 opacity, min-width 100px
- Active card gradient: `linear-gradient(135deg, ..., accent-to)` with light/dark tokens
- Gradient/flat mode gated by `data-accent-gradients` attribute on chips and cards
- Accent enable/disable gated by `data-accent-enabled` attribute
- Rendering flags persisted in localStorage `mdt-selector-preferences`
- Remove round color swatch from accent editor row
- Add native color picker slider after hex input
- Hex input: max 7 chars, placeholder = fallback hex, shorthand auto-expansion

**Changed requirement IDs:** BR-10.1, BR-10.2, BR-11.1, BR-11.2 (additive_change); C10 (additive_change)

**Updated workflow documents:** requirements.md, bdd.md, architecture.md, settings.spec.md, settings.mockups.md

**Trace revalidated:** requirements ✅, all stages rendered

**More implementation required:** Yes — wire toggle switches into Settings Appearance tab

### UAT Session 2026-06-08

**Approved changes:**
- Replace `accentGradients: boolean` with `accentStyle: string` enum (`"gradient"` | `"flat"` | `"plate"`) in schema and localStorage
- Replace "Gradient Accents" toggle with "Style" dropdown offering three named styles: Gradient, Flat, Plate
- Add Plate style: project code renders as a colored badge (identity plate) with accent-filled background and auto-computed foreground (light/dark via WCAG luminance)
- Chip plate: code element gets right-rounded accent-filled background, auto-contrast foreground, inner highlight shadow
- Card plate: same badge treatment on code element; identity area (gradient/stripe) removed — badge provides accent identity
- Add Autocolor toggle (default on): on = deterministic fallback for unconfigured projects; off = no accent for unconfigured projects
- Autocolor off + reset + empty input: reset fills the computed fallback hex into the input field
- Delete hex input value + save = revert to autocolor (or no accent if autocolor off)
- Migrate data attribute from `data-accent-gradients="true|false"` to `data-accent-style="gradient|flat|plate"`
- Migrate stored preference: `accentGradients: true` → `accentStyle: "gradient"`, `accentGradients: false` → `accentStyle: "flat"`

**Changed requirement IDs:** BR-11.1, BR-11.2, C10 (refine_in_place); BR-11.3, BR-12.1, BR-12.2, BR-12.3 (additive_change)

**Updated workflow documents:** requirements.md, bdd.md, architecture.md, settings.spec.md, settings.mockups.md, uat.md

**Trace revalidated:** requirements ✅, bdd ✅, architecture ✅, tests ✅, tasks ✅ — all stages rendered

**More implementation required:** Yes — 6 execution slices in uat.md
