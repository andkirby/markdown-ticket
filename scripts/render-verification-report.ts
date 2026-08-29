#!/usr/bin/env bun
/**
 * Verification Report Renderer
 *
 * Reads verification-report.yaml and generates:
 * - HTML report with color coding
 * - Markdown report for CR docs
 *
 * Usage:
 *   bun scripts/render-verification-report.ts docs/CRs/MDT-129/verification-report.yaml
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import * as YAML from 'js-yaml'

interface Requirement {
  id: string
  description: string
  target: string | null
  target_type: string | null
  status: 'covered' | 'routed' | 'gap'
  file: string | null
  priority?: string
}

interface Constraint {
  id: string
  description: string
  location: string
  status: string
  evidence?: string
}

interface Claim {
  claim: string
  expected: string
  actual: string
  status: string
}

interface TestIdEntry {
  component: string
  testid: string
  location: string
  status: string
}

interface VerificationData {
  meta: {
    ticket: string
    title: string
    generated: string
  }
  docs_alignment: {
    source_items: number
    target_items: number
    forward_coverage_pct: number
    reverse_coverage_pct: number
    gaps: number
    invented: number
  }
  requirements: Requirement[]
  constraints: Constraint[]
  implementation: {
    claims_verified: number
    claims_total: number
    coverage_pct: number
    verdict: string
    claims: Claim[]
  }
  testids: {
    total: number
    verified: number
    coverage_pct: number
    entries: TestIdEntry[]
  }
  summary: {
    docs_verdict: string
    impl_verdict: string
    overall_status: string
    required_actions: Array<{ action: string, priority: string }>
  }
}

// Color constants
const COLORS = {
  bg: '#0d1117',
  text: '#c9d1d9',
  border: '#30363d',
  green: '#238636',
  greenBg: '#1a5c24',
  red: '#da3633',
  redBg: '#8b1c1c',
  yellow: '#d29922',
  yellowBg: '#8f6c06',
  blue: '#58a6ff',
  blueBg: '#1f6feb',
  gray: '#8b949e',
  grayBg: '#30363d',
  white: '#ffffff',
}

function getStatusColor(status: string): { bg: string, text: string, label: string } {
  switch (status) {
    case 'covered':
      return { bg: COLORS.greenBg, text: COLORS.green, label: 'COVERED' }
    case 'routed':
      return { bg: COLORS.blueBg, text: COLORS.blue, label: 'ROUTED' }
    case 'gap':
      return { bg: COLORS.redBg, text: COLORS.red, label: 'GAP' }
    case 'verified':
      return { bg: COLORS.greenBg, text: COLORS.green, label: 'VERIFIED' }
    case 'conformant':
      return { bg: COLORS.greenBg, text: COLORS.green, label: 'CONFORMANT' }
    case 'gaps_found':
      return { bg: COLORS.yellowBg, text: COLORS.yellow, label: 'GAPS FOUND' }
    default:
      return { bg: COLORS.grayBg, text: COLORS.gray, label: status.toUpperCase() }
  }
}

function getPriorityColor(priority?: string): { bg: string, text: string } {
  switch (priority) {
    case 'High':
      return { bg: COLORS.redBg, text: COLORS.red }
    case 'Medium':
      return { bg: COLORS.yellowBg, text: COLORS.yellow }
    case 'Low':
      return { bg: COLORS.grayBg, text: COLORS.gray }
    default:
      return { bg: COLORS.grayBg, text: COLORS.gray }
  }
}

function generateHTML(data: VerificationData): string {
  const docsStatus = getStatusColor(data.summary.docs_verdict)
  const implStatus = getStatusColor(data.summary.impl_verdict)

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.meta.ticket} Verification Report</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      background-color: ${COLORS.bg};
      color: ${COLORS.text};
      margin: 0;
      padding: 20px;
      line-height: 1.5;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { color: ${COLORS.white}; border-bottom: 1px solid ${COLORS.border}; padding-bottom: 10px; }
    h2 { color: ${COLORS.white}; margin-top: 30px; }
    h3 { color: ${COLORS.blue}; }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }

    .card {
      background: ${COLORS.grayBg};
      border: 1px solid ${COLORS.border};
      border-radius: 6px;
      padding: 15px;
    }

    .card-title {
      color: ${COLORS.gray};
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }

    .card-value {
      font-size: 32px;
      font-weight: bold;
      color: ${COLORS.white};
    }

    .card-subtitle {
      color: ${COLORS.gray};
      font-size: 14px;
      margin-top: 5px;
    }

    .verdict-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 14px;
    }

    th, td {
      border: 1px solid ${COLORS.border};
      padding: 10px;
      text-align: left;
    }

    th {
      background: ${COLORS.grayBg};
      color: ${COLORS.white};
      font-weight: 600;
      position: sticky;
      top: 0;
    }

    tr:hover { background: rgba(255,255,255,0.03); }

    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
    }

    .priority-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
    }

    .gap-row { background: rgba(218, 54, 51, 0.1); }
    .routed-row { background: rgba(88, 166, 255, 0.1); }

    .coverage-bar {
      height: 8px;
      background: ${COLORS.grayBg};
      border-radius: 4px;
      overflow: hidden;
      margin-top: 5px;
    }

    .coverage-fill {
      height: 100%;
      background: ${COLORS.green};
      transition: width 0.3s ease;
    }

    .actions-list {
      list-style: none;
      padding: 0;
    }

    .actions-list li {
      padding: 10px;
      margin: 5px 0;
      background: ${COLORS.grayBg};
      border-left: 3px solid ${COLORS.yellow};
      border-radius: 0 4px 4px 0;
    }

    code {
      background: ${COLORS.grayBg};
      padding: 2px 6px;
      border-radius: 3px;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${data.meta.ticket} Verification Report</h1>
    <p style="color: ${COLORS.gray}; margin-bottom: 30px;">
      <strong>${data.meta.title}</strong> • Generated: ${data.meta.generated}
    </p>

    <!-- Summary Cards -->
    <div class="summary-cards">
      <div class="card">
        <div class="card-title">Docs Alignment</div>
        <div class="card-value">${data.docs_alignment.forward_coverage_pct}%</div>
        <div class="card-subtitle">${data.docs_alignment.source_items} → ${data.docs_alignment.target_items} items</div>
      </div>

      <div class="card">
        <div class="card-title">Docs Verdict</div>
        <div style="margin-top: 10px;">
          <span class="verdict-badge" style="background: ${docsStatus.bg}; color: ${docsStatus.text};">
            ${docsStatus.label}
          </span>
        </div>
        <div class="card-subtitle">${data.docs_alignment.gaps} gaps • ${data.docs_alignment.invented} invented</div>
      </div>

      <div class="card">
        <div class="card-title">Implementation</div>
        <div class="card-value">${data.implementation.coverage_pct}%</div>
        <div class="card-subtitle">${data.implementation.claims_verified}/${data.implementation.claims_total} claims</div>
      </div>

      <div class="card">
        <div class="card-title">Impl Verdict</div>
        <div style="margin-top: 10px;">
          <span class="verdict-badge" style="background: ${implStatus.bg}; color: ${implStatus.text};">
            ${implStatus.label}
          </span>
        </div>
        <div class="card-subtitle">${data.testids.verified}/${data.testids.total} testids</div>
      </div>
    </div>

    <!-- Coverage Bars -->
    <div style="margin: 30px 0;">
      <h3>Forward Coverage (Source → Target)</h3>
      <div class="coverage-bar">
        <div class="coverage-fill" style="width: ${data.docs_alignment.forward_coverage_pct}%;"></div>
      </div>
      <p style="color: ${COLORS.gray}; font-size: 12px; margin-top: 5px;">
        ${data.docs_alignment.target_items} of ${data.docs_alignment.source_items} requirements have test coverage
      </p>

      <h3 style="margin-top: 20px;">Reverse Coverage (Target → Source)</h3>
      <div class="coverage-bar">
        <div class="coverage-fill" style="width: ${data.docs_alignment.reverse_coverage_pct}%;"></div>
      </div>
      <p style="color: ${COLORS.gray}; font-size: 12px; margin-top: 5px;">
        ${data.docs_alignment.target_items} of ${data.docs_alignment.target_items} tests trace to requirements (no invented tests)
      </p>
    </div>

    <!-- Requirements Table -->
    <h2>Requirements Coverage</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 80px;">ID</th>
          <th>Description</th>
          <th style="width: 150px;">Target</th>
          <th style="width: 100px;">Type</th>
          <th style="width: 100px;">Status</th>
          <th style="width: 200px;">File</th>
        </tr>
      </thead>
      <tbody>
`

  for (const req of data.requirements) {
    const statusColor = getStatusColor(req.status)
    const rowClass = req.status === 'gap' ? 'gap-row' : req.status === 'routed' ? 'routed-row' : ''
    const targetDisplay = req.target || `<em style="color: ${COLORS.gray};">—</em>`
    const fileDisplay = req.file || `<em style="color: ${COLORS.gray};">—</em>`
    const typeDisplay = req.target_type || '—'
    const priorityBadge = req.priority
      ? (() => {
          const pc = getPriorityColor(req.priority!)
          return `<span class="priority-badge" style="background: ${pc.bg}; color: ${pc.text};">${req.priority}</span>`
        })()
      : ''

    html += `        <tr class="${rowClass}">
          <td><code>${req.id}</code></td>
          <td>${req.description}${priorityBadge ? ` ${priorityBadge}` : ''}</td>
          <td>${targetDisplay}</td>
          <td>${typeDisplay}</td>
          <td><span class="status-badge" style="background: ${statusColor.bg}; color: ${statusColor.text};">${statusColor.label}</span></td>
          <td><code>${fileDisplay}</code></td>
        </tr>
`
  }

  html += `      </tbody>
    </table>

    <!-- Required Actions -->
    <h2>Required Actions</h2>
    <ul class="actions-list">
`

  for (const action of data.summary.required_actions) {
    const priorityColor = getPriorityColor(action.priority)
    html += `      <li>
        <span class="priority-badge" style="background: ${priorityColor.bg}; color: ${priorityColor.text}; margin-right: 10px;">${action.priority}</span>
        ${action.action}
      </li>
`
  }

  html += `    </ul>

    <!-- Constraints Table -->
    <h2>Constraint Verification</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 60px;">ID</th>
          <th>Description</th>
          <th>Location</th>
          <th style="width: 100px;">Status</th>
        </tr>
      </thead>
      <tbody>
`

  for (const constraint of data.constraints) {
    const statusColor = getStatusColor(constraint.status)
    html += `        <tr>
          <td><code>${constraint.id}</code></td>
          <td>${constraint.description}${constraint.evidence ? ` <span style="color: ${COLORS.green}; font-size: 11px;">✓ ${constraint.evidence}</span>` : ''}</td>
          <td>${constraint.location}</td>
          <td><span class="status-badge" style="background: ${statusColor.bg}; color: ${statusColor.text};">${statusColor.label}</span></td>
        </tr>
`
  }

  html += `      </tbody>
    </table>

    <!-- Implementation Claims -->
    <h2>Implementation Claims</h2>
    <table>
      <thead>
        <tr>
          <th>Claim</th>
          <th>Expected</th>
          <th>Actual</th>
          <th style="width: 100px;">Status</th>
        </tr>
      </thead>
      <tbody>
`

  for (const claim of data.implementation.claims) {
    const statusColor = getStatusColor(claim.status)
    html += `        <tr>
          <td><code>${claim.claim}</code></td>
          <td>${claim.expected}</td>
          <td style="color: ${COLORS.green};">${claim.actual}</td>
          <td><span class="status-badge" style="background: ${statusColor.bg}; color: ${statusColor.text};">${statusColor.label}</span></td>
        </tr>
`
  }

  html += `      </tbody>
    </table>

    <!-- Test IDs -->
    <h2>data-testid Attributes</h2>
    <p style="color: ${COLORS.gray};">${data.testids.verified} of ${data.testids.total} verified</p>
    <table>
      <thead>
        <tr>
          <th>Component</th>
          <th>testid</th>
          <th>Location</th>
          <th style="width: 100px;">Status</th>
        </tr>
      </thead>
      <tbody>
`

  for (const entry of data.testids.entries) {
    const statusColor = getStatusColor(entry.status)
    html += `        <tr>
          <td>${entry.component}</td>
          <td><code>${entry.testid}</code></td>
          <td><code>${entry.location}</code></td>
          <td><span class="status-badge" style="background: ${statusColor.bg}; color: ${statusColor.text};">${statusColor.label}</span></td>
        </tr>
`
  }

  html += `      </tbody>
    </table>

  </div>
</body>
</html>`

  return html
}

function generateMarkdown(data: VerificationData): string {
  const docsStatus = data.summary.docs_verdict.toUpperCase()
  const implStatus = data.summary.impl_verdict.toUpperCase()
  const statusEmoji = docsStatus === 'CONFORMANT' ? '✅' : '⚠️'

  let md = `# ${data.meta.ticket} Verification Report

> **${data.meta.title}** • Generated: ${data.meta.generated}

## Summary

| Metric | Value |
|--------|-------|
| Docs Alignment | ${data.docs_alignment.forward_coverage_pct}% (${data.docs_alignment.target_items}/${data.docs_alignment.source_items}) |
| Docs Verdict | ${statusEmoji} **${docsStatus}** (${data.docs_alignment.gaps} gaps, ${data.docs_alignment.invented} invented) |
| Implementation | ${data.implementation.coverage_pct}% (${data.implementation.claims_verified}/${data.implementation.claims_total}) |
| Impl Verdict | ✅ **${implStatus}** |
| Test IDs | ${data.testids.verified}/${data.testids.total} verified |

## Coverage Visual

\`\`\`
Forward Coverage (Source → Target): ${'█'.repeat(Math.floor(data.docs_alignment.forward_coverage_pct / 5))}${'░'.repeat(20 - Math.floor(data.docs_alignment.forward_coverage_pct / 5))} ${data.docs_alignment.forward_coverage_pct}%
Reverse Coverage (Target → Source): ${'█'.repeat(Math.floor(data.docs_alignment.reverse_coverage_pct / 5))}${'░'.repeat(20 - Math.floor(data.docs_alignment.reverse_coverage_pct / 5))} ${data.docs_alignment.reverse_coverage_pct}%
\`\`\`

## Requirements Coverage

| ID | Description | Target | Type | Status | File |
|----|-------------|--------|------|--------|------|
`

  for (const req of data.requirements) {
    const statusIcon = req.status === 'covered' ? '✅' : req.status === 'routed' ? '🔄' : '❌'
    const targetDisplay = req.target || '—'
    const fileDisplay = req.file || '—'
    const typeDisplay = req.target_type || '—'
    const prioritySuffix = req.priority ? ` (${req.priority})` : ''

    md += `| ${req.id} | ${req.description}${prioritySuffix} | ${targetDisplay} | ${typeDisplay} | ${statusIcon} ${req.status} | ${fileDisplay} |\n`
  }

  md += `
## Required Actions

`

  for (const action of data.summary.required_actions) {
    const icon = action.priority === 'High' ? '🔴' : action.priority === 'Medium' ? '🟡' : '⚪'
    md += `${icon} **${action.priority}**: ${action.action}\n`
  }

  md += `
## Constraint Verification

| ID | Description | Location | Status |
|----|-------------|----------|--------|
`

  for (const constraint of data.constraints) {
    const statusIcon = constraint.status === 'verified' ? '✅' : '❌'
    md += `| ${constraint.id} | ${constraint.description}${constraint.evidence ? ` ✓ ${constraint.evidence}` : ''} | ${constraint.location} | ${statusIcon} ${constraint.status} |\n`
  }

  md += `
## Implementation Claims

| Claim | Expected | Actual | Status |
|-------|----------|--------|--------|
`

  for (const claim of data.implementation.claims) {
    md += `| \`${claim.claim}\` | ${claim.expected} | ${claim.actual} | ✅ ${claim.status} |\n`
  }

  md += `
## data-testid Attributes

${data.testids.verified}/${data.testids.total} verified

| Component | testid | Location | Status |
|-----------|--------|----------|--------|
`

  for (const entry of data.testids.entries) {
    md += `| ${entry.component} | \`${entry.testid}\` | ${entry.location} | ✅ ${entry.status} |\n`
  }

  md += `
---

*Generated from verification-report.yaml*
`

  return md
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error('Usage: bun render-verification-report.ts <verification-report.yaml>')
    process.exit(1)
  }

  const yamlPath = args[0]
  const yamlContent = readFileSync(yamlPath, 'utf-8')
  const data = YAML.load(yamlContent) as VerificationData

  const baseDir = join(yamlPath, '..')

  // Generate HTML
  const htmlPath = join(baseDir, 'verification-report.html')
  writeFileSync(htmlPath, generateHTML(data))
  console.log(`✅ HTML report: ${htmlPath}`)

  // Generate Markdown
  const mdPath = join(baseDir, 'verification-report.md')
  writeFileSync(mdPath, generateMarkdown(data))
  console.log(`✅ Markdown report: ${mdPath}`)
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
