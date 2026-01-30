---
code: MDT-053
title: Integrate AWS Labs code-doc-gen MCP server for documentation generation
status: Implemented
dateCreated: 2025-10-02T09:02:57.098Z
type: Feature Enhancement
priority: Medium
phaseEpic: MCP Integration
---

# Integrate AWS Labs code-doc-gen MCP server for documentation generation

## Description

Integrate the AWS Labs code-doc-gen MCP server (https://awslabs.github.io/mcp/servers/code-doc-gen-mcp-server/) to add automated code documentation generation capabilities to the markdown ticket system.

## Rationale

The current MCP server focuses on ticket management but lacks code documentation capabilities. Adding the AWS Labs code-doc-gen server would:
- Enable automatic documentation generation for code changes described in CRs
- Provide a well-tested MCP implementation as reference
- Enhance the development workflow by linking tickets to generated documentation
- Leverage AWS-maintained code quality standards

## Solution Analysis

### Integration Options
1. **Standalone Integration**: Install and configure as separate MCP server
2. **Code Reuse**: Fork and customize for ticket-specific documentation needs
3. **Hybrid Approach**: Use patterns from AWS server in existing MCP implementation

### Recommended Approach
Start with standalone integration, then evaluate code reuse opportunities.

## Implementation

### Phase 1: Basic Integration
- Install @awslabs/code-doc-gen-mcp-server
- Configure as additional MCP server alongside existing ticket management
- Test integration with Q CLI and Claude Code
- Document setup process

### Phase 2: Workflow Integration
- Link documentation generation to CR workflow
- Add documentation references to ticket templates
- Create automation for doc generation on CR status changes

### Phase 3: Custom Enhancement
- Evaluate forking AWS server for ticket-specific features
- Add markdown ticket metadata to generated documentation
- Integrate with existing project discovery system

## Acceptance Criteria
- [x] AWS Labs code-doc-gen MCP server successfully installed
- [x] MCP server accessible via Q CLI and Claude Code
- [x] Documentation generation works for project codebases
- [x] Integration documented in README and development guide
- [x] No conflicts with existing MCP ticket management server
- [x] Performance impact assessed and acceptable
