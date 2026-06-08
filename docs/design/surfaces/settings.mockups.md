# Settings — Wireframe Schema

Related spec: `settings.spec.md`

## Appearance Tab — Project Accent collapsed

```wireloom
window "Settings":
  tabs:
    tab "Appearance" active
    tab "Board"
    tab "Sharing"
    tab "Advanced"
  panel:
    section "Theme":
      text "Choose light, dark, or system theme" muted
      segmented:
        segment "☀ Light"
        segment "🌙 Dark"
        segment "💻 System" selected
    divider
    section "Default View":
      text "Open this view when navigating to a project" muted
      combo value="Board" options="Board,List"
    divider
    section "Markdown Density":
      text "Adjust rendered ticket and document text size" muted
      combo value="Default" options="Compact,Default,Comfortable"
    divider
    section "Project Accents" id="project-accents":
      row:
        text "Project Accents" bold
        button "i" id="accents-info"
      row:
        text "Accent Colors" id="accent-colors-label"
        toggle "on" id="accent-enabled"
      row:
        text "Style" id="style-label"
        combo value="Gradient" options="Gradient,Flat,Plate" id="accent-style"
      combo value="MDT" options="MDT,API,OPS" id="project-select"
      row:
        input placeholder="#00bbcc" id="hex-input"
        button "🎨" id="color-slider"
        button "↺" id="reset-btn"
        button "✓" id="save-btn"
        text "choose ↗" muted id="choose-link"
        button "▼" id="palette-toggle"
    divider
    row justify=end:
      button "Cancel"
      button "Save" primary id="save-accents"

annotation "Personal preference, not shared with other users." target="accents-info" position=right
annotation "Master toggle: off hides all accent marks on chips and cards." target="accent-enabled" position=right
annotation "On = deterministic fallback color per project. Off = only manual accents shown. Reset fills auto hex into empty input when off." target="autocolor-toggle" position=right
annotation "Three accent rendering styles: Gradient (fade), Flat (thin stripe), Plate (colored code badge with auto-contrast text)." target="accent-style" position=right
annotation "Dropdown lists all registered projects." target="project-select" position=right
annotation "Max 7 chars. Shorthand like 0bc auto-expands to #00bbcc on blur." target="hex-input" position=right
annotation "Reset: on = clear accent and revert to fallback. Autocolor off + empty input = fill auto hex. Autocolor off + accent set = clear accent." target="reset-btn" position=right
```

## Appearance Tab — Project Accent palette open

```wireloom
window "Settings — Accent Palette":
  tabs:
    tab "Appearance" active
    tab "Board"
    tab "Sharing"
    tab "Advanced"
  panel:
    section "Project Accents" id="palette-section":
      row:
        text "Project Accents" bold
        button "i" id="accents-info-expanded"
      combo value="MDT" options="MDT,API,OPS" id="project-select-expanded"
      row:
        text "#2563eb" muted id="current-hex"
        spacer
        button "↺" id="reset-btn"
      row:
        button "red"
        button "orange"
        button "amber"
        button "yellow"
        button "lime"
        button "green"
        button "emerald"
        button "teal"
      row:
        button "cyan"
        button "blue" id="preset-blue"
        button "indigo"
        button "violet"
        button "purple"
        button "fuchsia"
        button "pink"
        button "rose"
      text "Custom hex"
      row:
        input placeholder="#2563eb" id="custom-hex"
        text "Choose color ↗" muted id="choose-color"
    divider
    row justify=end:
      button "Cancel"
      button "Save" primary id="save-expanded"

annotation "Changing the dropdown loads the new project's current accent into the palette." target="project-select-expanded" position=right
annotation "Presets are 16 colors; clicking one selects it immediately in the staged form." target="preset-blue" position=right
annotation "Custom hex validated on blur. Invalid values show inline error and preserve previous accent." target="custom-hex" position=right
annotation "Opens https://www.figma.com/colors/ in a new tab." target="choose-color" position=right
annotation "↺ clears stored accent (reverts to fallback or no accent). Autocolor off + empty input fills auto hex instead." target="reset-btn" position=right
```

## Board Tab

```wireloom
window "Settings":
  tabs:
    tab "Appearance"
    tab "Board" active
    tab "Sharing"
    tab "Advanced"
  panel:
    section "Card Density":
      text "Compact shows more tickets per column" muted
      combo value="Comfortable" options="Comfortable,Compact"
    divider
    section "Smart Links":
      text "Auto-detect ticket keys and doc paths" muted
      toggle "Smart Links" on
    divider
    section "Visible Card Badges":
      text "Choose which badges appear on board ticket cards" muted
      checkbox "Status" id="badge-status" checked label-right
      checkbox "Priority" checked label-right
      checkbox "Type" checked label-right
      checkbox "Phase" checked label-right
      checkbox "Related" checked label-right
      checkbox "Depends" checked label-right
      checkbox "Blocks" checked label-right
      checkbox "Worktree" checked label-right

annotation "Writes immediately to markdown-ticket:board:ticket-card-badges" target="badge-status" position=right
```

