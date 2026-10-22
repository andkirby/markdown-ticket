# Proof of Concept: links into the existing Safari MDT app

- CR: MDT-250; app epic: MDT-251.
- Date: 2026-10-20.
- Answer: **Partial — the macOS helper works; clicking links from BB does not yet reach it.**
- Feature status remains Proposed. These are spike results, not implementation acceptance.

## Question

Can a small registered `mdt://` helper resolve ticket/project-document links and open the requested content in the existing Safari MDT app, including warm reuse and cold launch? Can BB deliver the click?

## Hypothesis

- A native URL handler can translate the requested URI forms into existing website routes and deliver those URLs specifically to the installed Safari app.
- A running Safari MDT instance can navigate without adding another app instance or document window.
- BB will expose the custom link as clickable and deliver it to macOS. This part was disproved in the observed chat renderer.

## Experiment

- Spike location: `poc/app-handoff/`, already ignored by the repository's `**/poc/` rule.
- Initial platform: macOS 15.7.9; installed Safari wrapper `~/Applications/MDT.app`, bundle ID `com.apple.Safari.WebApp.4C9AB6DE-8BCD-48D0-A092-EACE722751C9`.
- Observed configured website origin: `http://localhost:3070/`.
- Baseline UI: GPDE Board, project GPT German Lerner. This made DEVPT/MDT navigation a cross-project check.
- Used Swift/AppKit without third-party dependencies. Existing Safari app files and production MDT code were not modified.
- Registered a temporary helper for `mdt` and `mdt-poc-250` only after checking that neither had an existing handler. Both registrations were removed afterward.
- Another installed app exists at `/Applications/apps/MDT.app`, bundle ID `com.mdt.app`. It was not used or modified; delivery explicitly targeted the Safari wrapper's full path.

| Spike artifact | Purpose |
|---|---|
| `poc/app-handoff/Helper.swift` | URI resolution, source-project example generation, URL-event receiver, forwarding and PID logging |
| `poc/app-handoff/build.py` | Build a disposable app bundle with URL types |
| `poc/app-handoff/probe.py` | Replay the resolution/context experiment matrix |
| `poc/app-handoff/inspect.swift` | Inspect registered handlers, app paths and running receiver PIDs |
| `poc/app-handoff/README.md` | Run and cleanup instructions |
| `poc/app-handoff/evidence/` | Resolver results, helper events, process snapshots and compact native UI observations |

### Key code

```swift
let configuration = NSWorkspace.OpenConfiguration()
configuration.activates = true
NSWorkspace.shared.open(
    [target],
    withApplicationAt: safariApp,
    configuration: configuration
) { app, error in
    // Record receiver PID/error, then terminate the helper.
}
```

- The helper declares `CFBundleURLTypes` and receives URLs through `application(_:open:)`.
- Target construction and app delivery are separate functions. The website origin/app path are deliberately hardcoded for this spike.

## Findings

### Observed results

| Experiment | Result | Evidence |
|---|---|---|
| `open -a ~/Applications/MDT.app <full ticket-subdocument URL>` | PASS | Safari switched from GPDE to DEVPT-023; native HTML URL ended in `/prj/DEVPT/ticket/DEVPT-023/plan.md`; heading `DEVPT-023 implementation plan` |
| `open mdt://DEVPT/README.md` | PASS | Safari showed project Dev process tracker, HTML URL `/prj/DEVPT/documents?file=README.md`, heading `Dev Process Tracker` |
| `open mdt://MDT-250` while Safari showed DEVPT | PASS | Safari showed `/prj/MDT/ticket/MDT-250` and the MDT-250 title |
| `open mdt://DEVPT/DEVPT-023/plan.md#ownership-and-architecture` | PASS for project/ticket/subdocument delivery | Helper forwarded the requested fragment; visual section position/preservation was not established |
| Warm instance reuse | PASS | Helper events recorded Safari PID 36090 before forwarding and receiver PID 36090 afterward |
| Warm document-window count | PASS in the observed single-window setup | Safari Window menu listed one document after direct delivery and after the explicit-project alias |
| Cold `open mdt://DEVPT-023/plan.md` | PASS | Confirmed no Safari MDT PID before invocation; helper recorded an empty before-PID list and receiver PID 64614; settled UI showed the requested plan |
| Custom-scheme Markdown link in BB chat | FAIL for clickable delivery | Label `PoC: open DEVPT-023 plan` appeared as plain text, without an actionable link node |
| Ordinary HTTP URL clicked in BB chat | FAIL for delivery to the separate Safari app | BB opened its built-in browser at `http://127.0.0.1:3070/prj/DEVPT/ticket/DEVPT-023/plan.md`; selected `plan` tab. Safari stayed on README |
| Ordinary OS `open <full HTTP URL>` | No Safari capture observed | Safari stayed on MDT-250. The receiving browser was not independently inspected |

### Resolution and originating context

- The executable matrix passed 13 URI-resolution/rejection cases and 3 originating-context cases, 16 total.
- Resolution includes all requested forms: ticket-key authority, explicit project plus ticket, project document path, and `SOME` cross-project examples.
- Additional cases cover lowercase/short keys, encoded spaces, fragment forwarding, an existing full website URL, conflicting project/key, encoded traversal, missing document path, and a different website origin.
- `--link docs/my.md ~/.config/dev-process-tracker` emitted `mdt://DEVPT/docs/my.md`.
- The same reference with `~/home/markdown-ticket` emitted `mdt://MDT/docs/my.md`.
- A reference originating in `/tmp` failed because it had no project context. The prototype did not use the receiving app's selected project.
- `SOME` is a parser fixture, not a registered/live project assertion. Actual cross-project UI navigation used DEVPT and MDT.

