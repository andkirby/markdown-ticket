# MDT-205 Architecture — Epic level field with phaseEpic validation

> Architect's design record. Source of truth for traceability is `spec-trace`; this is
> the human narrative. Rendered projections live in `docs/CRs/MDT-205/*.trace.md`.

## 1. Problem & design drivers

MDT-205 introduces a `level` field (`ticket` | `epic`, default `ticket`) and turns the
existing free-text `phaseEpic` into a validated child→epic link, plus an epic close guard.
Three forces shape the design:

1. **Cross-ticket semantics.** `phaseEpic` target validation and the close guard must look
   up *other* tickets (is the target an epic? what are the children?). That is not a pure
   field check — it needs repository access.
2. **Three input surfaces must behave identically** (CLI, MCP, REST). The repo already has
   a split input gate (`attrResolver`, CLI-only) and a permissive persistence layer
   (`updateCRAttrs`, MDT-148). Level + epic rules must not introduce a fourth, divergent path.
3. **Read stays tolerant, write gains validation.** No migration (C-1): existing files
   without `level` read as `ticket`. Validation is a write-time concern only, mirroring how
   status transitions are deliberately unenforced on read today.

## 2. Key architectural decisions

### A-D1. Pure epic rules module + orchestration in TicketService (NEW)

A new **`shared/services/epicRules.ts`** holds pure, dependency-injected rule functions with
**zero I/O**:

| Function | Purpose | Throws |
|---|---|---|
| `isTicketKey(value)` | True when a string is `{CODE}-###` shaped | — |
| `isUsableEpicState(status)` | True for `Approved` / `Implemented` | — |
| `isEpicCloseTerminal(status)` | True for `Implemented` / `Rejected` / `Partially Implemented` (C-3) | — |
| `resolvePhaseEpicTarget({ childKey, value, target })` | Classify a phaseEpic write | `EPIC_TARGET_NOT_FOUND`, `EPIC_TARGET_NOT_EPIC`, `EPIC_NOT_USABLE` |
| `assertEpicClosable(epic, children)` | Close guard | `EPIC_HAS_OPEN_CHILDREN` (lists blockers) |

`TicketService` is the **only** orchestrator: it fetches the target ticket / children (it
already owns `getCR`/`listCRs`) and calls these pure functions. The rules are unit-testable
without a filesystem; the orchestration is tested through the service.

**Why split:** the rules are the stable domain facts; orchestration is the wiring. Keeping
them separate means the rules can be reused (e.g. a future dry-run / bulk validator) and
tested exhaustively without fixtures.

### A-D2. Validation chokepoint = shared write layer (one implementation, three surfaces)

To satisfy BR-2 ("identically through CLI, MCP, REST") without duplicating logic:

- **phaseEpic target validation** runs inside `TicketService.updateCRAttrs` (the final
  persistence gate shared by the REST PATCH path *and* the operation-based path used by
  CLI + MCP). When `attributes.phaseEpic` is present and ticket-key-shaped, fetch the
  target and run `resolvePhaseEpicTarget`.
- **Epic close guard** runs inside `TicketService.updateCRStatus`: when the target ticket
  is an epic (`level === 'epic'`) and the new status is `Implemented`, fetch children and
  run `assertEpicClosable`. Non-epic tickets and all other transitions are untouched (C-4).
- **Create-time** phaseEpic validation runs in the `createCR` flow (after the existing
  `TemplateService.validateTicketData` enum checks), since a new ticket may carry phaseEpic.

Value-shape concerns (is `level` a known enum value? alias resolution) stay at the **input
boundary** (A-D3). Semantic concerns (target exists, is epic, closable) stay at the
**persistence boundary**. This separation keeps each layer's responsibility crisp.

### A-D3. Level aliases join the shared resolver (no drift)

Per C-6 and the existing status-alias precedent (where CLI status aliases were *moved* into
`shared/services/ticket/attrResolver.ts` so all consumers agree), level aliases live there:

- Add `LEVEL_ALIASES` (`e`→`epic`, `t`→`ticket`, plus canonical self-maps, case-insensitive).
- Export `resolveLevelToken(token)` (throws on unknown) and `lookupLevelToken(token)` (lenient).
- Dispatch `level` from `resolveAttrValue(field, value)`.

**Coverage gap to close:** `attrResolver` is currently CLI-only. MCP `update_cr_attrs` and
REST PATCH skip it. For `level`, the operation-based path (`validateAttrOperations`) applies
`resolveLevelToken` for CLI + MCP; the server adapter applies it for REST. (Fully wiring
attrResolver into MCP/REST for *all* fields is out of scope and would change existing
behaviour — noted as debt.)

### A-D4. Structured, actionable errors

