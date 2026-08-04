---
id: IDEA-010
status: triage
date: 2026-08-04
resolution-date:
promoted-to:
---

# Priority Polishing (Customizable Catalog + Clickable Badge + Sort)

## Idea

The left-stripe priority color on board cards is a good feature but rigid — only
`Critical` and `High` ever show a stripe, the palette is four hardcoded values,
and the color/icon/list cannot be configured. Polish priority into a first-class
configurable attribute:

1. Make the stripe color customizable.
2. Let users keep a default custom list of priorities (selected from a predefined
   superset) at global scope and per-project scope.
3. Make the priority badge in the ticket view clickable to change priority,
   writing the change back to the ticket.
4. Add priority to the sortable attributes.

## Investigation

### The governing constraint

`CRPriority` is a **closed Zod enum** baked into
`domain-contracts/src/types/schema.ts:56-73` (`Low`, `Medium`, `High`,
`Critical`). That enum is the validation boundary for ticket create/update across
MCP, REST, and CLI. `Ticket.priority` is typed `string` (permissive on re-save per
MDT-148), but every *input* path validates against `CRPrioritySchema`. The MCP
server is `mdt-all` scope — its tool schemas are static and cannot advertise a
per-project enum.

Consequence: asks #1 and #2 are the **same feature** (color and list both live in
one presentation catalog), and #4 is downstream of #2. Touching the priority list
means touching the validation schema, the MCP tool enum, the CLI alias resolver,
the filter facet, and the CSS stripe rule — all assume exactly four values today.

### Current state (verified)

- **Data model:** `CRPriority` enum + `CRPriorities` array + `CRPrioritySchema`
  in `domain-contracts/src/types/schema.ts:56-73`. Re-exported via
  `shared/models/Types.ts`, `shared/utils/constants.ts` (`PRIORITIES`,
  `DEFAULTS.PRIORITY = 'Medium'`).
- **Stripe:** CSS-only, via `data-priority` attribute +
  `--card-accent` custom property. `src/components/TicketCard/ticket.css:22-34`
  — **only `critical` and `high` produce a stripe**; `medium`/`low`/unknown fall
  back to `transparent`. Colors are `--prio-*` tokens in
  `src/styles/design-tokens.css:58` (light) / `:118` (dark). No JS color logic.
- **Icons:** `PRIORITY_ICON` map in `src/components/Badge/priorityIcons.ts:9-14`
  (`critical: Flame, high: ChevronUp, medium: Equal, low: ChevronDown`). Plain
  `Record<string, LucideIcon>` — no compile-time link to the enum.
- **Badge in ticket view:** `CompactTicketHeader.tsx:26` and
  `TicketAttributes.tsx:24` render `<PriorityBadge>`. **No inline edit control.**
- **Filter facet:** `BoardFilterBar/index.tsx:37` builds `PRIORITY_OPTIONS`
  directly from `CRPriorities`.
- **Sorting:** `src/config/sorting.ts:1-49` — four system attributes
  (`code`, `title`, `dateCreated`, `lastModified`). **Priority is absent.** The
  `system: boolean` flag is a vestigial hook for admin-configurable attributes
  (MDT-012 sketched a TOML reader/writer for this but never built it).
- **Edit API already handles priority:** `PATCH /api/projects/:id/crs/:crId`
  (`server/routes/projects.ts:179`), MCP `update_cr_attrs`, both rewrite YAML via
  `updateYAMLField`. `priority` is in `TICKET_UPDATE_ALLOWED_ATTRS`
  (`domain-contracts/src/ticket/input.ts:51`). **#3 needs no backend work.**
- **Config system:** three-tier merge already exists — global app
  `config.toml` → local `.mdt-config.toml`. No ticket-attribute / status /
  priority config exists in either today.
- **Architectural precedent:** `STATUS_CONFIG` (`src/config/statusConfig.ts:6-63`)
  is the template — closed enum + presentation registry
  (`{ label, color, description, isTerminal, canTransitionTo, order }`). `phaseEpic`
  is the *other* pattern (free-text, no catalog, neutral fallback styling).

### The architectural decision (open)

**Option A — grow the closed palette, customize presentation (recommend).**
Expand `CRPriority` to a predefined superset (e.g. add `Blocker`, `Major`,
`Minor`, `None`). Stored ticket values are always canonical keys. Config controls
presentation only: active subset, label/color/icon/order/weight/stripe. Mirrors
`STATUS_CONFIG`. Uses an existing pattern; introduces no third pattern.

**Option B — arbitrary free-form priorities (reject).** Kills the Zod enum.
Breaks MCP tool advertisement (static, multi-project). Loses input validation
everywhere. Gains nothing the "select from predefined" framing actually wants.

Proposed data shape (one struct — not a manager/factory/provider):

