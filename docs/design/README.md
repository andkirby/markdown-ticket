# Design Documents

This directory contains design specifications for MDT features and UI surfaces.

## Structure

```
docs/design/
├── README.md                          ← you are here
└── surfaces/                          ← UI surface specs
    ├── *.spec.md                      ← component composition + behavior specs
    └── *.mockups.md                   ← Wireloom wireframe mockups
```

## Document Types

### `.spec.md` — Component Specification

Describes a UI component's structure, composition tree, children, state, and source files. Written for implementers.

**Sections**:
1. **Title + one-line description** — what it is
2. **Composition** — tree diagram showing parent/child nesting
3. **Children** — table of child components with source paths
4. **State / Behavior** — notable state management or interaction patterns
5. **Source files** — table mapping spec elements to code paths

### `.mockups.md` — Wireframe Mockup

Contains Wireloom code fences rendering visual wireframes of a surface. May include annotation blocks describing interactions. Written for design review.

**Conventions**:
- One mockup per major state or variant of the surface
- Use Wireloom annotations (`annotation` blocks) to document design decisions inline
- Name files after the surface they depict

## Naming

- File name = the surface or feature name in kebab-case
- Paired files: `settings.spec.md` + `settings.mockups.md`
- A surface without a mockup (e.g., not visually complex) only needs a `.spec.md`

## Cross-references

Spec files reference each other via relative links:
```markdown
See [Wireloom Annotation Toggle](../features/wireloom-annotation-toggle.md) for compact mode design.
```

## When to Create a Design Doc

- **New UI surface** → `surfaces/<name>.spec.md` (and `.mockups.md` if visually complex)
- **New interaction pattern** that spans surfaces → reference from the surface spec
- **Post-implementation update** → update the spec to match reality (specs are living docs)
