# UX Gate Reference

Use this reference for UI, interaction, content, visual, or durable design-doc
changes.

## Contract

1. Read project UX/design docs and `docs/SKILLS.md` when present.
2. Prefer a project UX skill or reviewer role from the local registry.
3. If none exists, use the global UX designer/specifier skill.
4. Write a ticket-local `ux-design.md` draft before durable docs.
5. Run a reviewer gate before updating durable design docs.
6. Update durable docs only after approval, or record why no durable doc changed.

## `ux-design.md`

Include only what affects implementation:

```text
Journey intent: <user goal and situation>
Surfaces: <screens/components/routes>
States: <empty/loading/error/success/permission/mobile/etc.>
Interactions: <commands, gestures, keyboard, navigation>
Accessibility/responsive: <required constraints>
Alternatives considered: <brief>
Reviewer: <identity/tool>
Verdict: <approved/revise>
Required changes: <items or none>
Durable docs: <updated paths or reason skipped>
```

## Reviewer Gate

The reviewer checks:

- Journey intent is explicit.
- State coverage is complete enough to implement.
- Durable docs describe final behavior, not draft history.
- Accessibility and responsive expectations are stated.
- The design does not contradict requirements, architecture, or tests.

Do not proceed to Tests or Tasks until required UX review changes are resolved.
