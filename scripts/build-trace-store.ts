#!/usr/bin/env bun

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import process from 'node:process'
import YAML from 'js-yaml'

type RequirementKind = 'behavior' | 'constraint' | 'edge_case'

interface RequirementRecord {
  id: string
  kind: RequirementKind
  text: string
  source_doc: string
  bdd_scenario_ids: string[]
  test_ids: string[]
  obligation_ids: string[]
  task_ids: string[]
  planning_status?: string
  planning_notes?: string
  finding_ids: string[]
}

interface ScenarioRecord {
  id: string
  source_doc: string
  file?: string
}

interface TestRecord {
  id: string
  kind: 'e2e' | 'unit' | 'integration'
  file: string
  source_doc: string
}

interface ObligationRecord {
  id: string
  title: string
  source_doc: string
  artifact_paths: string[]
  requirement_ids: string[]
}

interface TaskRecord {
  id: string
  title: string
  source_doc: string
}

interface FindingRecord {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  source_doc: string
  requirement_ids: string[]
  summary: string
}

interface TraceStore {
  meta: {
    ticket: string
    source_dir: string
    generated_at: string
  }
  source_docs: Record<string, string>
  requirements: RequirementRecord[]
  scenarios: ScenarioRecord[]
  tests: TestRecord[]
  obligations: ObligationRecord[]
  tasks: TaskRecord[]
  findings: FindingRecord[]
}

function deriveJsonOutputPath(outputPath: string): string {
  if (outputPath.endsWith('.yaml')) {
    return `${outputPath.slice(0, -5)}.json`
  }
  if (outputPath.endsWith('.yml')) {
    return `${outputPath.slice(0, -4)}.json`
  }
  return `${outputPath}.json`
}

function fail(message: string): never {
  throw new Error(message)
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseTableRows(section: string): string[][] {
  const tableLines = section
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('|'))

  if (tableLines.length < 3) {
    return []
  }

  return tableLines
    .slice(2)
    .map(line => line.slice(1, -1).split('|').map(cell => cell.trim()))
    .filter(cells => cells.some(cell => cell.length > 0))
}

function extractSection(content: string, heading: string): string {
  const lines = content.split('\n')
  const start = lines.findIndex(line => line.trim() === heading)
  if (start === -1) {
    fail(`Missing heading: ${heading}`)
  }

  const collected: string[] = []
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (line.startsWith('#')) {
      break
    }
    collected.push(line)
  }

  return collected.join('\n')
}

function expandRequirementExpr(expr: string, knownIds: string[]): string[] {
  const segments = expr
    .split(',')
    .map(segment => segment.trim())
    .filter(Boolean)

  const results = new Set<string>()

  for (const segment of segments) {
    if (segment === '-' || segment === '—') {
      continue
    }

    if (knownIds.includes(segment)) {
      results.add(segment)
      continue
    }

    let match = segment.match(/^BR-(\d+)$/)
    if (match) {
      const prefix = `BR-${match[1]}.`
      knownIds.filter(id => id.startsWith(prefix)).forEach(id => results.add(id))
      continue
    }

    match = segment.match(/^BR-(\d+)\.(\d+)-(\d+)\.(\d+)$/)
    if (match) {
      const [, leftFamily, leftStart, rightFamily, rightEnd] = match
      if (leftFamily !== rightFamily) {
        fail(`Cross-family requirement ranges are not supported: ${segment}`)
      }
      const family = Number(leftFamily)
      const start = Number(leftStart)
      const end = Number(rightEnd)
      for (let value = start; value <= end; value += 1) {
        results.add(`BR-${family}.${value}`)
      }
      continue
    }

    match = segment.match(/^Edge-(\d+)$/)
    if (match) {
      results.add(segment)
      continue
    }

    match = segment.match(/^Edge-(\d+)\.(\d+)$/)
    if (match) {
      results.add(segment)
      continue
    }

    match = segment.match(/^Edge-(\d+)\s+to\s+Edge-(\d+)$/)
    if (match) {
      const start = Number(match[1])
      const end = Number(match[2])
      for (let value = start; value <= end; value += 1) {
        const familyIds = knownIds.filter(id => id === `Edge-${value}` || id.startsWith(`Edge-${value}.`))
        familyIds.forEach(id => results.add(id))
      }
      continue
    }

    if (/^C\d+$/.test(segment)) {
      results.add(segment)
      continue
    }

    fail(`Unsupported requirement expression: ${segment}`)
  }

  return [...results]
}

