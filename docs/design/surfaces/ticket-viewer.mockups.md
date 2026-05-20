# Ticket Viewer — Wireframe Schema

Related spec: `ticket-viewer.spec.md`

## Default State (Ticket with Sub-Documents)

```wireloom
window "Ticket Viewer — With Sub-Docs":
  panel:
    row:
      text "MDT-042🪾 • Implement user authentication" bold id="tv-title"
      spacer
      button "×" id="tv-close"
    divider
    row:
      chip "In Progress" id="tv-status"
      chip "High" accent=danger id="tv-priority"
      chip "Feature" id="tv-type"
      chip "Phase:Auth" id="tv-phase"
    row:
      chip "Assignee:Bob" id="tv-assignee"
      chip "🪾 Worktree" id="tv-worktree"
      chip "Related:3" id="tv-related"
      spacer
      button "Trace Graph" icon="tech" id="tv-trace-action"
    divider
    tabs id="tv-doc-tabs":
      tab "Main" active id="tv-tab-main"
      tab "API Design ▶" id="tv-tab-api"
      tab "Implementation" id="tv-tab-impl"
    divider
    row:
      col 120:
        list:
          item "Overview" id="tv-toc-1"
          item "Acceptance Criteria" id="tv-toc-2"
      col fill:
        row:
          spacer
          text "Updated 2h ago" muted size=small id="tv-timestamp"
        text "### Overview" bold id="tv-h2"
        text "This ticket covers..." muted
        text "### Acceptance Criteria" bold
        text "- [ ] Users can log in" muted
        text "- [ ] Sessions persist" muted

annotation "Title bar with border-b" target="tv-title" position=top
annotation "Badge bar wraps if needed" target="tv-status" position=right
annotation "Trace Graph appears only when the standard trace store exists" target="tv-trace-action" position=right
annotation "Document tabs hidden if no subdocs" target="tv-doc-tabs" position=right
annotation "RelativeTimestamp, absolute right-4 top-4" target="tv-timestamp" position=right
annotation "ToC: collapsible sidebar" target="tv-toc-1" position=left
annotation "Markdown body uses markdown-content.spec.md ticket variant" target="tv-h2" position=right
```

## No Sub-Documents (Main Content Only)

```wireloom
window "Ticket Viewer — No Sub-Docs":
  panel:
    row:
      text "MDT-042 • Fix login redirect" bold id="tv-ns-title"
      spacer
      button "×"
    divider
    row:
      chip "Proposed" id="tv-ns-status"
      chip "Medium" id="tv-ns-priority"
      chip "Bug" id="tv-ns-type"
    divider
    row:
      spacer
      text "Updated 2h ago" muted size=small id="tv-ns-timestamp"
    text "## Problem" bold
    text "Users are redirected to..." muted
    text "## Steps to Reproduce" bold
    text "1. Navigate to /login" muted
    text "2. Enter credentials" muted

annotation "No tab row, no ContextBadge/Relationship badges" target="tv-ns-title" position=right
```

## Trace Store Present

```wireloom
window "Ticket Viewer — Trace Store Present":
  panel:
    row:
      text "MDT-169 • Document view filename tabs" bold id="tv-trace-title"
      spacer
      button "×"
    divider
    row:
      chip "In Progress"
      chip "High" accent=danger
      chip "Feature"
      spacer
      button "Trace Graph" icon="tech" id="tv-trace-button"
    divider
    tabs:
      tab "Main" active
      tab "Requirements"
      tab "Tasks"
    divider
    text "## Summary" bold
    text "Ticket content remains the default view." muted

annotation "Action is rendered, not disabled, only after trace metadata confirms store presence" target="tv-trace-button" position=right
```

## Trace Graph Shell

```wireloom
window "Ticket Viewer — Trace Graph Shell":
  panel id="trace-shell":
    panel id="trace-iframe":
      row id="trace-floating-layer":
        backbutton "Back" id="trace-back"
      text "Trace dashboard iframe" muted
      text "Dashboard styles and controls are isolated inside the iframe." muted

annotation "Back floats above the iframe with a translucent non-blurred background; it is not part of the dashboard HTML" target="trace-back" position=bottom
annotation "Viewport shell has no modal padding, margin, rounded card, or shadow" target="trace-shell" position=left
annotation "Iframe is a black box; this mockup does not specify graph-board internals" target="trace-iframe" position=right
```

## Trace Graph Unavailable After Open

