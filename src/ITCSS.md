# ITCSS — Inverted Triangle CSS Architecture

Formalizes this project's CSS layering after **Harry Roberts' ITCSS** methodology.
This doc maps the seven ITCSS layers onto the actual files in this repo so the
architecture is auditable and a nightly migration can measure drift.

**Related docs:**
- [STYLING.md](STYLING.md) — day-to-day CSS conventions (class taxonomy, extraction rules, surface contract)
- [PRIMITIVES.md](PRIMITIVES.md) — shared CSS class inventory (the "what exists")
- [THEME.md](THEME.md) — the token system reference (both palettes, z-index, typography)

**Division of labour:** STYLING.md tells you *how to write* a class. This doc
tells you *which layer a file belongs in and why*. THEME.md tells you *what
tokens exist*. They answer different questions — read accordingly.

---

## Token-first rule

**Before writing any hardcoded value (`8px`, `0.5rem`, `#hex`, `oklch(0.5 …)`),
check [THEME.md](THEME.md) for an existing token. If a token exists, use it. If
you need a value that doesn't exist as a token, add it to `design-tokens.css`
(both `:root` and `.dark`) — don't hardcode it where you need it.**

The token scales (from `design-tokens.css`):

| Concern | Tokens | Consume via |
|---|---|---|
| Spacing / gap | `--gap-xs` (4px), `--gap-sm` (8px), `--gap-md` (16px), `--gap-lg` (24px) | bare `var(--gap-md)` |
| Border radius | `--radius-input` (8px), `--radius-card` (8px), `--radius-xs` (4px), `--radius-pill` (999px) | bare `var(--radius-card)` |
| Card density | `--pad-y`, `--pad-x`, `--fs-xs`, `--fs-md` | driven by `useCardDensity` |
| Icon / control | `--sz-icon` (16px), `--sz-control` (32px) | glyph + hit target |
| Colors (v3 semantic) | `--bg-subtle/muted/elevated`, `--text-muted/subtle`, `--primary-text`, `--border-strong`, status/priority/type tokens | bare `var(--bg-elevated)` |
| Colors (shadcn channel) | `--background`, `--primary`, `--border`, … | `oklch(var(--border))` |

```css
/* ❌ DRIFT — invents a new scale */
.card { padding: 8px; gap: 16px; border-radius: 6px; border: 1px solid #ccc; }

/* ✅ CORRECT — tokens keep the system coherent */
.card { padding: var(--pad-y) var(--pad-x); gap: var(--gap-md); border-radius: var(--radius-card); border-color: oklch(var(--border)); }
```

Two consumption patterns — know the difference:
- **shadcn bare-channel set** (`--background`, `--primary`, `--border`): `L C H` triplets → `oklch(var(--x))`
- **v3 semantic set** (`--bg-subtle`, `--gap-md`, `--radius-input`): full values → bare `var(--x)`

---

## The Inverted Triangle

ITCSS organizes CSS by **specificity and reach**, broadest/least-specific at the
top, narrowest/most-specific at the bottom. Lower layers may never be overridden
by ad-hoc rules higher up — overrides flow *down* the triangle through tokens,
never up through `!important` or specificity wars.

```
┌─────────────────────────────────────────────┐
│  1. Settings         tokens, never compiled  │  widest reach, lowest specificity
│  2. Tools            functions, mixins        │
│  3. Generic          resets, normalize        │
│  4. Elements         bare HTML elements       │
│  5. Objects          layout patterns, no skin │
│  6. Components       UI features, skinned     │
│  7. Utilities        single-purpose helpers   │  narrowest reach, highest specificity
└─────────────────────────────────────────────┘
```

**The one rule:** a file in layer *N* must not contain rules that belong in a
lower layer. A component file (6) must not redefine a token (1) or reset a bare
element (3/4). If you need a value that doesn't exist as a token, add the token
in layer 1 — don't hardcode it where you need it.

---

## Layer Map — how this repo maps to ITCSS

Current state, audited against `src/index.css` import order.

