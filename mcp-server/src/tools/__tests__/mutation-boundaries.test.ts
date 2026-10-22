import { ALL_TOOLS, TOOL_NAMES } from '../config/allTools.js'
import { CRHandlers } from '../handlers/crHandlers.js'
import { ProjectHandlers } from '../handlers/projectHandlers.js'
import { SectionHandlers } from '../handlers/sectionHandlers.js'
import { AttributesArgsSchema, CreateArgsSchema, KeyArgsSchema, SectionArgsSchema, StatusArgsSchema } from '../mutationSchemas.js'
import { createTools } from './boundary-fixtures.js'
import { createMockProject, createMockTicket } from './test-fixtures.js'

const invalidCalls: [string, unknown][] = [
  ['create_cr', { type: 'Bug Fix', data: { title: 'title', assignee: {} } }],
  ['create_cr', { project: {}, type: 'Bug Fix', data: { title: 'title' } }],
  ['create_cr', { type: 'Bug Fix', data: null }],
  ['update_cr_status', { key: {}, status: 'In Progress' }],
  ['update_cr_status', { project: [], key: '1', status: 'In Progress' }],
  ['update_cr_status', { key: '1', status: 'wrong' }],
  ['update_cr_attrs', { key: '1', attributes: { priority: { bad: true } } }],
  ['update_cr_attrs', { key: '1', attributes: { blocks: [1] } }],
  ['update_cr_attrs', { key: '1', attributes: null }],
  ['delete_cr', { key: 1 }],
  ['manage_cr_sections', { key: '1', operation: 'update', section: 'Description', content: [] }],
  ['manage_cr_sections', { key: '1', operation: 'append', section: 'Description' }],
  ...['create_cr', 'update_cr_status', 'update_cr_attrs', 'delete_cr', 'manage_cr_sections'].flatMap(name => [null, [], 1, false, 'text'].map(args => [name, args] as [string, unknown])),
]

describe('MCP mutation boundary', () => {
  afterEach(() => jest.restoreAllMocks())
  it.each(invalidCalls)('%s rejects %p before resolution or mutation', async (name, args) => {
    const resolve = jest.spyOn(ProjectHandlers.prototype, 'resolveProject')
    const delegates = [jest.spyOn(CRHandlers.prototype, 'handleCreateCR'), jest.spyOn(CRHandlers.prototype, 'handleUpdateCRStatus'), jest.spyOn(CRHandlers.prototype, 'handleUpdateCRAttrs'), jest.spyOn(CRHandlers.prototype, 'handleDeleteCR'), jest.spyOn(SectionHandlers.prototype, 'handleManageCRSections')]
    await expect(createTools().handleToolCall(name, args)).rejects.toMatchObject({ code: -32602, data: { code: 'VALIDATION_ERROR', issues: expect.any(Array) } })
    expect(resolve).not.toHaveBeenCalled()
    for (const spy of delegates) expect(spy).not.toHaveBeenCalled()
  })
  it('null attributes remain no-op operations in the real positional handler', async () => {
    jest.spyOn(ProjectHandlers.prototype, 'resolveProject').mockResolvedValue(createMockProject())
    const update = jest.fn().mockResolvedValue({ ticket: createMockTicket(), changedFields: [] })
    await createTools({ updateTicketAttributes: update }).handleToolCall('update_cr_attrs', { key: '1', attributes: { priority: null, assignee: null } })
    expect(update).toHaveBeenCalledWith({ projectRef: 'MDT', ticketKey: 'MDT-001', operations: [] })
  })
  it('unknown and prototype names keep -32601 before argument handling', async () => {
    for (const name of ['unknown', 'toString', '__proto__']) await expect(createTools().handleToolCall(name, null)).rejects.toMatchObject({ code: -32601 })
  })
  it('registered names equal TOOL_NAMES and advertised tools', () => {
    expect(Object.keys(createTools().registry).sort()).toEqual(Object.values(TOOL_NAMES).sort())
    expect(ALL_TOOLS.map(tool => tool.name).sort()).toEqual(Object.values(TOOL_NAMES).sort())
  })
  it('required mutation keys and status enum match advertisement', () => {
    const schemas = { create_cr: CreateArgsSchema, update_cr_status: StatusArgsSchema, update_cr_attrs: AttributesArgsSchema, delete_cr: KeyArgsSchema }
    for (const [name, schema] of Object.entries(schemas)) {
      const tool = ALL_TOOLS.find(tool => tool.name === name)!
      const required = Object.entries(schema.shape).filter(([, value]) => !value.isOptional()).map(([key]) => key)
      expect(required.sort()).toEqual([...tool.inputSchema.required as string[]].sort())
    }
    const statusTool = ALL_TOOLS.find(tool => tool.name === 'update_cr_status')!
    expect(StatusArgsSchema.shape.status.options).toEqual((statusTool.inputSchema.properties as Record<string, { enum: string[] }>).status.enum)
    expect(SectionArgsSchema.safeParse({ key: '1', operation: 'update', section: 'section', content: 'text' }).success).toBe(true)
  })
})
