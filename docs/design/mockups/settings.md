# Settings — Wireframe Schema

Related spec: `specs/settings.md`

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
    toggle "Smart Links" on
    text "Auto-detect ticket keys and doc paths" muted
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
window "Settings":
  tabs:
    tab "App" active
    tab "Board"
    tab "Adv"
  panel:
    section "Theme":
      text "Choose your theme" muted
      segmented:
        segment "☀ Light"
        segment "🌙 Dark"
        segment "💻 System" selected
    divider
    section "Default View":
      text "Open this view first" muted
      combo value="Board" options="Board,List"
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
| Clear cache button | `--border` | `variant="outline"` | |
| Setting divider | `--border` | dashed or `space-y-6` gap | Between groups |
