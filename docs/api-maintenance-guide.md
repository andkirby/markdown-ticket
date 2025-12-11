# API Maintenance & OpenAPI Compatibility Guide

**Reference**: [MDT-091] - Add comprehensive E2E testing framework for MCP-SE (implementation)

## Overview

This guide explains how to maintain API compatibility and keep OpenAPI documentation synchronized with the codebase.

## Core Principles

### 1. API Versioning Strategy
- **Current Version**: 1.0.0 (defined in `server/openapi/config.ts`)
- **Backward Compatibility**: Never break existing endpoints
- **Deprecation**: Use `deprecated: true` in JSDoc for old endpoints
- **Breaking Changes**: Increment minor version (1.1.0) and maintain old version for at least one release

### 2. OpenAPI Synchronization
The API documentation is automatically generated from JSDoc comments using `swagger-jsdoc`.

## Maintenance Workflow

### Adding New Endpoints

1. **Create Route File** (`server/routes/new-endpoint.ts`):
```typescript
/**
 * @swagger
 * /api/new-endpoint:
 *   post:
 *     summary: Create new resource
 *     tags: [ResourceTag]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewResource'
 *     responses:
 *       201:
 *         description: Resource created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resource'
 */
router.post('/', async (req, res) => {
  // Implementation
});
```

2. **Update Schemas** (if needed):
   - Edit `server/openapi/schemas.ts`
   - Add new schema definitions
   - Reference existing schemas where possible

3. **Register Route** in `server/server.ts`

4. **Generate Documentation**:
```bash
cd server && npm run openapi:generate
```

### Modifying Existing Endpoints

1. **Non-Breaking Changes**:
   - Add optional query parameters
   - Add new response fields
   - Update JSDoc comments
   - Regenerate docs

2. **Breaking Changes** (AVOID):
   - Required new parameters
   - Change response structure
   - Remove endpoints
   - If unavoidable: Create v2 endpoint with new path

### Removing Endpoints

1. **Deprecate First**:
```typescript
/**
 * @swagger
 * /api/old-endpoint:
 *   get:
 *     deprecated: true
 *     summary: [DEPRECATED] Use /api/new-endpoint instead
 */
```

2. **Maintain for One Release Cycle**
3. **Remove After Deprecation Period**

## Documentation Updates

### Regenerate OpenAPI Files

```bash
# Navigate to server directory
cd server

# 1. Generate YAML specification
npm run openapi:generate

# 2. Validate the generated spec
npm run openapi:validate

# 3. Generate static HTML documentation
npx @redocly/cli build-docs openapi.yaml -o api-docs.html

# 4. Serve interactive documentation (development)
npm run dev
# Then visit: http://localhost:3001/api-docs
```

### File Locations

- **YAML Spec**: `server/openapi.yaml` - Generated specification file
- **Config**: `server/openapi/config.ts` - swagger-jsdoc configuration
- **Schemas**: `server/openapi/schemas.ts` - Reusable schema definitions
- **HTML Docs**:
  - Static: `server/api-docs.html` - Generated with Redoc CLI
  - Interactive: `http://localhost:3001/api-docs` - Served by redoc-express

## Best Practices

### JSDoc Annotations

1. **Always Include**:
   - `@swagger` tag
   - HTTP method and path
   - `summary` and `description`
   - `tags` for grouping
   - `responses` for all status codes
   - `requestBody` for POST/PUT/PATCH

2. **Use References**:
   - `#$ref: '#/components/schemas/SchemaName'` for reusable types
   - Avoid inline schema definitions

3. **Error Responses**:
   ```typescript
   responses:
     '400':
       $ref: '#/components/responses/BadRequest'
     '404':
       $ref: '#/components/responses/NotFound'
     '500':
       $ref: '#/components/responses/ServerError'
   ```

### Schema Management

1. **Centralize in `schemas.ts`**:
   - All shared models
   - Request/response types
   - Error schemas

2. **Naming Conventions**:
   - PascalCase for types: `ChangeRequest`
   - Descriptive names: `CreateChangeRequestInput`

3. **Validation**:
   - Run `npm run openapi:validate` after changes
   - Fix all validation errors

### Version Control

1. **Commit OpenAPI Files**:
   - `server/openapi.yaml` - Generated but tracked
   - Enables API consumers to reference specific versions

2. **Update Version Number**:
   - Edit `server/openapi/config.ts`
   - Follow semantic versioning
   - Update changelog

## Testing API Changes

1. **Unit Tests**: Test new endpoints with Jest
2. **Integration Tests**: Test full request/response cycles
3. **Documentation Tests**: Verify OpenAPI spec validates
4. **E2E Tests**: Test through the UI

## Troubleshooting

### Common Issues

1. **Missing Schemas**:
   - Check `server/openapi/schemas.ts`
   - Ensure all `$ref` paths exist

2. **Validation Errors**:
   - Run `npm run openapi:validate`
   - Check for duplicate schema names
   - Verify required fields

3. **Documentation Not Updating**:
   - Ensure JSDoc comments are properly formatted
   - Check file paths in `swaggerOptions.apis`
   - Regenerate with `npm run openapi:generate`

## Automation

Consider adding to CI/CD:
```yaml
- name: Generate and Validate API Documentation
  run: |
    cd server
    # Generate OpenAPI specification
    npm run openapi:generate

    # Validate the specification
    npm run openapi:validate

    # Generate static HTML docs
    npx @redocly/cli build-docs openapi.yaml -o api-docs.html

    # Optionally deploy docs to GitHub Pages or other hosting
    # mv api-docs.html ../docs/api.html
    # git add ../docs/api.html
```

## Quick Reference

### Commands Summary
```bash
# All documentation generation commands (run in server/ directory)

# 1. Generate YAML spec from JSDoc comments
npm run openapi:generate

# 2. Validate the generated spec
npm run openapi:validate

# 3. Generate static HTML file
npx @redocly/cli build-docs openapi.yaml -o api-docs.html

# 4. Start dev server with interactive docs
npm run dev  # Visit http://localhost:3001/api-docs
```

### Prerequisites
- Node.js 16+
- `@redocly/cli` for HTML generation (auto-installed on first use)

## Resources

- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [swagger-jsdoc Documentation](https://github.com/Surnet/swagger-jsdoc)
- [Redoc Documentation](https://redocly.com/docs/redoc/)
- [Redoc CLI Reference](https://redocly.com/docs/cli/)