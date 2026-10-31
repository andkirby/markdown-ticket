# Ticket Side Doc — Mockups

Related: [spec](ticket-side-doc.spec.md), [interactions](ticket-side-doc.interactions.md), [shared shell](ticket-viewer.mockups.md).
**MDT-248 UAT r12 target; implementation and browser acceptance pending.** These states replace the earlier tabs/floating-history mockups.

## Same-ticket comparison — collapsed details

```wireloom
window "Reader — same-ticket documents":
  header:
    row:
      text "= ABC-003 • Add public website global search for JRP-95" bold
      spacer
      button "Show ticket details"
      button "Trace Graph" icon="tech"
      button "Restore"
      button "Close viewer"
  panel:
    row:
      col 520:
        row:
          button "Back"
          button "Forward" disabled
          button "Implementation ▾"
          spacer
          button "Copy path"
          button "Close left pane"
        divider
        text "Implementation" bold
        text "Reuse the existing search service."
      col fill:
        row:
          button "Back"
          button "Forward" disabled
          col fill:
            button "Acceptance matrix ▾"
            text "ABC-003 / acceptance-matrix" muted size=small
          button "Copy path"
          button "Close right pane"
        divider
        text "Acceptance matrix" bold
        text "Exact match — matching public results are returned."
```

Shared header spans both panes; toolbars align below it. Neither pane repeats a full ticket header. Both own navigation/copy controls; runtime has icon-only close controls with distinct labels. Global Close closes the viewer, reference Close discards it, and Close left pane promotes the reference. Column width in this drawing is structural, not the runtime persisted ratio.

## Different-ticket reference — reference header fragment

```wireloom
window "Reference — another ticket":
  panel:
    row:
      button "Back"
      button "Forward"
      col fill:
        button "Architecture ▾"
        text "ABC-008 / architecture" muted size=small
      button "Copy path"
      button "Close right pane"
    divider
    text "Architecture" bold
    text "The index contains only public content."
```

Use the shared ABC-003 main header from the preceding state. Reference remains explicitly owned by ABC-008, even after main navigation. Its selector browses ABC-008's documents. Promotion adopts ABC-008's header/metadata as drawn in ticket-viewer.mockups.md.

## Repository reference — reference header fragment

```wireloom
window "Reference — repository document":
  panel:
    row:
      button "Back"
      button "Forward" disabled
      col fill:
        text "Public website search" bold
        text "sf-api/docs/prd/cms/public-search.md" muted size=small
      button "Copy path"
      button "Open in Documents"
      button "Close right pane"
    divider
    text "Search API" bold
    text "The response contains grouped public results."
```

No ticket-picker chevron or ticket badges. Full source project/path remains available after truncation. Copy, hand-off, links, cache and fetch resolve against this document's source. Switching main projects selects that project's separate reference session; it does not load this path under the new project.

## Reference history — jump menu fragment

```wireloom
window "Reference — history":
  panel:
    row:
      button "Back"
      button "Forward"
      col fill:
        text "Public website search" bold
        text "sf-api/docs/prd/cms/public-search.md" muted size=small
      button "Copy path"
      button "Close right pane"
    menu "Back history":
      menuitem "Public search architecture — sf-api/docs/architecture/public-search.md"
      menuitem "Search overview — sf-api/docs/prd/cms/overview.md"
```

Back/Forward is pinned toolbar chrome, not a floating chip over content. Existing right-click jump menus keep the history stack intact and restore per-entry scroll; dismissing the menu does not close the reader. Project qualification prevents equal-path collisions.

## Hidden reference — reveal affordance fragment

```wireloom
window "Reader — reference tucked":
  panel:
    text "Implementation" bold
    text "Reuse the existing search service."
    row justify=end:
      button "Reading · ABC-008 / Architecture · Show"
```

Compose with the single main shell. Escape/Return to main preserved the active project's session. Pill sits above prose/ToC and names the kept source. It is absent after reference discard or successful promotion.

## Narrow reference overlay

```wireloom
window "Reader — narrow reference":
  panel:
    row:
      button "Return to main"
      spacer
      button "Use as main"
      button "Close right pane"
    row:
      button "Back"
      button "Forward" disabled
      col fill:
        button "Architecture ▾"
        text "ABC-008 / architecture" muted size=small
      button "Copy path"
    divider
    text "Architecture" bold
    text "The index contains only public content."
```

Below 1100px the reference covers main; the covered main/global close is hidden so the reference surface has one close. Return to main hides without discarding; Use as main promotes the document because the left close is unreachable. History/copy remain accessible. At <640px its document picker uses the same sheet pattern as main. This narrower toolbar arrangement is a breakpoint-specific state, not the desktop row-height contract.

## First-load failure — reference body fragment

```wireloom
window "Reference — source unavailable":
  panel:
    icon name="warning"
    text "Couldn’t load this document" bold
    text "sf-api/docs/prd/cms/public-search.md" muted size=small
```

Keep the source-aware toolbar above this body. With an already loaded document, retain its content/title/path and identify the failed target through the existing error treatment instead. Render crashes stay contained by PaneErrorBoundary. No failure may expose another project's cached document or history as the active project's data.

## Reuse

Surface/prose use --background and .prose--document; labels/separators use --muted-foreground/--border; controls use the existing neutral hover, selected tint and focus ring. The reveal pill keeps its existing elevated/pill tokens. Fullscreen, details and promotion source headers are owned by ticket-viewer.mockups.md rather than duplicated here.