function tryExpandRequirementExpr(expr: string, knownIds: string[]): string[] {
  try {
    return expandRequirementExpr(expr, knownIds)
  }
  catch {
    return []
  }
}

function ensureRequirement(
  requirements: Map<string, RequirementRecord>,
  id: string,
  partial: Partial<RequirementRecord>,
): RequirementRecord {
  const existing = requirements.get(id)
  if (existing) {
    if (partial.text && existing.text !== partial.text) {
      existing.text = partial.text
    }
    if (partial.kind && existing.kind !== partial.kind) {
      existing.kind = partial.kind
    }
    if (partial.source_doc) {
      existing.source_doc = partial.source_doc
    }
    return existing
  }

  const created: RequirementRecord = {
    id,
    kind: partial.kind ?? 'behavior',
    text: partial.text ?? '',
    source_doc: partial.source_doc ?? '',
    bdd_scenario_ids: [],
    test_ids: [],
    obligation_ids: [],
    task_ids: [],
    finding_ids: [],
  }
  requirements.set(id, created)
  return created
}

function pushUnique(target: string[], values: string[]): void {
  const known = new Set(target)
  for (const value of values) {
    if (!known.has(value)) {
      target.push(value)
      known.add(value)
    }
  }
}

function ensureTest(tests: Map<string, TestRecord>, file: string, sourceDoc: string): string {
  const id = `TEST-${slugify(file)}`
  if (!tests.has(id)) {
    const lowerFile = file.toLowerCase()
    const kind = lowerFile.includes('e2e')
      ? 'e2e'
      : lowerFile.includes('/api/')
        ? 'integration'
        : 'unit'
    tests.set(id, {
      id,
      kind,
      file,
      source_doc: sourceDoc,
    })
  }
  return id
}

function ensureScenario(scenarios: Map<string, ScenarioRecord>, id: string, sourceDoc: string): string {
  if (!scenarios.has(id)) {
    scenarios.set(id, {
      id,
      source_doc: sourceDoc,
    })
  }
  return id
}

