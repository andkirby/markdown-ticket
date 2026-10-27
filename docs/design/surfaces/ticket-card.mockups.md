# Ticket Card — Mockups

Related spec: [Ticket Card](ticket-card.spec.md). External behavior: [External Reference Badges](external-reference-badge.spec.md).

## Default: selected badge flow

```wireloom
window "Ticket card — external badges":
  panel:
    row justify=between:
      text "MDT-252" bold
      text "2h ago" muted
    text "External issue tracker links" bold
    row:
      chip "In Progress"
      chip "Feature"
      chip "◈ 123 ↗"
      button "⋯"
```

The tracker icon identifies Jira here. Prefix PRJ is omitted because it is the sole configured project key. All metadata, including external refs, shares one wrapping flow; renderer rows do not reserve an external-ref line.

## Reference details open

```wireloom
window "Ticket card — reference details":
  panel:
    row justify=between:
      text "MDT-252" bold
      text "2h ago" muted
    text "External issue tracker links" bold
    row:
      chip "In Progress"
      chip "Feature"
      chip "◈ work:123 ↗"
      chip "◈ client:PRJ-123 ↗"
      button "+2"
    section "External references":
      text "Jira (work) · PRJ-123 ↗"
      text "Jira (client) · PRJ-123 ↗"
      text "GitLab · acme/platform/customer-authentication#18 ↗"
      text "legacy:OPS-7 — unavailable: tracker not configured" muted
```

This complete-list popover is viewport bounded and scrolls internally. Full namespace paths wrap; all refs appear, not just overflow. Actual product glyphs come from the vendor icon component, not the Wireloom diamond.

## Narrow card: busy metadata and unavailable ref

```wireloom
window "Ticket card — narrow":
  panel:
    row justify=between:
      text "MDT-252" bold
      text "2h ago" muted
    text "External issue tracker links" bold
    row:
      chip "In Progress"
      chip "Feature"
      chip "Related: 030, 035"
    row:
      chip "◈ widgets#123 ↗"
      chip "⚠ legacy:OPS-7"
      button "⋯"
      chip "Worktree"
```

Natural wrapping depends on available width; the fixed order keeps external refs after internal relationships and before worktree. Missing refs render no placeholder. Read-only cards preserve external navigation/details while removing mutation/drag capability. Hidden board badges do not hide search-result or viewer refs.
