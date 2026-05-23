# Settings

Owner/admin modal with tabbed sections for user preferences and project sharing controls. Most settings are client-side and write immediately; Sharing is API-backed.

## Composition

```text
Modal[size="md"]
├── ModalHeader
│   │ title="Settings"
│   └── button[close ×]
└── ModalBody[p-0]
    └── Tabs.Root
        ├── Tabs.List (horizontal, border-b)
        │   ├── Tabs.Trigger[Appearance]
        │   ├── Tabs.Trigger[Board]
        │   ├── Tabs.Trigger[Sharing]
        │   └── Tabs.Trigger[Advanced]
        └── Tabs.Content × 4
            ├── Appearance panel
            │   ├── div.setting-group["Theme"]
            │   │   ├── label + description
            │   │   └── ButtonGroup[Light / Dark / System]
            │   └── div.setting-group["Default View"]
            │       ├── label + description
            │       └── Select[Board / List]
            │   └── div.setting-group["Markdown Density"]
            │       ├── label + description
            │       └── Select[Compact / Default / Comfortable]
            ├── Board panel
            │   ├── div.setting-group["Card Density"]
            │   │   ├── label + description
            │   │   └── Select[Comfortable / Compact]
            │   ├── div.setting-group["Smart Links"]
            │       ├── label + description
            │       └── Switch[toggle]
            │   └── div.setting-group["Visible Card Badges"]
            │       ├── label + description
            │       └── CheckboxList[Status / Priority / Type / Phase / Related / Depends / Blocks / Worktree]
            ├── Sharing panel (owner/admin only)
            │   ├── div.setting-group["Project Access"]
            │   │   └── Select[Private / Unlisted read-only / Public read-only]
            │   └── div.setting-group["Share link"]
            │       ├── ReadonlyInput[share URL] or helper text
            │       └── ActionRow[Rotate, Save]
            └── Advanced panel
                ├── div.setting-group["Event History"]
                │   ├── label + description
                │   └── Switch[toggle]
                └── div.setting-group["Cache"]
                    ├── label + description
                    └── Button[outline]["Clear Cache"]
```

## Children

| Child | Component | Spec | Conditional |
|-------|-----------|------|-------------|
| Modal | `src/components/ui/Modal.tsx` | `MODALS.md` | always |
| Tabs | Radix `@radix-ui/react-tabs` | — | always |
| ButtonGroup | `src/components/ui/button-group.tsx` | — | theme selector |
| Button | `src/components/ui/Button.tsx` | — | clear cache action |
| Switch | `src/components/ui/switch.tsx` | — | toggle preferences |
| Checkbox list | native checkbox controls | — | visible card badges |
| Readonly input | native input with `readOnly` | — | Sharing tab with generated share URL |

## Source files

| Type | Path |
|------|------|
| Component | `src/components/SettingsModal.tsx` |
| Modal primitive | `src/components/ui/Modal.tsx` |
| Theme hook | `src/hooks/useTheme.ts` |
| Link config | `src/config/linkConfig.ts` |
| Event history | `src/components/DevTools/useEventHistoryState.ts` |
| Cache utils | `src/utils/cache.ts` |
| Sharing API | `PUT /api/projects/:code/sharing` |

## Layout

### Modal

- Size: `md` (`sm:max-w-xl`)
- ModalBody: `p-0` (tabs own their padding)
- Follows all `MODALS.md` conventions (backdrop, escape, click-outside)

### Tabs

- Horizontal tab list: `border-b border-gray-200 dark:border-gray-700`
- Tab trigger: `flex-1 px-4 py-3 text-sm font-medium`
- Active tab: `border-b-2 border-primary text-foreground`
- Inactive tab: `text-muted-foreground hover:text-foreground`
- Tab content: `p-6` padding inside each panel

### Setting groups

- Vertical stack: `space-y-6`
- Each group: `div` with label + description + control
- Label: `text-sm font-medium text-foreground`
- Description: `text-sm text-muted-foreground mt-0.5`

### Setting group layouts

| Control type | Layout |
|--------------|--------|
| Button group | label above, group below (`flex-col gap-3`) |
| Select | label + description above, select below (`flex-col gap-2`) |
| Switch | label/description left, switch right (`flex items-center justify-between`) |
| Button action | label/description left, button right (`flex items-center justify-between`) |
| Checkbox list | label + description above, checkbox rows below (`flex-col gap-2`) |
| Share link | label above, readonly generated URL below, save/rotate actions in trailing row |

## Tabs

### Appearance

| Setting | Storage | Control | Default |
|---------|---------|---------|---------|
| Theme | cookie `theme` | ButtonGroup (Light / Dark / System) | `system` |
| Default View | localStorage `mdt-settings-default-view` | Select (Board / List) | `board` |
| Markdown Density | localStorage `mdt-settings-markdown-density` | Select (Compact / Default / Comfortable) | `default` |

### Board

| Setting | Storage | Control | Default |
|---------|---------|---------|---------|
| Card Density | localStorage `mdt-settings-card-density` | Select (Comfortable / Compact) | `comfortable` |
| Smart Links | localStorage `markdown-ticket-link-config.enableAutoLinking` | Switch toggle | `true` |
| Visible Card Badges | localStorage `markdown-ticket:board:ticket-card-badges` | Checkbox list | Status, Priority, Type, Phase, Related, Depends, Blocks, Worktree |

### Sharing

Visible only when current access mode includes owner/admin permission. Hidden entirely for anonymous and read-token visitors.

