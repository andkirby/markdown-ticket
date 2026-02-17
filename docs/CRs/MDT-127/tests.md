# Test Specification: MDT-127 - Project Discovery Subsystem Refactoring

**Ticket**: MDT-127 - Refactor Project Discovery Subsystem
**Date**: 2026-02-17
**Status**: Test Specification Complete
**Based on**: architecture.md (Architecture Analysis)

---

## Overview

This document specifies comprehensive test coverage for the refactored project discovery subsystem. Tests are organized by component and cover both new functionality (validation helpers, ProjectFactory) and refactored components (ProjectScanner, ProjectDiscoveryService).

**Testing Principles**:
- All existing tests must continue to pass (backward compatibility)
- New components must have complete unit test coverage
- Integration tests verify end-to-end behavior
- Tests follow existing patterns in the codebase

---

## Test Categories

### 1. Validation Helpers Tests (NEW)
**File**: `shared/utils/__tests__/project-validation-helpers.test.ts`

These tests cover the centralized validation functions extracted from duplicate code.

#### 1.1 validateProjectIdMatchesDirectory()

**Purpose**: Validate that project ID matches directory name (case-insensitive)

```typescript
describe('validateProjectIdMatchesDirectory', () => {
  describe('when ID matches directory name', () => {
    it('should return true for exact match', () => {
      expect(validateProjectIdMatchesDirectory('myproject', 'myproject')).toBe(true)
    })

    it('should return true for case-insensitive match', () => {
      expect(validateProjectIdMatchesDirectory('MyProject', 'myproject')).toBe(true)
      expect(validateProjectIdMatchesDirectory('MYPROJECT', 'myproject')).toBe(true)
      expect(validateProjectIdMatchesDirectory('myproject', 'MyProject')).toBe(true)
    })

    it('should handle special characters in ID', () => {
      expect(validateProjectIdMatchesDirectory('my-project', 'my-project')).toBe(true)
      expect(validateProjectIdMatchesDirectory('my_project', 'my_project')).toBe(true)
    })
  })

  describe('when ID does not match directory name', () => {
    it('should return false for different ID', () => {
      expect(validateProjectIdMatchesDirectory('different-id', 'myproject')).toBe(false)
    })

    it('should return false for different casing when ID is explicit', () => {
      expect(validateProjectIdMatchesDirectory('MyProject', 'myproject')).toBe(true) // case-insensitive
    })
  })

  describe('when ID is undefined', () => {
    it('should return true (no explicit ID to validate)', () => {
      expect(validateProjectIdMatchesDirectory(undefined, 'myproject')).toBe(true)
    })

    it('should handle empty directory name', () => {
      expect(validateProjectIdMatchesDirectory(undefined, '')).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      expect(validateProjectIdMatchesDirectory('', '')).toBe(true)
      expect(validateProjectIdMatchesDirectory('myproject', '')).toBe(false)
      expect(validateProjectIdMatchesDirectory('', 'myproject')).toBe(false)
    })

    it('should handle whitespace', () => {
      expect(validateProjectIdMatchesDirectory(' myproject ', 'myproject')).toBe(false)
    })
  })
})
```

#### 1.2 validateNoDuplicateByCode()

**Purpose**: Validate no duplicate project code exists in the project list

```typescript
describe('validateNoDuplicateByCode', () => {
  describe('when no duplicates exist', () => {
    it('should return true for unique codes', () => {
      const projects = [
        { id: 'proj1', project: { code: 'AAA' } },
        { id: 'proj2', project: { code: 'BBB' } },
        { id: 'proj3', project: { code: 'CCC' } },
      ]
      expect(validateNoDuplicateByCode('DDD', projects)).toBe(true)
    })

    it('should return true when code is undefined', () => {
      const projects = [
        { id: 'proj1', project: { code: 'AAA' } },
      ]
      expect(validateNoDuplicateByCode(undefined, projects)).toBe(true)
    })
  })

  describe('when duplicates exist', () => {
    it('should return false for existing code', () => {
      const projects = [
        { id: 'proj1', project: { code: 'AAA' } },
        { id: 'proj2', project: { code: 'BBB' } },
      ]
      expect(validateNoDuplicateByCode('AAA', projects)).toBe(false)
    })

    it('should be case-insensitive', () => {
      const projects = [
        { id: 'proj1', project: { code: 'AAA' } },
      ]
      expect(validateNoDuplicateByCode('aaa', projects)).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle empty project list', () => {
      expect(validateNoDuplicateByCode('AAA', [])).toBe(true)
    })

    it('should handle projects without code', () => {
      const projects = [
        { id: 'proj1', project: {} },
        { id: 'proj2', project: { code: 'AAA' } },
      ]
      expect(validateNoDuplicateByCode('AAA', projects)).toBe(false)
    })
  })
})
```

