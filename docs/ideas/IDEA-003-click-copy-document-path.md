---
id: IDEA-003
status: deferred
date: 2026-06-10
resolution-date:
promoted-to:
---

# Click-to-Copy Document Path

## Idea

In the file navigator (documents view), clicking a document file copies its relative path to the clipboard. The system should give visual feedback so the user knows what happened — possibly a brief label or toast showing the copied path.

Path should be relative (e.g. `docs/CRs/MDT-042/some-file.md`), not absolute.

Hover on the file row should highlight it to signal it's interactive.

## Investigation

### Current state

- Documents view renders a file tree/folder browser
- No click-to-copy behavior exists on file rows
- Hover highlighting on file rows is unknown — needs checking

### Open questions

- **Click semantics**: Does clicking a document already do something (open it, select it)? If so, copy-on-click conflicts. Might need a dedicated action — e.g. a small copy icon button, or a modifier key (Alt+click).
- **Feedback pattern**: Toast? Inline flash? A brief "Copied!" badge that fades out?
- **Scope**: Just the documents navigator, or also ticket attachments?

## Decision

**Deferred** — Small and useful, but click semantics conflict with existing document open behavior. Needs UX decision on copy button vs modifier key. No urgency; promote alongside document view improvements.

## References

- Documents view: file tree component
