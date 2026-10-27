# MDT-252 pre-flight

## Objective and authorization

Deliver stored external tracker references, clickable presentation, and reference search. User authorized implementation, scoped commits, Codex review with fixes, and final Implemented status. UI agreement is explicitly required first; styleguide.html and canonical surface docs follow that agreement.

## Discovery

- Ticket: `docs/CRs/MDT-252-external-tracker-links.md`, Proposed.
- Repository baseline: clean `main`; HEAD captured in `.pipeline-state.json`.
- Runtime: Bun, TypeScript, React; Jest server/shared tests and Playwright E2E.
- Owner docs read: root AGENTS.md, docs/SKILLS.md, design README, ticket-card spec/mockups, THEME.md, STYLING.md, MODALS.md, BADGE_ARCHITECTURE.md.
- Workflow: mdt:pipeline-e2e with stage owners; mdt-ux-designer, ux-designer-specifier, wireloom, mdt-tools, codex-thread.
- UI source truth: TicketCard.tsx uses key/timestamp row, separate title, attributes. Existing card design docs predate this structure; reconcile at approved UX handoff.
- Dependency correction: user meant MDT-254, already implemented (key-pattern consolidation at current HEAD). MDT-264 is irrelevant.
- No unrelated dirty paths. Never restart existing servers.
- Verification selection: focused domain/shared/server/CLI tests as appropriate, frontend unit tests, isolated Playwright wrapper, build/type validation and scoped lint. Exact commands selected by Tests milestone after UX agreement.

## Delivery sequence

1. Agree on card reference presentation using the ticket-local UX draft and independent Codex review.
2. Complete assessment, requirements, scenarios, architecture, verification map, and implementation tasks; resolve reference/config/search semantics against code.
3. Update canonical surface specs/mockups and frontend/src/styleguide.html to the agreed design.
4. Implement stored refs, configured resolution, editing paths, search, and UI; verify through the documented runtimes.
5. Obtain independent Codex implementation review, fix findings, commit coherent changes, and move MDT-252 to Implemented once all required work passes.

Only step 1 is ready for user agreement. No implementation or final readiness is claimed.
