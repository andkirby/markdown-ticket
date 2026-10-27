# External Reference Badges — Mockups

Related spec: [External Reference Badges](external-reference-badge.spec.md).

Review states are embedded in [Ticket Card Mockups](ticket-card.mockups.md) to keep the shared card shell in one place: default configured Jira shortening, instance grouping, same-kind disambiguation and hidden-only overflow, narrow wrapping/long repository paths and unavailable refs. Search and viewer use the same grouped badges independently of board preferences. Full identities remain in native link titles and accessible names; unavailable refs keep an explanation control.

## Shared visual contract

- Match the general badge font, padding, column gap, radius and visible height on cards and in the ticket viewer; preserve 24px interactive hit areas through vertical expansion rather than a taller pill. Wrapped rows use sufficient vertical spacing to keep neighboring link targets independent.
- The Jira tile has equal leading/top/bottom insets. Issue numbers have no separate hover fill or underline; keyboard focus stays visible.
- One badge per exact tracker instance, one icon, up to three independently clickable short keys, one shared new-tab arrow, then +N only for additional references.
- Overflow shows only hidden resolved refs with the same short labels; no repeated resolved inline refs. Unavailable refs retain their explanation control.
- Jira uses [jira.svg](../../../frontend/public/icons/trackers/jira.svg) in the 16px `--sz-icon` slot so its inset mark remains legible beside other badge glyphs. `icon="jira"` in Wireloom denotes that asset; exact brand artwork is shown in the [HTML styleguide](../../../frontend/src/styleguide.html#external-reference-badges).
- Search and viewer reuse these groups independently of board preferences. Their existing shells are illustrated in [Quick Search](quick-search.mockups.md) and [Ticket Viewer](ticket-viewer.mockups.md), rather than duplicated here.
