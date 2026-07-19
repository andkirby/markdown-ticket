#!/usr/bin/env bun
/**
 * inspect-config.ts — Inspect where each configuration setting lives.
 *
 * Answers the question: "for any setting, does it live in the browser, in a
 * backend file (and is it editable/guarded/read-only/file-only), or in a file
 * but immutable?" Draws from the MDT-168 configuration exposure matrix and the
 * canonical selector allowlist in @mdt/domain-contracts.
 *
 * Sources of truth (this script only projects them, never redefines them):
 *   - docs/CRs/MDT-168/configuration-exposure.md  (human matrix)
 *   - domain-contracts/src/config-management/selectors.ts  (code allowlist)
 *   - src/config/*.ts  (browser-only localStorage modules)
 *
 * Usage:
 *   bun scripts/inspect-config.ts                     # grouped, readable table
 *   bun scripts/inspect-config.ts --json              # machine-readable
 *   bun scripts/inspect-config.ts --scope project     # filter by scope
 *   bun scripts/inspect-config.ts --exposure guarded  # filter by exposure
 *   bun scripts/inspect-config.ts --filter maxdepth   # substring on selector
 *   bun scripts/inspect-config.ts --summary           # counts only
 *
 * Exit codes: 0 on success.
 */

import process from 'node:process'
import { CONFIG_SELECTOR_ALLOWLIST, Exposure } from '@mdt/domain-contracts'

// ---------------------------------------------------------------------------
// Browser-only settings are NOT in the backend allowlist (they never reach a
// file). They live in browser localStorage via src/config/*.ts. This list is
// the documented supplement from the exposure matrix; update it there first
// (docs/CRs/MDT-168/configuration-exposure.md) if a browser-only setting is
// added or promoted to backend storage.
// ---------------------------------------------------------------------------
interface BrowserOnlySetting {
  selector: string
  module: string
  storageKey: string
  ownerSurface: string
  note: string
}

// File-only selectors are intentionally excluded from the backend mutation
// allowlist (CONFIG_SELECTOR_ALLOWLIST) because they must never be read or
// written through the API. They are documented in the exposure matrix and
// listed here so the inspection is complete. Update the matrix first if one is
// added: docs/CRs/MDT-168/configuration-exposure.md.
const FILE_ONLY_SETTINGS: readonly {
  selector: string
  scope: string
  file: string
  note: string
}[] = [
  {
    selector: 'project.id',
    scope: 'project',
    file: '{project}/.mdt-config.toml',
    note: 'Project identity; manual config only.',
  },
  {
    selector: 'project.startNumber',
    scope: 'project',
    file: '{project}/.mdt-config.toml',
    note: 'Project creation/manual config only.',
  },
  {
    selector: 'project.counterFile',
    scope: 'project',
    file: '{project}/.mdt-config.toml',
    note: 'Manual config only.',
  },
]

// Backend settings defined in the Zod schemas and persisted to TOML, but NOT in
// the CONFIG_SELECTOR_ALLOWLIST (so not readable/writable via the MDT-168
// config API yet). Their exposure is documented in the matrix; most are
// read-only-until-ownership-confirmed or file-only. Update the matrix first if
// one is promoted: docs/CRs/MDT-168/configuration-exposure.md.
interface BackendSupplementSetting {
  selector: string
  scope: string
  file: string
  exposure: string
  note: string
}

