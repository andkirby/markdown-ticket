---
code: MDT-237
status: Proposed
dateCreated: 2026-08-24T13:15:11.023Z
type: Feature Enhancement
priority: Medium
relatedTickets: MDT-150, MDT-059, MDT-154
---

# Render inline-code .md references as clickable links

## 1. Description

### Requirements Scope
full — feature enhancement, navigable document references

### Problem
- Agents (AI assistants authoring tickets and docs) reference other `.md` files using the inline-code convention — `` `path/to/some.md` `` — which renders as plain code text, not a link
- Inline code is deliberately excluded from link conversion (MDT-150, MDT-059), so this convention silently bypasses the app's document navigation
- Users must manually copy the path and find the document themselves; the opportunity for one-click navigation to referenced documents is missed

### Affected Areas
- Frontend: Markdown rendering and link processing pipeline
- Frontend: Document navigation (SmartLink, document viewer)
- Authoring: The convention agents follow when writing cross-document references

### Scope
- **In scope**: References to `.md` files written as inline code in rendered markdown become navigable to the referenced document
- **In scope**: Deciding the system split — render-side detection, an authoring convention, or both
- **Out of scope**: Changing how real markdown links (`[text](href)`) render
- **Out of scope**: Non-markdown file references (images, source files) unless architecture includes them
- **Out of scope**: Reviving or reworking MDT-059 (On Hold)

## 2. Desired Outcome

### Success Conditions
- When a rendered document contains an inline-code reference matching a `.md` file path, the user can click it and land on that document in the app via client-side navigation
- References to non-existent documents are visibly flagged rather than silently dead, consistent with existing scope-validation behavior
- The system works on documents agents already wrote — users are not required to manually reformat existing inline-code references
- Out-of-scope or path-traversal targets are blocked and flagged; navigation never escapes project boundaries

### Constraints
- Must reuse the existing document URL scheme and scope validation from the SmartLink pipeline (MDT-150)
- Must not convert inline code inside fenced code blocks, or inline code that is genuinely code (commands, flags, paths in examples) into navigation
- Must not break existing ticket-key linkification or markdown-link rendering
- Navigation must be client-side (no full page reloads)

### Non-Goals
- Not building a general wiki system (backlinks, graph, transclusion)
- Not changing the established inline-code protection for code samples
- Not enforcing a single authoring tool or workflow on agents beyond what architecture decides

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Approach | Change agent authoring convention (write real links) vs. render-side detection of `.md`-shaped inline code vs. both? | Existing docs already use inline-code convention; render-side must avoid false positives |
| Detection | Which path shapes qualify: bare filename, relative path, leading `../`, `TICKET-KEY.md`? | Scope validation rules from MDT-150 apply |
| False positives | How to distinguish a navigable doc reference from a `.md` path inside a command or example (e.g., a rename command)? | Fenced code is protected; inline genuine code must remain verbatim |
| Authoring | If an authoring convention is adopted, where does it live (project docs, agent skills) and is it enforced? | Must remain readable as raw markdown; no new tooling dependencies |

### Known Constraints
- The existing pipeline intentionally protects inline code from link conversion; any change must preserve that protection for genuine code
- Document URLs use the query-parameter scheme produced by the SmartLink pipeline; generated links must resolve to working URLs

### Decisions Deferred
- Implementation approach and pipeline placement (`mdt:architecture`)
- Whether an authoring convention is part of the solution (`mdt:architecture`)
- Task breakdown (`mdt:tasks`)

## 4. Acceptance Criteria

### Functional (Outcome-focused)
- [ ] An inline-code `.md` reference in a ticket/document body renders as a clickable element
- [ ] Clicking it navigates to the referenced document with client-side routing (no full page reload)
- [ ] A reference to a non-existent document is visibly flagged, not silently dead
- [ ] An out-of-scope or traversal path is blocked and flagged
- [ ] Inline code inside fenced code blocks remains unlinked and verbatim
- [ ] Existing markdown links and ticket-key references keep working unchanged

### Non-Functional
- [ ] Documents containing many inline-code spans render without perceptible regression vs. current rendering

### Edge Cases
- Inline code that merely mentions `.md` files in a command or example must not become a navigation link
- References that include an anchor fragment (`#section`) — behavior defined or explicitly unsupported
- Same filename in different directories (disambiguation)
- Paths with spaces or URL-encoded characters

## 5. Verification

### How to Verify Success
- Manual: open a document containing an inline-code reference (e.g., `` `../architecture/url-map.md` ``), click it, land on that document in the viewer
- Manual: a fenced code sample containing a `.md` path stays plain code
- Automated: rendering cases for detection, false-positive, flagging, and scope blocking (architecture will detail tests)