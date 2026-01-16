import type { Project } from '../../../models/Project'
import { ProjectCacheService } from '../ProjectCacheService'

describe('projectCacheService', () => {
  let service: ProjectCacheService
  const mockProjects: Project[] = [
    { id: 'p1', project: { name: 'P1', code: 'P1', path: '/p1', configFile: '/c1', active: true, description: '' }, metadata: { dateRegistered: '2024-01-01', lastAccessed: '2024-01-01', version: '1.0.0' } },
  ]

  beforeEach(() => {
    service = new ProjectCacheService(true)
    jest.clearAllMocks()
  })

  describe('isCacheValid', () => {
    it('should return false when no cached data', () => {
      expect(service.isCacheValid()).toBe(false)
    })

    it('should return true when cache has valid data', () => {
      service.setCachedProjects(mockProjects)
      expect(service.isCacheValid()).toBe(true)
    })
  })

  describe('getCacheAge', () => {
    it('should return 0 when no cached data', () => {
      expect(service.getCacheAge()).toBe(0)
    })

    it('should return positive age when cache has data', () => {
      service.setCachedProjects(mockProjects)
      expect(service.getCacheAge()).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getCachedProjects', () => {
    it('should return null when cache invalid', () => {
      expect(service.getCachedProjects()).toBeNull()
    })

    it('should return cached projects when valid', () => {
      service.setCachedProjects(mockProjects)
      expect(service.getCachedProjects()).toEqual(mockProjects)
    })
  })

  describe('getAllProjects', () => {
    it('should return empty array when cache invalid', async () => {
      const projects = await service.getAllProjects()
      expect(projects).toEqual([])
    })
  })

  describe('clearCache', () => {
    it('should clear cached data', () => {
      service.setCachedProjects(mockProjects)
      service.clearCache()
      expect(service.getCachedProjects()).toBeNull()
    })
  })

  describe('hasCachedData', () => {
    it('should return false initially', () => {
      expect(service.hasCachedData()).toBe(false)
    })

    it('should return true after caching', () => {
      service.setCachedProjects(mockProjects)
      expect(service.hasCachedData()).toBe(true)
    })
  })

  describe('setCacheTTL', () => {
    it('should update TTL', () => {
      service.setCacheTTL(5000)
      expect(service.getCacheTTL()).toBe(5000)
    })
  })
})