| Setting | Storage | Control | Default |
|---------|---------|---------|---------|
| Sharing mode | server project sharing config | Select (Private / Unlisted read-only / Public read-only) | Private |
| Share link | derived from server-generated share ID | read-only input | hidden until read-only sharing is enabled |
| Rotate link | server project sharing config | Button "Rotate" | visible only when a non-private share link exists |
| Save sharing | server project sharing config | Button "Save" | always visible on Sharing tab |

Interaction rules:
- Changing Sharing mode is local until Save is selected. Save writes through an authenticated API and shows loading/error state inline.
- Unlisted read-only is the default sharing choice for link sharing: accessible through share URL, absent from anonymous project listing.
- Public read-only appears in anonymous project listing and should be selected only when the owner wants directory-style discovery.
- Read-only modes never grant mutation rights.
- Read tokens are entered through the auth unlock flow, not managed from Settings in this version.
- Share links use a server-generated, non-enumerable public share ID. Clients must never submit a custom share ID.
- Rotate invalidates the previous share URL by asking the backend to generate a new share ID.
- Write/admin tokens must never be included in generated links.

### Advanced

| Setting | Storage | Control | Default |
|---------|---------|---------|---------|
| Event History | localStorage `markdown-ticket-event-history-force-hidden` | Switch toggle (on = show) | shown |
| Clear Cache | action only | Button "Clear Cache" | n/a |

## States

| State | Trigger | Visual Change |
|-------|---------|---------------|
| default | modal opens | first tab (Appearance) active |
| theme active | current theme mode | matching button highlighted `bg-primary` |
| toggle on | switch enabled | switch primary color, knob right |
| toggle off | switch disabled | switch muted color, knob left |
| badge selected | visible card badge enabled | checkbox checked; label stays normal foreground |
| badge unselected | visible card badge hidden | checkbox unchecked; label remains readable, no disabled styling |
| invalid badge storage | stored list is empty, malformed, or unsupported | UI falls back to default checked badges |
| clearing cache | Clear Cache clicked | toast confirmation |
| readonly visitor | current access mode lacks owner/admin | Settings entry is hidden; modal is not reachable |
| sharing loading | sharing config loads or saves | affected controls disabled with inline spinner |
| sharing error | sharing read/write fails | destructive inline message with retry |
| unlisted shared | Sharing mode = Unlisted read-only | share link input visible; Rotate and Save actions available; project not listed anonymously |
| public shared | Sharing mode = Public read-only | share link input visible; Rotate and Save actions available; project appears in anonymous listing |
| unlisted/public unsaved | mode selected but no share ID yet | helper text: "Save to generate a share link." |
| share link rotated | Rotate selected | previous URL no longer grants access; new read-only URL appears after save response |

## Visible Card Badges

The Board tab includes a checkbox list for board ticket card badges. The list controls visibility only; it does not change badge order, labels, semantic color, or ticket viewer badges.

### Badge Options

| Option | Card badge | Default | Notes |
|--------|------------|---------|-------|
| Status | `StatusBadge` | checked | Always available when defaulted. |
| Priority | `PriorityBadge` | checked | Uses existing badge color mapping. |
| Type | `TypeBadge` | checked | Uses existing badge color mapping. |
| Phase | `ContextBadge[phase]` | checked | Hidden automatically when ticket has no phase. |
| Related | `RelationshipBadge[related]` | checked | Hidden automatically when empty. |
| Depends | `RelationshipBadge[depends]` | checked | Hidden automatically when empty. |
| Blocks | `RelationshipBadge[blocks]` | checked | Hidden automatically when empty. |
| Worktree | `ContextBadge[worktree]` | checked | Hidden automatically when ticket is not in a worktree. |

### Interaction Rules

- Each checkbox writes immediately to `markdown-ticket:board:ticket-card-badges`.
- At least one valid badge must remain visible. If the user attempts to clear the final selected badge, keep that checkbox selected.
- Stored unsupported badge IDs are ignored.
- Empty or invalid stored lists fall back to the default full set.
- Ticket cards render selected badge types in the existing `TicketAttributeTags.tsx` order.

## Entry Point

Settings opens from the **hamburger menu** via ⚙ Settings item for owner/admin users. Theme quick-access buttons **remain** in hamburger menu for fast switching, including read-only mode.

## Tokens used

| Element | Token | Usage |
|---------|-------|-------|
| background | `--background` | modal bg, tab content |
| foreground | `--foreground` | labels, active tab |
| muted-foreground | `--muted-foreground` | descriptions, inactive tab |
| primary | `--primary` | active theme button, switch on, active tab |
| border | `--border` | tab list border, select border |
| muted | `--muted` | inactive switch, inactive theme button |
| readonly input | `--muted` | generated share URL background |

## Extension notes

- New preference: add a setting group to the appropriate tab. If a tab exceeds 5 settings, consider splitting.
- New tab: add `Tabs.Trigger` + `Tabs.Content`. Keep names to 1 word.
- The `_setLinkConfig` function in `linkConfig.ts` is currently unused (prefixed `_`). Settings should use it or write directly.
- Card density: consumers should read from `mdt-settings-card-density` and apply CSS class changes to TicketCard and column spacing.
- Default view: consumers should read from `mdt-settings-default-view` on initial load when URL has no view suffix.
- Visible card badges: consumers should read from `markdown-ticket:board:ticket-card-badges`, validate badge IDs against the supported board-card badge set, preserve the standard display order, and fall back to default badges when storage is invalid or empty.
- Sharing controls are not client-only preferences. They require owner/admin access and must use backend authorization as the source of truth.
