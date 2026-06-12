---
code: MDT-184
status: Open
dateCreated: 2026-06-12T21:00:00.000Z
type: Tech Debt
priority: Medium
relatedTickets:
  - MDT-172
---

# Centralize route patterns into single source of truth

## 1. Description

### Requirements Scope
- full

### Problem
- Route path patterns (e.g., `/prj/:projectCode/ticket/:ticketKey`) are hardcoded in 8+ files, 25+ call sites across `src/`.
- `linkBuilder.ts`, `linkNormalization.ts` (`DEFAULT_WEB_BASE`), `markdownPreprocessor.ts`, `subdocPathValidation.ts`, `DirectTicketAccess.tsx`, `useTicketDocumentNavigation.ts`, `ProjectSelector/index.tsx`, `RedirectToCurrentProject.tsx`, and `App.tsx` all independently construct the same route shapes with template literals.
- `linkBuilder.ts` exists as a canonical builder but is not used consistently — `linkNormalization.ts` reinvented its own builder methods, and most `navigate()` calls hand-roll paths inline.
- Sub-document path variants (`ticket/:key/*`) have no builder function at all.
- If the `/prj` prefix ever changes, every file must be found and updated manually.

### Context (from MDT-172 hot fix)
- Bug: `classifyLink()` in `linkProcessor.ts` returned raw `"MDT-167"` as `href` for ticket links, causing React Router `<Link to="MDT-167">` to resolve relative to the current URL (`/prj/MDT/ticket/MDT-172/MDT-167` instead of `/prj/MDT/ticket/MDT-167`).
- Hot fix: used `buildTicketLink()` from `linkBuilder.ts` to produce absolute paths.
- This revealed that `linkBuilder.ts` itself still hardcodes `/prj/` — there is no route pattern constant to reference.

## 2. Proposed Solution

Introduce a `src/routes.ts` (or extend `linkBuilder.ts`) that:

1. **Defines route pattern constants** for all route shapes:
   - `ROUTE_PROJECT = '/prj/:projectCode'`
   - `ROUTE_PROJECT_LIST = '/prj/:projectCode/list'`
   - `ROUTE_PROJECT_DOCUMENTS = '/prj/:projectCode/documents'`
   - `ROUTE_TICKET = '/prj/:projectCode/ticket/:ticketKey'`
   - `ROUTE_TICKET_SUBDOC = '/prj/:projectCode/ticket/:ticketKey/*'`
   - `ROUTE_DIRECT_TICKET = '/ticket/:ticketKey'`

2. **Exports builder functions** that replace all inline template literals:
   - `buildProjectPath(projectCode, view?)`
   - `buildTicketPath(projectCode, ticketKey, anchor?)`
   - `buildTicketSubDocPath(projectCode, ticketKey, subDocPath, anchor?)`
   - `buildDocumentPath(projectCode, documentPath)`

3. **`App.tsx` route definitions** reference the same constants (or at minimum the builders are the only way to construct these paths).

4. **Migrate all call sites** to use builders: `linkNormalization.ts`, `markdownPreprocessor.ts`, `subdocPathValidation.ts`, `DirectTicketAccess.tsx`, `useTicketDocumentNavigation.ts`, `ProjectSelector/index.tsx`, `RedirectToCurrentProject.tsx`.

## 3. Acceptance Criteria

- [ ] No file outside `routes.ts`/`linkBuilder.ts` contains a hardcoded `/prj/` template literal
- [ ] `App.tsx` route `path` props use pattern constants
- [ ] All `navigate()` calls use builder functions
- [ ] `linkNormalization.ts` delegates to `linkBuilder.ts` instead of reimplementing
- [ ] Sub-document path builder exists and is used by `useTicketDocumentNavigation.ts`, `DirectTicketAccess.tsx`, `subdocPathValidation.ts`
- [ ] `markdownPreprocessor.ts` uses builders
- [ ] Existing tests pass; no behavioral change
