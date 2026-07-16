---
id: IDEA-006
research-date: 2026-07-11
status: research-complete
---

# IDEA-006 Sub-Areas Within a Project — Research Report

**Scope:** How a user can organize tickets into "sub-areas" within a single MDT project (e.g. `API`, `UI`, `DB` inside the `MDT` project). Evaluates the `MDT/API-123` key-embedded format against attribute-based alternatives.
**Related:**
- [MDT-143 / discovery-ticket-code-namespace.md](../CRs/MDT-143/discovery-ticket-code-namespace.md) — prior analysis of custom ticket-code namespaces (deferred)
- [ticket-numbering-scale.md](../../research/ticket-numbering-scale.md) — key/counter scaling research
- [ticket-service-architecture.md](../../research/ticket-service-architecture.md) — ticket service coupling

---

## Motivation

The original idea: a project hosts multiple "areas", each with its own ticket stream, surfaced *in the ticket key*:

```
MDT/API-123   → ticket #123 in the "API" area of the MDT project
MDT/UI-45     → ticket #45  in the "UI" area of the MDT project
```

Goal of this doc: find the approach that gives the **best UX** at **reasonably low implementation complexity**. We consider embedding the area in the key versus treating it as a separate attribute, and weigh both against real-world systems (Jira, GitHub, Linear).

---

## Current State (what the codebase gives us today)

| Aspect | Today | File / line |
|--------|-------|-------------|
| Key format | `CODE-NNN` (e.g. `MDT-123`) | `domain-contracts/src/ticket/frontmatter.ts:8` |
| Key regex | `/^[A-Z][A-Z0-9]{1,4}-\d{3,4}$/` — **no `/`, no area segment** | `frontmatter.ts:8` |
| Project code regex | `/^[A-Z][A-Z0-9]{1,4}$/` | `domain-contracts/src/project/schema.ts:6` |
| Key formatter (single owner) | `formatCrKey(code, num)` | `shared/utils/keyNormalizer.ts:38-41` |
| Number generation | Filename scan with `${code}-(\d+)-` regex | `shared/services/TicketService.ts:583-611` |
| Filename | `${crKey}-${slug}.md` — **key is embedded in filename** (`/` illegal) | `TicketService.ts:314` |
| Frontmatter categorization fields | `phaseEpic?: string`, `impactAreas?: string[]` — **both unused in frontend** | `frontmatter.ts:43-44` |
| Board grouping | By `status` only — no group/filter by area | `src/components/Board.tsx:313-332` |
| List view columns | Code, Title, Status, Modified — no area | `src/components/ProjectView.tsx:136-168` |
| Create flow | Hardcoded title + type — no field inputs at all | `src/components/Board.tsx:260-277` |
| Cross-project CLI syntax | `PROJECT/KEY` **already means** "project, ticket" — collision risk | `cli/src/commands/view.ts:29-52` |

**Key fact:** there is **no concept of "area", "component", "label", or "tag"** anywhere in the ticket model, config, or UI. The closest analog (`impactAreas: string[]`) is declared in the schema but never rendered, never filtered, and not even serialized to YAML by `MarkdownService`.

**Prior art:** MDT-143's discovery doc already analyzed a near-identical feature (custom code namespaces → `ABC/API-001`) and **deferred it** as "requires domain-model change", identifying 6 hard-coupled modules.

---

## Design Constraints

Any solution must respect:

1. **The key is embedded in the filename.** A `/` in the key is a path separator and breaks filesystem layout. Any separator must be filesystem-safe.
2. **The CLI already uses `X/Y`** to mean "project X, ticket Y" (`cli/src/commands/{view,attr,rename}.ts`). `MDT/API-123` collides directly with this.
3. **6 modules are hard-coupled to `project.code`** as the key prefix (per MDT-143): `createCR`, `getNextCRNumber`, `getCR`, `WorktreeService.detect`, `TicketLocationResolver.resolve`, `normalizeKey`.
4. **Keys are stable identity.** They appear in `relatedTickets`, `dependsOn`, `blocks`, git branch names, worktree names, and human memory. Changing a key = a rename event with cascading reference updates (there is a `rename-cr` skill precisely for this).
5. **`keyNormalizer.ts` is the single owner** of key formatting (centralized in MDT-159).

---

## Solution Options

### Option A — Area embedded in the key (`MDT/API-123` or `MDT-API-123`)

The original idea. The area is part of the ticket's identity.

```
MDT/API-123   (slash separator)
MDT-API-123   (dash separator)
API-123       (per-area prefix, project implicit)
```

