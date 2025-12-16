---
code: MDT-097
status: Implemented
dateCreated: 2025-12-15T23:27:58.542Z
type: Architecture
priority: High
phaseEpic: Test Infrastructure
assignee: Test Infrastructure Team
dependsOn: MDT-091
blocks: MDT-096
---

# Refactor ProjectFactory: Extract Single Responsibility Classes

## 1. Description
The current `ProjectFactory` class in `mcp-server/tests/e2e/helpers/project-factory.ts` has grown to 722 lines and violates the Single Responsibility Principle. It handles 6+ distinct responsibilities: project structure creation, configuration management, test data generation, scenario orchestration, file system operations, validation, and content templating. This creates tight coupling, makes testing difficult, and makes the code hard to maintain.

**Dependency on MDT-091**: This refactoring work depends on the comprehensive E2E testing framework implemented in MDT-091. The E2E tests provide a critical safety net that ensures the refactoring maintains all existing functionality and behavior, especially for the MCP tool testing infrastructure that relies on ProjectFactory.
## 2. Rationale
Refactor ProjectFactory to extract single responsibility classes with clean separation of concerns.

> **Extracted**: Complex architecture — see [architecture.md](./architecture.md)

**Summary**:
- Pattern: Strategy Pattern + Dependency Injection
- Components: 12 focused classes (down from 1 monolithic class)
- Key constraint: Each class ≤ 150 lines, total 47% size reduction

**Extension Rule**: To add new ticket creation method, implement TicketCreator interface (limit 150 lines) and inject via constructor.

The monolithic ProjectFactory creates several problems:
- **Tight MCP coupling**: Ticket creation is directly coupled to MCP client, making unit tests difficult
- **Poor testability**: Cannot test individual responsibilities in isolation
- **Maintenance burden**: Changes to one aspect (e.g., config format) affect the entire class
- **Code duplication**: Similar patterns scattered throughout the large class
- **Hard to extend**: Adding new project types or ticket creation methods requires modifying a large class
## 3. Solution Analysis

Evaluated several approaches:

**Option A (Selected)**: Extract into focused classes with dependency injection
- Create separate classes for each responsibility
- Use TicketCreator interface to decouple from MCP
- Maintain backward compatibility with facade pattern
- Pros: Clean separation, easy testing, flexible extension
- Cons: More files, initial refactoring effort

**Option B**: Keep single class with internal methods
- Reorganize methods within existing class
- Pros: Fewer files, minimal changes
- Cons: Still violates SRP, still tightly coupled

**Option C**: Use factory pattern with inheritance
- Create base factory with subclasses
- Pros: OOP structure
- Cons: Complex inheritance, still coupled

Selected Option A for clean separation and testability.

## 4. Implementation Specification

### Phase 1: Extract Support Components (No Dependencies)
1. Create `utils/file-helper.ts` - File system operations (75 lines)
2. Create `utils/validation-rules.ts` - Input validation (100 lines)
3. Create `config/configuration-generator.ts` - Config generation (100 lines)
4. Create `types/project-factory-types.ts` - Type definitions (150 lines)

### Phase 2: Create Ticket Abstraction Layer
1. Create `ticket/ticket-creator.ts` - Interface for ticket creation (50 lines)
2. Create `ticket/mcp-ticket-creator.ts` - MCP implementation (80 lines)
3. Create `ticket/file-ticket-creator.ts` - Direct file creation (100 lines)
4. Create `ticket/memory-ticket-creator.ts` - In-memory for unit tests (90 lines)

### Phase 3: Extract Core Components
1. Create `core/project-setup.ts` - Project structure creation (150 lines)
2. Create `config/content-templates.ts` - CR content templates (150 lines)
3. Create `core/test-data-factory.ts` - Test data orchestration (120 lines)
4. Create `core/scenario-builder.ts` - Scenario building (100 lines)

### Phase 4: Refactor Main Class
1. Update `core/project-factory.ts` to orchestrate components (100 lines)
2. Maintain same public API for backward compatibility
3. Add dependency injection constructor

### Implementation Details

```typescript
// Main facade maintains compatibility
class ProjectFactory {
  constructor(
    testEnv: TestEnvironment,
    ticketCreator: TicketCreator, // Injected abstraction
    projectSetup?: ProjectSetup,
    testDataFactory?: TestDataFactory,
    scenarioBuilder?: ScenarioBuilder
  ) {
    // Components injected or created with defaults
  }
  
  // Public API unchanged
  async createProject(type: 'empty' = 'empty', config: ProjectConfig = {}): Promise<ProjectData>
  async createTestCR(projectCode: string, crData: TestCRData): Promise<MCPResponse>
  async createTestScenario(scenarioType: 'standard-project' | 'complex-project'): Promise<TestScenario>
}

// Ticket creation decoupled from MCP
interface TicketCreator {
  createTicket(projectCode: string, ticketData: TicketData): Promise<TicketResult>
  createMultipleTickets(projectCode: string, ticketsData: TicketData[]): Promise<TicketResult[]>
}
```

### Migration Strategy
- Create parallel structure without breaking existing code
- Update imports gradually
- Remove old methods once all tests pass
- Maintain backward compatibility during transition

## 5. Acceptance Criteria

- [ ] Each extracted class has single responsibility (< 150 lines)
- [ ] Ticket creation abstracted from MCP (support file/memory/MCP implementations)
- [ ] All existing E2E tests pass without modification
- [ ] Unit tests exist for each extracted component
- [ ] File structure follows proposed layout
- [ ] No behavioral changes - same functionality, better organization
- [ ] Documentation updated with new architecture
- [ ] Performance tests show no regression
- [ ] Code coverage maintained or improved
- [ ] Linter passes with no new warnings
- [ ] **Validation command exists**: `cd mcp-server && npx jest --config jest.e2e.config.mjs --testNamePattern="GIVEN valid project and data WHEN creating THEN success with proper CR key"` must pass after refactoring
- [ ] **ProjectFactory-specific validation**: `cd mcp-server && npx jest tests/e2e/helpers/project-factory.spec.ts --config jest.e2e.config.mjs` must pass after refactoring
- [ ] These tests serve as regression validators to ensure ProjectFactory refactoring maintains behavior