/**
 * Unit tests for cloud option DTOs and validation (TEST-options-parse).
 *
 * Source: docs/CRs/MDT-202/architecture.md § Module Boundaries (BR-5.1).
 *
 * The DTOs themselves are pure types; this test locks the exported constant
 * arrays used for runtime validation (`--kind`, `--role`) and the mutually
 * exclusive `--json`/`--yaml` enforcement that lives in structured output.
 */

import { assertSingleOutputFormat, getOutputFormat } from '../../../output/structured'
import { describe, expect, it } from 'bun:test'
import { CLOUD_MEMBER_ROLES, CLOUD_PRINCIPAL_KINDS } from '../options'

describe('cloud option parsing (TEST-options-parse)', () => {
  it('exposes the principal kinds array for runtime validation', () => {
    expect(CLOUD_PRINCIPAL_KINDS).toEqual(['human', 'machine'])
  })

  it('exposes the member roles array for runtime validation', () => {
    expect(CLOUD_MEMBER_ROLES).toEqual(['viewer', 'contributor', 'owner'])
  })

  it('getOutputFormat honors --json then --yaml then human default', () => {
    expect(getOutputFormat({ json: true })).toBe('json')
    expect(getOutputFormat({ yaml: true })).toBe('yaml')
    expect(getOutputFormat({})).toBe('human')
  })

  it('assertSingleOutputFormat rejects simultaneous --json and --yaml (BR-5.1)', () => {
    expect(() => assertSingleOutputFormat({ json: true, yaml: true })).toThrow(/mutually exclusive/)
  })

  it('assertSingleOutputFormat passes for a single format', () => {
    expect(() => assertSingleOutputFormat({ json: true })).not.toThrow()
    expect(() => assertSingleOutputFormat({})).not.toThrow()
  })
})
