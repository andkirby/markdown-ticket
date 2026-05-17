---
code: MDT-169
status: Implemented
dateCreated: 2026-05-17T16:07:19.884Z
type: Feature Enhancement
priority: Medium
relatedTickets: MDT-138
---

# Add document view filename tabs

## 1. Description

### Requirements Scope
`full` — detailed behavior requirements for document view tab grouping

### Problem
- Document view opens each markdown file as a standalone document, even when filenames represent variants of one logical document.
- Files such as `some-name.one.md` and `some-name.two.md` cannot be viewed as related tabs under `some-name`.
- Users need the grouped tab behavior from MDT-138 available for general documents without changing the document tree.

### User Value
- Users can navigate related document variants from a single document view.
- Opening a specific variant file lands directly on the matching tab.
- Existing document tree structure remains predictable and unchanged.

### Affected Areas
- Frontend: Documents view and document rendering surface
- Backend: Document discovery metadata exposed to the frontend
- Shared: Document model behavior if grouping metadata is needed
- Tests: Document navigation and grouping coverage

### Scope
- In scope: Group dot-notation sibling markdown documents into one document view with tabs.
- In scope: Preserve the existing document tree exactly as separate files.
- In scope: Open the corresponding tab when a grouped child file is selected from the tree.
- In scope: Sort tabs alphanumerically.
- Out of scope: Changing ticket subdocument behavior from MDT-138.
- Out of scope: Renaming, moving, or merging files on disk.
- Out of scope: Changing non-markdown file handling.

## 2. Desired Outcome

### Success Conditions
- When `some-name.one.md` and `some-name.two.md` exist, the document view shows one logical `some-name` document with `[one] [two]` tabs.
- When the user opens `some-name.two.md` from the document tree, the `some-name` document view opens with `[two]` selected.
- When the user opens `some-name.one.md` from the document tree, the `some-name` document view opens with `[one]` selected.
- Document tree entries remain unchanged and continue to show `some-name.one.md` and `some-name.two.md` as individual files.
- Tab order is alphanumeric for all grouped variants.

### Naming Rules
- `base.variant.md` groups under logical document `base` with tab `variant`.
- `base.variant.extra.md` groups under logical document `base` with tab `variant.extra` unless architecture identifies a project convention requiring a different split.
- Files without a dot-notation variant continue opening as normal standalone documents.

### Constraints
- Must align with the MDT-138 approach for ticket subdocuments where applicable.
- Must not affect document tree discovery, ordering, or display.
- Must not change the files stored on disk.
- Must preserve direct opening of any document tree file.
- Must support alphanumeric tab sorting.
- Must keep ungrouped document behavior unchanged.

### Non-Goals
- Not introducing folders or virtual tree nodes for grouped documents.
- Not adding document editing workflow changes.
- Not changing ticket detail tabs unless required for shared component compatibility.

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Architecture | Should document grouping reuse MDT-138 tab structures or introduce document-view-specific grouping metadata? | Must preserve document tree behavior. |
| Routing | How should a selected variant be represented in URL or local selection state? | Opening a tree file must select the matching tab. |
| Parsing | Should grouping use the first filename segment as the base for multi-dot filenames? | MDT-138 preserves the remainder as the sub-key. |
| Compatibility | How should a root file such as `some-name.md` coexist with `some-name.one.md`? | Existing standalone document behavior must remain understandable. |

### Known Constraints
- Document tree must stay as is.
- Tab labels must be sorted alphanumerically.
- Related precedent is MDT-138 dot-notation subdocument tabs.
- Architecture owns final API and component boundaries.

### Decisions Deferred
- Exact data shape for grouped document metadata.
- Specific frontend component extraction or reuse.
- Specific automated test locations.
- URL versus state representation for selected tabs.

## 4. Acceptance Criteria

### Functional
- [ ] `some-name.one.md` and `some-name.two.md` render as one logical document view with `[one] [two]` tabs.
- [ ] Selecting `some-name.two.md` in the document tree opens the grouped view with `[two]` active.
- [ ] Selecting `some-name.one.md` in the document tree opens the grouped view with `[one]` active.
- [ ] The document tree continues to display the original files as separate entries.
- [ ] Tabs are sorted alphanumerically.
- [ ] Ungrouped markdown documents continue to open without tabs.
- [ ] A root document and variants can coexist without losing access to either content.
- [ ] Multi-dot variant names remain accessible and predictable.

### Non-Functional
- [ ] Grouping does not introduce visible delay when opening the documents view.
- [ ] Existing document tree interactions remain stable.
- [ ] Tab rendering follows existing project UI conventions.

### Edge Cases
- [ ] Only one variant exists, such as `some-name.one.md`.
- [ ] Root file exists with variants, such as `some-name.md` and `some-name.one.md`.
- [ ] Multi-dot variants exist, such as `some-name.alpha.beta.md`.
- [ ] Numeric labels sort naturally enough for expected user navigation, such as `one`, `two`, `10`.
- [ ] Files with similar prefixes but different bases do not group incorrectly.

## 5. Verification

> Requirements trace projection: [requirements.trace.md](./MDT-169/requirements.trace.md)
> Requirements notes: [requirements.md](./MDT-169/requirements.md)
> BDD trace projection: [bdd.trace.md](./MDT-169/bdd.trace.md)
> BDD notes: [bdd.md](./MDT-169/bdd.md)
> Architecture trace projection: [architecture.trace.md](./MDT-169/architecture.trace.md)
> Architecture notes: [architecture.md](./MDT-169/architecture.md)

### How to Verify Success
- Manual: Create grouped document filenames and verify tree display, selected tab behavior, and tab ordering.
- Automated: Add coverage for grouping rules, active-tab selection from tree opens, and ungrouped document behavior.
- Regression: Verify MDT-138 ticket subdocument behavior still works.