## Board Tab (customized badges)

```wireloom
window "Settings":
  tabs:
    tab "Appearance"
    tab "Board" active
    tab "Sharing"
    tab "Advanced"
  panel:
    section "Visible Card Badges":
      text "Choose which badges appear on board ticket cards" muted
      checkbox "Status" checked label-right
      checkbox "Priority" id="badge-priority-off" label-right
      checkbox "Type" checked label-right
      checkbox "Phase" label-right
      checkbox "Related" label-right
      checkbox "Depends" label-right
      checkbox "Blocks" label-right
      checkbox "Worktree" checked label-right

annotation "Unchecked badges are hidden from board cards only" target="badge-priority-off" position=right
```

## Sharing Tab (owner/admin)

```wireloom
window "Settings — Sharing":
  tabs:
    tab "Appearance"
    tab "Board"
    tab "Sharing" active
    tab "Advanced"
  panel:
    section "Project Access":
      row:
        text "Project Access" bold
        button "i" id="sharing-mode-info"
      combo value="Private" options="Private,Unlisted read-only,Public read-only" id="sharing-mode"
    divider
    section "Read access tokens":
      text "Create named read-only access for one person across multiple projects." muted
      button "Create read token" id="create-read-token"
    divider
    section "Save Sharing":
      row justify=end:
        button "Save" id="save-sharing"

annotation "Writes through authenticated API; default is Private" target="sharing-mode" position=right
annotation "Info explains Private, Unlisted, and Public before the owner saves." target="sharing-mode-info" position=right
annotation "Read tokens are named, multi-project, and managed by owner/admin users here." target="create-read-token" position=right
```

## Sharing Tab (unlisted read-only enabled)

```wireloom
window "Settings — Unlisted Sharing Enabled":
  tabs:
    tab "Appearance"
    tab "Board"
    tab "Sharing" active
    tab "Advanced"
  panel:
    section "Project Access":
      combo value="Unlisted read-only" options="Private,Unlisted read-only,Public read-only"
    divider
    section "Share link":
      text "Using https://tickets.example.com" muted id="share-origin"
      input placeholder="https://app.example/share/7YpQ9zM2" disabled id="public-share-url"
    divider
    section "Save Sharing":
      row justify=end:
        button "Rotate" id="rotate-public-link"
        button "Save" primary id="save-public-link"

annotation "Share ID is bookmarkable, not listed in anonymous project browser, and never grants writes" target="public-share-url" position=right
annotation "Rotate asks the backend for a new server-generated share ID" target="rotate-public-link" position=right
annotation "Origin is server-selected from PUBLIC_ORIGIN or an allowed current-origin fallback; no owner domain picker is shown." target="share-origin" position=right
```

## Sharing Tab (read tokens managed)

```wireloom
window "Settings — Read Access Tokens":
  tabs:
    tab "Appearance"
    tab "Board"
    tab "Sharing" active
    tab "Advanced"
  panel:
    section "Read access tokens":
      row justify=between:
        text "Named access" bold
        button "Create read token" primary id="token-create"
      list:
        slot "Bob":
          row:
            chip "2 projects"
            chip "Active"
          text "PRI, DOCS" muted
          row:
            button "Generate invite" id="token-invite"
            button "Revoke"
        slot "Contractor":
          row:
            chip "Expired"
          text "OPS" muted
          button "Generate invite" disabled

annotation "Rows show name, project scope, and status; never show the raw token after creation." target="token-invite" position=right
```

## Create Read Token

```wireloom
window "Settings — Create Read Token":
  sheet position=center title="Create read token":
    input placeholder="Name, e.g. Bob" id="token-name"
    section "Allowed projects":
      checkbox "PRI — Private roadmap" checked label-right id="token-project-pri"
      checkbox "DOCS — Documentation" checked label-right
      checkbox "OPS — Operations" label-right
    section "Expiry":
      combo value="30 days" options="7 days,30 days,90 days,No expiry" id="token-expiry"
    row justify=end:
      button "Cancel"
      button "Create token" primary id="token-save"

annotation "At least one project must be selected before Create token is enabled." target="token-project-pri" position=right
annotation "Raw token is displayed once after creation, then replaced by named metadata." target="token-save" position=right
```

## Invite Link Generated