```ts
type PriorityEntry = {
  key: CRPriorityValue        // canonical, stored in frontmatter
  label: string               // display
  weight: number              // for sorting + stripe threshold
  color: string               // single token; bg derived via color-mix (as today)
  icon?: LucideIcon
  stripe: boolean             // replaces the hardcoded "critical/high only" rule
  alias?: string              // CLI short form
}
```

### Per-ask notes

- **#1 Custom stripe color:** not standalone. Stripe = `entry.color` where
  `entry.stripe === true`. The current hardcoded rule becomes default config
  (`stripe: true` on top two weights). Ship with #2 or not at all.
- **#2 Custom list, global + project:** reuse three-tier merge. `[priorities]`
  in global app config = default subset + overrides; `[priorities]` in
  `.mdt-config.toml` = project override, deep-merged. **One** pure resolver
  `resolvePriorityCatalog(global, project) → PriorityEntry[]`, shared by frontend
  and server.
- **#3 Clickable badge:** frontend-only. Turn `<PriorityBadge>` into a popover
  bound to the resolved catalog. Picker shows active subset; deactivated current
  value still renders and stays selectable.
- **#4 Priority sort:** ~10 lines in `src/config/sorting.ts`, gated on #2. Sort
  by `weight`, not alphabetical.

### Extended concerns to keep in scope

5. **Configurable default priority for new tickets.** Currently hardcoded
   `'Medium'` (`shared/utils/constants.ts:128`). If the active list is
   customizable, the default must be configurable too — otherwise new tickets get
   a value the user deactivated.
6. **Filter facet must consume the resolved catalog**, not `CRPriorities`
   directly (`BoardFilterBar/index.tsx:37`). Catalog = single source of truth for
   badge picker *and* filter *and* sort.
7. **CLI alias resolver is a hidden coupling.**
   `shared/services/ticket/attrResolver.ts:79-100` hardcodes
   `p1→Critical, p2→High, p3→Medium, p4→Low`. A reorderable/growing palette
   breaks `p1..p4`. Either derive aliases from `entry.alias`, or drop numeric
   aliases and accept canonical keys only.
8. **Backward compat for deactivated values.** User turns off "Critical" but 12
   tickets still have `priority: Critical`. Render with neutral fallback, keep
   selectable, never lose the value (the `phaseEpic` free-text field already
   behaves this way).

### Explicit rejects (do not carry into the ticket)

- No `PriorityManager` / `Provider` / factory. One pure merge function returning
  an array.
- No generic "configurable enum" framework shared across status/type/priority.
  Build priority's catalog; refactor for status later if asked.
- No per-ticket catalog in frontmatter. Catalog is config; ticket stores the key.
- No priority-as-number. Canonical string key + catalog `weight`.

### Challenges

- **Contradiction / scope:** the priority system spans four layers (schema,
  config, frontend, CLI/MCP) and currently assumes a fixed four-value enum. Any
  customization ripples through all of them. This is the crux of the deferral —
  the design must be settled before a ticket is worth writing.
- **Dependency:** a clean catalog resolver and a `[priorities]` config schema
  must be agreed first. MDT-012 sketched TOML option-lists but never built them;
  this idea is the first concrete consumer of that pattern.
- **Cost:** Medium–Large end to end (schema + config + resolver + badge editor +
  filter rewiring + sort + CLI alias). #3 alone is Small (frontend-only, API
  exists).

## Decision

**Investigate more.** The governing constraint (closed enum as the validation
boundary across MCP/REST/CLI) means the closed-palette-vs-free-form decision must
be settled before any of the four asks can be scoped into a ticket. Option A
(grow the closed palette, customize presentation via a catalog mirroring
`STATUS_CONFIG`) is the recommended direction, but the full superset, the
config-schema shape, and the CLI-alias handling need a design pass. Defer the
clickable-badge work (#3) only if a quick standalone slice is wanted — it is
frontend-only against an API that already exists.

Estimated effort: **M–L** for the complete concept (#1+#2+#4 as one feature);
**S** for #3 as an isolated slice.

## References

- `domain-contracts/src/types/schema.ts:56-73` (CRPriority enum + schema)
- `src/components/TicketCard/ticket.css:22-34` (left stripe rule)
- `src/components/Badge/priorityIcons.ts:9-14` (PRIORITY_ICON map)
- `src/config/statusConfig.ts:6-63` (architectural precedent — STATUS_CONFIG)
- `src/config/sorting.ts:1-49` (sort attributes, priority absent)
- `shared/services/ticket/attrResolver.ts:79-100` (CLI alias coupling)
- `domain-contracts/src/ticket/input.ts:50-61` (TICKET_UPDATE_ATTRS — priority allowed)
- `server/routes/projects.ts:179` (PATCH cr — edit API exists)
- `docs/CONFIG_SPECIFICATION.md`, `docs/CONFIG_GLOBAL_SPECIFICATION.md` (three-tier config)