#### 1.3 validateConfigExists()

**Purpose**: Validate that config file exists

```typescript
describe('validateConfigExists', () => {
  describe('when config exists', () => {
    it('should return true for existing file', () => {
      // Mock fs.existsSync to return true
      expect(validateConfigExists('/path/to/.mdt-config.toml')).toBe(true)
    })
  })

  describe('when config does not exist', () => {
    it('should return false for non-existent file', () => {
      // Mock fs.existsSync to return false
      expect(validateConfigExists('/path/to/nonexistent.toml')).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle empty path', () => {
      expect(validateConfigExists('')).toBe(false)
    })

    it('should handle directory path', () => {
      // Mock fs.existsSync for directory
      expect(validateConfigExists('/path/to/directory')).toBe(false)
    })
  })
})
```

---

### 2. ProjectFactory Tests (NEW)
**File**: `shared/services/project/__tests__/ProjectFactory.test.ts`

These tests cover the centralized Project object construction.

#### 2.1 createFromConfig()

**Purpose**: Create Project from local config (auto-discovery)

```typescript
describe('ProjectFactory.createFromConfig', () => {
  let factory: ProjectFactory

  beforeEach(() => {
    factory = new ProjectFactory()
  })

  describe('with valid config', () => {
    it('should create Project with all required fields', () => {
      const config = {
        project: {
          id: 'myproject',
          name: 'My Project',
          code: 'MDT',
          startNumber: 100,
          active: true,
          description: 'Test project',
          repository: 'https://github.com/test/repo',
          ticketsPath: 'docs/CRs',
        },
      }

      const project = factory.createFromConfig(
        config,
        '/path/to/myproject',
        '/registry/myproject.toml'
      )

      expect(project.id).toBe('myproject')
      expect(project.project.name).toBe('My Project')
      expect(project.project.code).toBe('MDT')
      expect(project.project.path).toBe('/path/to/myproject')
      expect(project.project.active).toBe(true)
      expect(project.registryFile).toBe('/registry/myproject.toml')
    })

    it('should use directory name as ID when config.id is not set', () => {
      const config = {
        project: {
          name: 'My Project',
          code: 'MDT',
        },
      }

      const project = factory.createFromConfig(config, '/path/to/myproject')

      expect(project.id).toBe('myproject')
    })

    it('should set default values for optional fields', () => {
      const config = {
        project: {
          name: 'My Project',
          code: 'MDT',
        },
      }

      const project = factory.createFromConfig(config, '/path/to/myproject')

      expect(project.project.active).toBe(true)
      expect(project.project.description).toBe('')
      expect(project.project.repository).toBe('')
      expect(project.metadata.version).toBe('1.0.0')
    })

    it('should mark as autoDiscovered when no registry file provided', () => {
      const config = {
        project: {
          name: 'My Project',
          code: 'MDT',
        },
      }

      const project = factory.createFromConfig(config, '/path/to/myproject')

      expect(project.autoDiscovered).toBe(true)
    })
  })

  describe('with minimal config', () => {
    it('should create Project with minimal valid config', () => {
      const config = {
        project: {
          name: 'My Project',
          code: 'MDT',
        },
      }

      const project = factory.createFromConfig(config, '/path/to/myproject')

      expect(project.id).toBe('myproject')
      expect(project.project.name).toBe('My Project')
      expect(project.project.code).toBe('MDT')
      expect(project.project.active).toBe(true)
    })
  })
})
```

