---
code: MDT-250
status: Proposed
dateCreated: 2026-10-20T13:36:43.014Z
type: Feature Enhancement
priority: Medium
relatedTickets: MDT-017,MDT-093,MDT-150,MDT-184
phaseEpic: MDT-251
---

# Open context-aware ticket and document links in MDT

## 1. Description

### Requirements Scope
- full; capture user-visible behavior and defer implementation choices to architecture.

### Problem
- Ticket and document links in agent replies currently open local Markdown previews instead of the interactive MDT website.
- A generated link must identify the intended ticket or project document, including targets in another project, without requiring the user to find that context again in MDT.
- Users want links to open the existing MDT application rather than create normal browser tabs.

### Affected Areas
- `frontend/`: ticket, ticket subdocument, project document, and cross-project navigation.
- `shared/`: project/ticket identity and context-aware target resolution where reusable behavior is needed.
- `cli/`: potential link generation from the caller's current directory/project context.
- `docs/`: link format, context rules, installation, and agent usage guidance.
- macOS integration: registered URL handling and delivery to the installed Safari MDT web app.

### Scope
- In scope: clickable `mdt://` links; ticket and project-document targets; originating-context resolution; cross-project links; equivalent full HTTP(S) website URLs; opening the installed MDT app.
- Out of scope: replacing MDT with a new desktop UI, changing ticket storage, running a complete specification/implementation pipeline as part of this intake, or adding ticket mutations through links.

## 2. Desired Outcome

### Success Conditions
- An agent or user can generate an MDT link from the originating working directory/project context, including from an ordinary relative document reference such as `docs/my.md`.
- A ticket key carries its project identity, so `SOME-023` targets project `SOME` even when the caller or receiving app is currently in `DEVPT`.
- A project document reference uses its originating project unless another project is explicitly supplied; the receiving app's currently selected project must not silently change the target.
- Generated links carry sufficient identity to resolve correctly when clicked later or from another application; a click does not assume that macOS supplies the originating shell's working directory.
- Clicking a supported link opens the intended MDT surface and brings the installed MDT app forward; an already-running app is reused rather than starting a duplicate app instance or opening a normal browser tab.
- When MDT is already loaded, opening an external target behaves like internal SPA navigation: it keeps the existing page runtime instead of reloading the top-level document. A cold launch may load the website normally.
- A full HTTP(S) MDT URL can identify the same target and remain a supported link form alongside the custom scheme.

### Requested Link Forms

| Input or link | Expected target |
|---|---|
| `mdt://DEVPT-023` | Main ticket DEVPT-023 in project DEVPT |
| `mdt://DEVPT-023/plan.md` | DEVPT-023 ticket subdocument `plan.md`; project inferred from the ticket key |
| `mdt://DEVPT/DEVPT-023/plan.md` | Same ticket subdocument with explicit project context |
| `mdt://DEVPT/docs/some.md` | Project DEVPT document at project-relative path `docs/some.md` |
| `mdt://SOME-023/plan.md` | Ticket SOME-023 subdocument `plan.md`, independently of the current project |
| `mdt://SOME/docs/some.md` | Project SOME document at project-relative path `docs/some.md` |
| Relative input `docs/my.md` while working in DEVPT | A generated link to DEVPT's document, using the originating project context |
| Full MDT HTTP(S) ticket or document URL | The same target, preserving its project, document path, and any supported section anchor |

### Constraints
- Reuse MDT's existing routing, project discovery, key normalization, document access rules, and configured website origin; local port 3070 is an observed installation setting, not a universal constant.
- Preserve the distinction between ticket-relative subdocuments and project-relative documents, including nested paths and encoded filenames.
- Explicit project context and a ticket's embedded project code must agree; conflicting inputs must not open a different ticket silently.
- macOS URL parsers may normalize the URI authority's case; project and ticket identity resolution must account for the chosen URL grammar.
- Keep target resolution separate from delivery to the desktop app; a small helper or script is a candidate, not a selected architecture.
- The existing MDT Safari wrapper is the initial integration target; a full desktop rewrite is not required by this request.

### Non-Goals
- Replacing existing HTTP(S) routes or breaking existing browser bookmarks.
- Choosing Swift, AppleScript, Electron, Elixir, or another packaging technology during ticket creation.
- Assuming that receiving a URL in the same app guarantees reuse of one particular existing window.

## 3. Open Questions

