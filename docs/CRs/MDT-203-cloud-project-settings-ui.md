---
code: MDT-203
status: Proposed
dateCreated: 2026-07-25T14:04:28.706Z
type: Feature Enhancement
priority: High
relatedTickets: MDT-200,MDT-201,MDT-202
dependsOn: MDT-201,MDT-202
---

# Add cloud project settings UI

## 1. Description

### Requirements Scope

`full`

### Problem

- Project owners cannot enable or manage cloud coordination from the application interface without handling Access tokens, HTTP requests, cloud UUIDs, or project configuration manually.
- Teammates cannot clearly distinguish provisioning a cloud project from connecting to an existing project binding.
- A frontend implementation could diverge from the approved onboarding procedure or embed cloud lifecycle rules in the browser.

### Affected Areas

- Frontend: project settings, cloud-sync status, onboarding, membership, diagnostics, and disable flows.
- Backend: authenticated project-management operations exposed to the frontend.
- Shared workflow: reusable cloud onboarding and management outcomes owned by MDT-201.
- Integration: Cloudflare Access authentication and the MDT-200 coordination service.
- Documentation and testing: durable onboarding procedure, approved designs, interaction tests, and end-to-end verification.

### Scope

- In scope:
  - a Project Settings surface for cloud-sync enablement, connection, status, membership management, diagnostics, and disablement;
  - separate owner/operator enablement and teammate connection journeys;
  - clear progress and recovery states for every multi-step operation;
  - frontend consumption of the reusable MDT-201 backend contract;
  - an explicit design-approval gate before UI implementation;
  - durable documentation of the canonical multi-step user procedure.
- Out of scope:
  - cloud lifecycle or authorization business rules implemented in the frontend;
  - direct browser calls to Cloudflare provisioning or coordination endpoints;
  - creation or storage of Access credentials in browser-controlled state;
  - replacing the MDT-201 backend workflow or MDT-202 CLI;
  - ticket-body cloud editing, teammate presence, comments, or offline ticket allocation.

## 2. Desired Outcome

### Success Conditions

- An admitted operator can enable cloud sync from Project Settings without manually obtaining or copying a cloud project UUID.
- A teammate opening a repository with an existing binding can authenticate and connect without provisioning another cloud project.
- Users can inspect readiness, authentication, membership, coordinator, and binding state through one project-scoped surface.
- Owners can manage human and machine memberships without entering shared passwords or machine secrets into the UI.
- Disablement clearly distinguishes project-wide suspension from device-local detachment and never silently resumes local numbering.
- Interrupted or failed multi-step operations show their durable state and a safe retry or recovery action.
- The UI never writes a binding until provisioning and membership verification have completed successfully.

### Constraints

- MDT-201 owns reusable readiness, provisioning, idempotency, membership, binding, diagnostics, recovery, and disable semantics.
- MDT-202 delivers and proves the CLI journey before this UI implementation starts.
- The browser communicates only with the authenticated local backend and never receives Cloudflare credentials.
- The canonical user procedure is maintained in `docs/CLOUD_COORDINATION_GUIDE.md` and referenced by the UI design and user help.
- Permanent security, identity, data, and failure invariants remain owned by `docs/architecture/cloud-sync/`.
- Approved design artifacts are the source of truth for layout, interaction sequence, copy, responsive behavior, accessibility behavior, and visual states.
- Recommendations in this ticket are non-authoritative once approved design artifacts exist.
- UI implementation and implementation-task execution must not start until the required design artifacts receive explicit approval and are linked from this ticket.
- Project binding remains non-secret and project-scoped; credentials, sessions, journals, locks, and caches remain device-local.
- Local-only projects retain current behavior.

### Non-Goals

- No provider administration console in Markdown Ticket.
- No UI for deploying Workers, creating D1 databases, or configuring Access applications.
- No redesign of the existing cloud coordination protocol.
- No automatic Git repository access or teammate invitation to the Git host.
- No speculative UI implementation before design approval.

## 3. Open Questions

| Area | Question | Constraints |
| --- | --- | --- |
| Information architecture | Where should Cloud Sync live within Project Settings? | Approved designs decide; it must remain project-scoped. |
| Journey | How should enablement, connection, status, and recovery be divided into steps? | The procedure must match `docs/CLOUD_COORDINATION_GUIDE.md`; designs own presentation. |
| Authentication | How should Access login, cancellation, expiry, and retry appear? | Tokens never enter browser state or output. |
| Progress | Which durable backend states should be shown during partial completion? | UI labels must map to stable MDT-201 outcomes rather than infer state. |
| Membership | How should roles, machine principals, revocation, and final-owner protection be presented? | Designs must preserve identity and authorization constraints. |
| Disablement | How should project suspension and local detachment be distinguished and confirmed? | The UI must not imply that disabling one device stops other clients. |
| Responsive behavior | How should the workflow adapt across supported viewport sizes? | Approved designs are the UI/UX source of truth. |

### Known Constraints

