# Settings

Modal with tabbed sections for user preferences. All settings are client-side — stored in localStorage or cookies. No API calls needed. Each control writes immediately on change (no Save button).

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
        │   └── Tabs.Trigger[Advanced]
        └── Tabs.Content × 3
            ├── Appearance panel
            │   ├── div.setting-group["Theme"]
            │   │   ├── label + description
            │   │   └── ButtonGroup[Light / Dark / System]
            │   └── div.setting-group["Default View"]
            │       ├── label + description
            │       └── Select[Board / List]
            ├── Board panel
            │   ├── div.setting-group["Card Density"]
            │   │   ├── label + description
            │   │   └── Select[Comfortable / Compact]
            │   └── div.setting-group["Smart Links"]
            │       ├── label + description
            │       └── Switch[toggle]
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

## Source files

| Type | Path |
|------|------|
| Component | `src/components/SettingsModal.tsx` |
| Modal primitive | `src/components/ui/Modal.tsx` |
| Theme hook | `src/hooks/useTheme.ts` |
| Link config | `src/config/linkConfig.ts` |
| Event history | `src/components/DevTools/useEventHistoryState.ts` |
| Cache utils | `src/utils/cache.ts` |

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

## Tabs

### Appearance

| Setting | Storage | Control | Default |
|---------|---------|---------|---------|
| Theme | cookie `theme` | ButtonGroup (Light / Dark / System) | `system` |
| Default View | localStorage `mdt-settings-default-view` | Select (Board / List) | `board` |

### Board

| Setting | Storage | Control | Default |
|---------|---------|---------|---------|
| Card Density | localStorage `mdt-settings-card-density` | Select (Comfortable / Compact) | `comfortable` |
| Smart Links | localStorage `markdown-ticket-link-config.enableAutoLinking` | Switch toggle | `true` |

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
| clearing cache | Clear Cache clicked | toast confirmation |

## Entry Point

Settings opens from the **hamburger menu** via ⚙ Settings item. Theme quick-access buttons **remain** in hamburger menu for fast switching.

## Tokens used

| Element | Token | Usage |
|---------|-------|-------|
| background | `--background` | modal bg, tab content |
| foreground | `--foreground` | labels, active tab |
| muted-foreground | `--muted-foreground` | descriptions, inactive tab |
| primary | `--primary` | active theme button, switch on, active tab |
| border | `--border` | tab list border, select border |
| muted | `--muted` | inactive switch, inactive theme button |

## Extension notes

- New preference: add a setting group to the appropriate tab. If a tab exceeds 5 settings, consider splitting.
- New tab: add `Tabs.Trigger` + `Tabs.Content`. Keep names to 1 word.
- The `_setLinkConfig` function in `linkConfig.ts` is currently unused (prefixed `_`). Settings should use it or write directly.
- Card density: consumers should read from `mdt-settings-card-density` and apply CSS class changes to TicketCard and column spacing.
- Default view: consumers should read from `mdt-settings-default-view` on initial load when URL has no view suffix.
