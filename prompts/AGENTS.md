# Repository Guidelines

## Project Identity

This repository defines an SDD (Spec-Driven Development) framework for software delivery using Markdown Tickets (MDT).

- The framework is technology-agnostic.
- Work is driven by specifications and explicit artifacts.
- Commands guide the full lifecycle from ticket definition to reflection.

## Core Workflow Model

- Work starts from a CR and progresses through defined `/mdt:*` workflows.
- Each workflow writes or updates concrete artifacts under `{TICKETS_PATH}/{CR-KEY}/`.
- Typical flow:
  - `/mdt:ticket-creation`
  - `/mdt:requirements` (when needed)
  - `/mdt:bdd`
  - `/mdt:assess` (optional)
  - `/mdt:poc` (optional)
  - `/mdt:domain-lens` (optional)
  - `/mdt:clarification` (as needed)
  - `/mdt:architecture`
  - `/mdt:tests`
  - `/mdt:tasks`
  - `/mdt:implement` or `/mdt:implement-agentic`
  - `/mdt:tech-debt`
  - `/mdt:reflection`

## Repository Structure

- `mdt/`: main workflow package
  - `mdt/commands/`: user-facing `/mdt:*` command prompts
  - `mdt/agents/`: internal agent contracts
  - `mdt/scripts/`: workflow helper scripts
  - `mdt/hooks/`: workflow hook registration
  - `mdt/.claude-plugin/plugin.json`: plugin manifest
- `mdt-report/`: incident and reporting workflow assets
- `hooks/`: local context/helper scripts
- `scripts/`: repository utility scripts
- Top-level docs: `README.md`, `INSTALL.md`, `WORKFLOWS.md`, `COMMANDS.md`, `QUICKREF.md`, `CONCEPTS.md`, `CHANGE_NOTES.md`
- Working material: `drafts/`, `dev/`, `test/`, `incidents/`

## Development and Validation

There is no traditional build process in this repository. Validate changes by running workflows and checking generated artifacts.

- Install/update plugin locally: `./install-plugin.sh --local` or `./install-plugin.sh -uy`
- Install skill package for broader assistant environments: `./install-agents-skill.sh`
- Run relevant `/mdt:*` commands against a test CR and confirm:
  - expected output paths,
  - required sections,
  - clean handoff to downstream workflows.

## Authoring Standards

- Write concise, directive Markdown.
- Keep prompts artifact-focused and implementation-agnostic.
- Avoid vague behavioral prose; require explicit files, boundaries, and acceptance criteria.
- Follow established naming patterns:
  - `mdt/commands/<command>.md`
  - `mdt/agents/<agent>.md`

## Contribution Guidelines

- Use Conventional Commit style (`feat(...)`, `fix(...)`, `refactor(...)`, `docs(...)`).
- In PRs, include:
  - summary of workflow/prompt changes,
  - related CR references,
  - validation notes (commands executed and artifacts produced).

## Source of Truth

`AGENTS.md` is the primary repository guidance file.  
`CLAUDE.md` should only reference `@AGENTS.md` to prevent drift.
