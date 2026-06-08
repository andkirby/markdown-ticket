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
            │   └── div.setting-group["Project Accents"]
            │       ├── label + description
            │       └── ProjectAccents component
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
            │   │   ├── LabelRow[label + Info tooltip]
            │   │   └── Select[Private / Unlisted read-only / Public read-only]
            │   ├── div.setting-group["Share link"]
            │   │   ├── LinkOrigin[server-selected PUBLIC_ORIGIN or allowed current origin]
            │   │   ├── ReadonlyInput[share URL] or helper text
            │   │   └── ActionRow[Rotate, Save]
            │   └── div.setting-group["Read access tokens"]
            │       ├── TokenList[named token rows]
            │       ├── CreateTokenForm[name, project multiselect, expiry]
            │       └── InviteLinkResult[shown once after generation]
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
| Readonly input | native input with `readOnly` | — | Sharing tab with generated share URL or invite link |
| Link origin notice | text | — | visible only when no server-approved link origin is available |
| Project multiselect | checkbox list or compact multiselect | `project-browser.spec.md` visibility rules | read-token creation |
| AccentColorPicker | `src/components/AddProjectModal/components/AccentColorPicker.tsx` | this spec | reused in Project Accents section |
| ProjectAccents | `src/components/SettingsModal/ProjectAccents.tsx` | this spec | accent editor in Appearance tab |

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
| Accent picker | `src/components/AddProjectModal/components/AccentColorPicker.tsx` |
| Accent utilities | `src/utils/accentColors.ts` |
| Selector state hook | `src/components/ProjectSelector/useSelectorData.ts` |

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
| Share link | label above, optional domain selector, readonly generated URL below, save/rotate actions in trailing row |
| Token list | heading and description above, rows with name/scope/expiry/actions below |
| Token create form | name input, project scope checklist, expiry select, create action |

## Tabs

### Appearance

| Setting | Storage | Control | Default |
|---------|---------|---------|---------|
| Theme | cookie `theme` | ButtonGroup (Light / Dark / System) | `system` |
| Default View | localStorage `mdt-settings-default-view` | Select (Board / List) | `board` |
| Markdown Density | localStorage `mdt-settings-markdown-density` | Select (Compact / Default / Comfortable) | `default` |
| Project Accents | `project-selector.json` via `/api/config/selector` | Per-project picker rows | deterministic fallback |
| Accent Colors | localStorage `mdt-selector-preferences` | Switch toggle | `true` (on) |
| Autocolor | localStorage `mdt-selector-preferences` | Switch toggle | `true` (on) |
| Style | localStorage `mdt-selector-preferences` | Select dropdown (Gradient / Flat / Plate) | `gradient` |

### Project Accents (Appearance tab)

A section below Markdown Density with rendering controls (Accent Colors toggle, Autocolor toggle, Style dropdown), a project dropdown, and a compact inline accent editor.

**Toggles**:
- **Accent Colors** (Switch, default on): master toggle. Off disables all accent marks on chips and cards.
- **Autocolor** (Switch, default on): only visible when Accent Colors is on. On = projects without a user-set accent receive a deterministic fallback color. Off = projects without a user accent show no accent color at all.
- **Style** (Select dropdown, default `gradient`): only visible when Accent Colors is on. Three named rendering styles:
  - **Gradient** — 25px gradient fade stripe on chips, 250° diagonal identity bar on cards, accent-tinted card background on active cards.
  - **Flat** — thin 4px solid stripe on chips, 6px solid bar on cards, no background tint. All at 0.3 opacity.
  - **Plate** — the project code renders as a colored badge flush to the left edge of the card/chip, with accent-filled background and auto-computed foreground (perceptual brightness formula). On chips, the code badge is right-rounded. On cards, the badge replaces the identity area. When autocolor is off and no user accent is stored, plate badges revert to plain text.

**Header row**: "Project Accents" label + (i) info button.

**(i) tooltip**: shows contextual help:
- "Personal preference, not shared with other users."
- "Autocolor: on = each project gets a deterministic fallback color. Off = only projects with a manually set accent show color."
- "Style controls how accents look: gradient fade, flat stripe, or plate (colored code badge flush to left edge, perceptual brightness text)."
- "Delete the hex input value and save to revert to autocolor (or no accent if autocolor is off)."

**Project dropdown**: a select listing all registered projects. On change, the editor loads that project's current accent. Defaults to the current project.

**Inline editor row**: hex input (max 7 chars, placeholder = fallback hex) + native color picker slider + ↺ Reset + ✓ Save + "choose ↗" link + ▼ expand palette.

**Collapsible palette**: when expanded, shows the 4×4 preset grid below the row.

**Auto-expansion**: shorthand hex like `0bc` expands to `#00bbcc` on blur. Missing `#` auto-prepended.

**Reset button**: ↺ (rotate-left icon). Behavior depends on Autocolor state:
- **Autocolor on** (default): clears the stored user accent → project reverts to deterministic fallback.
- **Autocolor off**: if the hex input is empty, fills the computed fallback hex into the input. If a user accent is stored, clears it. This lets users undo a custom color choice (reset fills the auto value) or drop to no accent (clear hex input manually).

