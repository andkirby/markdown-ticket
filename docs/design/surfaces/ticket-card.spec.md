# Ticket Card

Board card representing one local ticket. Local identity remains primary; external refs are compact metadata links.

## Ownership

Owns card composition and local-viewer entry. The Column drag wrapper owns drag-and-drop; TicketCode owns stable priority/type/epic/worktree identity glyphs. External reference behavior belongs to [External Reference Badges](external-reference-badge.spec.md).

## Composition

```text
DraggableTicketCard
└── TicketCard
    ├── key/timestamp row
    │   ├── TicketCode (priority glyph, local key, optional type/epic/worktree)
    │   └── RelativeTimestamp
    ├── title (two-line clamp)
    └── attributes region when Show badges is enabled
        └── TicketAttributeTags (one wrapping flow)
            ├── status / optional priority / type / phase
            ├── related / depends / blocks
            ├── external references
            └── worktree
```

## Layout and states

- Reuse the live flat raised surface, density padding, radius and high/critical priority stripe from `TicketCard/ticket.css`; no parallel gradient card design.
- Key and relative timestamp share the top row. Title occupies its own row and clamps to two lines. External refs join the existing wrapping badge flow after internal relationships and before worktree (user-selected option A); no reserved reference row.
- Card-background activation opens the local ticket viewer. Nested external links/details isolate activation and drag initiation.
- Hover reveals the existing border treatment. Invalid status uses the existing invalid marker. Dragging treatment belongs to the wrapper.
- Read-only cards remain viewable, with valid external navigation, but editing/dragging follow project capabilities. Do not add a pencil placeholder; the current card has no hover-edit button.
- No refs means the existing card layout. Missing tracker configuration preserves raw identifiers in unavailable badges.

## Badge visibility

The browser-local card badge preference filters the fixed attribute order without reordering or affecting viewer/search references. Priority is a glyph near the local key and is omitted from the default badge row; existing saved choices remain valid. New external references are added once to pre-feature selections without resetting other choices, then subsequent opt-out is respected.

Swimlane cards preserve their current Show badges=false default. This outer gate precedes the per-badge preference. External refs are not projected onto cloud stubs that do not carry them.

## Responsive and accessibility

Badges wrap within card/column width; long external labels constrain themselves without overflowing the column. External details remain reachable by touch/keyboard, including one/two-ref cards. Follow density text/target floors and visible focus from the shared badge spec. No external abbreviation changes the stored identifier or URL.

## Source and verification anchors

- `frontend/src/components/TicketCard.tsx` and `TicketCard/ticket.css`.
- `frontend/src/components/TicketAttributeTags.tsx` and `config/ticketCardBadges.ts`.
- `frontend/src/components/TicketCode.tsx` and `shared/RelativeTimestamp.tsx`.
- `frontend/src/components/Column/index.tsx` (drag wrapper).
- `tests/e2e/ticket/external-references.spec.ts` (planned external interactions); existing board/drag-drop and ticket status/type suites preserve local behavior.
