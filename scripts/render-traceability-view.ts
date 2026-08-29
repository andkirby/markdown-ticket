#!/usr/bin/env bun

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname } from 'node:path'
import process from 'node:process'
import YAML from 'js-yaml'

interface RequirementRecord {
  id: string
  kind: 'behavior' | 'constraint' | 'edge_case'
  text: string
  bdd_scenario_ids: string[]
  test_ids: string[]
  obligation_ids: string[]
  task_ids: string[]
  planning_status?: string
  planning_notes?: string
  finding_ids: string[]
}

interface FindingRecord {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  requirement_ids: string[]
  summary: string
}

interface TraceStore {
  meta: {
    ticket: string
    source_dir: string
    generated_at: string
  }
  requirements: RequirementRecord[]
  findings: FindingRecord[]
}

function renderCoverageBadge(value: boolean): string {
  return value ? 'yes' : 'no'
}

function getMissingRoutes(requirement: RequirementRecord): string[] {
  const missing: string[] = []

  if (requirement.kind === 'constraint') {
    if (requirement.obligation_ids.length === 0) {
      missing.push('architecture')
    }
    if (requirement.test_ids.length === 0) {
      missing.push('tests')
    }
    if (requirement.task_ids.length === 0) {
      missing.push('tasks')
    }
    return missing
  }

  if (requirement.kind === 'edge_case') {
    if (requirement.bdd_scenario_ids.length === 0) {
      missing.push('bdd')
    }
    return missing
  }

  if (requirement.obligation_ids.length === 0) {
    missing.push('architecture')
  }
  if (requirement.task_ids.length === 0) {
    missing.push('tasks')
  }
  if (requirement.bdd_scenario_ids.length === 0 && requirement.test_ids.length === 0) {
    missing.push('bdd/tests')
  }

  return missing
}

function render(store: TraceStore): string {
  const findingsById = new Map(store.findings.map(finding => [finding.id, finding]))
  const total = store.requirements.length
  const withBdd = store.requirements.filter(item => item.bdd_scenario_ids.length > 0).length
  const withTests = store.requirements.filter(item => item.test_ids.length > 0).length
  const withArchitecture = store.requirements.filter(item => item.obligation_ids.length > 0).length
  const withTasks = store.requirements.filter(item => item.task_ids.length > 0).length
  const withFindings = store.requirements.filter(item => item.finding_ids.length > 0).length

  const missingRoutes = store.requirements.filter(item => getMissingRoutes(item).length > 0)

  const highRiskFindings = store.findings.filter(finding => finding.severity === 'critical' || finding.severity === 'high')

  const lines: string[] = []
  lines.push(`# ${store.meta.ticket} Traceability View`)
  lines.push('')
  lines.push(`**Source Store**: \`${process.argv[2] ?? basename('store.yaml')}\``)
  lines.push(`**Generated**: ${store.meta.generated_at}`)
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push('| Metric | Value |')
  lines.push('|--------|-------|')
  lines.push(`| Requirements | ${total} |`)
  lines.push(`| With BDD route | ${withBdd} |`)
  lines.push(`| With test route | ${withTests} |`)
  lines.push(`| With architecture obligation | ${withArchitecture} |`)
  lines.push(`| With task coverage | ${withTasks} |`)
  lines.push(`| With findings | ${withFindings} |`)
  lines.push(`| Missing required routes | ${missingRoutes.length} |`)
  lines.push(`| Critical/high findings | ${highRiskFindings.length} |`)
  lines.push('')
  lines.push('## Requirement Matrix')
  lines.push('')
  lines.push('| ID | Kind | BDD | Tests | Architecture | Tasks | Planning | Findings |')
  lines.push('|----|------|-----|-------|--------------|-------|----------|----------|')
  for (const requirement of store.requirements) {
    lines.push(
      `| ${requirement.id} | ${requirement.kind} | ${renderCoverageBadge(requirement.bdd_scenario_ids.length > 0)} | ${renderCoverageBadge(requirement.test_ids.length > 0)} | ${renderCoverageBadge(requirement.obligation_ids.length > 0)} | ${renderCoverageBadge(requirement.task_ids.length > 0)} | ${requirement.planning_status ?? 'n/a'} | ${requirement.finding_ids.length} |`,
    )
  }

  lines.push('')
  lines.push('## Missing Required Routes')
  lines.push('')
  if (missingRoutes.length === 0) {
    lines.push('None.')
  }
  else {
    lines.push('| ID | Kind | Missing | Notes |')
    lines.push('|----|------|---------|-------|')
    for (const requirement of missingRoutes) {
      const missing = getMissingRoutes(requirement)
      lines.push(`| ${requirement.id} | ${requirement.kind} | ${missing.join(', ')} | ${requirement.planning_notes ?? ''} |`)
    }
  }

  lines.push('')
  lines.push('## Critical And High Findings')
  lines.push('')
  if (highRiskFindings.length === 0) {
    lines.push('None.')
  }
  else {
    lines.push('| ID | Severity | Requirements | Summary |')
    lines.push('|----|----------|--------------|---------|')
    for (const finding of highRiskFindings) {
      lines.push(`| ${finding.id} | ${finding.severity} | ${finding.requirement_ids.join(', ')} | ${finding.summary} |`)
    }
  }

  lines.push('')
  lines.push('## Requirement Details')
  lines.push('')
  for (const requirement of store.requirements) {
    lines.push(`### ${requirement.id}`)
    lines.push('')
    lines.push(requirement.text)
    lines.push('')
    lines.push(`- BDD scenarios: ${requirement.bdd_scenario_ids.join(', ') || 'none'}`)
    lines.push(`- Tests: ${requirement.test_ids.join(', ') || 'none'}`)
    lines.push(`- Architecture obligations: ${requirement.obligation_ids.join(', ') || 'none'}`)
    lines.push(`- Tasks: ${requirement.task_ids.join(', ') || 'none'}`)
    const findingSummaries = requirement.finding_ids
      .map(findingId => findingsById.get(findingId))
      .filter((finding): finding is FindingRecord => Boolean(finding))
      .map(finding => `${finding.id} (${finding.severity}): ${finding.summary}`)
    lines.push(`- Findings: ${findingSummaries.join('; ') || 'none'}`)
    lines.push('')
  }

  return `${lines.join('\n')}\n`
}

const [, , inputPath, outputPath] = process.argv

if (!inputPath || !outputPath) {
  console.error('Usage: bun scripts/render-traceability-view.ts <store-yaml> <output-md>')
  process.exit(1)
}

const store = YAML.load(readFileSync(inputPath, 'utf8')) as TraceStore
const markdown = render(store)
mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, markdown, 'utf8')