**UX:**
- ✅ Area is always visible in the key itself — great for mentions, branch names, commit messages
- ✅ Self-describing: `API-123` immediately tells you the area
- ❌ **Area is immutable in practice** — moving a ticket from `API` to `UI` changes the key, breaking every cross-reference (`dependsOn`, `blocks`), every git branch, every worktree. The `rename-cr` skill exists precisely because renames are expensive.
- ❌ Fragmented numbering — `API-001`, `API-002`, `UI-001` makes total project ticket count opaque
- ❌ Slash form (`MDT/API-123`) **collides** with the existing cross-project syntax (`PROJECT/KEY`)
- ❌ Dash form (`MDT-API-123`) is ambiguous to parse unless project-code length is fixed/known
- ❌ Every cross-reference must now include the area: `dependsOn: MDT/API-005` is verbose

**Complexity:** **High.** Per MDT-143, touches all 6 coupled modules + 4 regex patterns + filename derivation + counter scanning (per-area or project-wide?) + worktree routing. Deferred once already as "too large for a delta."

| Touch point | Change required |
|-------------|-----------------|
| `CR_CODE_PATTERN`, `TICKET_KEY_INPUT_PATTERN`, `PROJECT_CODE_PATTERN`, `PROJECT_SCOPE_INPUT_PATTERN` | Rewrite to allow area segment |
| `formatCrKey()` | New `area` parameter |
| `getNextCRNumber()` | Per-area counter logic + regex |
| Filename (`${crKey}-${slug}.md`) | New filesystem-safe encoding of area |
| `TicketLocationResolver.resolve()` | Area segment in path |
| `WorktreeService.detect()` | Match on area prefix |
| CLI `parseTicketKey()` (`view`, `attr`, `rename`) | Disambiguate from cross-project `/` syntax |
| Frontend `routing.ts`, `routes.ts`, `useQuickSearch.ts` | URL encoding + key detection (6 locations forbid `/`) |
| Migration | Existing 239 CRs have no area — backfill + legacy key support |

**Verdict: ❌ Rejected.** Best-in-key visibility, but worst UX (immovable tickets, fragmented numbering, reference churn) and highest complexity. Already deferred in MDT-143 for good reason.

---

### Option B — Per-area independent prefixes (`ticketCodes` allowlist)

MDT-143's proposed design. Each area gets its own short code, registered in config.

```toml
# .mdt-config.toml
[project]
code = "MDT"
ticketCodes = ["MDT", "API", "UI", "DB"]
```

```
API-123   (area "API", number 123 — flat in docs/CRs/)
MDT-456   (no area / project-default, number 456)
```

**UX:**
- ✅ Short, clean keys
- ✅ Area visible in the key
- ❌ Same immutability problem as Option A (moving `API-123` → `UI-123` is a rename)
- ❌ Numbering is fragmented across areas (no single project-wide sequence)
- ❌ Loses the project prefix on every ticket — `API-123` doesn't tell you it's in the MDT project (collides visually with a real "API" project)
- ❌ Cross-project ambiguity: is `API-123` the MDT/API area, or a standalone "API" project?

**Complexity:** **High.** Same 6-module blast radius as Option A, plus config schema changes and cross-project collision resolution. This is Option A with a different surface syntax.

**Verdict: ❌ Rejected.** Inherits all of Option A's problems, adds cross-project ambiguity, and drops the project prefix.

---

### Option C — `area` as a frontmatter attribute (NOT in the key) ✅ RECOMMENDED

Keep the key stable and simple (`MDT-123`, unchanged). Add an `area` attribute to the ticket, separate from its identity.

```yaml
---
code: MDT-123          # ← identity, never changes
area: API              # ← categorization, freely mutable
status: Proposed
type: Feature Enhancement
priority: High
---
```

Project config declares the known areas (optional allowlist for validation + autocomplete):

```toml
# .mdt-config.toml
[project]
code = "MDT"

[areas]
known = ["API", "UI", "DB", "Docs", "Infra"]   # optional; free-text if absent
```

**UX (the best of all options):**
- ✅ **Stable identity** — `MDT-123` is forever; moving API→UI is a one-field edit, no rename, no reference churn
- ✅ **Single project-wide numbering** — `MDT-001`..`MDT-500` reads naturally; total count is obvious
- ✅ **Filtering** — List view gets an Area column; Board gets area filters
- ✅ **Grouping** — Board can group by area (swimlanes) in addition to status
- ✅ **Badges** — ticket cards show a colored area badge next to the code
- ✅ **Optional** — a ticket with no area still works; no forced categorization
- ✅ Area is still visible at a glance (badge) without being baked into the identity
- ❌ The area is not part of the key, so `MDT-123` alone doesn't tell you the area (but the badge does, and search/filter does)