const BACKEND_SUPPLEMENT_SETTINGS: readonly BackendSupplementSetting[] = [
  // Global [ui] — read-only until ownership confirmed (exposure matrix).
  { selector: 'ui.theme', scope: 'global', file: 'CONFIG_DIR/config.toml', exposure: 'fileOnly', note: 'Backend theme enum (light/dark/auto); browser cookie theme is the live control.' },
  { selector: 'ui.autoRefresh', scope: 'global', file: 'CONFIG_DIR/config.toml', exposure: 'readOnly', note: 'Read-only until ownership is confirmed.' },
  { selector: 'ui.refreshInterval', scope: 'global', file: 'CONFIG_DIR/config.toml', exposure: 'readOnly', note: 'Read-only until ownership is confirmed.' },
  // Project [worktree] and symlinks.
  { selector: 'worktree.enabled', scope: 'project', file: '{project}/.mdt-config.toml', exposure: 'fileOnly', note: 'Worktree feature toggle (default true).' },
  { selector: 'project.allowSymlinks', scope: 'project', file: '{project}/.mdt-config.toml', exposure: 'fileOnly', note: 'Symlink following in subdocument reads (MDT-151, default false).' },
  // Sharing (registry metadata) — guarded.
  { selector: 'sharing.mode', scope: 'registry', file: 'CONFIG_DIR/projects/*.toml', exposure: 'guarded', note: 'private | unlisted-readonly | public-readonly; managed via /api/projects/:code/sharing.' },
]

const BROWSER_ONLY_SETTINGS: readonly BrowserOnlySetting[] = [
  {
    selector: 'browser.theme',
    module: 'src/hooks/useTheme.ts',
    storageKey: 'cookie "theme" (light/dark/system)',
    ownerSurface: 'settings',
    note: 'Theme quick toggle; stored in a browser COOKIE (not localStorage). Browser/profile-specific presentation. Distinct from backend ui.theme.',
  },
  {
    selector: 'browser.defaultView',
    module: 'src/config/settingsPreferences.ts',
    storageKey: 'mdt-settings-default-view',
    ownerSurface: 'settings',
    note: 'Board/list default view (MDT-167).',
  },
  {
    selector: 'browser.cardDensity',
    module: 'src/config/settingsPreferences.ts',
    storageKey: 'mdt-settings-card-density',
    ownerSurface: 'settings',
    note: 'Browser-only visual density.',
  },
  {
    selector: 'browser.markdownDensity',
    module: 'src/config/settingsPreferences.ts',
    storageKey: 'markdown-ticket:settings:markdown-density',
    ownerSurface: 'settings',
    note: 'Browser-only markdown density.',
  },
  {
    selector: 'browser.eventHistoryVisible',
    module: 'src/components/DevTools/useEventHistoryState.ts',
    storageKey: 'mdt-eventHistory-hidden',
    ownerSurface: 'devtools',
    note: 'Browser-only panel state.',
  },
  {
    selector: 'browser.documentTree.navigation',
    module: 'src/config/documentNavigation.ts',
    storageKey: 'markdown-ticket:documents-navigation:<projectId>',
    ownerSurface: 'documents',
    note: 'Recents/collapse/panel size per project.',
  },
  {
    selector: 'browser.documentTree.sorting',
    module: 'src/config/documentSorting.ts',
    storageKey: 'documents-sort-<projectId>',
    ownerSurface: 'documents',
    note: 'Sort by/direction per project.',
  },
  {
    selector: 'browser.visibleTicketCardBadges',
    module: 'src/config/ticketCardBadges.ts',
    storageKey: 'markdown-ticket:board:ticket-card-badges',
    ownerSurface: 'board',
    note: 'Which badges render on ticket cards.',
  },
  {
    selector: 'browser.autoLinking',
    module: 'src/config/linkConfig.ts',
    storageKey: 'markdown-ticket-link-config',
    ownerSurface: 'board',
    note: 'Smart Links auto-linking toggle (browser mirror). Same blob also stores browser-side enableTicketLinks/enableDocumentLinks.',
  },
  {
    selector: 'browser.selectorAccents',
    module: 'src/components/ProjectSelector/useSelectorData.ts',
    storageKey: 'mdt-selector-preferences',
    ownerSurface: 'settings',
    note: 'accentEnabled/autocolor/accentStyle browser mirror; overrides backend user.toml values on load (legacy accentGradients migrated).',
  },
  {
    selector: 'browser.tocExpanded',
    module: 'src/config/tocConfig.ts',
    storageKey: 'markdown-ticket-toc-<view>',
    ownerSurface: 'documents',
    note: 'Table-of-contents expand state, per view (document/ticket).',
  },
  {
    selector: 'browser.ticketListSorting',
    module: 'src/config/sorting.ts',
    storageKey: 'markdown-ticket-sort-preferences',
    ownerSurface: 'list',
    note: 'Ticket-list sort attribute/direction (distinct from document-tree sort).',
  },
  {
    selector: 'browser.viewMode',
    module: 'src/components/ViewModeSwitcher/useViewModePersistence.ts',
    storageKey: 'lastBoardListMode / lastViewMode / single-project-view-mode',
    ownerSurface: 'navigation',
    note: 'Persisted active view mode (board/list/documents).',
  },
]