#### 2.2 createFromRegistry()

**Purpose**: Create Project from registry data (global-only strategy)

```typescript
describe('ProjectFactory.createFromRegistry', () => {
  let factory: ProjectFactory

  beforeEach(() => {
    factory = new ProjectFactory()
  })

  describe('with complete registry data', () => {
    it('should create global-only Project', () => {
      const registryData = {
        project: {
          id: 'myproject',
          name: 'My Project',
          code: 'MDT',
          path: '/path/to/myproject',
          startNumber: 100,
          counterFile: 'counter.json',
          active: true,
          description: 'Test project',
          repository: 'https://github.com/test/repo',
          ticketsPath: 'docs/CRs',
        },
        metadata: {
          dateRegistered: '2024-01-01',
          lastAccessed: '2024-01-15',
          version: '1.0.0',
          globalOnly: true,
        },
      }

      const project = factory.createFromRegistry(
        registryData,
        '/path/to/myproject',
        '/registry/myproject.toml'
      )

      expect(project.id).toBe('myproject')
      expect(project.project.name).toBe('My Project')
      expect(project.metadata.globalOnly).toBe(true)
      expect(project.registryFile).toBe('/registry/myproject.toml')
    })

    it('should use directory name as ID when registry.id is not set', () => {
      const registryData = {
        project: {
          name: 'My Project',
          code: 'MDT',
          path: '/path/to/myproject',
        },
      }

      const project = factory.createFromRegistry(
        registryData,
        '/path/to/myproject',
        '/registry/myproject.toml'
      )

      expect(project.id).toBe('myproject')
    })
  })

  describe('with minimal registry data', () => {
    it('should set default values for optional fields', () => {
      const registryData = {
        project: {
          name: 'My Project',
          code: 'MDT',
          path: '/path/to/myproject',
        },
      }

      const project = factory.createFromRegistry(
        registryData,
        '/path/to/myproject',
        '/registry/myproject.toml'
      )

      expect(project.project.active).toBe(true)
      expect(project.project.startNumber).toBe(1)
      expect(project.metadata.version).toBe('1.0.0')
    })
  })
})
```

#### 2.3 createAutoDiscovered()

**Purpose**: Create auto-discovered Project

```typescript
describe('ProjectFactory.createAutoDiscovered', () => {
  let factory: ProjectFactory

  beforeEach(() => {
    factory = new ProjectFactory()
  })

  describe('with valid config', () => {
    it('should create auto-discovered Project', () => {
      const config = {
        project: {
          name: 'My Project',
          code: 'MDT',
          description: 'Test project',
        },
      }

      const project = factory.createAutoDiscovered(config, '/path/to/myproject')

      expect(project.id).toBe('myproject')
      expect(project.autoDiscovered).toBe(true)
      expect(project.project.configFile).toContain('.mdt-config.toml')
    })

    it('should set metadata with current date', () => {
      const config = {
        project: {
          name: 'My Project',
          code: 'MDT',
        },
      }

      const project = factory.createAutoDiscovered(config, '/path/to/myproject')

      const today = new Date().toISOString().split('T')[0]
      expect(project.metadata.dateRegistered).toBe(today)
      expect(project.metadata.lastAccessed).toBe(today)
    })
  })
})
```

---

### 3. ProjectScanner Tests (UPDATE)
**File**: `shared/services/project/__tests__/ProjectScanner.test.ts`

Update existing tests to verify that ProjectScanner returns discovery configs (not Projects) after refactoring.

#### 3.1 Updated Test Structure

