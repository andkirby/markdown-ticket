# Settings — Wireframe Schema

Related spec: `settings.spec.md`

## Appearance Tab (default)

```wireloom
window "Settings":
  tabs:
    tab "Appearance" active
    tab "Board"
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
```

## Board Tab

```wireloom
window "Settings":
  tabs:
    tab "Appearance"
    tab "Board" active
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

## Advanced Tab

```wireloom
window "Settings":
  tabs:
    tab "Appearance"
    tab "Board"
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
window "Settings — Mobile Board":
  tabs:
    tab "App"
    tab "Board" active
    tab "Adv"
  panel:
    section "Card Density":
      text "Compact shows more tickets per column" muted
      combo value="Comfortable" options="Comfortable,Compact"
    divider
    section "Visible Card Badges":
      text "Board cards only" muted
      checkbox "Status" checked label-right
      checkbox "Priority" checked label-right
      checkbox "Type" checked label-right
      checkbox "Phase" checked label-right
      checkbox "More relationship badges" checked label-right
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
| Switch on | `--primary` | bg-primary, knob right | |
| Switch off | `--muted` | bg-muted, knob left | |
| Checkbox checked | `--primary` | native checkbox or app checkbox checked state | Immediate persistence |
| Checkbox label | `--foreground` | `text-sm` | Never disabled when unchecked |
| Clear cache button | `--border` | `variant="outline"` | |
| Setting divider | `--border` | dashed or `space-y-6` gap | Between groups |