```wireloom
window "Ticket Viewer — Trace Graph Unavailable":
  panel:
    row id="trace-error-floating-layer":
      backbutton "Back" id="trace-error-back"
    panel:
      icon name="warning" id="trace-error-icon"
      text "Trace store unavailable" bold id="trace-error-title"
      text "The trace data for this ticket could not be loaded." muted

annotation "Back remains available even when the iframe/store fails" target="trace-error-back" position=bottom
annotation "Error belongs to the shell because the store failed before dashboard use" target="trace-error-title" position=right
```

## Sub-Document Loading

```wireloom
window "Ticket Viewer — Sub-Doc Loading":
  panel:
    row:
      text "MDT-042🪾 • Implement auth" bold
      spacer
      button "×"
    divider
    row:
      chip "In Progress"
      chip "High" accent=danger
      chip "Feature"
    divider
    tabs:
      tab "Main"
      tab "API Design ▶" active id="tv-load-tab"
      tab "Implementation"
    divider
    spinner "Loading…" id="tv-spinner"
    text "▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓" muted id="tv-load-content"

annotation "Active tab changed; content at opacity-50" target="tv-load-content" position=right
annotation "Loading overlay: bg-background/50, animate-pulse" target="tv-spinner" position=right
```

## Ticket Not Found

```wireloom
window "Ticket Viewer — Not Found":
  panel:
    row:
      spacer
      button "×" id="tv-nf-close"
    icon name="warning" id="tv-nf-icon"
    text "Ticket Not Found" bold id="tv-nf-heading"
    text "Ticket 'MDT-999' not found" muted id="tv-nf-msg"

annotation "AlertTriangle icon, centered" target="tv-nf-icon" position=top
```

## Sub-Document Error

```wireloom
window "Ticket Viewer — Sub-Doc Error":
  panel:
    row:
      text "MDT-042🪾 • Implement auth" bold
      spacer
      button "×"
    divider
    row:
      chip "In Progress"
      chip "High" accent=danger
      chip "Feature"
    divider
    tabs:
      tab "Main"
      tab "API Design" id="tv-err-tab"
      tab "Implementation"
    divider
    text "Failed to load document: file not found" accent=danger id="tv-error"

annotation "text-destructive, role=alert" target="tv-error" position=right
```

## Mobile

```wireloom
window "Ticket Viewer — Mobile":
  panel:
    row:
      text "MDT-042 • Fix login" bold id="tv-m-title"
      spacer
      button "×"
    divider
    row:
      chip "Proposed"
      chip "Medium"
      chip "Bug"
    row:
      button "Trace Graph" icon="tech" id="tv-m-trace"
    divider
    row:
      spacer
      text "Updated 2h ago" muted size=small
    text "## Problem" bold
    text "Users are redirected..." muted
    text "## Steps" bold
    text "1. Navigate to /login" muted
```

Mobile behavior:

- Sub-document tabs stay visible when sub-documents exist, but use horizontal scroll instead of wrapping.
- The table of contents is hidden by default on mobile and opens from a compact content-menu control.
- Timestamp remains above content, not absolute-positioned over the title.
- Trace Graph wraps onto its own row when badges leave no stable inline space.

## Annotations

| Element | Token | Class | Notes |
|---------|-------|-------|-------|
| Modal backdrop | n/a | `bg-black/50 backdrop-blur-sm` | Per MODALS.md |
| Modal z-index | n/a | `z-50` | |
| Close button | `--muted-foreground` | `absolute right-3 top-3 z-20` | 8×8, hover highlight |
| Title bar | `--foreground` | `text-base font-semibold` | `border-b`, `px-4 py-3` |
| Badge bar | badge.css | `flex flex-wrap gap-2` | `border-b`, `px-4 py-2.5` |
| Document tabs | `--primary` | `sticky top-0 z-10` | Active: `border-b-2 border-primary` |
| Trace action | `--primary`, `--border` | small secondary button or inline Tailwind | Ticket-scoped action, hidden when no trace store |
| Trace back control | `--background`, `--border` | `.trace-graph-shell__back` | Floating translucent Back over iframe |
| Trace iframe | n/a | iframe inside `.trace-graph-shell` | Dashboard styles remain isolated; graph internals are out of scope |
| Content area | `--background` | `px-4 py-4 sm:px-5` | |
| RelativeTimestamp | `--muted-foreground` | `absolute right-4 top-4` | z-[1] |
| Loading overlay | `--background` | `bg-background/50` | `animate-pulse` |
| Error text | `--destructive` | `text-destructive` | `role="alert"` |
| Ticket code | `--primary` | `text-primary dark:text-blue-400` | In title |
| ToC | `--muted-foreground` | collapsible sidebar | State persisted via tocConfig |