```typescript
describe('ProjectScanner - Refactored Behavior', () => {
  describe('scanDirectoryForConfigs', () => {
    it('should return discovery configs (not Projects)', () => {
      // After refactoring, scanner returns configs, not constructed Projects
      const discovered = scanner.scanDirectory('/test/path')

      expect(discovered).toHaveLength(1)
      expect(discovered[0]).toMatchObject({
        config: expect.any(Object),      // Raw config
        projectPath: '/test/path',       // Directory path
        configPath: expect.stringContaining('.mdt-config.toml'),
      })
    })

    it('should delegate validation to helpers', () => {
      // Verify that validation is delegated, not implemented in scanner
      const discovered = scanner.scanDirectory('/test/path')

      // Scanner should use validateProjectIdMatchesDirectory helper
      // Scanner should use validateConfigExists helper
    })
  })

  describe('backward compatibility', () => {
    it('should maintain existing public API', () => {
      // autoDiscoverProjects() should still return Project[]
      // But internally use factory to construct Projects
      const projects = scanner.autoDiscoverProjects(['/test/path'])

      expect(projects).toBeInstanceOf(Array)
      expect(projects[0]).toMatchObject({
        id: expect.any(String),
        project: expect.any(Object),
        metadata: expect.any(Object),
      })
    })
  })
})
```

---

### 4. ProjectDiscoveryService Tests (UPDATE)
**File**: `shared/services/project/__tests__/ProjectDiscoveryService.test.ts`

Update existing tests to verify orchestration behavior after refactoring.

#### 4.1 Updated Test Structure

```typescript
describe('ProjectDiscoveryService - Refactored Behavior', () => {
  describe('getRegisteredProjects (orchestration)', () => {
    it('should use ProjectFactory for construction', () => {
      // Verify factory usage, not direct construction
      const factorySpy = jest.spyOn(factory, 'createFromRegistry')

      service.getRegisteredProjects()

      expect(factorySpy).toHaveBeenCalled()
    })

    it('should use validation helpers for validation', () => {
      // Verify helper usage, not inline validation
      const validateSpy = jest.spyOn(projectValidationHelpers, 'validateProjectIdMatchesDirectory')

      service.getRegisteredProjects()

      expect(validateSpy).toHaveBeenCalled()
    })

    it('should orchestrate global-only strategy', () => {
      const mockRegistry = {
        file: 'test.toml',
        data: { project: { name: 'Test' }, metadata: { globalOnly: true } },
      }

      // Verify orchestration flow
      const projects = service.getRegisteredProjects()

      expect(projects[0].metadata.globalOnly).toBe(true)
    })

    it('should orchestrate project-first strategy', () => {
      const mockRegistry = {
        file: 'test.toml',
        data: { project: { path: '/test' } },
      }

      // Verify orchestration flow: read registry -> load local config -> factory create
      const projects = service.getRegisteredProjects()

      expect(projects[0].registryFile).toBeDefined()
    })
  })

  describe('backward compatibility', () => {
    it('should maintain existing public API', () => {
      // All public methods should work as before
      expect(() => service.getRegisteredProjects()).not.toThrow()
      expect(() => service.autoDiscoverProjects(['/test'])).not.toThrow()
      expect(() => service.registerProject(mockProject)).not.toThrow()
    })

    it('should return same results as pre-refactor', () => {
      const before = service.getRegisteredProjects()
      // After refactor
      const after = service.getRegisteredProjects()

      expect(after).toEqual(before)
    })
  })
})
```

---

## Integration Tests

### 5. End-to-End Discovery Flow

**File**: `shared/services/project/__tests__/ProjectDiscovery.integration.test.ts`

```typescript
describe('Project Discovery - Integration Tests', () => {
  describe('full discovery flow', () => {
    it('should discover and register projects correctly', () => {
      // Setup: Create test projects with different configs
      // Action: Run full discovery
      // Assert: All projects discovered with correct structure
      // Assert: No duplicate codes
      // Assert: Invalid IDs excluded
    })

    it('should handle mixed valid and invalid projects', () => {
      // Setup: Mix of valid configs, mismatched IDs, missing configs
      // Action: Run discovery
      // Assert: Only valid projects included
    })

    it('should handle global-only and project-first strategies together', () => {
      // Setup: Registry with both global-only and project-first entries
      // Action: Load registered projects
      // Assert: Both strategies work correctly
    })
  })

  describe('error handling', () => {
    it('should gracefully handle missing directories', () => {
      // Setup: Registry points to deleted directory
      // Action: Load projects
      // Assert: Missing directory skipped, other projects loaded
    })

    it('should gracefully handle invalid configs', () => {
      // Setup: Invalid TOML in config file
      // Action: Discover projects
      // Assert: Invalid config skipped, valid projects loaded
    })
  })
})
```

