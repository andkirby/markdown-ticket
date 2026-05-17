# UI Ownership Requirements

## Documents Settings

Owns project document discovery configuration.

Required capabilities:
- Continue editing `project.document.paths` through the existing path selector flow.
- Add controls for `project.document.excludeFolders` and `project.document.maxDepth` if exposed.
- Explain that document scan depth affects nested markdown discovery, not project discovery.
- Refresh document tree/watchers after successful save.

## Project Edit Form

Owns project metadata and project identity-adjacent configuration.

Required capabilities:
- Continue editing safe metadata such as name, description, repository, and active state.
- Treat `project.code`, `project.ticketsPath`, and registry path changes as guarded settings.
- Do not expose `project.id`, `startNumber`, or `counterFile` as normal UI fields.
- Show validation errors before writing config.

## Settings Modal

Owns global/system configuration and stable backend-owned user preferences.

Required capabilities:
- Separate backend-backed settings from browser-only settings.
- Show global link settings in a clear group.
- Show stable user preferences such as project selector preferences.
- Place discovery/system settings in advanced sections with warnings where appropriate.
- Avoid duplicating project edit and document settings controls.

## API Behavior Required By UI

The API should return configuration with exposure metadata so each surface can decide what to render.

Minimum response concepts:
- scope: `project`, `global`, `user`, or `registry`
- selector: stable dotted path such as `project.document.maxDepth`
- value: current effective value
- exposure: `editable`, `guarded`, `readOnly`, or `fileOnly`
- owner: suggested UI surface
- validation: human-readable constraints

Update behavior:
- Accept only allowlisted selectors.
- Validate all changes before writing any file.
- Write atomically per config file.
- Return field-level validation errors.
- Trigger required refresh side effects after successful writes.