**Complexity:** **Low.** This is a pure additive change — no existing pattern, parser, or path logic changes.

| Touch point | Change required |
|-------------|-----------------|
| Key regex / `formatCrKey` / filename / counter / worktree / routing | **None** — untouched |
| `TicketFrontmatterSchema` (`frontmatter.ts`) | Add `area: z.string().optional()` |
| `Ticket` interface + `TicketSchema` (`entity.ts`) | Add `area?: string` |
| `TICKET_UPDATE_ATTRS` (`input.ts:44`) | Add `'area'` (so it's mutable) |
| `MarkdownService.generateYamlFrontmatter()` | Write `area` to YAML |
| `normalizeTicket()` (`shared/models/Ticket.ts`) | Preserve `area` field |
| Project config schema (`schema.ts`) | Add optional `[areas].known` list |
| Frontend: Board filter/group, List column, TicketCode badge, Create/Edit form | New UI surfaces (additive) |

No migration needed: existing 239 CRs simply have no `area` (treated as "unassigned"). No existing key, path, or reference changes.

**Verdict: ✅ Recommended.** Best UX (mutable, filterable, groupable, stable identity) at the lowest complexity (additive only, zero blast radius on existing key/path infrastructure). Matches industry convention (see below).

---

### Option D — Sub-areas as separate projects

Each "area" is registered as its own project with its own code.

```
Project "MDT Core"   → MDT-123
Project "MDT API"    → MAPI-045
Project "MDT UI"     → MUI-012
```

**UX:**
- ✅ Zero new code — multi-project already works
- ✅ Each area gets its own board, its own numbering, its own config
- ❌ **Loses project cohesion** — the "MDT" project is now scattered across N project entries
- ❌ No cross-area board/view (the whole point of "sub-areas within a project")
- ❌ Cross-area `dependsOn` becomes cross-project references (heavier)
- ❌ Project switcher gets cluttered with area-projects

**Complexity:** **Zero** (it's the existing model). But it isn't really "sub-areas" — it's just more projects.

**Verdict: ⚠️ Workaround, not a solution.** Acceptable when areas are truly independent teams/repos, but defeats the "one project, multiple areas" goal.

---

### Option E — Labels/Tags (multiple areas per ticket)

GitHub-style labels. A ticket can belong to multiple areas.

```yaml
---
code: MDT-123
labels: ["area/api", "area/auth", "priority/high"]
---
```

**UX:**
- ✅ Most flexible — a ticket touching both API and Auth gets both
- ✅ Generalizes beyond areas (any taxonomy)
- ❌ Heavier UX — label management, color picking, namespace conventions (`area/` prefix)
- ❌ Overkill if the need is just "which area does this belong to"
- ❌ Multiple areas per ticket complicates Board grouping (which column/swimlane?)

**Complexity:** **Medium.** New `labels: string[]` field + label-management UI + filter/group logic. More than Option C, less than A/B.

**Verdict: ⚠️ Consider later.** Right answer if multi-dimensional tagging is needed; over-engineered for single-area grouping now. Note: the existing `impactAreas: string[]` field is an unused proto-version of this and could be revived.

---

## Evaluation Matrix

Scoring: UX (how good does it feel to use), Complexity (implementation effort + blast radius), Mutability (can a ticket change areas cheaply), and Numbering (is the project-wide sequence preserved).

| Option | UX | Complexity | Mutability | Numbering | Summary |
|--------|----|------------|------------|-----------|---------|
| **A. Key-embedded (`MDT/API-123`)** | ⚠️ Mixed | 🔴 High | 🔴 Rename | 🔴 Fragmented | Visible but rigid; deferred in MDT-143 |
| **B. Per-area prefixes (`API-123`)** | ⚠️ Mixed | 🔴 High | 🔴 Rename | 🔴 Fragmented | A's problems + cross-project ambiguity |
| **C. `area` attribute** ✅ | 🟢 Great | 🟢 Low | 🟢 Free | 🟢 Unified | Stable identity + mutable categorization |
| **D. Separate projects** | 🟡 OK | 🟢 Zero | 🔴 Re-create | 🔴 Split | Workaround, loses cohesion |
| **E. Labels/tags** | 🟢 Great | 🟡 Medium | 🟢 Free | 🟢 Unified | Best if multi-dimensional; overkill now |

---

## Industry Comparison

Real-world systems universally keep the ticket **identity** (number) stable and simple, and treat **categorization** (component/area/label) as a separate, mutable attribute. None bake the area into the key.

| System | Identity | Area mechanism | Area in key? |
|--------|----------|----------------|--------------|
| **Jira** | `PROJ-123` | Components (separate field, filterable) | ❌ No |
| **GitHub** | `#123` | Labels | ❌ No |
| **Linear** | `ENG-123` | Labels + Projects | ❌ No |
| **GitLab** | `group#123` | Labels | ❌ No |
| **Azure DevOps** | `123` | Area Path (hierarchical, separate) | ❌ No |

**Jira is the closest analogue** to what MDT-143/the original idea wanted, and Jira deliberately keeps the component *out* of the issue key. This validates **Option C**: the industry has already run this experiment and converged on attribute-based categorization.

---

## Recommendation

### Adopt Option C: `area` as a frontmatter attribute.

It delivers the best UX (mutable, filterable, groupable, stable identity) at the lowest complexity (additive only — zero changes to key format, filename, counter, worktree, or routing). It also aligns with how every major ticketing system solves this problem.

**Do not** pursue Option A/B (`MDT/API-123` key format) — the immutability tax (every area change is a rename with cascading reference updates), fragmented numbering, and the 6-module blast radius (already deferred in MDT-143) make it the worst complexity-to-UX ratio of the candidates.

### Phased rollout

**Phase 1 — Data model + minimal UI (low complexity, immediate value):**
1. Add `area: z.string().optional()` to `TicketFrontmatterSchema`, `Ticket`/`TicketSchema`, and `TICKET_UPDATE_ATTRS` (`domain-contracts`).
2. Serialize `area` in `MarkdownService.generateYamlFrontmatter()` and preserve it in `normalizeTicket()` (`shared/`).
3. Add optional `[areas].known` list to the project config schema for validation/autocomplete.
4. Rebuild `domain-contracts` → `shared` → dependents (per composite build order).
5. Frontend: show an Area badge on ticket cards (extend `TicketCardBadge` + `ContextVariant`), add an Area column to the List view, add an Area filter to the Board.

**Phase 2 — Richer UX (optional, when Phase 1 proves the model):**
6. Board swimlane grouping by area (alongside status columns).
7. Area picker in the (currently hardcoded) create flow — requires building a real create form.
8. Area color theming (per-area badge colors from config).
9. If multi-dimensional tagging is later needed, promote to Option E (labels) by reusing the existing `impactAreas` field or generalizing `area` → `labels`.

### Why not the key format (for the record)

The `MDT/API-123` format is visually appealing and was the original instinct, but it conflates **identity** (which ticket is this, forever?) with **categorization** (which area does this belong to, right now?). Those two concerns have different change rates: identity should be permanent, categorization should be fluid. Baking categorization into identity forces every re-categorization to become a rename — the most expensive operation in the system. Keeping them separate is both simpler to implement and better to use.

---

## Open Questions

1. **Single area vs. multi-area per ticket?** Option C assumes one `area` per ticket (simplest). If a ticket genuinely spans two areas, Option E (labels) is the upgrade path. Recommend starting single-area and revisiting if needed.
2. **Free-text vs. allowlist?** Config `[areas].known` gives validation + autocomplete, but free-text avoids a config edit for new areas. Recommend: allowlist when present, free-text fallback when absent (same pattern as today's lenient config).
3. **Should `impactAreas` be consolidated into `area`?** `impactAreas: string[]` is declared but unused. Decide whether to deprecate it in favor of `area`, or keep both (`area` = primary home, `impactAreas` = other areas touched).
4. **Cross-project area parity?** If areas become first-class, should the global registry allow area-based views across projects (e.g. "all `API` area tickets across all projects")? Out of scope for Phase 1, but worth not precluding.

---

## Related

- [MDT-143 / discovery-ticket-code-namespace.md](../CRs/MDT-143/discovery-ticket-code-namespace.md) — the deferred analysis this builds on
- [ticket-numbering-scale.md](./ticket-numbering-scale.md) — counter/numbering research
- [ticket-service-architecture.md](./ticket-service-architecture.md) — ticket service module coupling
- `domain-contracts/src/ticket/frontmatter.ts` — key format patterns (lines 8, 16, 25)
- `domain-contracts/src/ticket/entity.ts` — Ticket model (line 23: the unused `impactAreas` field)
- `shared/utils/keyNormalizer.ts` — single owner of key formatting (`formatCrKey`, line 38)
- `shared/services/TicketService.ts` — `createCR` (305) / `getNextCRNumber` (583)
- `src/components/Board.tsx` — status-only grouping (313)
- `src/config/ticketCardBadges.ts` — badge extension point
- [docs/PRE_IMPLEMENT.md](../PRE_IMPLEMENT.md) — type-safe enum pattern for adding the `area` field
