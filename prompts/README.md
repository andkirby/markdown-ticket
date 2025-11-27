# Markdown Ticket - Claude Code Prompt Commands

Structured workflows for AI agents creating and managing Change Request (CR) tickets using MCP mdt-all ticket system.

These commands provide a simple workflow of Spec-Driven Development (SDD).

Please [create a ticket](https://github.com/andkirby/markdown-ticket/issues/new) if you would like to integrate some other SDD tools.

## Overview

This directory contains interactive prompt workflows that guide AI agents through structured ticket creation, clarification, and reflection processes. Each workflow enforces artifact-focused documentation and integrates with the MCP mdt-all tools.

## Available Workflows

### `/mdt-ticket-creation`
- **Purpose**: Interactive workflow for creating new CR tickets with structured questioning
- **Process**: 10-question interactive specification gathering
- **Output**: Complete CR document with artifact specifications, alternatives analysis, and acceptance criteria
- **Integration**: Uses MCP `mdt-all`, `create_cr` and related tools

### `/mdt-clarification`
- **Purpose**: Interactive clarification workflow for improving existing CRs
- **Process**: Scans CR for ambiguities, asks targeted questions via taxonomy
- **Output**: Records clarifications in Section 8 and updates relevant CR sections
- **Integration**: Uses MCP `mdt-all` and tools: `get_cr` and `manage_cr_sections`

### `/mdt-reflection`
- **Purpose**: Post-implementation learning capture and CR documentation updates
- **Process**: Extracts artifact-level insights from implementation discussions
- **Output**: Updates CR with actual vs. planned specifications and creates session records
- **Integration**: Uses MCP `mdt-all` and `manage_cr_sections` for surgical updates

## Installation

Copy prompt commands to your Claude Code commands folder:

```bash
cp prompts/mdt-*.md ~/.claude/commands/
```

## Usage

1. **Create new ticket**: Provide context and run `/mdt-ticket-creation`
2. **Clarify existing**: Run `/mdt-clarification` on ambiguous CRs
3. **Document learnings**: After implementation, run `/mdt-reflection` to capture insights

## Design Principles

- **Artifact-focused**: Every technical statement references concrete files/components/methods
- **Structured interactions**: Use `AskUserQuestion` with max 4 options and concise descriptions
- **Atomic updates**: Individual section updates via `manage_cr_sections` (84-94% more efficient)
- **Quality enforcement**: 95%+ artifact reference requirement, zero behavioral descriptions

## File Structure

```
prompts/
├── README.md                # This file
├── mdt-ticket-creation.md   # CR creation workflow template
├── mdt-clarification.md     # Interactive clarification workflow
├── mdt-reflection.md        # Post-implementation learning capture
└── CLAUDE.md                # Development guidance for working with prompts
```

## Development

When modifying workflows:
1. Follow artifact-focused documentation standards
2. Test with MCP tools before committing changes
3. Verify markdown compliance (##/### headers, tables for specs, no bold headers)
4. Ensure all prompts integrate with `mcp__mdt-all_*` tools

See `CLAUDE.md` for detailed development guidelines and testing procedures.
