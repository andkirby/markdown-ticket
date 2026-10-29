import { describe, expect, it } from 'bun:test'
import { checkModuleBoundaries } from './check-module-boundaries'

describe('module dependency enforcement', () => {
  it('rejects alternate filesystem/path spellings and local cloud implementation imports', () => {
    const result = checkModuleBoundaries({
      'domain-contracts/src/a.ts': 'import fs from \'fs-extra\'; import path from \'path/posix\'',
      'shared/a.ts': 'import worker from \'@mdt/cloud/internal\'',
      'server/a.ts': 'import worker from \'@mdt/cloud\'',
    })
    expect(result.violations).toHaveLength(4)
  })
  it('recognizes default and namespace controller imports while permitting same-capability type contracts', () => {
    const result = checkModuleBoundaries({
      'server/modules/search/SearchController.ts': 'import Renamed from \'../projects/index.js\'; import * as Projects from \'../projects/index.js\'; new Renamed(); new Projects.ProjectController()',
      'server/modules/projects/index.ts': 'export { ProjectController as default, ProjectController } from \'./ProjectController.js\'',
      'server/modules/projects/ProjectController.ts': 'export class ProjectController {}',
      'server/modules/projects/OtherController.ts': 'import type { ProjectController } from \'./ProjectController.js\'; export type Port = Pick<ProjectController, never>',
    })
    expect(result.violations).toEqual(['controller-dependency: server/modules/search/SearchController.ts -> server/modules/projects/index.ts'])
  })
  it('allows same-capability internals and ignores type-only runtime cycles', () => {
    const result = checkModuleBoundaries({
      'server/modules/tickets/a.ts': 'import type { B } from \'./b.js\'; export const a = 1',
      'server/modules/tickets/b.ts': 'import { a } from \'./a.js\'; export interface B { a: typeof a }',
    })
    expect(result.violations).toEqual([])
  })
  it('rejects runtime cycles including dynamic imports and re-exports', () => {
    const result = checkModuleBoundaries({
      'shared/a.ts': 'export * from \'./b.js\'',
      'shared/b.ts': 'export const b = () => import(\'./a.js\')',
    })
    expect(result.violations.filter(v => v.startsWith('runtime-cycle'))).toHaveLength(2)
  })
  it('resolves .js source aliases and rejects cross-capability private imports, including type-only imports', () => {
    const result = checkModuleBoundaries({
      'server/modules/projects/a.ts': 'import type { Hidden } from \'@ticket/private.js\'',
      'server/modules/tickets/private.ts': 'export interface Hidden {}',
    }, [], { '@ticket/*': ['server/modules/tickets/*'] })
    expect(result.violations).toEqual(['private-capability-import: server/modules/projects/a.ts -> server/modules/tickets/private.ts'])
  })
  it('allows public capability and legacy shared facade imports', () => {
    expect(checkModuleBoundaries({
      'server/modules/projects/a.ts': 'import { query } from \'../tickets/index.js\'',
      'server/modules/tickets/index.ts': 'export { query } from \'./private.js\'',
      'server/modules/tickets/private.ts': 'export const query = 1',
      'cli/src/main.ts': 'import { TicketService } from \'@mdt/shared/services/TicketService.js\'',
      'shared/services/TicketService.ts': 'export class TicketService {}',
    }).violations).toEqual([])
  })
  it('rejects reverse package/HTTP edges and pure policy filesystem access', () => {
    const result = checkModuleBoundaries({
      'shared/services/a.ts': 'import { app } from \'../../server/app.js\'; import express from \'express\'',
      'server/app.ts': 'export const app = 1',
      'shared/services/epicRules.ts': 'import fs from \'node:fs\'',
      'domain-contracts/src/a.ts': 'import { app } from \'../../server/app.js\'',
    })
    expect(result.violations).toEqual(expect.arrayContaining([
      'shared-direction: shared/services/a.ts -> server/app.ts',
      'shared-direction: shared/services/a.ts -> express',
      'policy-io: shared/services/epicRules.ts -> node:fs',
      'contract-purity: domain-contracts/src/a.ts -> server/app.ts',
    ]))
  })
  it('rejects controller service locators through public barrels and production legacy HTTP imports', () => {
    const result = checkModuleBoundaries({
      'server/modules/search/SearchController.ts': 'import { ProjectController as C } from \'../projects/index.js\'; import \'../projects/private.js\'',
      'server/modules/projects/index.ts': 'export class ProjectController {}',
      'server/modules/projects/private.ts': 'import \'../../controllers/ProjectController.js\'',
      'server/controllers/ProjectController.ts': 'export const legacy = 1',
    })
    expect(result.violations).toEqual(expect.arrayContaining([
      'controller-dependency: server/modules/search/SearchController.ts -> server/modules/projects/index.ts',
      'legacy-http-dependency: server/modules/projects/private.ts -> server/controllers/ProjectController.ts',
      'private-capability-import: server/modules/search/SearchController.ts -> server/modules/projects/private.ts',
    ]))
  })
  it('requires exact owned exceptions and rejects stale exceptions/unresolved local aliases', () => {
    const sources = { 'shared/a.ts': 'import \'./missing.js\'' }
    const exception = { rule: 'unresolved-local-import', from: 'shared/a.ts', to: './missing.js', owner: 'MDT-266 fixture', reason: 'Fixture only' }
    expect(checkModuleBoundaries(sources).violations).toHaveLength(1)
    expect(checkModuleBoundaries(sources, [exception]).violations).toEqual([])
    expect(checkModuleBoundaries({ 'shared/a.ts': '' }, [exception]).violations).toEqual(['stale-exception: shared/a.ts -> ./missing.js'])
  })
  it('rejects search mutation dependencies and an independent project adapter writer', () => {
    const result = checkModuleBoundaries({
      'shared/services/search/SearchService.ts': 'import type { Mutation } from \'../ticket/TicketMutationService.js\'',
      'shared/services/ticket/TicketMutationService.ts': 'export interface Mutation {}',
      'server/services/config/adapters/ProjectConfigStorageAdapter.ts': 'import fs from \'node:fs/promises\'',
    })
    expect(result.violations).toEqual(expect.arrayContaining([
      'search-mutation: shared/services/search/SearchService.ts -> shared/services/ticket/TicketMutationService.ts',
      'project-writer-owner: server/services/config/adapters/ProjectConfigStorageAdapter.ts -> node:fs/promises',
    ]))
  })
})
