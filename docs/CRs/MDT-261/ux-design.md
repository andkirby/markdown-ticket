# Ticket creation feedback: MDT-261

## Intent and Boundaries

The legacy Board creation action and DataLayer API consumer share the creation response adapter. The routed ProjectView currently passes showHeader=false, hiding that legacy Create control; this ticket does not add a new creation entry point. Successful creation adds the actual returned ticket and visibly explains when its body still needs content. Access, navigation and creation permissions remain unchanged. The diagnostic is operation metadata and never part of ticket state.

## Composition and Reuse

Existing Board creation action → useTicketOperations → shared frontend response adapter → existing Sonner Toaster in ProjectOverlays. DataLayer creation uses the same response adapter. No new layout, modal, CSS, token, navigation destination or wireframe is needed; this is a spec-only content/state change using an existing toast surface.

## States

| Result | User feedback | State effect |
|--------|---------------|--------------|
| Successful, no diagnostics | Existing successful creation behavior | Add normalized created ticket once |
| Successful, unfinished body | Persistent dismissible warning headed by created ticket key; description is the shared diagnostic message and includes its file context | Add ticket once; no retry or error state |
| Multiple distinct findings | One warning per distinct diagnostic; stable operation-local identifiers prevent duplicate calls for one result | Never repeat create |
| Request failure | Existing error handling | No success or unfinished-body notice |

## Interaction, Accessibility and Responsive Behavior

- User can dismiss the existing accessible Sonner warning; no mandatory confirmation and no blocking modal.
- Warning is persistent until dismissed so the action is not lost; uses existing live-region semantics and responsive toast layout.
- Transport-specific title may say the ticket was created; canonical diagnostic text is supplied by shared and rendered verbatim, not reconstructed in browser code.
- Existing owner/read-only gating remains unchanged; no new API capability or editing control is introduced.
- CLI human and MCP text likewise show successful creation plus the diagnostic. CLI JSON/YAML, BB and DSH preserve structured operation diagnostics rather than printing an extra copy.

## Alternatives and Owner Impact

A blocking error/modal would falsely imply creation failed and invite duplicates; transient success-only feedback loses the action. Reuse the persistent warning instead. After reviewer approval, add a small durable ticket-creation feedback spec with source/test anchors; no existing visual mockups require changes.

## Verification and Review

Frontend response-adapter tests prove actual-ticket normalization, one visible warning, canonical text passthrough and no warning for clean results. Browser acceptance invokes the production DataLayer creation consumer against the real HTTP endpoint with the routed board/Toaster mounted, proving visible dismissible feedback and one SSE-created card. It does not claim a user-click creation journey because the routed board hides that legacy control. This document is a walkthrough/design contract, not recorded browser evidence.

Independent reviewer verdict: PASS. Read-only reviewer verified Board entry/write gating, existing Sonner warning surface and metadata separation. Required implementation details: persistent duration plus explicit close button; deduplicate findings; a toast presentation failure must never convert successful creation into a retryable failure. No blocking UX issues.
