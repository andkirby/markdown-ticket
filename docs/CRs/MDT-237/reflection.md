# Reflection: MDT-237

## Delivered vs planned
- All 7 BRs, C1-C5, Edge-1 delivered; 5/5 BDD scenarios executable and green.
- Architecture held: single seam (protectInlineCode classify branch), no second
  pipeline, existence signal isolated in its own module. Rollback surface as planned.
- One unplanned but necessary change: `useHtmlParser.ts` rich children
  (`domToReact`) — the old flatten-to-text behavior dropped the `<code>`
  affordance inside every link; discovered during E2E (a11y snapshot showed
  text-only link children). Covered by full regression suites.

## Drift
- E2E selectors: converted bare subdoc refs classify as DOCUMENT (not TICKET)
  — trace/spec updated during implementation; no requirement drift.
- Review (verify-complete) returned `partial` once; PV-1..PV-3 fixed and all
  suites re-verified green. Final verdict conditions cleared.

## Lessons
- Escaping-sensitive files (specs with backticks/\
) should be written via
  quoted heredocs or the edit tool, not interpolated templates.
- The a11y snapshot + DOM dump loop located a rendering-pipeline flattening bug
  faster than unit tests could.
