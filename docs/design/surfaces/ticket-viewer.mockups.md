# Ticket Viewer — Mockups

Canonical review states for the [viewer spec](ticket-viewer.spec.md) and [interactions](ticket-viewer.interactions.md). **MDT-248 UAT r12 target; not implemented/verified runtime screenshots.**
The shared shell belongs here; split/reference states belong to [side-pane mockups](ticket-side-doc.mockups.md).

**Temporary review images:** optional local images may contain obsolete Documents/ellipsis controls/order and illustrative counts. They are excluded from Git and must not govern implementation. Delete them after implementation and UAT are complete.

The specs and embedded Wireloom below are self-contained and govern hierarchy, source labels, counts and ownership. Wireloom uses text labels for icon buttons so their scopes remain reviewable; runtime uses the existing icon set. Optional pre-development images can remain locally in the ticket assets directory until implementation/UAT completes.

## Default single ticket — details collapsed

```wireloom
window "Ticket reader — single":
  header:
    row:
      text "= ABC-003 • Add public website global search for JRP-95" bold
      spacer
      button "Show ticket details" id="tv-details"
      button "Trace Graph" icon="tech"
      button "Fullscreen"
      button "Close viewer"
  panel:
    row:
      button "Back" disabled
      button "Forward" disabled
      button "Implementation ▾" id="tv-picker"
      spacer
      button "Copy path"
    divider
    text "Implementation" bold
    text "Reuse the existing search service and index public content."
    text "Search behavior" bold
    text "Return matching public documents while preserving source context."
```

Priority is the leading TicketCode glyph, not a moved metadata button. The single H1 is the ticket identity; main toolbar does not repeat its key. Header and toolbar stay pinned while prose scrolls. Trace is conditional on the main ticket's store. Both details/Trace/Fullscreen/Close are icon controls in the runtime; labels above convey accessible names.

## Details expanded — header fragment

```wireloom
window "Ticket reader — details expanded":
  header:
    row:
      text "= ABC-003 • Add public website global search for JRP-95" bold
      spacer
      button "Hide ticket details" primary
      button "Trace Graph" icon="tech"
      button "Fullscreen"
      button "Close viewer"
    row:
      chip "In Progress" accent=warning
      chip "Medium" accent=warning
      chip "95 59 68"
  panel:
    row:
      button "Back"
      button "Forward" disabled
      button "Implementation ▾"
      spacer
      button "Copy path"
```

The ordinary badge flow is directly below title, not a popover. This is one browser/device-wide preference across tickets/projects/reopen. Hover/focus only adds tooltip/highlight. Badge wrapping preserves the reading position; board badge filtering is separate. External links are existing reference-group controls, not generic chips in the runtime.

## Main document picker — Open beside

```wireloom
window "Ticket reader — document picker":
  panel:
    row:
      button "Back"
      button "Forward" disabled
      button "Implementation ▾"
      spacer
      button "Copy path"
    divider
    input placeholder="Find a document…" type=search
    row:
      button "Main"
      spacer
      button "Open Main beside"
    row:
      button "Acceptance matrix"
      chip "Beside"
      spacer
      button "Open acceptance matrix beside"
    row:
      button "Architecture ▾"
    row:
      text "Architecture /"
      button "Main"
      spacer
      button "Open architecture/Main beside"
    row:
      text "Architecture /"
      button "Trace"
      spacer
      button "Open architecture/trace beside"
    row:
      button "Implementation" primary
      chip "Main pane"
      spacer
      button "Open implementation beside"
    row:
      button "Review"
      spacer
      button "Open review beside" id="tv-open-beside"
```

This frame shows only the toolbar and its open picker, not a second permanent sidebar. The row's name and split-icon action are independent controls. Folder indentation models the tree; no new tab row appears. The main document remains unchanged when Open beside replaces the existing reference. Full source identity controls Main pane/Beside markers.

## Promotion — another ticket becomes single main

```wireloom
window "Ticket reader — promoted ticket document":
  header:
    row:
      text "↑ ABC-008 • Index public website content" bold
      spacer
      button "Hide ticket details" primary
      button "Trace Graph" icon="tech"
      button "Restore"
      button "Close viewer"
    row:
      chip "Open"
      chip "High" accent=warning
      chip "68"
  panel:
    row:
      button "Back"
      button "Forward" disabled
      button "Architecture ▾"
      spacer
      button "Copy path"
    divider
    text "Architecture" bold
    text "The index contains only public website content."
```

This follows Close left pane with ABC-008/architecture as the reference. No divider, empty column or pane close remains. Header, priority and all metadata belong to ABC-008; expanded preference survives. Back returns to the earlier main location without recreating the split. The sample's Trace icon assumes the promoted ticket has a store.

## Promotion — repository document becomes single main

```wireloom
window "Reader — promoted repository document":
  header:
    row:
      text "Public website search" bold
      spacer
      button "Restore"
      button "Close viewer"
  panel:
    row:
      button "Back"
      button "Forward" disabled
      text "sf-api/docs/prd/cms/public-search.md" muted size=small
      spacer
      button "Copy path"
      button "Open in Documents"
    divider
    text "Search API" bold
    text "Public search accepts a query and returns grouped results."
```

Repository mode has no ticket key, priority, details or Trace action. Details preference is retained without rendering a badge row. There is no repository-picker chevron. Uses /prj/{sourceProject}/read?doc={encodedProjectRelativePath}. Fresh/reloaded entry has no active reference and one main location. In-session Back returns to the preceding ticket; Close replaces with the source Documents workspace URL. Main history clears when the viewer closes.

## Narrow screen — ticket picker sheet

```wireloom
window "Ticket reader — narrow picker":
  header:
    row:
      text "= ABC-003 • Public website search" bold
      spacer
      button "Details"
      button "Fullscreen"
      button "Close viewer"
  panel:
    row:
      button "Back"
      button "Forward" disabled
      button "Implementation ▾"
      button "Copy path"
    text "Implementation" bold
    text "Reuse the existing search service."
  sheet position=bottom title="Ticket documents":
    input placeholder="Find a document…" type=search
    row:
      button "Main"
      spacer
      button "Open Main beside"
    row:
      button "Implementation" primary
      spacer
      button "Open implementation beside"
    row:
      button "Review"
      spacer
      button "Open review beside"
```

At <640px the picker is a sheet with the same hierarchy/search/actions. The title above is visually truncated; complete identity and icon labels remain accessible. Trace/Epic actions, when applicable, retain reachable icon controls; the default example has no trace store. Header scope does not change on mobile.

## Trace graph shell — preserved tool boundary

```wireloom
window "Ticket reader — Trace Graph":
  panel:
    backbutton "Back"
    text "Trace dashboard iframe" muted
```

Back floats over the existing isolated full-viewport iframe. The dashboard owns its own UI. #trace remains the source of truth; no reader document toolbar/content/ToC is visible over the tool.

## Loading and failures

Use the default shell above with the relevant document body replaced by Loading… or a role=alert failure. Keep header/navigation usable and source-labelled. Missing tickets use Ticket Not Found; missing main subdocs fall back to Main. Reference first-load/replacement/crash behavior is owned by the side-pane mockups/spec.

## Semantic review anchors

Reuse .modal__headline, TicketCode priority template, .badge[data-*], .modal__close, --state-hover-bg and --state-active-bg/fg. New compositions are disclosure, title-triggered picker, independent main history and source-safe promotion. No new palette or hand-built modal is proposed.
