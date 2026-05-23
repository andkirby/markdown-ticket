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
      text "This server accepts an owner token for management or a read token for scoped read-only access."
      text "Access token"
      input placeholder="Enter access token" type=password id="token-input"
      button "Unlock" primary id="unlock-button"
      text "Tokens are exchanged for a secure server session and are not stored in browser storage."

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
      text "This server accepts an owner token for management or a read token for scoped read-only access."
      text "Access token"
      input placeholder="Enter access token" type=password id="retry-input"
      text "Token was not accepted." id="token-error"
      button "Unlock" primary
      text "Check the token configured on the server and try again."

annotation "Generic error: do not reveal whether token length, format, or value was close." target="token-error" position=right
```

## Read-only session

```wireloom
window "Markdown Ticket Board — Read-only Session":
  header:
    row justify=between:
      text "Markdown Ticket Board" bold
      row:
        status "Read only" kind=info id="readonly-chip"
        button "Unlock" id="readonly-unlock"
  panel:
    row justify=between:
      text "Public Project" bold
      combo value="Key ▾"
    list:
      item "MDT-172 — Public read-only sharing"
      item "MDT-168 — Documentation polish"

annotation "Read-only users can view, sort, search, and open tickets; mutations stay hidden or disabled." target="readonly-chip" position=bottom
annotation "Unlock reuses the same token panel for owner-token upgrade." target="readonly-unlock" position=right
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

## Read token accepted

```wireloom
window "Markdown Ticket Board — Read Token Accepted":
  header:
    row justify=between:
      text "Markdown Ticket Board" bold
      row:
        status "Read only" kind=info id="token-readonly-chip"
        button "Unlock"
  panel:
    text "Scoped projects" bold
    list:
      item "PRI — Private Project (read token)"
      item "PUB — Public Project"

annotation "Read token broadens visible projects only; it does not grant writes." target="token-readonly-chip" position=bottom
```
