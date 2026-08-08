/**
 * MDT-205 — MCP tool schema surface for the `level` field.
 *
 * Asserts create_cr and update_cr_attrs expose `level` with the canonical enum,
 * and that the allowed-attribute description list includes level. The handler
 * surfaces epic-rule violations because the shared TicketService throws
 * INVALID_OPERATION ServiceErrors (covered by shared-layer tests).
 */

import { describe, expect, it } from '@jest/globals'
import { ALL_TOOLS } from '../../../../src/tools/config/allTools.js'

const findTool = (name: string) => ALL_TOOLS.find(t => t.name === name)

describe('MCP tool schemas — level field (MDT-205)', () => {
  it('create_cr data includes level with the ticket|epic enum', () => {
    const create = findTool('create_cr')!
    const schema = create.inputSchema as unknown as {
      properties: { data: { properties: Record<string, { enum?: string[] }> } }
    }
    const dataProps = schema.properties.data.properties
    expect(dataProps.level).toBeDefined()
    expect(dataProps.level!.enum).toEqual(['ticket', 'epic'])
  })

  it('update_cr_attrs attributes include level with the ticket|epic enum', () => {
    const update = findTool('update_cr_attrs')!
    const schema = update.inputSchema as unknown as {
      properties: {
        attributes: { properties: Record<string, { enum?: string[] }> }
      }
    }
    const attrs = schema.properties.attributes.properties
    expect(attrs.level).toBeDefined()
    expect(attrs.level!.enum).toEqual(['ticket', 'epic'])
  })

  it('update_cr_attrs description lists level among allowed attributes', () => {
    const update = findTool('update_cr_attrs')!
    expect(update.description).toMatch(/\blevel\b/)
  })
})