All epic-rule violations throw `ServiceError` (the repo's existing error type) with stable
codes so every surface can map them to user-facing text:

| Code | Meaning | Remediation in message |
|---|---|---|
| `EPIC_TARGET_NOT_FOUND` | phaseEpic key has no ticket | "create it or check the key" |
| `EPIC_TARGET_NOT_EPIC` | target is not an epic | "set its level to epic first" |
| `EPIC_NOT_USABLE` | target epic is Proposed | "approve the epic first" |
| `EPIC_HAS_OPEN_CHILDREN` | close guard blocked | lists the non-terminal child keys |

MCP surfaces these as JSON-RPC errors (existing `INVALID_OPERATION`/`TICKET_NOT_FOUND`
pattern extended); REST maps codes to 400/409 with the message; CLI prints the message.

### A-D5. Frontend contract (for MDT-206)

The frontend consumes three things from this ticket:

1. **`ticket.level`** on the `Ticket` type — flows automatically from domain-contracts (the
   frontend re-exports the type). No frontend type change beyond what the build carries.
2. **Usable-epic-state knowledge** — expose `isUsableEpicState` / `USABLE_EPIC_STATUSES` and
   `isEpicCloseTerminal` from the shared layer so the frontend (and any consumer) applies
   the same gate when offering phaseEpic targets or close actions. This prevents the UI from
   offering a Proposed epic as a target only to have the server reject it.
3. **Structured error codes** on write responses — the frontend can switch on
   `EPIC_*` codes to render inline, actionable field errors instead of generic toasts.
4. **Children derivation** — no new endpoint. The frontend derives children in-memory via
   `tickets.filter(t => t.phaseEpic === epic.code)` (the `phaseEpic` up-pointer). This is the
   "find-children" decision: no stored `children[]`, no lying rollup.

For MDT-205 the frontend contract is **data + rules only** (no board UI — that is MDT-206).

## 3. Data model changes (source of truth: domain-contracts)

```ts
// domain-contracts/src/types/schema.ts — mirror the CRStatus block
export const CRLevel = { TICKET: 'ticket', EPIC: 'epic' } as const
export type CRLevelValue = typeof CRLevel[keyof typeof CRLevel]
export const CRLevels = [CRLevel.TICKET, CRLevel.EPIC] as const
export const CRLevelSchema = z.enum(CRLevels)
```

- `entity.ts`: `level?: CRLevelValue` on `Ticket`; `level: CRLevelSchema.optional()` on `TicketSchema`.
- `frontmatter.ts`: `level: CRLevelSchema.optional()` (the YAML contract).
- `input.ts`: `level?` on `TicketData`, `TicketUpdateAttrs`, `TicketFilters`; `'level'` in
  `TICKET_UPDATE_ATTRS`; added to `CreateTicketInputSchema` / `UpdateTicketInputSchema`.

`phaseEpic` stays `z.string().optional()` (free text allowed; semantic validation is in the
write layer, not the schema — C-2: no link-field rename).

## 4. Normalization & serialization

- **Read default (C-1):** `shared/models/Ticket.ts` — both `normalizeTicket` and
  `normalizeTicketMetadata` set `level: getString(ticket.level, CRLevel.TICKET)`. Existing
  files without `level` read as `ticket`; nothing is rewritten on disk.
- **Write (two hardcoded serializers, both touched):**
  - `MarkdownService.generateYamlFrontmatter` — emit `level:` when present.
  - `TicketService.formatCRAsMarkdown` — emit `level:` for created tickets.
- The line-scanner parse paths (`parseYamlFrontmatter`, `updateYAMLField`) are field-name
  generic and need no change to carry `level`.

## 5. Adapter changes (thin)

| Surface | File | Change |
|---|---|---|
| CLI attr | `cli/src/commands/attrMeta.ts` | add `level` token to `ATTR_FIELDS` |
| CLI list | `cli/src/commands/list.ts` | add `level` to `FILTER_FIELD_MAPPING` + value resolution |
| MCP schema | `mcp-server/src/tools/config/allTools.ts` | `level` property on `create_cr` + `update_cr_attrs` |
| MCP handler | `mcp-server/src/tools/handlers/crHandlers.ts` | `level` in `CRAttributes` type |
| REST create | `server/services/TicketService.ts` | widen `CRData` + forward `level` |
| REST patch | `server/services/TicketService.ts` | forward `level` in `updateCRPartial`; resolve alias |
| OpenAPI | `server/openapi/schemas.ts` | `level` property doc (schemas auto-derive from zod) |

OpenAPI schemas auto-derive from the zod definitions, so once `level` is on
`UpdateTicketInputSchema`/`CreateTicketInputSchema`/`TICKET_UPDATE_ATTRS`, the `CRPatch`/
`CRInput`/`CR` docs pick it up automatically; only the human description is hand-added.

## 6. Migration & rollback

- **No data migration.** Rollback is purely code: revert the changes and existing files
  (which never gained a `level` key unless a user set one) read exactly as before. Files
  that *did* gain `level: epic` would, after rollback, simply ignore the key on read —
  harmless (the line scanner tolerates unknown keys).

## 7. Risks & non-goals

- **Risk:** `updateCRAttrs` gaining lookup calls could slow bulk attr writes. Mitigation:
  only fetch when `phaseEpic` is present and key-shaped; free-text phaseEpic skips lookup
  (Edge-6). The close guard only fetches children for epics→Implemented.
- **Risk:** the close guard is the first enforced transition in a permissive system. Scoped
  to epics→Implemented only (C-4); all other movement unchanged and tested.
- **Non-goal:** cloud sync of `level` (deferred — open question in ticket). Non-goal: board
  UI (MDT-206). Non-goal: retroactive rejection of historical phaseEpic references (Edge-4).
