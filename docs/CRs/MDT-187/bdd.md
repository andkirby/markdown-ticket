# BDD Scenarios

Related CR: `MDT-187-relationship-badge-overflow.md`
UX contract: `docs/design/surfaces/relationship-badge.spec.md`

## Elision (board / compact mode)

### S1 — Same-project link elides to bare number

```gherkin
Feature: Relationship badge project-code elision
  On the board, same-project links render as bare zero-padded numbers.

  Scenario: Single same-project related link on a board card
    Given the board is scoped to project "MDT"
    And a ticket has relatedTickets ["MDT-030"]
    When the ticket card renders in compact mode
    Then the related badge shows text "030"
    And the link element has title "MDT-030"
    And the link href resolves to the MDT-030 ticket route
```

### S2 — Cross-project link keeps full code

```gherkin
  Scenario: Cross-project related link on a board card
    Given the board is scoped to project "MDT"
    And a ticket has relatedTickets ["VOC-005"]
    When the ticket card renders in compact mode
    Then the related badge shows text "VOC-005"
    And the link element has title "VOC-005"
```

### S3 — Mixed same- and cross-project links

```gherkin
  Scenario: Mixed relationship list on a board card
    Given the board is scoped to project "MDT"
    And a ticket has relatedTickets ["MDT-030", "VOC-005", "MDT-035"]
    When the ticket card renders in compact mode
    Then the related badge shows "030, VOC-005, 035"
```

### S4 — Multi-digit number preserves its width

```gherkin
  Scenario: A ticket number beyond 3 digits
    Given the board is scoped to project "MDT"
    And a ticket has relatedTickets ["MDT-1005"]
    When the ticket card renders in compact mode
    Then the related badge shows text "1005"
```

## Overflow (board / compact mode, INLINE_MAX = 3)

### S5 — At-limit list renders all inline, no trigger

```gherkin
Feature: Relationship badge overflow
  Lists beyond INLINE_MAX collapse into a +N trigger opening a popover.

  Scenario: Exactly 3 links
    Given the board is scoped to project "MDT"
    And a ticket has relatedTickets ["MDT-030", "MDT-005", "MDT-035"]
    When the ticket card renders in compact mode
    Then the related badge shows "030, 005, 035"
    And no "+N" trigger is rendered
```

### S6 — Over-limit list collapses the tail

```gherkin
  Scenario: 5 same-project links
    Given the board is scoped to project "MDT"
    And a ticket has relatedTickets ["MDT-030", "MDT-005", "MDT-035", "MDT-040", "MDT-041"]
    When the ticket card renders in compact mode
    Then the related badge shows "030, 005, 035 +2"
    And the "+2" element is a button with aria-haspopup
    And the badge element title lists all 5 full keys "MDT-030, MDT-005, MDT-035, MDT-040, MDT-041"
```

### S7 — Popover reveals hidden links as full codes

```gherkin
  Scenario: Opening the overflow popover
    Given the related badge shows "030, 005, 035 +2"
    When the user clicks the "+2" trigger
    Then a popover opens anchored to the trigger
    And the popover lists "MDT-040" and "MDT-041" as links
    And each popover link has a valid ticket href
    And the trigger has aria-expanded="true"
```

### S8 — Popover closes on Escape / outside click / item click

```gherkin
  Scenario: Closing the popover
    Given the overflow popover is open
    When the user presses Escape
    Then the popover closes
    And focus returns to the "+2" trigger
    And the trigger has aria-expanded="false"
```

## Click behavior

### S9 — Relationship link click does not open the card viewer

```gherkin
Feature: Relationship badge click isolation
  Clicks on relationship links must not bubble to the card's viewer-open handler.

  Scenario: Clicking an inline relationship link
    Given a ticket card with a related badge in compact mode
    And the card has an onClick handler that opens the viewer
    When the user clicks an inline relationship link
    Then the click does not reach the card's onClick handler
    And navigation to the linked ticket occurs
```

### S10 — Overflow trigger click does not open the card viewer

```gherkin
  Scenario: Clicking the +N trigger
    Given a ticket card with a related badge showing "+2"
    When the user clicks the "+2" trigger
    Then the click does not reach the card's onClick handler
    And the popover opens
```

## Viewer divergence (full mode)

### S11 — TicketViewer shows full codes, no elision, no overflow

```gherkin
Feature: Relationship badge in TicketViewer
  The viewer is the detail surface and shows full CR keys.

  Scenario: 5 same-project links in the viewer
    Given the TicketViewer renders a ticket with 5 same-project related links
    When the RelationshipBadge renders in full mode
    Then all 5 links render as full CR keys "MDT-030, MDT-005, MDT-035, MDT-040, MDT-041"
    And no "+N" trigger is rendered
    And no elision occurs
```

## Edge cases

### S12 — Empty / missing arrays render no badge

```gherkin
  Scenario: Empty relationship array
    Given a ticket with relatedTickets []
    When the card renders
    Then no related badge is rendered
```

### S13 — Unclassifiable link falls back to full key

```gherkin
  Scenario: A malformed link in the array
    Given a ticket with relatedTickets ["not-a-ticket"]
    When the card renders in compact mode
    Then the badge shows the full string "not-a-ticket"
    And it does not crash
```