```wireloom
window "Settings — Invite Link Generated":
  tabs:
    tab "Appearance"
    tab "Board"
    tab "Sharing" active
    tab "Advanced"
  panel:
    section "Invite link for Bob":
      text "Using https://tickets.example.com" muted id="invite-origin"
      input placeholder="https://tickets.example.com/invite/r4nd0m-code" disabled id="invite-link"
      text "This one-time link expires soon and does not expose the persistent token." muted
      row justify=end:
        button "Copy link" primary
        button "Done"

annotation "Domain is selected by the server from PUBLIC_ORIGIN, or current origin only when allowed and no PUBLIC_ORIGIN exists." target="invite-origin" position=right
annotation "Opening this link exchanges the code into an HttpOnly read cookie and cleans the URL." target="invite-link" position=right
```

## Sharing Tab (share link pending)

```wireloom
window "Settings — Sharing Pending":
  tabs:
    tab "Appearance"
    tab "Board"
    tab "Sharing" active
    tab "Advanced"
  panel:
    section "Project Access":
      combo value="Public read-only" options="Private,Unlisted read-only,Public read-only" id="pending-sharing-mode"
    divider
    section "Share Link":
      text "Save to generate a share link." muted id="pending-share-copy"
    divider
    section "Save Sharing":
      row justify=end:
        button "Save" primary id="pending-save"

annotation "Clients choose mode only; share IDs are generated by the server" target="pending-sharing-mode" position=right
```

## Advanced Tab

```wireloom
window "Settings":
  tabs:
    tab "Appearance"
    tab "Board"
    tab "Sharing"
    tab "Advanced" active
  panel:
    toggle "Event History" on
    text "Show SSE event history panel" muted
    divider
    section "Cache":
      text "Clear all cached data and reload" muted
      row justify=end:
        button "Clear Cache"
```

## Mobile

```wireloom
window "Settings — Mobile Sharing":
  tabs:
    tab "App"
    tab "Board"
    tab "Share"
    tab "Adv"
  panel:
    section "Project Access":
      row:
        text "Project Access" bold
        button "i"
      combo value="Unlisted read-only" options="Private,Unlisted read-only,Public read-only"
    divider
    section "Read access tokens":
      list:
        slot "Bob":
          text "PRI, DOCS" muted
          button "Invite"
      button "Create read token"
```

## Annotations

| Element | Token | Class | Notes |
|---------|-------|-------|-------|
| Modal | `--background` | `bg-white dark:bg-slate-900` | size="md" |
| Tab trigger active | `--primary` | `border-b-2 border-primary` | `text-sm font-medium` |
| Tab trigger inactive | `--muted-foreground` | `hover:text-foreground` | |
| Tab content | n/a | `p-6` | |
| Setting label | `--foreground` | `text-sm font-medium` | |
| Setting desc | `--muted-foreground` | `text-sm mt-0.5` | |
| Theme button active | `--primary` | `bg-primary text-primary-foreground` | rounded-md |
| Theme button inactive | `--muted` | `bg-muted text-foreground` | |
| Select | `--background` | `border rounded-md px-3 py-2` | |
| Share link input | `--muted` | `font-mono text-xs` | read-only, generated by backend |
| Link origin text | `--muted-foreground` | `settings-desc` | server-selected link origin or no-origin notice |
| Rotate share ID | `--border` | `settings-action-btn` | visible only when a non-private share ID exists |
| Save sharing | `--primary` / `--border` | `settings-action-btn` | disabled while saving |
| Token row | `--border` / `--background` | proposed `settings-token-row` | compact list row with actions |
| Invite link input | `--muted` | `font-mono text-xs` | one-time invite URL, copyable |
| Read-only tabs | `--muted-foreground` | hidden Sharing tab | Sharing tab absent without owner/admin |
| Project accent row | `--border` | proposed `settings-accent-row` | per-project code + swatch + picker |
| Reset to default | `--border` / `--destructive` on hover | `accent-color-picker__reset` | visible only when accent stored |
| Accent preset swatch | per-user accent token | `accent-color-picker__preset-swatch` | 16-color palette swatch |
| Accent preset selected | `--primary` | `accent-color-picker__preset[data-selected="true"]` | ring highlight on active |
| Custom hex input | `--background` / `--border` | `accent-color-picker__custom-input` | `#RRGGBB` validation on blur |
| Validation error | `--destructive` | `accent-color-picker__error` | inline, replaces previous accent |
| Choose color link | `--primary` | `accent-color-picker__link` | `target="_blank" rel="noopener noreferrer" |
| Switch on | `--primary` | bg-primary, knob right | |
| Switch off | `--muted` | bg-muted, knob left | |
| Checkbox checked | `--primary` | native checkbox or app checkbox checked state | Immediate persistence |
| Checkbox label | `--foreground` | `text-sm` | Never disabled when unchecked |
| Clear cache button | `--border` | `variant="outline"` | |
| Setting divider | `--border` | dashed or `space-y-6` gap | Between groups |
