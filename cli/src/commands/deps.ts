/**
 * CLI Ticket Deps Command (MDT-189)
 *
 * `mdt-cli deps <KEY> --check`     — primary surface (default when no flag given)
 * `mdt-cli deps <KEY> --check --json` — structured output for agents/scripts
 *
 * Thin wire: resolves project + target ticket, builds the dependency graph,
 * computes violations via the shared DependencyGraph module, scans prose
 * gaps via the shared proseScanner, then formats. Pure presentation —
 * no graph logic here (AGENTS.md "CLI Business Logic Boundary").
 *
 * The violation table is the user-visible outcome that justifies the whole
 * MDT-189 ticket. The VOC lying-ticket scenario (S1) is the acceptance test.
 */

import type { Violation } from '@mdt/shared/services/ticket/DependencyGraph.js'
import type { RelationEntry, Relations } from '../output/depsFormatter.js'
import type { StructuredOutputOptions } from '../output/structured.js'
import { ProjectService } from '@mdt/shared/services/ProjectService.js'
import {
  buildGraph,
  inverse,
  resolveDepKey,
  violations,
} from '@mdt/shared/services/ticket/DependencyGraph.js'
import { scanProseGaps } from '@mdt/shared/services/ticket/proseScanner.js'
import { TicketService } from '@mdt/shared/services/TicketService.js'
import {
  KeyNormalizationError,
  normalizeKey,
} from '@mdt/shared/utils/keyNormalizer.js'
import { formatDepsReport } from '../output/depsFormatter.js'
import {
  CliCommandError,
  getOutputFormat,
  writeStructuredSuccess,
} from '../output/structured.js'

/**
 * Options for the deps command. `--check` is the primary v1 surface and is
 * the default behavior when no flag is given, mirroring the ticket spec
 * (`mdt-cli deps <KEY>` and `mdt-cli deps <KEY> --check` are equivalent).
 */
interface DepsCommandOptions extends StructuredOutputOptions {
  /** Explicitly request the check report. Default behavior; flag kept for clarity. */
  check?: boolean
  /** Explicit project code (overrides cwd detection). */
  project?: string
}

/**
 * Parse a user-supplied ticket key into its project code + canonical key.
 *
 * Accepts three forms (mirrors attr.ts):
 *   - Cross-project: "ABC/MDT-12" or "ABC/12"
 *   - Fully-qualified: "ABC-12"
 *   - Bare number: "12" (resolved against the active project)
 *
 * Returns null when the key is bare/numeric and must be resolved against the
 * active project context.
 */
interface ParsedKey {
  projectCode: string
  ticketKey: string
}

function parseTicketKey(key: string): ParsedKey | null {
  // Cross-project format: "ABC/MDT-12" or "ABC/12"
  const crossProjectMatch = key.match(/^([^/]+)\/(.+)$/)
  if (crossProjectMatch) {
    const [, projectCode, ticketKeyPart] = crossProjectMatch
    return {
      projectCode: projectCode!.toUpperCase(),
      ticketKey: ticketKeyPart!,
    }
  }

  // Fully-qualified: "ABC-12"
  const fullFormatMatch = key.match(/^([a-z][a-z0-9]*)-(\d+)$/i)
  if (fullFormatMatch) {
    const [, projectCode] = fullFormatMatch
    return {
      projectCode: projectCode!.toUpperCase(),
      ticketKey: key,
    }
  }

  // Bare number or other shorthand — caller resolves against active project.
  return null
}

/**
 * Normalize a parsed ticket key against its project code. Mirrors attr.ts
 * lines 219-233: throws CliCommandError(INVALID_TICKET_KEY) if normalizeKey
 * rejects the shape.
 */
function normalizeParsedKey(key: string, projectCode: string): string {
  try {
    return normalizeKey(key, projectCode)
  }
  catch (error) {
    if (error instanceof KeyNormalizationError) {
      throw new CliCommandError(
        'INVALID_TICKET_KEY',
        `Invalid key format '${key}'. Expected: numeric shorthand, full format ABC-012, or cross-project ABC/DEF-012`,
      )
    }
    throw error
  }
}

/**
 * Resolve the active project, returning its code + path. Mirrors list.ts:
 * `--project` wins, else cwd detection.
 */
async function resolveProject(
  projectService: ProjectService,
  explicitProject: string | undefined,
): Promise<{ projectCode: string, projectPath: string, projectId: string }> {
  if (explicitProject) {
    const resolved = await projectService.getProjectByCodeOrId(explicitProject)
    if (!resolved) {
      throw new CliCommandError(
        'PROJECT_NOT_FOUND',
        `Project ${explicitProject} not found`,
        { projectCode: explicitProject },
      )
    }
    return {
      projectCode: resolved.project.code,
      projectPath: resolved.project.path,
      projectId: resolved.id,
    }
  }
  const projectResult = await projectService.resolveCurrentProject()
  if (!projectResult.data) {
    throw new CliCommandError(
      'NO_PROJECT_CONTEXT',
      'No project context. Run from a project directory or use --project.',
    )
  }
  return {
    projectCode: projectResult.data.project.code,
    projectPath: projectResult.data.project.path,
    projectId: projectResult.data.id,
  }
}

