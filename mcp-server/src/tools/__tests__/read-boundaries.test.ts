import { ALL_TOOLS, TOOL_NAMES } from '../config/allTools'
import { CRHandlers } from '../handlers/crHandlers'
import { ProjectHandlers } from '../handlers/projectHandlers'
import { KeyArgsSchema } from '../mutationSchemas'
import { GetCRArgsSchema, ListCRsArgsSchema, ListProjectsArgsSchema, ProjectInfoArgsSchema } from '../readSchemas'
import { createTools } from './boundary-fixtures'
import { createMockProject } from './test-fixtures'

describe('MDT-258 all MCP reads validate before resolution', () => {
  afterEach(() => jest.restoreAllMocks())
  it.each([
    ['list_projects', null],
    ['list_projects', []],
    ['get_project_info', {}],
    ['get_project_info', { key: {} }],
    ['list_crs', { filters: [] }],
    ['list_crs', { filters: { status: {} } }],
    ['list_crs', { filters: { status: ['Proposed', 2] } }],
    ['get_cr', { key: [] }],
    ['get_cr', { key: '1', mode: 'unknown' }],
    ['suggest_cr_improvements', { project: {}, key: '1' }],
  ])('%s rejects %j before services', async (name, args) => {
    const resolve = jest.spyOn(ProjectHandlers.prototype, 'resolveProject')
    const list = jest.spyOn(ProjectHandlers.prototype, 'handleListProjects')
    const info = jest.spyOn(ProjectHandlers.prototype, 'handleGetProjectInfo')
    await expect(createTools().handleToolCall(name as string, args)).rejects.toMatchObject({ code: -32602, data: { issues: expect.any(Array) } })
    expect(resolve).not.toHaveBeenCalled()
    expect(list).not.toHaveBeenCalled()
    expect(info).not.toHaveBeenCalled()
  })
  it('retains project-read execution errors instead of reclassifying loader failures as bad arguments', async () => {
    jest.spyOn(ProjectHandlers.prototype, 'handleListProjects').mockRejectedValue(new Error('invalid persisted data'))
    await expect(createTools().handleToolCall('list_projects', {})).rejects.toMatchObject({ type: 'tool_execution' })
  })
  it('all ten advertised tools have exactly one imported validator entry', () => {
    const tools = createTools()
    expect(Object.keys(tools.registry).sort()).toEqual(ALL_TOOLS.map(tool => tool.name).sort())
    expect(new Set(ALL_TOOLS.map(tool => tool.name)).size).toBe(Object.values(TOOL_NAMES).length)
    const schemas = { list_projects: ListProjectsArgsSchema, get_project_info: ProjectInfoArgsSchema, list_crs: ListCRsArgsSchema, get_cr: GetCRArgsSchema, suggest_cr_improvements: KeyArgsSchema }
    for (const [name, schema] of Object.entries(schemas)) {
      const tool = ALL_TOOLS.find(tool => tool.name === name)!
      const required = Object.entries(schema.shape).filter(([, value]) => !value.isOptional()).map(([key]) => key)
      expect(required.sort()).toEqual([...(tool.inputSchema.required as string[])].sort())
      expect(schema.safeParse(null).success).toBe(false)
    }
  })
  it('preserves partial fuzzy strings, arrays, extensions and spelling', async () => {
    const project = createMockProject()
    jest.spyOn(ProjectHandlers.prototype, 'resolveProject').mockResolvedValue(project)
    const list = jest.spyOn(CRHandlers.prototype, 'handleListCRs').mockResolvedValue('ok')
    const filters = { status: 'progress', type: ['BUG', 'research'], priority: 'h', component: 'API', extension: 'keep' }
    await expect(createTools().handleToolCall('list_crs', { project: ' mdt ', filters })).resolves.toBe('ok')
    expect(list).toHaveBeenCalledWith(project, filters)
  })
  it.each([undefined, 'full', 'attributes', 'metadata'])('preserves get mode %s and lowercase/numeric key forms', async (mode) => {
    const project = createMockProject()
    jest.spyOn(ProjectHandlers.prototype, 'resolveProject').mockResolvedValue(project)
    const get = jest.spyOn(CRHandlers.prototype, 'handleGetCR').mockResolvedValue('ok')
    await expect(createTools().handleToolCall('get_cr', { key: 'mdt-1', mode })).resolves.toBe('ok')
    expect(get).toHaveBeenCalledWith(project, 'mdt-1', mode)
  })
})
