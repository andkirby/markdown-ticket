---
code: MDT-182
status: Partially Implemented
dateCreated: 2026-06-08T21:00:07.233Z
type: Feature Enhancement
priority: Medium
---

# Add Wireloom annotation view toggle

## 1. Description

### Requirements Scope
- full

### Problem
- Wireloom annotation callouts can make rendered mockups wider and taller than the underlying UI surface.
- Long annotated mockups are harder to scan when every note is always visible.
- Users need a compact review mode without losing access to annotation text.

### Affected Areas
- src: Documents View markdown rendering and Wireloom post-render presentation.
- docs: design mockups that use Wireloom annotations.
- tests: unit and browser coverage for Wireloom annotation presentation.

### Scope
- In scope: users can switch a rendered Wireloom block between expanded callouts and compact numbered annotation markers.
- In scope: compact markers expose annotation text on hover, focus, and click.
- In scope: the selected annotation view mode can persist for the user when appropriate.
- Out of scope: changing Wireloom source syntax.
- Out of scope: modifying the external Wireloom package.
- Out of scope: changing non-Wireloom markdown rendering behavior.

## 2. Desired Outcome

### Success Conditions
- Users can keep annotation-heavy Wireloom mockups visually compact while still reading every annotation.
- Users can switch back to the full callout view when they need the static annotated diagram.
- Numbered annotation markers remain attached to the same target points as the current callouts.
- Keyboard users can access the same annotation content as pointer users.

### Constraints
- Must keep original Markdown and Wireloom source unchanged.
- Must preserve current full-callout rendering as an available view.
- Must not require changes to the external Wireloom package.
- Must keep the markdown-it rendering pipeline shape intact.
- Must keep graceful fallback for malformed or unavailable Wireloom rendering.

### Non-Goals
- Not replacing Wireloom as the diagram renderer.
- Not introducing a new diagram syntax.
- Not making a global redesign of Documents View annotation UX.

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Architecture | Should hotspot mode be implemented as a Wireloom anti-corruption adapter or another isolated presentation layer? | Must not spread SVG rewrite logic across the app |
| Interaction | Should the toggle be per Wireloom block, global per document, or both? | Per-block behavior is preferred unless architecture finds a stronger reason |
| Persistence | Should annotation view preference persist per user, per document, or per block? | Must not mutate markdown files |
| Accessibility | What tooltip/popover pattern best supports hover, focus, click, Escape, and mobile touch? | Must keep annotation text reachable without pointer-only behavior |
| Rendering | How should marker coordinates be derived from Wireloom output safely? | Wireloom does not currently emit stable target metadata |

### Known Constraints
- Existing Wireloom annotations target element IDs in source.
- Existing Wireloom render output includes target dots and callout visuals, but not stable public metadata for annotation targets.
- MDT owns the presentation integration boundary, not the Wireloom package internals.

### Decisions Deferred
- Implementation approach is determined by mdt:architecture.
- Specific artifacts are determined by mdt:architecture.
- Test inventory is determined by mdt:tests.
- Task breakdown is determined by mdt:tasks.

## 4. Acceptance Criteria

### Functional
- [ ] A rendered Wireloom block offers a visible control to switch annotation presentation modes.
- [ ] Full callout mode preserves the current readable annotation view.
- [ ] Compact mode replaces always-visible callout boxes with numbered target markers.
- [ ] Hovering or focusing a marker shows the matching annotation text.
- [ ] Clicking or tapping a marker keeps the annotation visible until dismissed or another marker is selected.
- [ ] The control does not modify the source Markdown file.
- [ ] Non-Wireloom code fences render exactly as before.

### Non-Functional
- [ ] Compact mode avoids expanding the rendered SVG canvas to fit external annotation boxes.
- [ ] Keyboard and screen reader users can reach annotation marker controls and read annotation text.
- [ ] Malformed Wireloom source still shows the existing inline error behavior.
- [ ] Missing or unloadable Wireloom still falls back to escaped plain code.

### Edge Cases
- Multiple annotations target the same element.
- Long annotation text exceeds the available tooltip width.
- Annotation target cannot be resolved by Wireloom.
- Multiple Wireloom blocks appear in one document.
- User switches theme while compact mode is active.
- User opens fullscreen while compact mode is active.

## 5. Verification

> Requirements trace projection: [requirements.trace.md](./MDT-182/requirements.trace.md)
>
> Requirements notes: [requirements.md](./MDT-182/requirements.md)
>
> BDD trace projection: [bdd.trace.md](./MDT-182/bdd.trace.md)
>
> BDD notes: [bdd.md](./MDT-182/bdd.md)
>
> Architecture trace projection: [architecture.trace.md](./MDT-182/architecture.trace.md)
>
> Architecture notes: [architecture.md](./MDT-182/architecture.md)
>
> Tests trace projection: [tests.trace.md](./MDT-182/tests.trace.md)
>
> Tests notes: [tests.md](./MDT-182/tests.md)
>
> Tasks trace projection: [tasks.trace.md](./MDT-182/tasks.trace.md)
>
> Tasks notes: [tasks.md](./MDT-182/tasks.md)

### How to Verify Success
- Manual verification: open an annotation-heavy Wireloom mockup and switch between callout and compact marker views.
- Manual verification: hover, focus, click, tap, and dismiss annotation markers.
- Automated verification: assert mode toggle renders the correct annotation presentation without changing source content.
- Automated verification: assert malformed and missing-Wireloom fallback paths still work.
- Browser verification: assert compact mode keeps rendered dimensions close to the base mockup dimensions.