- The enable journey is multi-step: readiness, operator authentication, idempotent provisioning, owner membership verification, and commit-last binding.
- The connect journey uses the repository binding, personal authentication, and membership verification without provisioning.
- The durable guide must describe step order, prerequisites, intermediate states, recovery, and completion outcomes.
- Unknown projects and non-members retain non-disclosing errors.
- Project owner authority does not automatically grant cloud-service operator authority.
- Browser sessions cannot become a source of project identity or membership.

### Decisions Deferred

- UI layout, component composition, visual hierarchy, wording, animation, responsive breakpoints, and accessibility interaction details are deferred to approved design artifacts.
- Design artifact format and design-production workflow are deferred to the design phase.
- Implementation artifacts and endpoint mapping are deferred to `mdt:architecture` after design approval.
- Test implementation and task breakdown are deferred to `mdt:tests` and `mdt:tasks` after design approval.

### Non-Authoritative Recommendations

- Prefer one Project Settings entry with explicit `Enable`, `Connect`, `Needs attention`, `Ready`, `Suspended`, and `Disabled` states.
- Prefer a resumable step-based flow for enablement rather than one opaque loading action.
- Show the generated cloud UUID only as diagnostic information, never as a required user input.
- Keep teammate connection visibly shorter than owner/operator enablement.
- Link contextual help to the canonical durable procedure instead of duplicating operational instructions in component copy.

## 4. Acceptance Criteria

### Design Gate

- [ ] Approved design artifacts are linked from this ticket before implementation starts.
- [ ] The approved designs cover enablement, teammate connection, status, membership, diagnostics, disablement, loading, cancellation, retry, partial completion, forbidden, unauthenticated, unavailable, and invalid-binding states.
- [ ] The approved designs identify the canonical step sequence from `docs/CLOUD_COORDINATION_GUIDE.md` and are declared the UI/UX source of truth.
- [ ] Implementation review verifies the delivered UI against approved designs; deviations require design approval or an updated approved design.

### Functional

- [ ] An admitted operator can enable cloud sync without manually editing configuration, copying a UUID, running Wrangler, or constructing HTTP requests.
- [ ] Enablement writes the non-secret project binding only after readiness, provisioning, and owner membership verification succeed.
- [ ] Repeating enablement after a timeout or for an existing valid binding does not create a second cloud project.
- [ ] A teammate can authenticate and connect to an existing bound project without provisioning or receiving operator authority.
- [ ] Status distinguishes disabled, ready, authentication required, forbidden, unavailable, incompatible, suspended, and recoverable partial states.
- [ ] An authorized owner can list, add, change, and revoke project members while final-owner protection remains visible and enforced.
- [ ] Machine membership accepts only the non-secret principal identifier and never asks for or displays the client secret.
- [ ] Diagnostics explain the failed layer and provide a safe next action without exposing tokens, assertions, or membership details to unauthorized users.
- [ ] Disablement requires explicit confirmation, distinguishes project-wide suspension from local detachment, and does not silently switch to local numbering.
- [ ] Refreshing or reopening the application preserves the backend-authoritative operation outcome without relying on browser-only state.
- [ ] Local-only projects continue to create, edit, and display tickets without cloud calls.

### Non-Functional

- [ ] Cloud credentials, assertions, cookies, service-token secrets, and reusable join credentials never appear in browser storage, URLs, rendered output, logs, or project files.
- [ ] The frontend contains no provisioning, membership, retry, binding, authorization, or disable business rules duplicated from MDT-201.
- [ ] The surface follows approved keyboard, focus, semantic, responsive, and reduced-motion behavior from the design source of truth.
- [ ] Owner-only management operations remain inaccessible from anonymous and read-only browser sessions.
- [ ] User-facing procedure help links to the durable guide and does not become a competing workflow specification.

### Edge Cases

- Operator authentication succeeds but the user is not admitted by the operator policy.
- Provisioning succeeds but the response is lost before the binding is written.
- Membership verification fails after provisioning.
- The repository contains a malformed, unknown, suspended, or untrusted binding.
- The same valid binding is opened on a new device with no local session.
- A teammate is authenticated but is not a project member or lacks Git access.
- A member is revoked while Project Settings is open.
- The final owner attempts to remove or demote themselves.
- Coordination becomes unavailable during enablement, membership mutation, diagnostics, or disablement.
- The user cancels authentication or closes the UI between steps.

## 5. Verification

### How to Verify Success

- Design review confirms explicit approval, complete state coverage, and traceability to the durable procedure before implementation begins.
- Requirements and architecture review confirm that browser, backend, shared-service, and cloud authority boundaries remain intact.
- Automated frontend tests verify rendering, accessibility behavior, progress, recovery, and every stable backend outcome without reproducing lifecycle rules.
- Backend integration tests verify owner-only access, idempotent enablement, commit-last binding, membership operations, diagnostics, and disablement.
- End-to-end tests verify operator enablement, teammate connection from a second client, membership revocation, recovery after interruption, and local-only preservation.
- Security verification confirms that credentials and sensitive assertions never cross into browser-controlled state.
- Documentation review confirms that `docs/CLOUD_COORDINATION_GUIDE.md` is the single durable owner of the multi-step user procedure and that UI help links to it.
- User acceptance compares the implemented surface directly with the approved design artifacts.