| # | ITCSS Layer | This repo's files | `@layer` home | Status |
|---|---|---|---|---|
| 1 | **Settings** | `styles/design-tokens.css` (`:root` + `.dark`) | `@layer base` | ✅ consolidated |
| 2 | **Tools** | `styles/animations.css` (keyframes) | unlayered | ⚠️ no formal mixins; `@apply` + `color-mix()` are the ad-hoc tools |
| 3 | **Generic** | `styles/base.css` (reset portion, `*`, `html`, `body` box rules) | `@layer base` | ⚠️ combined with Elements |
| 4 | **Elements** | `styles/base.css` (`h1`–`h6`, `a`, `code`, type scale) | `@layer base` | ⚠️ combined with Generic |
| 5 | **Objects** | `styles/components/{buttons,forms,tabs,overlays,loading,layout}.css` | `@layer components` | ✅ shared primitives, UI-agnostic |
| 6 | **Components** | `components/**/*.css` + `styles/prose.css` + `styles/wireloom-annotations.css` + `styles/entities/fav-star.css` | `@layer components` (mostly) | ⚠️ `AccentColorPicker.css` unlayered |
| 7 | **Utilities** | `styles/utilities.css` | `@layer utilities` (partly) | ⚠️ `.sr-only`, `.not-sr-only`, print/responsive sit outside any layer |

**Import order in `index.css`** (specificity increases downward):

```
Settings    → design-tokens.css
Generic+El  → base.css
Objects     → components/{buttons,forms,overlays,loading,layout}.css
Components  → prose.css, wireloom-annotations.css, [component-local CSS]
Tools       → animations.css   ← note: imported late; keyframes are layer-agnostic so order is safe
Utilities   → utilities.css
```

### Why `@layer base/components/utilities` and not ITCSS's seven names?

Tailwind v3 owns three named layers and `@import`-ed CSS joins them by name.
Renaming to ITCSS's seven would require Tailwind v4 `@theme` or custom
`@layer` statements — a future migration. For now the ITCSS *layering intent* is
expressed through **import order within each `@layer`** (Settings before Objects
before Components) plus the one-rule contract above. The mapping table is the
source of truth for "which ITCSS layer is this file in."

---

## Layer Contracts

### 1. Settings — `design-tokens.css`

**What belongs:** CSS custom properties only. No selectors that produce output.

**Rules:**
- Every reusable value (color, size, radius, gap, z-index, breakpoint, shadow)
  is a custom property defined here.
- Two aligned palettes coexist:
  - **shadcn bare-channel set** — `L C H` triplets, consumed via
    `oklch(var(--x))` or Tailwind `bg-x`.
  - **v3 semantic set** — full `oklch()`, consumed via bare `var(--x)`.
- Light in `:root`, dark in `.dark`. Both must define the **same keys** — a
  token missing from `.dark` silently inherits the light value.

**Known token gaps (tracked by the nightly audit):**

| Missing token | Currently hardcoded in | Migration target |
|---|---|---|
| `--shadow-*` (sm/md/lg/xl/2xl) | `tailwind.config.js:98-104` (rgba values) | `--shadow-sm/md/lg/xl/2xl` tokens |
| `--z-*` (scale) | documented in THEME.md but no CSS custom properties | `--z-base/dropdown/sticky/modal/toast` tokens |
| `--bp-*` (breakpoints) | Tailwind defaults inline via `@media (max-width: Npx)` | `--bp-sm/md/lg` tokens |
| `success`/`warning`/`error` palettes | `tailwind.config.js:44-79` (hex, not OKLCH) | OKLCH tokens aligned to the two-palette system |
| focus-ring as token | `.ring-prim` class in `utilities.css:66-69` | `--ring-width`, `--ring-offset`, `--ring-color` tokens |

### 2. Tools — functions, mixins, keyframes

**What belongs:** `@keyframes`, reusable `@apply` compositions, `color-mix()`
recipes. Tools produce **no output on their own** — they're invoked by higher
layers.

**Current state:** `animations.css` holds keyframes + animation utilities. There
is no formal mixin system; `@apply` inside component CSS is the de-facto tool
layer. `color-mix(in srgb, var(--x) 15%, transparent)` for badge tints is the
most-reused tool recipe — consider a `--tint-*` token if it proliferates.

### 3. Generic — resets

