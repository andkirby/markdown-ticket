# MDT-070: Consolidated MCP Tools Design

## Tool Consolidation Map

### 1. CR Content Access (2 → 1 tool)

**Before**:
- `get_cr_full_content(project, key)` - 1,200 tokens
- `get_cr_attributes(project, key)` - 800 tokens

**After**:
```typescript
{
  name: 'get_cr',
  description: 'Access CR content in multiple modes: full (content+metadata), attributes (YAML only), or metadata (key info)',
  inputSchema: {
    type: 'object',
    properties: {
      project: { type: 'string', description: 'Project key' },
      key: { type: 'string', description: 'CR key (e.g., MDT-004)' },
      mode: {
        type: 'string',
        enum: ['full', 'attributes', 'metadata'],
        description: 'Access mode: full=content+metadata, attributes=YAML only, metadata=key info only',
        default: 'full'
      }
    },
    required: ['project', 'key']
  }
}
```

**Token Savings**: ~1,000 tokens (consolidated descriptions + shared schema)

### 2. Section Management (3 → 1 tool)

**Before**:
- `list_cr_sections(project, key)` - 900 tokens
- `get_cr_section(project, key, section)` - 1,100 tokens
- `update_cr_section(project, key, section, operation, content)` - 1,400 tokens

**After**:
```typescript
{
  name: 'manage_cr_sections',
  description: 'Manage CR sections: list, get, or update sections efficiently',
  inputSchema: {
    type: 'object',
    properties: {
      project: { type: 'string', description: 'Project key' },
      key: { type: 'string', description: 'CR key' },
      operation: {
        type: 'string',
        enum: ['list', 'get', 'update'],
        description: 'Operation: list=show all sections, get=read one section, update=modify section'
      },
      section: { type: 'string', description: 'Section name/header (for get/update)' },
      updateMode: {
        type: 'string',
        enum: ['replace', 'append', 'prepend'],
        description: 'Update method (for update operation)',
        default: 'replace'
      },
      content: { type: 'string', description: 'Section content (for update operation)' }
    },
    required: ['project', 'key', 'operation']
  }
}
```

**Token Savings**: ~1,800 tokens (consolidated descriptions + shared schema)

### 3. Template Access (2 → 0 tools) - REMOVED

**Before**:
- `list_cr_templates()` - 600 tokens
- `get_cr_template(type)` - 600 tokens

**After**: REMOVED ENTIRELY

**Justification**:
- Templates are rarely used after initial project setup
- Template info can be embedded in `create_cr` tool description
- 1,200 token savings

**Alternative**: Add brief template info to `create_cr` description:
```
"description": "Create new CR. Types: Architecture (system design), Feature Enhancement (new functionality),
Bug Fix (defect correction), Technical Debt (code quality), Documentation (docs).
Templates auto-generated with standard sections."
```

### 4. Description Optimization Guidelines

**Before Example**:
```typescript
"description": "Comma-separated list of CR keys this blocks (e.g., \"MDT-010,MDT-015\")"
```

**After Example**:
```typescript
"description": "Blocked CR keys (comma-separated)"
```

**Optimization Rules**:
1. Remove examples from descriptions (move to tool-level docs)
2. Remove redundant default value documentation
3. Use abbreviations: "Number" → "#", "description" → "desc"
4. Remove "optional" keyword (schema already indicates this)
5. Consolidate enum documentation into description header
6. Remove verbose parameter explanations

## Expected Token Savings

| Category | Before | After | Savings |
|----------|--------|-------|---------|
| CR Content | 2,000 | 1,000 | 1,000 |
| Section Mgmt | 3,400 | 1,600 | 1,800 |
| Templates | 1,200 | 0 | 1,200 |
| Description Opt | ~3,000 | ~1,500 | 1,500 |
| **Total** | **9,600** | **4,100** | **5,500** |

**Overall Reduction**: 5,500 tokens = 39% decrease
**Tool Count**: 20 → 17 tools = 15% decrease

## Implementation Order

1. **Phase 1**: Description optimization only (non-breaking, ~2k tokens saved)
2. **Phase 2**: Add new consolidated tools alongside existing ones
3. **Phase 3**: Update tests to use new tools
4. **Phase 4**: Update documentation
5. **Phase 5**: Remove old tools (breaking change)

## Backward Compatibility Strategy

**Option A: Clean Break (Recommended)**
- Remove old tools entirely
- Update all documentation at once
- Clear migration path in MIGRATION.md

**Option B: Gradual Transition**
- Keep old tools as wrappers calling new tools
- Add deprecation warnings
- Remove in v2.0.0

**Recommendation**: Option A - clean break for maximum token savings

## New Tool Handler Structure

```typescript
private async handleGetCR(projectKey: string, key: string, mode: string = 'full'): Promise<string> {
  switch (mode) {
    case 'attributes':
      return await this.handleGetCRAttributes(projectKey, key);
    case 'metadata':
      return await this.handleGetCRMetadata(projectKey, key);
    case 'full':
    default:
      return await this.handleGetCR(projectKey, key);
  }
}

private async handleManageCRSections(
  projectKey: string,
  key: string,
  operation: string,
  section?: string,
  updateMode?: string,
  content?: string
): Promise<string> {
  switch (operation) {
    case 'list':
      return await this.handleListCRSections(projectKey, key);
    case 'get':
      if (!section) throw new Error('Section required for get operation');
      return await this.handleGetCRSection(projectKey, key, section);
    case 'update':
      if (!section || !content) throw new Error('Section and content required for update operation');
      return await this.handleUpdateCRSection(projectKey, key, section, updateMode || 'replace', content);
    default:
      throw new Error(`Invalid operation: ${operation}`);
  }
}
```

## Testing Strategy

### Unit Tests (TDD Approach)
```typescript
describe('Consolidated MCP Tools', () => {
  describe('get_cr', () => {
    it('should return full content by default');
    it('should return only attributes when mode=attributes');
    it('should return metadata when mode=metadata');
  });

  describe('manage_cr_sections', () => {
    it('should list sections when operation=list');
    it('should get section when operation=get');
    it('should update section when operation=update');
    it('should validate required parameters for each operation');
  });
});
```

### Integration Tests
- MCP Inspector validation
- Claude Code integration test
- Token counting verification

### Documentation Tests
- All 8 documentation files updated
- Tool references consistent
- Migration guide complete