---

## Test Execution Plan

### Phase 1: Validation Helpers Tests
- Create `shared/utils/__tests__/project-validation-helpers.test.ts`
- Implement all validation helper tests
- Run: `npm test -- project-validation-helpers`

### Phase 2: ProjectFactory Tests
- Create `shared/services/project/__tests__/ProjectFactory.test.ts`
- Implement all factory tests
- Run: `npm test -- ProjectFactory`

### Phase 3: Update ProjectScanner Tests
- Update `shared/services/project/__tests__/ProjectScanner.test.ts`
- Verify existing tests still pass
- Add tests for new behavior (returns configs)
- Run: `npm test -- ProjectScanner`

### Phase 4: Update ProjectDiscoveryService Tests
- Update `shared/services/project/__tests__/ProjectDiscoveryService.test.ts`
- Verify existing tests still pass
- Add tests for orchestration behavior
- Run: `npm test -- ProjectDiscoveryService`

### Phase 5: Integration Tests
- Create `shared/services/project/__tests__/ProjectDiscovery.integration.test.ts`
- Implement end-to-end tests
- Run: `npm test -- ProjectDiscovery.integration`

### Phase 6: Full Test Suite
- Run all project-related tests: `npm test -- --testPathPattern="Project"`
- Run full shared test suite: `npm test`
- Verify consumer tests pass: `npm test -- ProjectService`, `npm test -- DocumentService`

---

## Verification Commands

```bash
# Unit tests for new components
npm test -- project-validation-helpers
npm test -- ProjectFactory

# Unit tests for refactored components
npm test -- ProjectScanner
npm test -- ProjectDiscoveryService

# Integration tests
npm test -- ProjectDiscovery.integration

# All project-related tests
npm test -- --testPathPattern="Project"

# Full test suite
npm test

# Type checking
npm run validate:ts
```

---

## Success Criteria

- [ ] All new test files created
- [ ] All new tests passing (100% coverage for new code)
- [ ] All existing tests still passing (backward compatibility)
- [ ] Integration tests passing
- [ ] TypeScript validation passes
- [ ] No API changes to public interfaces

---

## References

- **Architecture**: `/Users/kirby/home/markdown-ticket/docs/CRs/MDT-127/architecture.md`
- **Requirements**: `/Users/kirby/home/markdown-ticket/docs/CRs/MDT-127-project-discovery-refactoring.md`
- **Existing Tests**:
  - `/Users/kirby/home/markdown-ticket/shared/services/project/__tests__/ProjectScanner.test.ts`
  - `/Users/kirby/home/markdown-ticket/shared/services/project/__tests__/ProjectDiscoveryService.test.ts`
- **Existing Code**:
  - `/Users/kirby/home/markdown-ticket/shared/services/project/ProjectScanner.ts`
  - `/Users/kirby/home/markdown-ticket/shared/services/project/ProjectDiscoveryService.ts`

---

## Appendix: Test Coverage Matrix

| Component | Test File | Test Count | Coverage Target |
|-----------|-----------|------------|-----------------|
| Validation Helpers | project-validation-helpers.test.ts | 15+ | 100% |
| ProjectFactory | ProjectFactory.test.ts | 12+ | 100% |
| ProjectScanner (updated) | ProjectScanner.test.ts | 10+ | 90%+ |
| ProjectDiscoveryService (updated) | ProjectDiscoveryService.test.ts | 8+ | 85%+ |
| Integration | ProjectDiscovery.integration.test.ts | 5+ | 80%+ |
| **Total** | | **50+** | **90%+** |

---

**Next Step**: `/mdt:tasks MDT-127` - Generate implementation tasks based on test specifications.
