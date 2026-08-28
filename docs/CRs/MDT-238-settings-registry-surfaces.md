---
code: MDT-238
status: Proposed
dateCreated: 2026-08-28T15:44:45.090Z
type: Feature Enhancement
priority: Medium
relatedTickets: MDT-168,MDT-237
---

# Declarative settings registry with attribute-driven surfaces

## 1. Description

### Requirements Scope
full — feature enhancement, metadata-driven settings system

### Problem
- The Advanced tab is a hand-maintained workaround: a dump of all settings existing only because proper contextual surfaces were never built
- Setting metadata is fragmented across three sources — the selectors registry, patch schemas, and script-local entries in the inspection tool — so the UI, the API validation, and the audit view can drift (this is how dead settings like the old `ui.*` section survived unnoticed)
- Settings lack human-facing attributes (label, grouping, help text), so every surface re-invents its own presentation

### Affected Areas
- Frontend: Settings surfaces (Advanced, project-edit, documents-settings)
- Shared/domain: unified settings schema (single source of truth)
- Tooling: config inspection output

### Scope
- **In scope**: one declarative schema record per setting; surfaces generated from it; the inspection tool reads it; the PATCH API validates against it
- **In scope**: browser (localStorage/cookie) settings join the same registry so every setting is one enumerable universe
- **Out of scope**: changing where values live (files stay the value store; no DB, no website/store-style value layering)
- **Out of scope**: changing the enforcement model (existing owner-only PATCH gate stays)

## 2. Desired Outcome

### Success Conditions
- Adding a new setting means declaring one record; it appears in the right surface, validates through the API, and shows in inspection — with no hand-built form code
- Each setting carries presentation attributes (label, description, group, order, type) usable by any surface
- The Advanced tab becomes the auto-generated all-settings view (owner-only escape hatch) — no hand-maintained forms remain
- Guarded settings render with warning + confirmation flow driven by the schema; readOnly/fileOnly settings are visible but not editable in generated surfaces
- Removing a setting removes it everywhere at once (registry, surfaces, inspection) — single-source deletion

### Constraints
- Schema record shape (Magento-2-inspired, adapted): `key`, `label`, `description`, `group`, `scope` (browser | user.toml | config.toml | project | registry), `access` (owner-only | device-local), `exposure` (editable | guarded | readOnly | fileOnly), `type` + validation (zod schemas referenced, not duplicated), `surface` + order, `depends`
- Must reuse existing enforcement: owner-only file mutations route through the existing PATCH gate; browser settings never reach the backend
- Must not require new infrastructure; the registry lives in domain-contracts beside the current selectors
- Migration is a rewrite of metadata, not of stored values — existing config.toml / .mdt-config.toml / user.toml files remain valid

### Non-Goals
- Not porting Magento's website/store value layering or DB-backed config
- Not introducing i18n/translation of labels (may come later)
- Not changing the auth model or access-policy prefixes

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Schema location | Extend the existing selectors registry in place, or new schema module consuming/replacing it? | Registry is the API's default-deny source — replacement must be atomic |
| Surface generation | Render surfaces from the registry at build time (codegen) or runtime (generic form renderer)? | React components, existing modal patterns (src/MODALS.md) |
| Browser settings | How do device-local settings declare their storage (localStorage key vs cookie) in the schema? | browser.theme lives in a cookie today |
| Access levels | Is `owner-only | device-local` sufficient, or is an intermediate authenticated level needed? | Current auth has owner + agents + read sessions |
| Depends | Which visibility dependencies are actually needed in v1? | Keep minimal; avoid Magento-level complexity |

### Known Constraints
- The three current metadata sources (selectors registry, patch schemas, inspection supplements) must collapse into one without breaking the PATCH API contract
- Domain-contracts resolves from dist — build ordering matters for consumers

### Decisions Deferred
- Exact schema field list and module layout (`mdt:architecture`)
- Surface renderer approach (`mdt:architecture`)
- Task breakdown (`mdt:tasks`)

## 4. Acceptance Criteria

### Functional (Outcome-focused)
- [ ] A setting declared once in the registry renders in its contextual surface with label, description, and correct input type
- [ ] The Advanced tab renders all registry settings grouped by section, generated — no per-setting hand-written form code
- [ ] Guarded settings require an explicit confirmation flow; readOnly/fileOnly settings display without edit affordances
- [ ] A browser-scoped setting is listed in the same registry with its storage kind, and never reaches the backend
- [ ] The config inspection tool output is generated from the same registry (no script-local supplement entries)
- [ ] Removing a setting from the registry removes it from all surfaces and inspection simultaneously

### Non-Functional
- [ ] Generated surfaces are keyboard-navigable and match existing focus-ring and modal conventions

### Edge Cases
- Settings whose stored value exists but whose registry record is gone (orphaned values) — displayed or hidden, consistently
- Registry record whose validation schema and declared type disagree — fails loudly at build/test time
- Empty groups (all members fileOnly/readOnly) — group renders as read-only display or is hidden

## 5. Verification

### How to Verify Success
- Manual: add a throwaway setting record; confirm it appears in its surface, in Advanced, in `inspect:config` output, and round-trips through PATCH — then delete it and confirm it vanishes everywhere
- Automated: registry consistency test (type-vs-schema agreement, unique keys, every patch schema has a record and vice versa); rendering tests for generated surfaces