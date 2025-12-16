# Tests: MDT-097

**Mode**: Refactoring (Behavioral Preservation)
**Source**: Existing ProjectFactory implementation + existing tests at `mcp-server/tests/e2e/helpers/project-factory.spec.ts`
**Generated**: 2025-12-16
**Focus**: Lock current behavior before refactoring to 12 focused classes

## Test Configuration

| Setting | Value |
|---------|-------|
| Framework | Jest |
| Test directory | `mcp-server/tests/e2e/helpers/` |
| Existing test file | `project-factory.spec.ts` |
| Test command | `cd mcp-server && npm run test:e2e` |
| CR test filter | `project-factory.spec.ts` |

## Existing Test Coverage

The existing `project-factory.spec.ts` already provides comprehensive coverage:

### Covered Behaviors ✅

| Component | Test Coverage | Status |
|-----------|---------------|--------|
| **Project Creation** | - Basic project structure creation<br>- MCP discovery validation<br>- Custom configuration support | ✅ Comprehensive |
| **CR Creation** | - Single CR via MCP API<br>- Multiple CR creation<br>- Sequential numbering<br>- Response validation | ✅ Comprehensive |
| **Dependencies** | - Parent/child CR relationships<br>- Dependency setting | ✅ Covered |
| **Scenarios** | - Complete test scenario creation<br>- Project + CRs setup | ✅ Covered |
| **Error Handling** | - Invalid project codes<br>- Missing CR sections<br>- Validation errors | ✅ Good coverage |

### Existing Test Scenarios

1. **GIVEN temp dir WHEN creating project THEN MCP discovers it**
   - Validates project directory creation
   - Checks .mdt-config.toml exists
   - Verifies docs/CRs directory
   - Confirms MCP discovery

2. **GIVEN project with custom config WHEN creating THEN respect config**
   - Custom repository URL
   - Custom CR path
   - Custom document paths

3. **GIVEN discovered project WHEN creating CR via API THEN CR exists**
   - MCP API usage
   - CR key extraction (response.key property)
   - CR content validation

4. **GIVEN project WHEN creating multiple CRs THEN assign sequential numbers**
   - Batch creation
   - Order preservation

5. **GIVEN project WHEN creating CR with dependencies THEN set dependencies correctly**
   - Dependency relationships

6. **GIVEN project WHEN creating test scenario THEN create complete setup**
   - Full scenario creation

7. **Error handling tests**
   - Project code validation
   - CR content validation

## Test Gaps (Optional Enhancements)

While existing tests are sufficient for refactoring, consider these gaps for future improvement:

| Gap | Priority | Reason |
|-----|----------|--------|
| **All CR Types** | Low | Current tests use Feature Enhancement, Bug Fix, Documentation |
| **All Priority Levels** | Low | Current tests use Medium priority |
| **All Status Values** | Low | Current tests don't set status explicitly |
| **TOML Structure Validation** | Low | Tests check content but not exact format |
| **MCP Connection Errors** | Medium | How to handle when MCP server is down |
| **File System Errors** | Medium | Permission denied, disk full scenarios |

## Behavioral Preservation Strategy

Since the existing tests are comprehensive, the refactoring should:

1. **Keep all existing tests GREEN** - They serve as behavioral contracts
2. **No new tests required initially** - Existing coverage is sufficient
3. **Add tests only if**:
   - New behavior is introduced (not expected)
   - Edge cases are discovered during implementation
   - Architecture requires additional validation

## Refactoring Validation Commands

### Primary Validation (from AC)

**Validation command specified in AC #127-129**:
```bash
cd mcp-server && npx jest --config jest.e2e.config.mjs --testNamePattern="GIVEN valid project and data WHEN creating THEN success with proper CR key"
```

**ProjectFactory-specific validation from AC #130**:
```bash
cd mcp-server && npx jest tests/e2e/helpers/project-factory.spec.ts --config jest.e2e.config.mjs
```

These must pass:
- **Before refactoring**: All tests GREEN (baseline)
- **After refactoring**: All tests GREEN (success)

### Additional Test Validation
```bash
# Run specific scenario tests
npm run test:e2e -- --testNamePattern="GIVEN.*WHEN.*THEN"

# Run error handling tests
npm run test:e2e -- --testNamePattern="Error Handling"

# Run MCP integration tests
npm run test:e2e -- --testNamePattern="MCP"
```

## Test Architecture Mapping

| Refactoring Phase | Tests That Verify Success |
|-------------------|---------------------------|
| **Phase 1: Extract Support Components**<br>- FileHelper<br>- ValidationRules<br>- ConfigurationGenerator | `GIVEN temp dir WHEN creating project THEN MCP discovers it`<br>`GIVEN project with custom config WHEN creating THEN respect config` |
| **Phase 2: Ticket Abstraction**<br>- TicketCreator interface<br>- MCP/File/Memory implementations | `GIVEN discovered project WHEN creating CR via API THEN CR exists`<br>`GIVEN project WHEN creating multiple CRs THEN assign sequential numbers` |
| **Phase 3: Extract Core Components**<br>- ProjectSetup<br>- TestDataFactory<br>- ScenarioBuilder | All existing tests (especially scenario tests) |
| **Phase 4: Refactor Main Class**<br>- Orchestration only | All existing tests must remain GREEN |

## Quality Gates

### Before Each Phase:
```bash
cd mcp-server && npx jest tests/e2e/helpers/project-factory.spec.ts --config jest.e2e.config.mjs
# Expected: All tests passing
```

### After Each Phase:
```bash
cd mcp-server && npx jest tests/e2e/helpers/project-factory.spec.ts --config jest.e2e.config.mjs
# Expected: Same tests passing (no regressions)
```

### Final Validation (per AC #127-130):
```bash
cd mcp-server && npx jest --config jest.e2e.config.mjs --testNamePattern="GIVEN valid project and data WHEN creating THEN success with proper CR key"
# Expected: Pass

cd mcp-server && npx jest tests/e2e/helpers/project-factory.spec.ts --config jest.e2e.config.mjs
# Expected: All tests GREEN
```

## Summary

**No new tests are needed initially**. The existing `project-factory.spec.ts` provides excellent coverage for behavioral preservation during refactoring. The tests already:

1. ✅ Verify all public API methods
2. ✅ Check error conditions
3. ✅ Validate side effects (file creation, MCP discovery)
4. ✅ Test integration points
5. ✅ Cover edge cases

The existing tests serve as the behavioral contract that must be preserved throughout the refactoring process. Only add new tests if the refactoring introduces new behavior or uncovers missing edge cases.

---

## For Implementation

**Rule**: All tests in `project-factory.spec.ts` must remain GREEN throughout the refactoring. If a test fails after a refactoring step:
1. The refactoring changed behavior (not allowed)
2. The test was too brittle (adjust test, not behavior)
3. An edge case was missed (add new test after fixing)

These tests are the **source of truth** for current behavior.