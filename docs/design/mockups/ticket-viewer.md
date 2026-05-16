# Ticket Viewer — Wireframe Schema

Related spec: `specs/ticket-viewer.md`

## Default State (Ticket with Sub-Documents)

```wireframe
┌──────────────────────────────────────────────────┐
│ Modal (size=xl)                            [×]   │
│─────────────────────────────────────────────────│
│ MDT-042 • Implement user authentication          │  ← Title bar (border-b)
│─────────────────────────────────────────────────│
│ [In Progress] [High] [Feature] [Phase:Auth]      │  ← Badge bar (border-b)
│ [Assignee:Bob] 🪾 Worktree [Related:3]           │     wraps if needed
│─────────────────────────────────────────────────│
│ [Main] [API Design ▶] [Implementation]           │  ← Document tabs
│                                                  │     (hidden if no subdocs)
│─────────────────────────────────────────────────│
│ │ToC│                              Updated 2h ago│  ← RelativeTimestamp
│ │   │                                            │
│ │ • │ ## Overview                                │  ← MarkdownContent
│ │ • │ This ticket covers...                      │     (headerLevelStart=3)
│ │   │                                            │
│ │ • │ ## Acceptance Criteria                     │
│ │   │ - [ ] Users can log in                     │
│ │   │ - [ ] Sessions persist                     │
│ │   │                                            │
│ └───┘                                            │
└──────────────────────────────────────────────────┘
```

## No Sub-Documents (Main Content Only)

```wireframe state:ticket-viewer no-subdocs
┌──────────────────────────────────────────────────┐
│ Modal (size=xl)                            [×]   │
│─────────────────────────────────────────────────│
│ MDT-042 • Fix login redirect                     │
│─────────────────────────────────────────────────│
│ [Proposed] [Medium] [Bug]                        │  ← No ContextBadge/Relationship
│─────────────────────────────────────────────────│
│                              Updated 2h ago      │  ← No tab row
│                                                   │
│ ## Problem                                        │
│ Users are redirected to...                        │
│                                                   │
│ ## Steps to Reproduce                             │
│ 1. Navigate to /login                             │
│ 2. Enter credentials                              │
│                                                   │
└──────────────────────────────────────────────────┘
```

## Sub-Document Loading

```wireframe state:ticket-viewer subdoc-loading
┌──────────────────────────────────────────────────┐
│ MDT-042 • Implement auth           [×]           │
│─────────────────────────────────────────────────│
│ [In Progress] [High] [Feature]                   │
│─────────────────────────────────────────────────│
│ [Main] [●API Design▶] [Implementation]           │  ← Active tab changed
│─────────────────────────────────────────────────│
│ ┌──────────────────────────────────────────────┐ │
│ │              Loading…                         │ │  ← Overlay: bg-background/50
│ │                                              │ │     animate-pulse
│ └──────────────────────────────────────────────┘ │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  ← Content at opacity-50
└──────────────────────────────────────────────────┘
```

## Ticket Not Found

```wireframe state:ticket-viewer not-found
┌──────────────────────────────────────────────────┐
│ Modal (size=xl)                            [×]   │
│─────────────────────────────────────────────────│
│                                                  │
│                    ⚠                              │  ← AlertTriangle icon
│                                                   │
│              Ticket Not Found                     │  ← h3
│                                                   │
│       Ticket 'MDT-999' not found                  │  ← Error message
│                                                   │
└──────────────────────────────────────────────────┘
```

## Sub-Document Error

```wireframe state:ticket-viewer subdoc-error
┌──────────────────────────────────────────────────┐
│ MDT-042 • Implement auth           [×]           │
│─────────────────────────────────────────────────│
│ [In Progress] [High] [Feature]                   │
│─────────────────────────────────────────────────│
│ [Main] [API Design] [Implementation]             │
│─────────────────────────────────────────────────│
│ Failed to load document: file not found          │  ← text-destructive, role=alert
│                                                   │
└──────────────────────────────────────────────────┘
```

## Mobile

```wireframe viewport:mobile
┌──────────────────────────┐
│ MDT-042 • Fix login  [×] │
│─────────────────────────│
│ [Proposed] [Medium] [Bug]│
│─────────────────────────│
│       Updated 2h ago     │
│                          │
│ ## Problem               │
│ Users are redirected...  │
│                          │
│ ## Steps                 │
│ 1. Navigate to /login    │
│                          │
└──────────────────────────┘
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
