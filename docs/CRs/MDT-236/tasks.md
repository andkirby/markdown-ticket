# Tasks: MDT-236

> Trace projection: [tasks.trace.md](./tasks.trace.md)
> Architecture: [architecture.md](./architecture.md) · Tests: [tests.trace.md](./tests.trace.md)

Task 0 skipped: runtime, E2E runner, and density spec already execute (spec verified RED this session).

### Task 1: Tokens are surface-agnostic (doc truth)

**Structure**: `frontend/src/styles/design-tokens.css`
**Scope**: Comments/semantic grouping only — the density slots (`--fs-xs/--fs-md/--pad-y/--pad-x/--radius-card`) are documented as surface-agnostic density slots, not card tokens. No value changes (C4).
**Boundary**: No token renames, no new tokens, no value edits.
**Modifies**: `frontend/src/styles/design-tokens.css`
**Must Not Touch**: `useCardDensity.ts`, any consumer CSS.
**Done when**: A reader of design-tokens.css cannot conclude the slots are card-only.

### Task 2: Vendored list table → density tokens

**Structure**: `frontend/src/components/ui/table.tsx`
**Makes GREEN**: `TEST-size-axis`, `TEST-space-axis`, `TEST-axis-independence`, `TEST-list-contract` → `tests/e2e/density/surfaces.spec.ts`
**Scope**: Replace `text-sm` (Table/TableCell/Caption) with `var(--fs-md)`; `px-4` cell padding with `var(--pad-x)`; row vertical sizing with `calc()` from `var(--pad-y)`. Header (`TableHead` `h-12 px-4`) scales with SIZE for grid alignment (architecture D3).
**Boundary**: Testids and DOM structure of rows unchanged; table alignment preserved.
**Modifies**: `frontend/src/components/ui/table.tsx`
**Must Not Touch**: `ProjectView.tsx` markup, other ui primitives.
**Verify**:
```bash
bunx playwright test tests/e2e/density/surfaces.spec.ts --project=chromium --grep "SIZE axis|SPACE axis|axes are independent"
bunx playwright test tests/e2e/list/view.spec.ts --project=chromium
```

### Task 3: Documents navigation rows → density tokens

**Structure**: `frontend/src/components/DocumentsView/documents-view.css`
**Makes GREEN**: `TEST-size-axis` (tree probe), `TEST-a11y-floor` (documents probe)
**Scope**: Tree/favs/recent row font + padding swap from `--fs-ui*`/fixed values to `var(--fs-md)`/`var(--pad-y)`/`var(--pad-x)` (with `calc()` factors as needed). Toolbar, breadcrumbs chrome, viewer prose untouched.
**Modifies**: `frontend/src/components/DocumentsView/documents-view.css`
**Must Not Touch**: toolbar rules (already `--fs-ui-sm`), prose/markdown styles.
**Verify**:
```bash
bunx playwright test tests/e2e/density/surfaces.spec.ts --project=chromium --grep "SIZE axis|accessibility floor"
```

### Task 4: Remaining content surfaces

**Structure**: `frontend/src/components/QuickSearch/quick-search.css`, `frontend/src/components/ProjectSelector/project-selector.css`, `frontend/src/components/TicketAttributes.tsx`
**Makes GREEN**: `TEST-size-axis` (same mechanism, sampled verification; full matrix per CR §5 manual pass)
**Scope**: QuickSearch result row text (`text-sm`/`text-xs` → tokens); selector card/chip sizing; attribute dt/dd `text-sm`/`text-xs` → tokens. Scope bar/hints/inputs stay chrome.
**Boundary**: No markup/testid changes; modal chrome stays chrome.
**Modifies**: the three files above.
**Must Not Touch**: `ui/Modal`, `SettingsModal`.
**Verify**: `bun run build` + manual spot-check at compact·tight.

### Task 5: Clamp floor everywhere (user-approved)

**Structure**: `frontend/src/components/TicketCard/ticket.css` + all content text consuming `--fs-xs`
**Makes GREEN**: `TEST-a11y-floor`
**Scope**: Content text using `--fs-xs` wraps as `clamp(11px, var(--fs-xs), 2rem)` — compact becomes 11px everywhere including shipped cards (approved decision). Apply where each surface consumes it (Tasks 2–4 land their own guards; this task sweeps TicketCard + PinRail).
**Anti-duplication**: define the clamp inline per declaration — no second token aliasing the floor (one concept, one expression).
**Modifies**: `frontend/src/components/TicketCard/ticket.css`, `frontend/src/components/PinRail/pin-rail.css`
**Verify**:
```bash
bunx playwright test tests/e2e/density/surfaces.spec.ts --project=chromium --grep "accessibility floor"
```

### Task 6: Documentation contract

**Structure**: `frontend/src/THEME.md`, `frontend/src/styleguide.html`
**Scope**: THEME.md gains the D2 surface inventory table + "density slots are surface-agnostic" + clamp-floor rule; styleguide gains a density-aware surfaces section.
**Modifies**: both files.
**Done when**: Every verdict in architecture.md D2 is reflected and the styleguide demos at least one non-card density-aware surface.

### Task 7: Full verification gate

**Makes GREEN**: `TEST-chrome-immunity`, `TEST-reset`, `TEST-persistence`, `TEST-token-purity`
**Scope**: Run the full density spec (7/7 GREEN), list + board specs, `bun run check`, and the token-purity grep:
```bash
bunx playwright test tests/e2e/density/surfaces.spec.ts --project=chromium
bunx playwright test tests/e2e/list tests/e2e/board --project=chromium
bun run check
rg -n "font-size:\s*[\d.]+(px|rem)" frontend/src/components/QuickSearch frontend/src/components/ProjectSelector frontend/src/components/DocumentsView frontend/src/components/ui/table.tsx   # expect: no hits
```
**Re-plan trigger**: density spec still failing after Tasks 2–5, or existing list/board specs regress beyond the known zero-tickets flake.
