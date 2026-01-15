/**
 * Ticket/CR Fixtures - MDT-106.
 *
 * Test fixtures for CR markdown content.
 * For creating CR files, use ProjectFactory from @mdt/shared/test-lib.
 */

import type { CRStatus, CRType } from '@mdt/shared'

function tpl(_code: string, s: CRStatus, _t: CRType, _p = 'Medium', _extra = '', _desc = 'Test description') {
  return `---\ncode: ${_code}\nstatus: ${s}\ntype: ${_t}\npriority: ${_p}${_extra}\n---\n\n## 1. Description\n${_desc}`
}

// Status fixtures
const _statusFixtures: Record<CRStatus, string> = {
  'Proposed': tpl('TEST-001', 'Proposed', 'Feature Enhancement'),
  'Approved': tpl('TEST-002', 'Approved', 'Architecture', 'High'),
  'In Progress': tpl('TEST-003', 'In Progress', 'Bug Fix', 'Critical', '\nassignee: dev@example.com'),
  'Implemented': tpl('TEST-004', 'Implemented', 'Documentation', 'Low'),
  'Rejected': tpl('TEST-005', 'Rejected', 'Feature Enhancement', 'Low'),
  'On Hold': tpl('TEST-006', 'On Hold', 'Feature Enhancement', 'Medium'),
  'Superseded': tpl('TEST-007', 'Superseded', 'Bug Fix', 'Low'),
  'Deprecated': tpl('TEST-008', 'Deprecated', 'Technical Debt', 'Low'),
  'Duplicate': tpl('TEST-009', 'Duplicate', 'Documentation', 'Low'),
  'Partially Implemented': tpl('TEST-010', 'Partially Implemented', 'Feature Enhancement', 'Medium'),
}

// Type fixtures (Feature Enhancement, Bug Fix, Technical Debt, Architecture, Documentation)
const _typeFixtures: Record<CRType, string> = {
  'Feature Enhancement': tpl('TEST-006', 'Proposed', 'Feature Enhancement'),
  'Bug Fix': tpl('TEST-007', 'Approved', 'Bug Fix', 'High'),
  'Technical Debt': tpl('TEST-008', 'Proposed', 'Technical Debt'),
  'Architecture': tpl('TEST-009', 'In Progress', 'Architecture', 'Critical'),
  'Documentation': tpl('TEST-010', 'Implemented', 'Documentation', 'Low'),
}

// Malformed YAML fixtures (R6.3 error testing)
export const malformedYAMLFixtures = {
  invalidIndentation: `---\ncode: TEST-991\nstatus: Proposed\n    phaseEpic: Bad indent\n---\n\n## 1. Description\nBad YAML indent.`,
  missingColon: `---\ncode TEST-992\nstatus: Proposed\n---\n\n## 1. Description\nMissing colon.`,
  unclosedQuote: `---\ncode: TEST-993\ntitle: "Unclosed\nstatus: Proposed\n---\n\n## 1. Description\nUnclosed quote.`,
  invalidList: `---\ncode: TEST-994\nimpactAreas: [broken\n---\n\n## 1. Description\nInvalid list.`,
  duplicateKeys: `---\ncode: TEST-995\nstatus: Proposed\nstatus: Approved\n---\n\n## 1. Description\nDuplicate keys.`,
}

// Edge case fixtures
const _edgeCaseFixtures = {
  emptyContent: `---\ncode: TEST-801\nstatus: Proposed\ntype: Feature Enhancement\npriority: Low\n---\n\n## 1. Description\n\n\n## 2. Rationale\nNo content.`,
  specialCharacters: `---\ncode: TEST-802\ntitle: 'Test <special> & "chars"'\nstatus: Proposed\ntype: Bug Fix\npriority: Medium\n---\n\n## 1. Description\nUnicode: 你好 世界 🎉`,
  longTitle: `---\ncode: TEST-803\ntitle: ${'Long '.repeat(50)}\nstatus: Proposed\n---\n\n## 1. Description\nLong title test.`,
  codeBlocks: `---\ncode: TEST-804\nstatus: In Progress\ntype: Technical Debt\n---\n\n## 1. Description\n\`\`\`ts\nconst x: string = 'test';\n\`\`\``,
  allFields: tpl('TEST-805', 'Approved', 'Feature Enhancement', 'High', '\nphaseEpic: Q1\nassignee: dev@test.com\nimpactAreas: [FE, BE]\nrelatedTickets: TEST-001\ndependsOn: TEST-001\nblocks: TEST-006'),
  minimalFields: `---\ncode: TEST-806\nstatus: Proposed\ntype: Bug Fix\n---\n\n## 1. Description\nMinimal fields.`,
}