/**
 * Ticket deps action handler.
 *
 * @param key - Ticket key (numeric shorthand, full format, or cross-project)
 * @param options - Command options
 * @throws CliCommandError on resolution/validation failures
 */
export async function ticketDepsAction(
  key: string,
  options: DepsCommandOptions = {},
): Promise<void> {
  const projectService = new ProjectService(true)
  const ticketService = new TicketService(true)

  // Resolve project first so a bare-number key has a code to resolve against.
  const { projectCode, projectId } = await resolveProject(projectService, options.project)

  // Resolve the target ticket key to its canonical form.
  const parsed = parseTicketKey(key)
  let targetCode: string
  let targetProjectCode: string
  if (parsed) {
    targetProjectCode = parsed.projectCode
    targetCode = parsed.ticketKey.includes('/')
      ? normalizeParsedKey(parsed.ticketKey.split('/')[1]!, parsed.projectCode)
      : normalizeParsedKey(parsed.ticketKey, parsed.projectCode)
  }
  else {
    targetProjectCode = projectCode
    targetCode = normalizeParsedKey(key, projectCode)
  }

  // Load tickets across the target ticket's project so the graph sees every
  // same-project edge. Cross-project edges resolve only if the target ticket
  // lives in the same project; resolving cross-project deps against their
  // home project is a v1.1 concern.
  const listResult = await ticketService.listTickets({
    projectRef: targetProjectCode,
    sort: 'code',
    limit: undefined,
  })
  const tickets = listResult.data

  const target = tickets.find(t => t.code === targetCode)
  if (!target) {
    throw new CliCommandError(
      'TICKET_NOT_FOUND',
      `Ticket ${targetCode} not found in project ${targetProjectCode}`,
      { ticketKey: targetCode, projectCode: targetProjectCode },
    )
  }

  // Build the graph over the whole project and compute the target's violations.
  const graph = buildGraph(tickets, targetProjectCode)
  const violationList: Violation[] = violations(target, graph)
  const proseGaps = scanProseGaps(target, targetProjectCode)

  // Relationship inventory (BR-6). Computed from the same graph the violation
  // reporter uses (C-11): `dependsOn` from the target's own field, `blocks`
  // from `inverse(graph)`. Never re-derived from raw arrays.
  //
  // `--check` strict mode suppresses the inventory to preserve the pre-UAT
  // violations-only contract for scripts (BR-6.3). Default mode includes it.
  const includeRelations = !options.check
  const relations: Relations | undefined = includeRelations
    ? buildRelations(target, graph, targetProjectCode, tickets)
    : undefined

  const outputFormat = getOutputFormat(options)
  if (outputFormat !== 'human') {
    // Structured envelope — data block shape mirrors bdd.md S10/S18.
    const data: {
      ticket: { key: string, title: string }
      ready: boolean
      violations: Violation[]
      proseGaps: string[]
      relations?: Relations
    } = {
      ticket: { key: target.code, title: target.title },
      ready: violationList.length === 0,
      violations: violationList,
      proseGaps,
    }
    // BR-6.4: structured output carries the relations block alongside
    // violations/proseGaps. Included in default mode; omitted in `--check`
    // strict mode so JSON consumers can also distinguish the two contracts.
    if (relations) {
      data.relations = relations
    }
    writeStructuredSuccess(outputFormat, 'ticket.deps.check', data, {
      projectCode: targetProjectCode,
      projectId,
    })
    return
  }

  console.log(formatDepsReport({
    ticketCode: target.code,
    violations: violationList,
    proseGaps,
    relations,
  }))
}

/**
 * Build the relationship inventory for the target ticket (BR-6, C-11).
 *
 * - `dependsOn` comes from the target's own `dependsOn` field, each entry
 *   resolved via `resolveDepKey` (the same function `buildGraph` uses) and
 *   looked up in the tickets map for current status. Unresolved targets get
 *   status 'missing' — matches the violation reporter's framing.
 * - `blocks` comes from `inverse(graph)`: every ticket whose `dependsOn`
 *   includes the target. This is the canonical source per C-11; the CLI
 *   never re-derives blocking edges from raw arrays.
 *
 * Pure: takes the target + graph + ticket lookup, returns the inventory.
 * Exported for direct unit testing of the inventory composition (S18).
 */
export function buildRelations(
  target: { code: string, dependsOn: string[] },
  graph: ReturnType<typeof buildGraph>,
  activeProjectCode: string,
  tickets: { code: string, status: string }[],
): Relations {
  const statusByCode = new Map(tickets.map(t => [t.code, t.status]))

  const dependsOn: RelationEntry[] = target.dependsOn.map((rawKey) => {
    const resolved = resolveDepKey(rawKey, activeProjectCode)
    return {
      key: resolved,
      status: statusByCode.get(resolved) ?? 'missing',
    }
  })

  // inverse(graph) maps a key K -> [keys that depend on K]. We want everyone
  // who depends on the target — i.e., everyone the target blocks.
  const blockedByMap = inverse(graph)
  const blocksRaw = blockedByMap.get(target.code) ?? []
  const blocks: RelationEntry[] = blocksRaw.map(key => ({
    key,
    status: statusByCode.get(key) ?? 'unknown',
  }))

  return { dependsOn, blocks }
}