// ---------------------------------------------------------------------------
// Human-readable labels per exposure class — the "where it lives" answer.
// ---------------------------------------------------------------------------
const EXPOSURE_META: Record<
  string,
  { location: string, editable: string, color: string }
> = {
  [Exposure.EDITABLE]: {
    location: 'backend file',
    editable: 'yes — normal setting',
    color: '\x1B[32m',
  },
  [Exposure.GUARDED]: {
    location: 'backend file',
    editable: 'yes — confirmation/advanced only',
    color: '\x1B[33m',
  },
  [Exposure.READ_ONLY]: {
    location: 'backend file',
    editable: 'no — display only (immutable via UI)',
    color: '\x1B[36m',
  },
  [Exposure.FILE_ONLY]: {
    location: 'backend file',
    editable: 'no — manual file edit only; not exposed in UI/API',
    color: '\x1B[31m',
  },
  'browser-only': {
    location: 'browser localStorage',
    editable: 'yes — client only; never reaches backend',
    color: '\x1B[35m',
  },
}

const SCOPE_FILE: Record<string, string> = {
  project: '{project}/.mdt-config.toml',
  global: 'CONFIG_DIR/config.toml',
  user: 'CONFIG_DIR/user.toml',
  registry: 'CONFIG_DIR/projects/*.toml',
  browser: 'browser localStorage',
}

interface UnifiedRow {
  selector: string
  scope: string
  exposure: string
  location: string
  file: string
  editable: string
  ownerSurface: string
  validation: string
}

function buildRows(): UnifiedRow[] {
  const rows: UnifiedRow[] = []

  for (const s of CONFIG_SELECTOR_ALLOWLIST) {
    const meta = EXPOSURE_META[s.exposure]
    rows.push({
      selector: s.selector,
      scope: s.scope,
      exposure: s.exposure,
      location: meta.location,
      file: SCOPE_FILE[s.scope] ?? '—',
      editable: meta.editable,
      ownerSurface: s.ownerSurface,
      validation: s.validation,
    })
  }

  for (const b of BROWSER_ONLY_SETTINGS) {
    const meta = EXPOSURE_META['browser-only']!
    rows.push({
      selector: b.selector,
      scope: 'browser',
      exposure: 'browser-only',
      location: meta.location,
      file: b.storageKey,
      editable: meta.editable,
      ownerSurface: b.ownerSurface,
      validation: b.note,
    })
  }

  for (const f of FILE_ONLY_SETTINGS) {
    const meta = EXPOSURE_META[Exposure.FILE_ONLY]
    rows.push({
      selector: f.selector,
      scope: f.scope,
      exposure: Exposure.FILE_ONLY,
      location: meta.location,
      file: f.file,
      editable: meta.editable,
      ownerSurface: 'none',
      validation: f.note,
    })
  }

  for (const b of BACKEND_SUPPLEMENT_SETTINGS) {
    const meta = EXPOSURE_META[b.exposure] ?? EXPOSURE_META[Exposure.FILE_ONLY]
    rows.push({
      selector: b.selector,
      scope: b.scope,
      exposure: b.exposure,
      location: meta.location,
      file: b.file,
      editable: meta.editable,
      ownerSurface: b.exposure === 'guarded' ? 'project-edit' : 'none',
      validation: b.note,
    })
  }

  return rows
}

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------
function parseArgs(argv: string[]): {
  json: boolean
  summary: boolean
  scope?: string
  exposure?: string
  filter?: string
  help?: boolean
} {
  const opts = {
    json: false,
    summary: false,
    scope: undefined,
    exposure: undefined,
    filter: undefined,
    help: false,
  } as {
    json: boolean
    summary: boolean
    scope?: string
    exposure?: string
    filter?: string
    help?: boolean
  }
  // Support both --flag value and --flag=value forms.
  const getValue = (
    flag: string,
    arg: string,
    next?: string,
  ): string | undefined => {
    if (arg === flag)
      return next
    if (arg.startsWith(`${flag}=`))
      return arg.slice(`${flag}=`.length)
    return undefined
  }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!
    const next = argv[i + 1]
    if (arg === '--json')
      opts.json = true
    else if (arg === '--summary')
      opts.summary = true
    else if (arg === '--help' || arg === '-h')
      opts.help = true
    else if (arg === '--scope' || arg.startsWith('--scope='))
      opts.scope = getValue('--scope', arg, next)
    else if (arg === '--exposure' || arg.startsWith('--exposure='))
      opts.exposure = getValue('--exposure', arg, next)
    else if (arg === '--filter' || arg.startsWith('--filter='))
      opts.filter = getValue('--filter', arg, next)
  }
  return opts
}