| Area | Question | Constraints |
|---|---|---|
| URL contract | Which requested forms are canonical and which are aliases? How are project documents disambiguated from ticket subdocuments? | Preserve the meanings in the requested examples; document URI authority/path handling. |
| Context | Which link-generation entry point accepts relative references, and what happens without an originating project? | Resolve from explicit or originating context; never guess from the unrelated project visible in the receiving app. |
| Full URLs | Does full-URL support mean emitting ordinary MDT HTTP(S) URLs, accepting them as resolver input, or both? | Capture both possibilities for clarification; avoid inventing a custom URI wrapper syntax for a full URL. |
| Native capture | Do ordinary full MDT URLs clicked in BB already reach the installed Safari app through macOS? | Native URL capture depends on link scope and whether the caller hands the link to macOS. |
| Helper delivery | Can a small registered `mdt://` handler forward the resolved website URL to the existing Safari MDT app? | Verify actual navigation, not just successful app launch; backend access alone does not navigate the UI. |
| Window behavior | Does the Safari wrapper reuse its existing window or create another MDT window? Is exact-window reuse required beyond reuse of the app instance? | Treat this as unverified until observed; surface any wrapper limitation before implementation commitments. |
| SPA delivery | How can an external target reach the loaded app's router without a top-level reload? | User observed page refresh with URL delivery. Evaluate a command addressed to the intended app session over the existing live channel; avoid navigating every connected tab. |
| Distribution | How should installation, URL registration, configured origin/app identity, and removal be managed? | Keep the initial macOS setup small and reviewable. |

### Known Constraints
- [PoC findings](./MDT-250/poc.md), 2026-10-20: direct URL delivery and a temporary registered helper navigated the installed Safari `MDT.app` at `http://localhost:3070/`, reused its running process and one observed document window, and cold-launched the requested ticket subdocument.
- MDT already has website routes for tickets, ticket subdocuments, and project documents; this request extends external linking and delivery rather than introducing those content types.
- Observed BB limitation: the custom-scheme Markdown link rendered as plain text; an HTTP link opened BB's built-in browser instead of the separate Safari app. Caller integration remains unresolved; the successful macOS bridge alone does not satisfy end-to-end feature acceptance.
- User follow-up after the PoC: sending an open URL refreshes the app page. Process/window reuse does not establish SPA runtime reuse. Warm navigation without a top-level reload is now an explicit outcome; its delivery mechanism remains unverified.

### Decisions Deferred
- Final canonical URI grammar and aliases, context precedence details, and treatment of unsupported or conflicting inputs.
- Native URL capture versus a registered helper, and the mechanism used to deliver navigation to the existing app.
- Implementation artifacts, installation design, detailed test specification, and task breakdown.

## 4. Acceptance Criteria

### Functional
- [ ] Each requested link form resolves to the intended project, ticket, or document described in the examples.
- [ ] A relative document input generated from a known project context produces a link that keeps that project identity when clicked later.
- [ ] Explicit links to another project work while the caller and receiving app are focused on a different project.
- [ ] Ticket subdocuments and project documents open their respective MDT surfaces, including nested documents and supported anchors.
- [ ] Full HTTP(S) MDT URLs remain valid, with the supported generation/input behavior documented after clarification.
- [ ] A supported external click brings the installed MDT app forward and displays the requested target without opening a normal browser tab.
- [ ] Opening links while MDT is already running reuses the app instance; observed window behavior and any limitation are documented.
- [ ] Opening a target in an already-loaded app uses client-side navigation without reloading the top-level document; delivery reaches the intended app session rather than navigating other open clients.

### Non-Functional
- [ ] Existing website links, normal navigation, and project/document access restrictions continue to work.
- [ ] App-routing claims are supported by observed end-to-end behavior on macOS, including a click from BB; HTTP 200 or a launched app alone is insufficient evidence.

### Edge Cases
- [ ] Missing originating context, unknown projects/tickets/documents, and conflicting project/key inputs produce an actionable failure instead of silently selecting another target.
- [ ] Spaces, percent encoding, nested paths, project/key casing, anchors, and invalid/out-of-project paths are handled consistently with the final contract and existing access rules.
- [ ] An unavailable MDT website or missing app/handler produces a clear recovery path; fallback behavior is explicit rather than silently opening a normal browser tab.

## 5. Verification

### How to Verify Success
- Automated: table-driven target resolution for every requested form, source-context resolution, cross-project targeting, normalization, conflicts, and invalid inputs.
- Website: verify that the resolved URLs display the intended ticket, subdocument, and project document using existing navigation contracts.
- macOS: click real links from BB with MDT closed and already running; record which app/window receives them, the displayed target, app-instance reuse, and whether any browser tab opens.
- Full URLs: compare ordinary HTTP(S) capture with custom-scheme delivery and record the supported behavior and setup requirements.
- Warm SPA behavior: retain an in-memory page identity across external target opens and verify no new document load. Separately observe target selection, unaffected app state, and isolation from another open browser/app client; PID/window identity alone is insufficient.
- Related MDT work: MDT-017 (website routing), MDT-093 (ticket subdocuments), MDT-150 (document links), MDT-184 (canonical route patterns).
- Source scenario: DEVPT-023 and its `plan.md` subdocument in the dev-process-tracker project.
- Platform reference: [WebKit: Safari web apps opening links](https://webkit.org/blog/15865/webkit-features-in-safari-18-0/#web-apps-for-mac).
- Platform reference: [Apple: receiving URLs in a macOS application](https://developer.apple.com/documentation/appkit/nsapplicationdelegate/application(_:open:)).
