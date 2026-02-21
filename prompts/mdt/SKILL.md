---
name: mdt
description: MDT command workflows and ticket/ADR generation for the mdt-all MCP system. Use when asked to create or update MDT CRs/ADRs or to run `/mdt:*` workflows (ticket creation, requirements, BDD, assess, PoC, domain lens/audit, architecture, tests, clarification, tasks, implement, tech-debt, reflection), including selecting modes like `--prep` and organizing outputs under `{TICKETS_PATH}`.
---

# Mdt

## Overview

Execute the MDT workflow system and generate CR artifacts exactly as specified by the MDT prompt set. Use the references in this skill for authoritative formats, steps, and file locations.

## Quick Start

1. Identify the requested command (e.g., `/mdt:requirements`, `/mdt:architecture`, `/mdt:tasks`).
2. Load the matching command file from `commands/`.
3. Use `references/README.md` only when you need extra implementation guidance.
4. Respect `{TICKETS_PATH}` from `.mdt-config.toml` if not provided by context.

## Core Rules

- Always follow the exact output locations and formats from the command file.
- If a command supports `--prep` or `--part`, detect from user arguments; if unclear, ask.
- Do not invent new sections or formats; mirror the referenced templates.

## Runtime Compatibility

- Use built-in Codex agents via `spawn_agent` (`default`, `worker`, `explorer`) when a command requires subagents.
- Treat files in `agents/*.md` as prompt contracts/templates for those spawned agents.
- Do not assume a skill-local `.mcp.json` is auto-loaded by the host session. Use MCP tools available in the active runtime.

## Reference Map

- `commands/*.md`: Authoritative prompt for each `/mdt:*` command.
- `references/README.md`: Supplemental reference docs and templates.
- `agents/*.md`: Subagent role contracts for orchestrated implementation flows.

## Command Files

Load only the file you need:

- `/mdt:ticket-creation` → `commands/ticket-creation.md`
- `/mdt:requirements` → `commands/requirements.md`
- `/mdt:bdd` → `commands/bdd.md`
- `/mdt:assess` → `commands/assess.md`
- `/mdt:poc` → `commands/poc.md`
- `/mdt:domain-lens` → `commands/domain-lens.md`
- `/mdt:domain-audit` → `commands/domain-audit.md`
- `/mdt:architecture` → `commands/architecture.md`
- `/mdt:tests` → `commands/tests.md`
- `/mdt:clarification` → `commands/clarification.md`
- `/mdt:tasks` → `commands/tasks.md`
- `/mdt:implement` → `commands/implement.md`
- `/mdt:implement-agentic` → `commands/implement-agentic.md`
- `/mdt:tech-debt` → `commands/tech-debt.md`
- `/mdt:reflection` → `commands/reflection.md`