function applyFilters(
  rows: UnifiedRow[],
  opts: { scope?: string, exposure?: string, filter?: string },
): UnifiedRow[] {
  let out = rows
  if (opts.scope)
    out = out.filter(r => r.scope === opts.scope)
  if (opts.exposure)
    out = out.filter(r => r.exposure === opts.exposure)
  if (opts.filter) {
    out = out.filter(r =>
      r.selector.toLowerCase().includes(opts.filter!.toLowerCase()),
    )
  }
  return out
}

// ---------------------------------------------------------------------------
// Output: JSON
// ---------------------------------------------------------------------------
function printJson(rows: UnifiedRow[]): void {
  const grouped = {
    generatedAt: new Date().toISOString(),
    sources: [
      'docs/CRs/MDT-168/configuration-exposure.md',
      'domain-contracts/src/config-management/selectors.ts',
      'src/config/*.ts',
    ],
    exposureLegend: Object.fromEntries(
      Object.entries(EXPOSURE_META).map(([k, v]) => [
        k,
        { location: v.location, editable: v.editable },
      ]),
    ),
    scopeFiles: SCOPE_FILE,
    summary: summarize(rows),
    selectors: rows,
  }
  console.log(JSON.stringify(grouped, null, 2))
}

// ---------------------------------------------------------------------------
// Output: summary counts
// ---------------------------------------------------------------------------
function summarize(rows: UnifiedRow[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const r of rows) counts[r.exposure] = (counts[r.exposure] ?? 0) + 1
  counts.__total = rows.length
  return counts
}