### Constraints and limitations

- **The caller matters:** a registered macOS handler cannot receive a link that the chat renderer exposes only as text. BB's observed full-URL path also used its own browser instead of handing the click to the Safari app.
- BB exposed a loopback full URL as `127.0.0.1` while the Safari wrapper is configured for `localhost`. Treat origin rewriting and browser selection as separate integration concerns; this experiment does not establish that host rewriting alone explains capture behavior.
- Normal website route parsing is reused conceptually, but the throwaway Swift resolver duplicates route strings. Production design must use the existing canonical route/resolution ownership rather than promote this duplicate implementation.
- Origin and app identity must become installation-specific settings. No shipping installer, signing, updates, or automatic creation of a Safari web app was tested.
- Source context must be encoded when generating a link. A URL event delivered by macOS does not carry the shell/agent's originating working directory.
- Source-project generation only demonstrates project-root inputs. Nested-directory path rebasing, absolute filesystem references, full URL input/output policy, and complete filename/path validation remain for the contract and implementation stages.
- The helper passes fragments, but a later accessibility snapshot showed a different hash on the same plan. Exact anchor scrolling/preservation is not proven.
- Only a single-window Safari setup was exercised. Choosing among multiple existing windows, unavailable-server recovery, and other operating systems remain unverified.
- Native UI inspection of a stopped target can itself relaunch it. The accepted cold baseline used app inventory and process inspection before sending the URL, without reading Safari UI until afterward.

## Execution evidence

```text
Direct command (home path abbreviated): open -a ~/Applications/MDT.app \
  http://localhost:3070/prj/DEVPT/ticket/DEVPT-023/plan.md
Exit: 0
Observed native heading: DEVPT-023 implementation plan

Warm helper event:
input: mdt://DEVPT/README.md
safariPIDsBefore: [36090]
receiverPID: 36090
error: null

Cold helper event, 2026-10-20T14:16:50Z:
input: mdt://DEVPT-023/plan.md
safariPIDsBefore: []
receiverPID: 64614
error: null

Resolution experiment: python3 poc/app-handoff/probe.py
Result: 16 PASS rows, exit 0

Cleanup inspection:
HANDLER mdt none
HANDLER mdt-poc-250 none
```

## Decision

- **Validated:** a small macOS URL-handler app can forward resolved URLs to this existing Safari wrapper, navigate tickets/documents, reuse a warm instance, and cold-launch it.
- **Not validated end to end:** agent reply → clickable `mdt://` link in BB → Safari MDT. BB chat did not expose the custom link as actionable, and its HTTP link opened an internal browser.
- Recommended next step: resolve the caller integration before locking the delivery architecture. Determine how BB can permit the custom scheme and hand it to macOS, or expose an explicit external-app action for the canonical website URL.
- A helper remains a viable macOS delivery component. This PoC does not require a full desktop UI rewrite and does not settle MDT-251's broader packaging choice.
- Ordinary full URLs remain useful website targets, but the observed default click behavior is insufficient for the requested Safari-app experience.

## Impact on architecture

| Aspect | Implication |
|---|---|
| Caller integration | Make renderer support and OS handoff explicit requirements; installing a URL handler alone is insufficient |
| Target resolution | Resolve originating project before emitting portable links; preserve explicit cross-project identity |
| macOS delivery | Use an explicit configured app target; instance reuse has runtime evidence for this wrapper |
| Route ownership | Keep ticket/document route construction with the canonical MDT resolver/builders |
| Verification | Test caller, handler, receiving app, displayed content and window behavior separately |
| Epic scope | Safari app creation, distribution and server lifecycle remain separate app-level questions |

## Cleanup

- [x] Throwaway source, compiled helper and detailed evidence remain under ignored `poc/`.
- [x] Temporary `mdt` and `mdt-poc-250` registrations removed; inspection restored both to no handler, matching the baseline.
- [x] Installed Safari app, the other native MDT app, production code and shared configuration unchanged.
- [x] Existing unrelated worktree changes preserved; no commit created.
- The Safari app remains open on the verified DEVPT-023 plan. UI navigation and one cold restart were runtime effects of the experiment.

## Next steps

- User follow-up: the open-URL approach refreshes the app page. The successful process/window checks above did not measure page-runtime continuity and must not be read as SPA-navigation evidence.
- Warm SPA navigation is now an explicit MDT-250 outcome. A next spike should deliver an open-target command to one registered app session, have its existing router navigate, and activate the app without sending another browser URL navigation. The existing SSE/event-bus infrastructure is a candidate transport; its current file-change broadcast is not an implemented navigation command.
- Verify the next spike with a stable in-memory page identity, no new top-level document load, the requested target visible, and a second connected client remaining on its current route. Cold launch still requires initial website loading. App-instance targeting, delivery acknowledgement and fallback remain design questions.
- Clarify BB custom-link/external-app delivery and the remaining URI-contract decisions, then continue with `mdt:architecture MDT-250` using this evidence.
- Keep MDT-250 Proposed until the normal specification/approval flow advances it; do not mark feature acceptance criteria complete from a throwaway spike.
- Platform references: [Apple URL-event receiver](https://developer.apple.com/documentation/appkit/nsapplicationdelegate/application(_:open:)) and [WebKit Safari web-app link capture](https://webkit.org/blog/15865/webkit-features-in-safari-18-0/#web-apps-for-mac).
