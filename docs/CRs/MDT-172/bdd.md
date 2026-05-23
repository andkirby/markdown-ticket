# BDD: MDT-172

**Source**: [MDT-172](../MDT-172-public-read-only-sharing.md)
**Generated**: 2026-05-23

## Feature: Public Read-Only Board Sharing

As a project owner, I want selected boards to be publicly viewable in read-only mode so I can share work without exposing private projects or write access.

## Journeys

### Project Visibility

```gherkin
Scenario: private_by_default
  Given a fresh deployment with active projects and no sharing configuration
  When an anonymous visitor opens the app
  Then the project list is empty and no private project metadata is displayed

Scenario: anonymous_public_listing
  Given one project is public-readonly, one is unlisted-readonly, and one is private
  When an anonymous visitor requests the project list
  Then only the public-readonly project is returned

Scenario: unlisted_share_link_opens_project
  Given a project is unlisted-readonly with a valid share ID
  When an anonymous visitor opens /share/{shareId}
  Then the visitor sees the shared board/list/documents data for that project
```

### Read-Only Enforcement

```gherkin
Scenario: readonly_mutations_are_denied
  Given an anonymous visitor can read a shared project
  When the visitor sends POST, PATCH, PUT, or DELETE requests for that project
  Then each request returns 403 and persisted project data is unchanged

Scenario: readonly_ui_removes_editing
  Given a read-only visitor is viewing a shared project
  When the board, list, project selector, settings, and documents views render
  Then project add/edit, ticket create, drag/drop, status toggles, delete, document favorite, and document configuration controls are unavailable
```

### Owner and Token Flows

```gherkin
Scenario: owner_updates_project_sharing
  Given an owner/admin session is unlocked
  When the owner sets a project to Private, Unlisted read-only, or Public read-only in Settings
  Then the saved sharing mode changes the project visibility on the next read

Scenario: scoped_read_token_expands_projects
  Given a scoped read token grants access to two projects
  When a visitor submits the token through the authorization flow
  Then those projects are visible and remain read-only

Scenario: invalid_token_generic_denial
  Given a visitor submits an invalid scoped read token
  When the token is rejected
  Then the UI shows a generic denial and no project names or counts are revealed

Scenario: share_code_exchange_cleans_url
  Given a share link contains a one-time code
  When the browser opens the link
  Then the code is exchanged through POST and the current address no longer contains the code
```

## Executable Target

- Browser E2E framework: Playwright.
- API route tests: Jest + Supertest under `server/tests/api/`.
- BDD trace projection: [bdd.trace.md](./bdd.trace.md).
