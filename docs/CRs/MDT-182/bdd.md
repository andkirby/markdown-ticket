# BDD: MDT-182

**Source**: [MDT-182](../MDT-182-wireloom-annotation-toggle.md)
**Updated**: 2026-06-10

## Overview

BDD scenarios cover the annotation view toggle for Wireloom blocks — switching between full callout (default) and compact numbered-marker modes, with tooltip interactions.

## E2E Framework

```yaml
e2e:
  framework: Playwright
  directory: tests/e2e/
  pattern: "*.spec.ts"
  command: "bun run test:e2e"
  filter: "tests/e2e/documents/wireloom-annotation-toggle.spec.ts"
```

---

## Scenario: toggle_visible_on_wireloom_block --covers BR-1.1

```gherkin
Given a document with a Wireloom code fence containing annotations
When the Wireloom block is rendered
Then a toggle button (#) appears on the block
```

## Scenario: no_toggle_on_non_wireloom --covers BR-1.1

```gherkin
Given a document with a Wireloom code fence containing no annotations
When the Wireloom block is rendered
Then no toggle button appears on the block
```

## Scenario: full_callout_mode_default --covers BR-1.2

```gherkin
Given a rendered Wireloom block with annotations
When the page loads
Then annotations are displayed as always-visible callout boxes (Wireloom default)
And no numbered markers are visible
```

## Scenario: toggle_switches_to_compact --covers BR-1.3

```gherkin
Given a rendered Wireloom block with annotations in callout mode
When the user clicks the toggle button
Then the mode switches to compact
And the SVG callout elements (boxes, lines, circles, texts) are hidden
And numbered markers appear at the same positions as the callout target dots
```

## Scenario: toggle_back_to_callout --covers BR-1.3

```gherkin
Given a Wireloom block in compact mode
When the user clicks the toggle button again
Then the mode switches back to callout
And numbered markers are removed
And SVG callout elements are visible again
```

## Scenario: hover_shows_tooltip --covers BR-1.4

```gherkin
Given a Wireloom block in compact mode
When the user hovers over a numbered marker
Then a tooltip appears near the marker showing the annotation text
And the tooltip is not clipped by the Wireloom block's boundary
```

## Scenario: hover_another_clears_previous --covers BR-1.6

```gherkin
Given a Wireloom block in compact mode with a pinned tooltip on marker 1
When the user hovers over marker 2
Then marker 1 is unpinned
And the tooltip shows marker 2's annotation text
```

## Scenario: click_pins_tooltip --covers BR-1.5

```gherkin
Given a Wireloom block in compact mode
When the user clicks a numbered marker
Then the tooltip stays visible (pinned)
And the marker shows active state
```

## Scenario: click_again_unpins --covers BR-1.5

```gherkin
Given a Wireloom block in compact mode with a pinned tooltip on a marker
When the user clicks the same marker again
Then the tooltip disappears
And the marker is no longer in active state
```

## Scenario: click_outside_dismisses --covers BR-1.5

```gherkin
Given a Wireloom block in compact mode with a pinned tooltip
When the user clicks anywhere outside all markers (including outside the Wireloom block)
Then the tooltip disappears
```

## Scenario: scroll_dismisses --covers BR-1.5

```gherkin
Given a Wireloom block in compact mode with a pinned tooltip
When the user scrolls the page
Then the tooltip disappears
```

## Scenario: escape_dismisses --covers BR-1.5

```gherkin
Given a Wireloom block in compact mode with a pinned tooltip
When the user presses Escape
Then the tooltip disappears
And the marker is no longer in active state
```

## Scenario: colors_match_wireloom --covers BR-1.7

```gherkin
Given a Wireloom block in compact mode
When the user hovers a marker
Then the tooltip background matches the SVG callout box fill color
And the tooltip border matches the SVG callout box stroke color
And the tooltip text color matches the SVG callout text color
And the marker border uses the SVG callout dot color
```

## Scenario: independent_toggles_per_block --covers BR-1.9

```gherkin
Given a document with two Wireloom blocks both containing annotations
When the user toggles block 1 to compact mode
Then block 2 remains in callout mode
```

## Scenario: theme_change_preserves_compact --covers BR-1.10

```gherkin
Given a Wireloom block in compact mode
When the user switches the application theme (light ↔ dark)
Then the block remains in compact mode
And markers reappear with colors matching the new theme's SVG callout colors
```

## Scenario: toggle_does_not_modify_source --covers BR-1.11

```gherkin
Given a Wireloom block with encoded source
When the user toggles to compact mode and back to callout mode
Then the data-source-encoded attribute is unchanged
```

---
*Updated post-implementation to reflect verified behavior*
