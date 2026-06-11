# Design Documents

This directory contains design specifications for MDT features and UI surfaces.

## Structure

```
docs/design/
├── README.md                          ← you are here
└── surfaces/                          ← UI surface specs
    ├── <entity>.spec.md               ← durable UX source of truth
    ├── <entity>.interactions.md       ← complex state / keyboard / precedence contracts
    └── <entity>.mockups.md            ← Wireloom wireframe mockups
```

## Document Types

### `.spec.md` — Component Specification

Durable source of truth for a UI surface. Written for implementers and reviewers.

**Sections**:
1. **Title + one-line description** — what it is
2. **Owns / Does Not Own** — clear source-of-truth boundaries
3. **Composition** — tree diagram showing parent/child nesting
4. **Children** — table of child components with source paths
5. **States / Responsive / Accessibility** — visible UX contract
6. **Source / Verification Anchors** — small set of code and test refs for drift checks

Do not use specs for phase plans, design exploration, code inventories, or deep CSS recipes unless the styling is part of the user-visible contract.

Source refs are drift protection, not bureaucracy. Prefer 3-6 anchors: the owning component, key behavior model, semantic style contract when relevant, and user-visible tests. Do not add line refs or utility-class inventories by default.

### `.interactions.md` — Interaction Contract

Optional document for surfaces with complex behavior. Use when state precedence, keyboard routing, result ordering, or cross-surface boundaries would make the main spec hard to scan.

Examples:
- `quick-search.interactions.md`
- `documents-view-file-updates.spec.md` does not need a separate interactions file because its behavior fits in the surface spec.

### `.mockups.md` — Wireframe Mockup

Contains Wireloom code fences rendering visual wireframes of a surface. May include annotation blocks describing interactions. Written for design review.

**Conventions**:
- One mockup per major review state or variant of the surface
- Use Wireloom annotations (`annotation` blocks) to document design decisions inline
- Name files after the surface they depict
- Do not add separate full-window mockups for hover-only, selected-only, or minor styling variants

## Naming

- File name format: `<entity>.<document-artifact>.md`
- Entity name = the surface or component in kebab-case
- Artifact name = `spec`, `interactions`, `mockups`, or another explicit document role
- Paired files: `settings.spec.md` + `settings.mockups.md`
- Complex surfaces may add a third artifact: `quick-search.interactions.md`
- A surface without a mockup (e.g., not visually complex) only needs a `.spec.md`

## Cross-references

Spec files reference each other via relative links:

```markdown
See [Quick Search Interactions](surfaces/quick-search.interactions.md) for scope and keyboard behavior.
```

## When to Create a Design Doc

- **New UI surface** → `surfaces/<name>.spec.md` (and `.mockups.md` if visually complex)
- **Complex interaction model** → `surfaces/<name>.interactions.md`
- **New interaction pattern** that spans surfaces → reference from the surface spec
- **Post-implementation update** → update the spec to match reality (specs are living docs)
