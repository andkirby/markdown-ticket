# UAT Refinement Brief

**Ticket**: MDT-197 (pin rail) · **Round**: UAT Session 2026-10-30 · **Feedback source**: product owner

> "Pin board is never meant to be global — it shall work within a project only."

## Objective

Convert the pin rail from a **user-global, cross-project** surface to a **project-scoped** surface. The pin set becomes per-project (one set per project), the rail renders only the current project's pins, and legacy global pin data migrates per project without data loss.

## Approved Changes

1. **Scope change (behavior)**: Pins from other projects must never render in the current rail. Replaces the v1 "cross-project pins render side by side" behavior (BR-5 → BR-13).
2. **Storage upgrade (architecture)**: Pin persistence moves from user-global `~/.config/markdown-ticket/pins.json` to per-project `~/.config/markdown-ticket/projects/{projectId}/pins.json` — mirroring the established document-favs pattern exactly (`DocumentFavStateService`).
3. **API upgrade (architecture)**: `GET /api/pins?projectId=X` and `PUT /api/pins` with `projectId` in the body (document-favs input shape). Endpoints gain the per-project visibility gate (`ensureProjectVisible`), same as `/api/documents`.
4. **Data migration (Edge-4 refinement)**: On first read of a project with no pins file, pins matching that project's code are absorbed from the legacy user-global `pins.json`. The legacy file is **retained as backup** (never deleted server-side).
5. **Tooltip (no change)**: BR-6 tooltip keeps project code in the identity line — now constant per rail, harmless.
6. **Edge-5 removed (scope removal)**: Cross-project same-numeric-code disambiguation is moot — foreign pins never render.

## Changed Requirement IDs

| ID | Identity decision | Meaning |
|----|-------------------|---------|
| BR-5 | **replacement → deleted** | "Cross-project pins render side by side" — superseded by BR-13 |
| **BR-13** (new) | replacement for BR-5 | Rail shows only the current project's pins; switching projects swaps the pin set; a pin set never spans projects |
| BR-4 | refine_in_place | Persists **per-project** via the server endpoint |
| Edge-4 | refine_in_place | Older schema **or legacy user-global pins.json** → migrated (absorbed per-project) or reset; never throws |
| Edge-5 | **scope_removal → deleted** | Cross-project code collision can no longer surface |

## Affected Downstream Trace

- **BDD**: `cross_project_pins_render_side_by_side` deleted → `project_scoped_pin_set`, `legacy_global_pins_migrate_per_project` added (both cover BR-13).
- **Architecture**: OBL-1/2/3/4/5 retexted for project scoping; artifact paths corrected to actual repo layout (ART-4 → `server/modules/tickets/PinController.ts`, ART-5 → `server/modules/tickets/pins.ts`, ART-6 → `server/app.ts`, ART-7/8/9/10/11/12/15/16 → `frontend/src/...`, ART-12 = `ProjectRouteHandler.tsx` mount site).
- **Tests**: `TEST-api-cross-project` deleted → `TEST-api-project-isolation` (sets disjoint per project) + `TEST-api-legacy-migration` (absorb-on-read, bad-schema reset) added; `TEST-api-put-pins` / `TEST-api-reject-unknown-project` / `TEST-api-reconcile-on-read` retexted for projectId scoping. E2E suite unaffected (all single-project UI flows).
- **Tasks**: TASK-2/3/4 retexted to current-truth; **TASK-10** (backend slice) + **TASK-11** (frontend slice) added as the remaining execution work.

## Execution Slices

### Slice 1 — Backend: project-scope pin persistence (TASK-10)

- **Objective**: Per-project storage + projectId-scoped API + visibility gate + legacy absorb-on-read.
- **Direct artifacts**: `server/services/PinStateService.ts` (ART-3), `server/modules/tickets/PinController.ts` (ART-4), `server/modules/tickets/pins.ts` (ART-5), `server/app.ts` wiring (ART-6), `domain-contracts/src/app-config/input.ts` (pin input schema with projectId, mirroring `DocumentFavInputSchema`).
- **Direct GREEN targets**: `TEST-api-put-pins`, `TEST-api-project-isolation`, `TEST-api-legacy-migration`, `TEST-api-reject-unknown-project`, `TEST-api-reconcile-on-read`, `TEST-api-validate-schema`.
- **Why**: The storage scope is the root cause; fixing it once at the service layer upgrades API + migration together.

### Slice 2 — Frontend: project-keyed pin state (TASK-11)

- **Objective**: `usePins(projectId)` reloads/swaps the pin set on project switch; client sends projectId; rail renders only current-project pins.
- **Direct artifacts**: `frontend/src/config/pins.ts` (ART-7), `frontend/src/hooks/usePins.ts` (ART-8), `frontend/src/components/routes/ProjectRouteHandler.tsx` (ART-12 wiring).
- **Direct GREEN targets**: `pins_persist_across_reload`, `project_scoped_pin_set` (E2E suite stays green).
- **Why**: The hook is the single consumer of the API; keying it by project completes the scope change with no PinRail/PinItem changes.

## Validation

- `bun run --cwd server jest pins` — rewritten API suite (scoping, isolation, migration, visibility gate).
- `bun run validate:ts` — typecheck touched files.
- E2E `tests/e2e/pin-rail/pin-rail.spec.ts` stays green (UI flows unchanged; verify persist-reload still passes).
- `spec-trace validate MDT-197 --stage all` — passed post-sync (all 5 stages).
- **Real-data migration check**: legacy `~/.config/markdown-ticket/pins.json` holds ABC-003 (→ `projects/acmeballoon/`), MDT-226 + MDT-223 (→ `projects/markdown-ticket/`). After deploy, GET per project must surface exactly these pins; legacy file retained.

## Watchlist

- Legacy `~/.config/markdown-ticket/pins.json` is kept forever as a backup — safe to delete manually once per-project files are confirmed. Server never writes to it again.
- Pin files are keyed by canonical **project id** (`projects/acmeballoon/pins.json`), not project code — same as document favs. Clients may pass project code; the service resolves to the canonical id.
- `PinItem.projectCode` is retained in the schema (now must equal the owning project's code) — no domain-contracts schema churn, no PinItem/PinRail component changes.
- Design spec `docs/design/surfaces/pin-rail.spec.md` still says "cross-project by design" — update the persistence/scope paragraph to match (doc-only).

## Open Decisions

None — storage/API/frontend/migration approaches all follow the established document-favs pattern.
