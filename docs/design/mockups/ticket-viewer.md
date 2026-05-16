# Ticket Viewer — Wireframe Schema

Related spec: `specs/ticket-viewer.md`

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
        text "## Overview" bold id="tv-h2"
        text "This ticket covers..." muted
        text "## Acceptance Criteria" bold
        text "- [ ] Users can log in" muted
        text "- [ ] Sessions persist" muted

annotation "Title bar with border-b" target="tv-title" position=top
annotation "Badge bar wraps if needed" target="tv-status" position=right
annotation "Document tabs hidden if no subdocs" target="tv-doc-tab" position=right
annotation "RelativeTimestamp, absolute right-4 top-4" target="tv-timestamp" position=right
annotation "ToC: collapsible sidebar" target="tv-toc-1" position=left
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
    divider
    row:
      spacer
      text "Updated 2h ago" muted size=small
    text "## Problem" bold
    text "Users are redirected..." muted
    text "## Steps" bold
    text "1. Navigate to /login" muted
```

## Annotations

| Element | Token | Class | Notes |
|---------|-------|-------|-------|
| Modal backdrop | n/a | `bg-black/50 backdrop-blur-sm` | Per MODALS.md |
| Modal z-index | n/a | `z-50` | |
| Close button | `--muted-foreground` | `absolute right-3 top-3 z-20` | 8×8, hover highlight |
| Title bar | `--foreground` | `text-base font-semibold` | `border-b`, `px-4 py-3` |
| Badge bar | badge.css | `flex flex-wrap gap-2` | `border-b`, `px-4 py-2.5` |
| Document tabs | `--primary` | `sticky top-0 z-10` | Active: `border-b-2 border-primary` |
| Content area | `--background` | `px-4 py-4 sm:px-5` | |
| RelativeTimestamp | `--muted-foreground` | `absolute right-4 top-4` | z-[1] |
| Loading overlay | `--background` | `bg-background/50` | `animate-pulse` |
| Error text | `--destructive` | `text-destructive` | `role="alert"` |
| Ticket code | `--primary` | `text-primary dark:text-blue-400` | In title |
| ToC | `--muted-foreground` | collapsible sidebar | State persisted via tocConfig |
