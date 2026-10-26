# Ticket creation feedback

Successful creation can leave an unfinished body; show the next action without implying creation failed.

## Owns / Does Not Own

- Owns successful browser creation feedback and separation of operation diagnostics from ticket state.
- Shared services own diagnostic rules and message content. Existing board permissions and HTTP auth own creation access.

## Composition

Legacy Board create action → useTicketOperations → ticketCreationResponse → existing Sonner Toaster. DataLayer creation shares the response adapter. ProjectView currently hides the legacy Board header/Create control; this feature adds no new entry point. Browser verification exercises the actual DataLayer/HTTP consumer with the routed board mounted.

## States and Interaction

| Result | Feedback | Ticket state |
|---|---|---|
| Clean success | Existing creation behavior | Add the normalized created ticket |
| Success with unfinished content | Persistent dismissible warning headed by created key, with shared message and file location | Add ticket once; no retry |
| Request failure | Existing error handling | No success warning |

Deduplicate findings within one response. Rendering failure cannot turn a successful creation into a failed request. Diagnostics never enter ticket state or frontmatter.

## Accessibility and Responsive Behavior

Reuse Sonner warning styling, live region, dismiss control and responsive positioning. Keep warnings visible until dismissed. No additional modal, navigation or capability is introduced.

## Source and Verification Anchors

- frontend/src/components/Board.tsx
- frontend/src/hooks/useTicketOperations.ts
- frontend/src/services/ticketCreationResponse.ts
- frontend/src/components/ui/sonner.tsx
- frontend/src/services/ticketCreationResponse.test.ts
