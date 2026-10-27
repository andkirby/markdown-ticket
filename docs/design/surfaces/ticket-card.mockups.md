# Ticket Card — Mockups

Related specs: [Ticket Card](ticket-card.spec.md), [External Reference Badges](external-reference-badge.spec.md).

## Default grouped Jira references

```wireloom
window "Ticket card":
  panel:
    col 520:
      row:
        text "ABC-004" bold
        text "3m ago" muted
      text "Make sample data reproducible for frontend integration" bold
      row:
        chip "↔ 003"
        chip "◈ 95 68 ↗"
```

One Jira icon and two independent short links share a badge. No dropdown when all resolved refs fit. The existing wrapping region also holds internal relationships and worktree metadata.

## Instance disambiguation and overflow

```wireloom
window "Grouped reference overflow":
  panel:
    col 520:
      row:
        text "MDT-252" bold
        text "2h ago" muted
      text "External issue tracker links" bold
      row:
        chip "In Progress"
        chip "◈ work: 123 124 125 ↗ +2"
        chip "◈ client: 123 ↗"
      divider
      text "External references" bold
      button "126 ↗"
      button "127 ↗"
```

The illustrated panel belongs to work:+2. It contains only the two hidden keys, not 123/124/125. The client group remains separate even with an identical issue key. Native titles and accessible names retain full identities and destinations.

## Narrow cards and unavailable references

```wireloom
window "Narrow ticket card":
  panel:
    col 300:
      row:
        text "MDT-252" bold
        text "2h ago" muted
      text "External issue tracker links" bold
      row:
        chip "Git repository-name…#42 ↗"
        chip "⚠ legacy:OPS-7 ⋯"
      text "Tracker instance is not configured" muted
```

Labels constrain or wrap within the available width. Unavailable refs keep an alert and non-navigating explanation control even without overflow. The production Radix popover bounds both dimensions, scrolls internally, wraps long keys, and restores focus to its invoking control.