**What belongs:** `*`, `html`, `body` box-model resets, `box-sizing`, font
inheritance resets, scrollbar normalization. No classes.

**Current state:** lives in `base.css` alongside Elements. Acceptable to keep
combined while the file stays small; split into `styles/generic.css` if it grows
beyond resets.

### 4. Elements — bare HTML styling

**What belongs:** styling for `h1`–`h6`, `p`, `a`, `code`, `ul`/`ol` — the type
scale and default element rendering. No classes.

**Current state:** heading scale + base element rules in `base.css`. Prose
rendering (heavier element styling under `.prose`) lives in `prose.css`
(layer 6, Component — it is a *feature*, not a default).

### 5. Objects — layout patterns (no skin)

**What belongs:** UI-agnostic structural patterns: `.card`, `.control-group`,
`.avatar-*`, `.input`, `.btn`, `.dropdown`. Objects are **structure + spacing**,
deliberately skinnable by components via tokens. Per Harry Roberts, an object
should not impose a visual identity — the token does that.

**The `.control-group` test:** this repo's canonical object — it joins adjacent
controls into a segmented cluster using `:not(:first-child)` / `:not(:last-child)`
border-radius zeroing + `margin-left: -1px`. It owns **no color** — it inherits
borders and fills from its children. If an object needs a hardcoded color, it's
not an object; it's a component.

**Current state:** `styles/components/*.css` (buttons, forms, overlays, loading,
layout). All correctly in `@layer components` (Tailwind's name for the
Objects+Components layer — see mapping table note).

### 6. Components — skinned UI features

**What belongs:** feature-specific, skinned selectors: `.badge`,
`.ticket-card`, `.column`, `.header`, `.settings-*`, `.swimlane-board`. These
consume tokens from layer 1 and objects from layer 5.

**Rules:**
- Every component CSS file is wrapped in `@layer components`.
- Components reference tokens by `var(--x)`, never by raw color/size literals.
- Semantic variants use `data-*` (see STYLING.md §Semantic Variants), not
  modifier-class proliferation.
- Component CSS lives at `components/{Component}/{component}.css`, imported
  after the shared objects so it can `@apply` them.

**Known violation:** `components/AddProjectModal/components/AccentColorPicker.css`
is **not** wrapped in `@layer components` — the only component file that escapes
the cascade layer and thus outranks siblings by specificity accident. The
nightly audit flags this.

### 7. Utilities — single-purpose helpers

**What belongs:** one-job classes that should win regardless of context:
`.scrollbar-hide`, `.text-balance`, `.sr-only`, `.not-sr-only`, print/responsive
overrides.

**Rules:**
- Utilities live in `@layer utilities` (wins over components — correct).
- A utility must be genuinely single-purpose. `.ring-prim` is borderline (it
  composes offset + width + color) — acceptable because focus rings are a
  cross-cutting concern.
- Never use utilities to override a component's semantic intent. If you're
  fighting a component with three utilities, extract the variant into the
  component's CSS instead.

**Known drift:** `.sr-only`, `.not-sr-only`, and the print/responsive blocks at
`utilities.css:73+` sit **outside** any `@layer`. They work today by source
order, but escape the cascade-layer contract — the nightly audit flags them.

---

## Nesting — current state and target

**Today:** no CSS nesting. No `postcss-nesting` or `tailwindcss/nesting` plugin
in `postcss.config.js`. All selectors are flat (`.parent .child` or
`.parent > .child`), with occasional `:is()` for selector-list grouping.

**Target:** native CSS nesting (`&`), progressively adopted per-file. Benefits:
- Collocates a component's states/children in one block — easier to audit which
  selectors a component owns.
- Reduces the flat-selector sprawl that makes "who styles `.x__y:hover`?" hard
  to grep.
- Native nesting is now baseline-supported (Chromium 112+, FF 117+, Safari 16.5+).

**Adoption gate:** native nesting works in the build today (Vite + Lightning CSS
/ PostCSS will pass `&` through), but **one rule** governs migration:

> Migrate a file to nesting **only when you are already editing it** for another
> reason. Nesting changes are diff-noisy; bundling them with an unrelated change
> makes review hard. The nightly audit reports nesting-readiness per file
> (selector groups that share a parent), but **never auto-applies nesting** — it
> only flags opportunities and the commit leaves it to a human.

