# Auth Session Unlock — Mockups

Related spec: `auth-session-unlock.spec.md`

## Locked board state

```wireloom
window "Markdown Ticket Board — Locked":
  header:
    row justify=between:
      text "Markdown Ticket Board" bold
      button "Theme"
  panel:
    section "Board is locked" id="locked-card":
      text "This server requires an owner access token before projects can be managed."
      text "Access token"
      input placeholder="Enter access token" type=password id="token-input"
      button "Unlock" primary id="unlock-button"
      text "Your token is exchanged for a secure server session and is not stored in browser storage."

annotation "401 from /api/projects routes here; never show No Projects Found for auth-required." target="locked-card" position=right
annotation "Raw token stays only in input state until POST /api/auth/session returns." target="token-input" position=bottom
```

## Invalid token state

```wireloom
window "Markdown Ticket Board — Unlock Error":
  header:
    row justify=between:
      text "Markdown Ticket Board" bold
      status "Locked" kind=warning
  panel:
    section "Board is locked":
      text "This server requires an owner access token before projects can be managed."
      text "Access token"
      input placeholder="Enter access token" type=password id="retry-input"
      text "Token was not accepted." id="token-error"
      button "Unlock" primary
      text "Check the token configured on the server and try again."

annotation "Generic error: do not reveal whether token length, format, or value was close." target="token-error" position=right
```

## Owner session unlocked

```wireloom
window "Markdown Ticket Board — Owner Session":
  header:
    row justify=between:
      text "Markdown Ticket Board" bold
      row:
        status "Owner session" kind=success id="owner-chip"
        button "Lock"
  panel:
    row justify=between:
      text "Projects" bold
      button "Create Project" primary id="create-project"
    list:
      item "MDT — Markdown Ticket Board"
      item "DEVPT — Dev process tracker"

annotation "Create Project appears only after owner/admin session is established." target="create-project" position=left
annotation "Lock clears server session cookie; it does not delete data." target="owner-chip" position=bottom
```

## MDT-172 placeholder

Public/read-only project visibility is intentionally not mocked here. MDT-172 owns the sharing contract, labels, empty states, and owner-upgrade affordance. MDT-176 only distinguishes locked, owner session, local auth-off, and backend unavailable states.
