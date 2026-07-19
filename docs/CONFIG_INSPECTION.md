# Configuration Inspection Tool

Inspect where each configuration setting lives: in the browser, in a backend
file (and whether it is editable, guarded, read-only, or file-only).

This tool answers a recurring question for MDT-168 and the configuration
management surface: _"for any setting, does it live in browser storage, in a
backend config file, or in a file but immutable from the UI?"_ It projects the
existing sources of truth — it never redefines them.

## Sources of truth (read-only)

The inspection script only **projects** these; it is not itself a source of truth:

| Source                                                                                | What it provides                                                           |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [`docs/CRs/MDT-168/configuration-exposure.md`](CRs/MDT-168/configuration-exposure.md) | Human exposure matrix (the canonical classification)                       |
| `domain-contracts/src/config-management/selectors.ts`                                 | `CONFIG_SELECTOR_ALLOWLIST` (code registry of readable/writable selectors) |
| `src/config/*.ts`                                                                     | Browser-only `localStorage` modules                                        |

## Usage

```bash
# Via the package script (recommended)
bun run inspect:config                      # grouped, readable table (default)
bun run inspect:config:json                 # machine-readable JSON for agents

# Or directly
bun scripts/inspect-config.ts               # grouped, readable table
bun scripts/inspect-config.ts --json        # machine-readable JSON
bun scripts/inspect-config.ts --summary     # counts only
bun scripts/inspect-config.ts --scope project       # filter by scope
bun scripts/inspect-config.ts --exposure guarded    # filter by exposure class
bun scripts/inspect-config.ts --filter maxdepth     # substring on selector name
bun scripts/inspect-config.ts --help
```

Filters accept both `--scope browser` and `--scope=browser`.

## Exposure classes — the "where it lives" answer

| Class          | Where it lives                  | Editable from UI?                                 |
| -------------- | ------------------------------- | ------------------------------------------------- |
| `editable`     | backend config file             | yes — normal setting                              |
| `guarded`      | backend config file             | yes — confirmation/advanced workflow only         |
| `readOnly`     | backend config file             | no — display only (immutable via UI)              |
| `fileOnly`     | backend config file             | no — manual file edit only; not exposed in UI/API |
| `browser-only` | browser `localStorage` / cookie | yes — client only; never reaches backend          |

The four backend classes all **persist to a file**; the distinction is
editability, not location. "Immutable" maps to `readOnly` (shown but not
editable) and `fileOnly` (not even shown).

## Config file locations by scope

| Scope      | File                                         |
| ---------- | -------------------------------------------- |
| `project`  | `{project}/.mdt-config.toml`                 |
| `global`   | `CONFIG_DIR/config.toml`                     |
| `user`     | `CONFIG_DIR/user.toml`                       |
| `registry` | `CONFIG_DIR/projects/*.toml`                 |
| `browser`  | browser `localStorage` (or cookie for theme) |

`CONFIG_DIR` resolves to `~/.config/markdown-ticket` unless overridden by the
`CONFIG_DIR` environment variable. See
[`CONFIG_SPECIFICATION.md`](CONFIG_SPECIFICATION.md) for field-level detail.

## Output modes

### Readable table (default)

Groups settings into five buckets — browser localStorage, backend editable,
backend guarded, backend read-only, backend file-only — each with the selector
name, scope, target file, and owning UI surface.

### `--summary`

Counts per exposure class plus the total. Useful for a quick orientation.

### `--json`

Machine-readable payload for agents and tooling:

```jsonc
{
  "generatedAt": "...",
  "sources": ["docs/CRs/MDT-168/configuration-exposure.md", ...],
  "exposureLegend": { "editable": { "location": "backend file", "editable": "..." }, ... },
  "scopeFiles": { "project": "{project}/.mdt-config.toml", ... },
  "summary": { "editable": 16, "guarded": 8, "readOnly": 3, "fileOnly": 6, "browser-only": 13, "__total": 46 },
  "selectors": [ { "selector": "...", "scope": "...", "exposure": "...", "location": "...", "file": "...", "editable": "...", "ownerSurface": "...", "validation": "..." } ]
}
```

## Adding or changing a setting

The script reflects the canonical sources. To add or reclassify a setting:

1. **Backend selector** — add it to `CONFIG_SELECTOR_ALLOWLIST` in
   `domain-contracts/src/config-management/selectors.ts` (with exposure,
   scope, owner surface, validation). File-only selectors that must never
   appear in the API go in the script's `FILE_ONLY_SETTINGS` supplement (and
   the exposure matrix).
2. **Browser-only setting** — add it to the script's
   `BROWSER_ONLY_SETTINGS` supplement and the exposure matrix's "Browser-only
   Settings" table.
3. Update [`docs/CRs/MDT-168/configuration-exposure.md`](CRs/MDT-168/configuration-exposure.md)
   first — it is the human source of truth the script mirrors.

## Scope

This tool inspects configuration **settings** only. It deliberately excludes
derived/runtime state and caches that are not settings: project favorites state
(`project-selector.json`), document favorites (`document-favs.json`), read-access
tokens, `selectedProject`, and ticket cache. The MCP server's own `config.toml`
(a separate domain) is also excluded.
