---
code: MDT-251
status: Approved
dateCreated: 2026-10-20T14:09:00.204Z
type: Feature Enhancement
priority: Medium
level: epic
---

# Make MDT available as an app

## 1. Description

### Requirements Scope
- full; define app-level outcomes and leave packaging and implementation to child tickets.

### Problem
- Users want MDT to act as an installed application that they can launch and return to directly.
- Links from agent replies and other applications need to open the intended MDT content in the app.
- The existing Safari MDT wrapper provides a starting point, but app navigation, reuse, installation, and lifecycle behavior need a verified contract.

### Affected Areas
- Desktop integration: app installation, launch, activation, navigation delivery, and removal.
- `frontend/`: existing ticket and document surfaces reached through the app.
- `shared/` and `cli/`: reusable target resolution and link generation where needed.
- `docs/`: setup, supported behavior, recovery, and agent usage guidance.

### Scope
- In scope: an installable MDT app experience; launch and return-to-app behavior; external ticket/document links; configured website origin; setup and removal; lifecycle and recovery expectations.
- Initial platform: macOS, starting with evaluation of the existing Safari MDT app.
- First child: MDT-250, context-aware ticket/document links and delivery to the existing app.
- Further child tickets are defined after discovery establishes which app capabilities need separate work.
- Out of scope: implementing the epic during intake, selecting a desktop framework now, replacing ticket storage, or committing to additional operating systems before requirements are established.

## 2. Desired Outcome

### Success Conditions
- Users can install and launch MDT as an app and access their existing projects, tickets, and documents.
- Users can return to the running app and open externally linked content in the intended project context.
- Installation, configured server connection, app reuse, and recovery behavior are documented and verified.
- The app continues to use MDT's existing product surfaces and data contracts.
- Child tickets provide independently reviewable delivery and verification for the app experience.

### Constraints
- Reuse the existing MDT website and preserve HTTP(S) access and bookmarks.
- Treat the configured website origin as installation-specific; do not assume a fixed localhost port.
- Preserve project identity, ticket identity, document access rules, and cross-project navigation.
- Verify Safari app navigation and window behavior before relying on that wrapper as the delivery architecture.
- MDT-250 remains responsible for its detailed URI and context-resolution contract.

### Non-Goals
- A new ticket UI or storage model as a prerequisite for app delivery.
- Selecting Swift, AppleScript, Electron, Elixir, or another packaging technology in this epic.
- Implicit commitments to offline mode, bundled backend services, mobile apps, or automatic updates.

## 3. Open Questions

| Area | Question | Constraints |
|---|---|---|
| App delivery | Can the existing Safari wrapper meet the required app behavior, or is another package needed? | Start with observed macOS behavior; architecture follows evidence. |
| Runtime | Does the initial app connect to an existing MDT server, or also manage a local server? | Requires clarification; preserve existing deployment options. |
| Lifecycle | What launch, window reuse, quit, and unavailable-server behavior is required? | Document observed wrapper limits before committing to implementation. |
| Distribution | How are installation, URL registration, configuration, updates, and removal delivered? | Keep the initial installation reviewable; update automation remains undecided. |
| Platforms | Should later delivery cover operating systems beyond macOS? | Initial scope is macOS; expand through explicit child requirements. |

### Known Constraints
- Intake recorded an existing Safari MDT app, but navigation delivery and window reuse remain unverified.
- A focused PoC should establish app handoff feasibility before architecture commitments.

### Decisions Deferred
- Packaging technology and native integration mechanisms.
- Server lifecycle ownership and distribution/update strategy.
- Exact window reuse requirements and additional platform support.
- Additional child-ticket breakdown after discovery.

## 4. Acceptance Criteria

### Functional
- [ ] Users can install, launch, and return to the supported MDT app.
- [ ] Existing projects, tickets, and documents remain accessible through the app.
- [ ] MDT-250 delivers verified context-aware external links to the intended app surface.
- [ ] The app's website-origin configuration and server lifecycle expectations are explicit.
- [ ] Users have documented setup, removal, and recovery procedures for the selected delivery approach.

### Non-Functional
- [ ] Existing browser access, bookmarks, and document access restrictions continue to work.
- [ ] App launch, navigation, instance reuse, and observed window behavior are supported by recorded macOS evidence.
- [ ] Each required child ticket reaches its accepted terminal state before epic closure.

### Edge Cases
- [ ] Missing app integration or an unavailable website has an explicit recovery path.
- [ ] External links preserve their target when another project is selected in the running app.
- [ ] Repeated launches and link activations follow the documented app/window behavior.

## 5. Verification

### How to Verify Success
- Manual macOS journey: install, launch, open existing content, return to the app, activate real external links, quit, relaunch, and remove the integration.
- Verify external links with the app closed and already running, including clicks from BB, using MDT-250's target-resolution cases.
- Record the actual receiving app, displayed target, instance/window behavior, and unavailable-server recovery.
- Use child-ticket automated checks for reusable resolution and existing website routing behavior.
- Review child-ticket completion and setup documentation before requesting epic closure.