function printSummary(rows: UnifiedRow[]): void {
  const counts = summarize(rows)
  console.log('Configuration registry summary')
  console.log('─'.repeat(40))
  for (const [exposure, n] of Object.entries(counts)) {
    if (exposure === '__total') {
      console.log('─'.repeat(40))
      console.log(`${'TOTAL'.padEnd(28)} ${n}`)
    }
    else {
      const meta = EXPOSURE_META[exposure]
      console.log(
        `${exposure.padEnd(28)} ${n}   ${meta ? `(${meta.location})` : ''}`,
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Output: readable grouped table
// ---------------------------------------------------------------------------
function pad(str: string, len: number): string {
  return str.length >= len
    ? str.slice(0, len)
    : str + ' '.repeat(len - str.length)
}

function printReadable(rows: UnifiedRow[]): void {
  const reset = '\x1B[0m'
  const dim = '\x1B[2m'

  // Group by location bucket for the "where it lives" answer.
  const buckets: Record<string, UnifiedRow[]> = {
    'browser localStorage': [],
    'backend file — editable': [],
    'backend file — guarded': [],
    'backend file — read-only (immutable via UI)': [],
    'backend file — file-only (not exposed in UI/API)': [],
  }
  for (const r of rows) {
    if (r.exposure === 'browser-only')
      buckets['browser localStorage']!.push(r)
    else if (r.exposure === Exposure.EDITABLE)
      buckets['backend file — editable']!.push(r)
    else if (r.exposure === Exposure.GUARDED)
      buckets['backend file — guarded']!.push(r)
    else if (r.exposure === Exposure.READ_ONLY)
      buckets['backend file — read-only (immutable via UI)']!.push(r)
    else if (r.exposure === Exposure.FILE_ONLY)
      buckets['backend file — file-only (not exposed in UI/API)']!.push(r)
  }

  console.log(`\n${'Configuration registry'.padEnd(70)}`)
  console.log(
    `${dim}where each setting lives — source: configuration-exposure.md + selectors.ts${reset}\n`,
  )

  for (const [bucket, bucketRows] of Object.entries(buckets)) {
    if (bucketRows.length === 0)
      continue
    const color = EXPOSURE_META[bucketRows[0]!.exposure]?.color ?? ''
    console.log(`${color}▌ ${bucket}  ${dim}(${bucketRows.length})${reset}`)
    console.log(
      `${dim}  ${'SELECTOR'.padEnd(34)} ${'SCOPE'.padEnd(9)} ${'FILE'.padEnd(38)} OWNER${reset}`,
    )
    for (const r of bucketRows.sort((a, b) =>
      a.selector.localeCompare(b.selector),
    )) {
      console.log(
        `  ${color}${pad(r.selector, 34)}${reset} ${pad(r.scope, 9)} ${dim}${pad(r.file, 38)}${reset} ${r.ownerSurface}`,
      )
    }
    console.log()
  }

  // Totals
  const counts = summarize(rows)
  console.log(`${dim}${'─'.repeat(78)}${reset}`)
  const parts = Object.entries(counts)
    .filter(([k]) => k !== '__total')
    .map(([k, n]) => `${EXPOSAGE_META_META(k)}${k}${reset}:${dim} ${n}`)
  console.log(`${dim}Total:${reset} ${counts.__total}   ${parts.join('   ')}`)

  // Hint
  console.log(
    `\n${dim}Filters: --scope <project|global|user|registry|browser>  --exposure <editable|guarded|readOnly|fileOnly|browser-only>  --filter <substring>${reset}`,
  )
  console.log(
    `${dim}Machine output: --json    Counts only: --summary${reset}\n`,
  )
}

// small helper to avoid clobbering color for the legend line
function EXPOSAGE_META_META(exposure: string): string {
  return EXPOSURE_META[exposure]?.color ?? ''
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main(): void {
  const opts = parseArgs(process.argv.slice(2))

  if (opts.help) {
    console.log(`inspect-config.ts — show where each configuration setting lives.

Usage:
  bun scripts/inspect-config.ts                  readable grouped table (default)
  bun scripts/inspect-config.ts --json           machine-readable JSON for agents
  bun scripts/inspect-config.ts --summary        counts only
  bun scripts/inspect-config.ts --scope project  filter by scope
  bun scripts/inspect-config.ts --exposure guarded
  bun scripts/inspect-config.ts --filter maxdepth

Scopes:        project | global | user | registry | browser
Exposure:      editable | guarded | readOnly | fileOnly | browser-only

The "where it lives" answer:
  browser-only  → browser localStorage (src/config/*.ts)
  editable      → backend file, normal setting
  guarded       → backend file, confirmation/advanced only
  readOnly      → backend file, display only (immutable via UI)
  fileOnly      → backend file, not exposed in UI/API (manual edit only)`)
    return
  }

  let rows = buildRows()
  rows = applyFilters(rows, opts)

  if (opts.json)
    printJson(rows)
  else if (opts.summary)
    printSummary(rows)
  else printReadable(rows)
}

main()
