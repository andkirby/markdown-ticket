import { CRHandlers } from '../handlers/crHandlers.js'
import { ProjectHandlers } from '../handlers/projectHandlers.js'
import { SectionHandlers } from '../handlers/sectionHandlers.js'
import { acceptedMutations, createTools } from './boundary-fixtures.js'

import { createMockProject } from './test-fixtures.js'

describe('Phase 0 MCP compatibility fixtures', () => {
  afterEach(() => jest.restoreAllMocks())
  it.each(acceptedMutations)('$name preserves positional arguments', async (fixture) => {
    const project = createMockProject()
    const resolve = jest.spyOn(ProjectHandlers.prototype, 'resolveProject').mockResolvedValue(project)
    const delegate = fixture.handler === 'handleManageCRSections'
      ? jest.spyOn(SectionHandlers.prototype, fixture.handler).mockResolvedValue('ok')
      : jest.spyOn(CRHandlers.prototype, fixture.handler).mockResolvedValue('ok')
    await expect(createTools().handleToolCall(fixture.name, fixture.args)).resolves.toBe('ok')
    expect(resolve).toHaveBeenCalledWith('project' in fixture.args ? fixture.args.project : undefined, null, 'key' in fixture.args ? fixture.args.key : undefined)
    expect(delegate).toHaveBeenCalledWith(project, ...fixture.forwarded)
  })
})