function parseRequirements(requirementsPath: string, rootDir: string): Map<string, RequirementRecord> {
  const content = readFileSync(requirementsPath, 'utf8')
  const requirements = new Map<string, RequirementRecord>()
  const lines = content.split('\n')

  let activeFamily: string | null = null
  let activeSection = ''

  for (const line of lines) {
    const familyMatch = line.match(/^### (BR-\d+):/)
    if (familyMatch) {
      activeFamily = familyMatch[1]
      activeSection = 'behavior'
      continue
    }

    if (line.trim() === '## Constraints') {
      activeFamily = null
      activeSection = 'constraints'
      continue
    }

    if (activeSection === 'behavior' && activeFamily) {
      const itemMatch = line.match(/^\s*(\d+)\.\s+(WHEN .+)$/)
      if (itemMatch) {
        const id = `${activeFamily}.${itemMatch[1]}`
        ensureRequirement(requirements, id, {
          kind: 'behavior',
          text: itemMatch[2],
          source_doc: relative(rootDir, requirementsPath),
        })
      }
    }
  }

  const constraintsSection = extractSection(content, '## Constraints')
  for (const [concern, text] of parseTableRows(constraintsSection)) {
    const match = concern.match(/^(C\d+):/)
    if (!match) {
      continue
    }
    ensureRequirement(requirements, match[1], {
      kind: 'constraint',
      text,
      source_doc: relative(rootDir, requirementsPath),
    })
  }

  return requirements
}

function parseBdd(
  bddPath: string,
  requirements: Map<string, RequirementRecord>,
  scenarios: Map<string, ScenarioRecord>,
  rootDir: string,
): void {
  const content = readFileSync(bddPath, 'utf8')
  const coverageSection = extractSection(content, '## Requirement Coverage')
  const knownIds = [...requirements.keys()]

  for (const [reqExpr, scenarioCell, routedTo] of parseTableRows(coverageSection)) {
    const reqIds = expandRequirementExpr(reqExpr, knownIds)
    const scenarioIds = scenarioCell === '-' ? [] : scenarioCell.split(',').map(value => value.trim()).filter(Boolean)

    for (const scenarioId of scenarioIds) {
      ensureScenario(scenarios, scenarioId, relative(rootDir, bddPath))
    }

    for (const reqId of reqIds) {
      const requirement = ensureRequirement(requirements, reqId, {
        kind: reqId.startsWith('Edge-') ? 'edge_case' : undefined,
        source_doc: relative(rootDir, bddPath),
      })
      if (routedTo.includes('bdd')) {
        pushUnique(requirement.bdd_scenario_ids, scenarioIds)
      }
    }
  }
}

function parseArchitecture(
  architecturePath: string,
  requirements: Map<string, RequirementRecord>,
  obligations: Map<string, ObligationRecord>,
  rootDir: string,
): void {
  const content = readFileSync(architecturePath, 'utf8')
  const section = extractSection(content, '## Requirement Derivation')
  const knownIds = [...requirements.keys()]

  for (const [title, derivedExpr, artifactCell] of parseTableRows(section)) {
    const obligationId = `OBL-${slugify(title)}`
    const requirementIds = expandRequirementExpr(derivedExpr, knownIds)
    const artifactPaths = artifactCell
      .split(',')
      .map(value => value.trim().replace(/^`|`$/g, ''))
      .filter(Boolean)

    obligations.set(obligationId, {
      id: obligationId,
      title,
      source_doc: relative(rootDir, architecturePath),
      artifact_paths: artifactPaths,
      requirement_ids: requirementIds,
    })

    for (const reqId of requirementIds) {
      const requirement = ensureRequirement(requirements, reqId, {
        source_doc: relative(rootDir, architecturePath),
      })
      pushUnique(requirement.obligation_ids, [obligationId])
    }
  }
}

function parseTests(
  testsPath: string,
  requirements: Map<string, RequirementRecord>,
  tests: Map<string, TestRecord>,
  rootDir: string,
): void {
  const content = readFileSync(testsPath, 'utf8')
  const requirementSection = extractSection(content, '## Requirement Routing Summary')
  const constraintSection = extractSection(content, '## Constraint Coverage')
  const knownIds = [...requirements.keys()]

  for (const [reqExpr, fileCell] of parseTableRows(requirementSection)) {
    const reqIds = expandRequirementExpr(reqExpr, knownIds)
    const files = fileCell
      .split(',')
      .map(value => value.trim().replace(/^`|`$/g, ''))
      .filter(Boolean)

    const testIds = files.map(file => ensureTest(tests, file, relative(rootDir, testsPath)))
    for (const reqId of reqIds) {
      const requirement = ensureRequirement(requirements, reqId, {
        source_doc: relative(rootDir, testsPath),
      })
      pushUnique(requirement.test_ids, testIds)
    }
  }

  for (const [constraintId, fileCell] of parseTableRows(constraintSection)) {
    const reqIds = expandRequirementExpr(constraintId, knownIds)
    const files = fileCell
      .split(',')
      .map(value => value.trim().replace(/^`|`$/g, ''))
      .filter(Boolean)

    const testIds = files.map(file => ensureTest(tests, file, relative(rootDir, testsPath)))
    for (const reqId of reqIds) {
      const requirement = ensureRequirement(requirements, reqId, {
        source_doc: relative(rootDir, testsPath),
      })
      pushUnique(requirement.test_ids, testIds)
    }
  }
}

function parseTasks(
  tasksPath: string,
  requirements: Map<string, RequirementRecord>,
  tasks: Map<string, TaskRecord>,
  rootDir: string,
): void {
  const content = readFileSync(tasksPath, 'utf8')
  const taskLines = content.split('\n')
  for (const line of taskLines) {
    const match = line.match(/^### Task (\d+): (.+?) \(/)
    if (!match) {
      continue
    }
    const id = `TASK-${match[1]}`
    tasks.set(id, {
      id,
      title: match[2],
      source_doc: relative(rootDir, tasksPath),
    })
  }

  const requirementSection = extractSection(content, '## Requirement Coverage')
  const constraintSection = extractSection(content, '## Constraint Coverage')
  const knownIds = [...requirements.keys()]

  for (const [reqExpr, taskCell, status, notes] of parseTableRows(requirementSection)) {
    const reqIds = expandRequirementExpr(reqExpr, knownIds)
    const taskIds = [...taskCell.matchAll(/Task (\d+)/g)].map(match => `TASK-${match[1]}`)
    for (const reqId of reqIds) {
      const requirement = ensureRequirement(requirements, reqId, {
        source_doc: relative(rootDir, tasksPath),
      })
      pushUnique(requirement.task_ids, taskIds)
      requirement.planning_status = status.toLowerCase()
      requirement.planning_notes = notes
    }
  }

  for (const [constraintExpr, taskCell] of parseTableRows(constraintSection)) {
    const reqIds = expandRequirementExpr(constraintExpr, knownIds)
    const taskIds = [...taskCell.matchAll(/Task (\d+)/g)].map(match => `TASK-${match[1]}`)
    for (const reqId of reqIds) {
      const requirement = ensureRequirement(requirements, reqId, {
        source_doc: relative(rootDir, tasksPath),
      })
      pushUnique(requirement.task_ids, taskIds)
    }
  }
}

function parseFindings(
  gapsPath: string,
  uatPath: string,
  requirements: Map<string, RequirementRecord>,
  findings: Map<string, FindingRecord>,
  rootDir: string,
): void {
  const knownIds = [...requirements.keys()]
  const gapsContent = YAML.load(readFileSync(gapsPath, 'utf8')) as Record<string, unknown>
  const severityKeys = ['critical_gaps', 'high_priority_gaps', 'medium_priority_gaps', 'low_priority_gaps'] as const
  let findingCounter = 1

  for (const key of severityKeys) {
    const entries = Array.isArray(gapsContent[key]) ? (gapsContent[key] as Array<Record<string, unknown>>) : []
    for (const entry of entries) {
      const requirementExpr = typeof entry.requirement === 'string' ? entry.requirement : ''
      const requirementIds = requirementExpr ? tryExpandRequirementExpr(requirementExpr, knownIds).filter(id => requirements.has(id)) : []
      const findingId = `FIND-${String(findingCounter).padStart(3, '0')}`
      findingCounter += 1
      const severity = key === 'critical_gaps'
        ? 'critical'
        : key === 'high_priority_gaps'
          ? 'high'
          : key === 'medium_priority_gaps'
            ? 'medium'
            : 'low'

      findings.set(findingId, {
        id: findingId,
        severity,
        source_doc: relative(rootDir, gapsPath),
        requirement_ids: requirementIds,
        summary: String(entry.description ?? entry.requirement ?? 'Implementation finding'),
      })

      for (const reqId of requirementIds) {
        pushUnique(ensureRequirement(requirements, reqId, {}).finding_ids, [findingId])
      }
    }
  }

  const uatContent = readFileSync(uatPath, 'utf8')
  for (const match of uatContent.matchAll(/^\d+\.\s+\*\*(\S(?:.*?\S)?)\*\*\s+-\s+(\S.*)$/gm)) {
    const title = match[1]
    const text = match[2]
    const findingId = `FIND-${String(findingCounter).padStart(3, '0')}`
    findingCounter += 1

    const requirementIds: string[] = []
    if (/show all/i.test(title) || /launcher/i.test(text)) {
      requirementIds.push('BR-3.1')
    }
    if (/mobile/i.test(title) && /show all/i.test(title)) {
      requirementIds.push('BR-9.1')
    }
    if (/dropdown alignment/i.test(title)) {
      requirementIds.push('C5')
    }
    if (/single column/i.test(text)) {
      requirementIds.push('BR-9.3')
    }

    findings.set(findingId, {
      id: findingId,
      severity: 'info',
      source_doc: relative(rootDir, uatPath),
      requirement_ids: requirementIds,
      summary: `${title}: ${text}`,
    })

    for (const reqId of requirementIds) {
      pushUnique(ensureRequirement(requirements, reqId, {}).finding_ids, [findingId])
    }
  }
}

function buildStore(sourceDir: string, outputPath: string): void {
  const rootDir = dirname(dirname(dirname(dirname(sourceDir))))
  const requirementsPath = join(sourceDir, 'requirements.md')
  const bddPath = join(sourceDir, 'bdd.md')
  const architecturePath = join(sourceDir, 'architecture.md')
  const testsPath = join(sourceDir, 'tests.md')
  const tasksPath = join(sourceDir, 'tasks.md')
  const gapsPath = join(dirname(sourceDir), 'implementation-gaps.yaml')
  const uatPath = join(sourceDir, 'uat.md')

  const requirements = parseRequirements(requirementsPath, rootDir)
  const scenarios = new Map<string, ScenarioRecord>()
  const tests = new Map<string, TestRecord>()
  const obligations = new Map<string, ObligationRecord>()
  const tasks = new Map<string, TaskRecord>()
  const findings = new Map<string, FindingRecord>()

  parseBdd(bddPath, requirements, scenarios, rootDir)
  parseArchitecture(architecturePath, requirements, obligations, rootDir)
  parseTests(testsPath, requirements, tests, rootDir)
  parseTasks(tasksPath, requirements, tasks, rootDir)
  parseFindings(gapsPath, uatPath, requirements, findings, rootDir)

  const store: TraceStore = {
    meta: {
      ticket: basename(dirname(sourceDir)),
      source_dir: relative(rootDir, sourceDir),
      generated_at: new Date().toISOString(),
    },
    source_docs: {
      requirements: relative(rootDir, requirementsPath),
      bdd: relative(rootDir, bddPath),
      architecture: relative(rootDir, architecturePath),
      tests: relative(rootDir, testsPath),
      tasks: relative(rootDir, tasksPath),
      uat: relative(rootDir, uatPath),
      implementation_gaps: relative(rootDir, gapsPath),
    },
    requirements: [...requirements.values()].sort((left, right) => left.id.localeCompare(right.id, undefined, { numeric: true })),
    scenarios: [...scenarios.values()].sort((left, right) => left.id.localeCompare(right.id)),
    tests: [...tests.values()].sort((left, right) => left.id.localeCompare(right.id)),
    obligations: [...obligations.values()].sort((left, right) => left.id.localeCompare(right.id)),
    tasks: [...tasks.values()].sort((left, right) => left.id.localeCompare(right.id)),
    findings: [...findings.values()].sort((left, right) => left.id.localeCompare(right.id)),
  }

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, YAML.dump(store, { noRefs: true, lineWidth: 120 }), 'utf8')
  writeFileSync(deriveJsonOutputPath(outputPath), `${JSON.stringify(store, null, 2)}\n`, 'utf8')
}

const [, , sourceDirArg, outputPathArg] = process.argv

if (!sourceDirArg || !outputPathArg) {
  console.error('Usage: bun scripts/build-trace-store.ts <workflow-drafts-dir> <output-yaml>')
  process.exit(1)
}

buildStore(sourceDirArg, outputPathArg)