**Nesting anti-patterns to enforce (the audit checks these):**
- Never nest more than **2 levels deep**. `&:hover { & .icon { } }` is the
  ceiling; deeper nesting hides selector specificity and fights the "avoid deep
  chains" rule in STYLING.md.
- Never use `&__element` BEM-in-nesting — keep `__element` selectors flat
  (`.card__header { }`), only nest pseudo-states and child combinators.
- `@nest` is legacy — use bare `&` or native nesting. No `@nest` rules.

---

## Auditing — how to check ITCSS compliance

Three signals, all machine-checkable (the nightly task runs them):

1. **Layer membership.** Every `.css` file under `src/` should have its rules
   inside the correct `@layer`. The audit lists files whose rules are unlayered
   or in the wrong layer.
2. **Token coverage.** Component/Object CSS must reference tokens, not literals.
   The audit greps for hardcoded `#hex`, `rgb()`, bare `px` (outside the density
   tokens) in layers 5–6 and reports them.
3. **Nesting readiness.** For each file, the audit lists selector groups that
   share a parent prefix — the candidates for native-nesting migration. It
   reports counts, not patches.

### Manual quick-check

```bash
# Files not wrapped in @layer (should be empty or utilities-only)
grep -rL '@layer' src/components/**/*.css src/styles/**/*.css

# Hardcoded hex/rgb in component CSS (should trend to zero)
grep -rn '#[0-9a-fA-F]\{3,8\}\|rgb(' src/components/ src/styles/components/ src/styles/entities/

# Specificity outliers (!important — should be near-zero)
grep -rn '!important' src/components/ src/styles/

# CSS syntax gate (parse-only — catches agent-broken CSS)
find src -name '*.css' | xargs node scripts/parse-css.mjs
```

### Commit-time CSS gate

A parse-only CSS check (`scripts/parse-css.mjs`) runs as a lefthook pre-commit
command on every staged `.css` file. It catches syntax errors — orphaned braces,
malformed nesting, broken `@layer` blocks — that a nightly LLM agent can introduce
when editing CSS. It enforces **no style rules**; ITCSS architecture lives in this
doc + the nightly task.

**Why postcss, not lightningcss:** lightningcss auto-closes unclosed braces
(lenient parser), silently accepting the most common agent-breakage mode. postcss
rejects unclosed blocks, missing colons, and extra braces while accepting
`@apply`, `@layer`, `@tailwind`, and `@import`.

**Setup (once per fresh clone):** `sh scripts/setup-css-gate.sh` — recreates the
gitignored `lefthook-local.yml` entry that wires the gate into pre-commit (the
gate can't live in tracked `lefthook.yml` because remote pre-commit scripts
override local commands in lefthook 2.1.10; see the script header for the
merge-behavior detail). The `scripts/parse-css.mjs` gate itself is tracked.

---

## Decision: when to add a new layer vs. a new token

| Need | Action |
|---|---|
| A new reusable value (color, size, radius) | Add a token in **Settings** (`design-tokens.css`). |
| A new reusable composition (`@apply` recipe used 3+ times) | Add it to **Tools** or extract a utility. |
| A new reset rule | Add to **Generic** (`base.css` reset section). |
| A new bare-element style | Add to **Elements** (`base.css` type-scale section). |
| A new layout pattern used across features | Add an **Object** in `styles/components/`. |
| A new skinned feature | Add a **Component** in `components/{Feature}/`. |
| A one-off override | Add a **Utility** — and question whether it's truly one-off. |

If you reach for `!important` or a deeper selector to win a cascade fight, the
fix is almost always "the value belongs in a token" or "this is the wrong layer."
The triangle resolves specificity by construction — you should not have to fight
it.

---

## References

- Harry Roberts, **cssguidelin.es** — the canonical styleguide rules ITCSS
  formalizes.
- Harry Roberts, **"Managing Specificity"** talk — the inverted-triangle
  rationale.
- This repo: [STYLING.md](STYLING.md) (class taxonomy, surface contract),
  [THEME.md](THEME.md) (token reference), `src/index.css` (import order).