**"choose ↗" link**: opens `https://www.figma.com/colors/` in a new tab for browsing the full color spectrum.

**Fallback algorithm**: when Autocolor is on and no user accent is stored, each project gets a deterministic fallback via FNV-1a hash → 360° hue mapping with fixed saturation 65%, lightness 45%. This produces a unique vivid color per project code; at 0.3 opacity the accent renders as a soft pastel. Results are cached in a `Map<string, string>`. When Autocolor is off, projects without a user accent show no accent color.

**Persistence semantics**: accent changes are **staged locally** and persisted only on explicit Save. Cancel discards. Rendering preferences (Accent Colors, Autocolor, Style) persist immediately to localStorage.

**Storage**: accent values in `project-selector.json` via `/api/config/selector`. Rendering preferences (`accentEnabled`, `autocolor`, `accentStyle`) in localStorage `mdt-selector-preferences`.

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
| Share link | derived from server-generated share ID and server-selected public origin | read-only input | hidden until read-only sharing is enabled |
| Rotate link | server project sharing config | Button "Rotate" | visible only when a non-private share link exists |
| Save sharing | server project sharing config | Button "Save" | always visible on Sharing tab |
| Public origin | server-selected `PUBLIC_ORIGIN` or allowed current origin fallback | read-only API state | `PUBLIC_ORIGIN` when configured |
| Read access tokens | server token store | Token list + create/revoke/generate invite | empty list |

Interaction rules:
- Changing Sharing mode is local until Save is selected. Save writes through an authenticated API and shows loading/error state inline.
- Unlisted read-only is the default sharing choice for link sharing: accessible through share URL, absent from anonymous project listing.
- Public read-only appears in anonymous project listing and should be selected only when the owner wants directory-style discovery.
- Read-only modes never grant mutation rights.
- Read access tokens are managed from Settings by owner/admin users. Each token has a human-readable name, one or more assigned projects, optional expiry, and revoke action.
- Raw read tokens are shown once only when created. After creation, rows show name, project scope, expiry, and status; they never show the raw token again.
- Invite links use short-lived one-time codes derived from a named token. The persistent read token must not appear in the generated URL.
- Invite link generation requires a valid named token and at least one assigned project.
- Project assignment uses visible owner/admin projects only and supports selecting multiple projects for the same person.
- Opening an invite link exchanges the code into the `mdt_read_session` HttpOnly cookie and removes the code from the browser URL.
- Opening a one-project `/share/{shareId}` link must not erase existing projects granted by a named read token.
- Share links use a server-generated, non-enumerable public share ID. Clients must never submit a custom share ID.
- Rotate invalidates the previous share URL by asking the backend to generate a new share ID.
- Write/admin tokens must never be included in generated links.
- Link generation uses `PUBLIC_ORIGIN` when configured. When `PUBLIC_ORIGIN` is absent, the current browser origin is used only if accepted by server policy. When no safe origin exists, link generation is disabled with concise helper text. The owner UI does not show a domain selector.

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
| configured public origin | server returns `PUBLIC_ORIGIN` | generated links use that origin |
| no public origin | server accepts the current browser origin | generated links use current origin |
| no safe origin | server returns no selected origin | invite/share link actions disabled with helper text |
| token list empty | no named read tokens | compact empty state with "Create read token" action |
| token created | owner creates named token | show raw token/invite result once with copy action; row appears in token list |
| token active | token has project scope and is not expired/revoked | row shows name, project count/list, expiry, Generate invite, Revoke |
| token expired | expiry passed | row remains visible with Expired status; invite action disabled |
| token revoked | owner revokes token | row shows Revoked status; invite action disabled |
| invite generated | owner selects Generate invite | readonly invite URL visible with copy action and one-time/expiry helper |
| token create error | create/generate/revoke fails | destructive inline message inside token section |

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

## E2E Journey Contract

| Journey | Given | When | Expected |
|---------|-------|------|----------|
| owner creates multi-project token | owner session, at least two projects | create token named "Bob" with two projects | token row shows Bob, two-project scope, active status |
| invite exchange | clean browser opens generated invite link | backend accepts one-time code | URL is cleaned, read-only cookie is set, assigned projects are visible |
| token-scoped switching | read-only visitor has token for two private projects | open project browser and select either project | selected project loads read-only without asking for another token |
| share-link merge | token-scoped visitor opens an unlisted project link | share route grants one additional project | existing token-scoped projects remain visible |
| revoke | owner revokes token | visitor refreshes after session expiry or exchange retry | token no longer grants private projects |
| public origin | `PUBLIC_ORIGIN` exists | owner generates share/invite link | server-selected origin is used in the URL |
| read-only boundary | token-scoped visitor tries write affordance | UI renders read-only state | mutation controls are hidden or disabled and backend still denies writes |

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
