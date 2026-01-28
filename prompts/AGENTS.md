# Repository Guidelines

## Project Structure & Module Organization

This repository contains the prompt and documentation assets for the MDT (Markdown Ticket) workflow plugin.

- `mdt/` houses the Claude plugin: `mdt/commands/` for user-facing workflows, `mdt/agents/` for internal agent prompts, and `.claude-plugin/plugin.json` for plugin metadata.
- Top-level Markdown files (`README.md`, `GUIDE.md`, `COMMANDS.md`, `WORKFLOWS.md`, `QUICKREF.md`, `CONCEPTS.md`) are the primary docs.
- `hooks/` contains shell helpers (e.g., `hooks/mdt-project-vars.sh`) for injecting project context.
- `drafts/` is for in-progress notes and experiments.

## Build, Test, and Development Commands

There is no build system or runtime in this directory; changes are validated by running MDT workflows.

- Install the plugin locally: `claude plugin install /path/to/prompts/mdt`
- Use the workflows directly: `/mdt:ticket-creation {CR-KEY}`, `/mdt:requirements {CR-KEY}`, `/mdt:architecture {CR-KEY}`, `/mdt:tests {CR-KEY}`
- Install helper commands for Claude Code: `bash install-claude.sh`

## Coding Style & Naming Conventions

- Markdown is the primary format; prefer clear headings and short, directive sentences.
- Keep prompts artifact-focused (concrete files, components, endpoints) and avoid vague behavioral prose.
- Follow existing file naming patterns (`mdt/commands/<command>.md`, `mdt/agents/<agent>.md`).

## Testing Guidelines

There are no automated tests in this repo. Validate changes by:

- Creating a test CR with `mcp__mdt-all__create_cr`.
- Running the relevant `/mdt:*` command and checking generated artifacts (e.g., `{TICKETS_PATH}/{CR-KEY}/requirements.md`).

## Commit & Pull Request Guidelines

Recent history follows Conventional Commits (e.g., `feat(prompts): …`, `refactor(prompts): …`, `fix(…): …`). Use that style for new commits.

For PRs, include:

- A concise summary of the workflow or prompt changes.
- Links or references to any CRs or documentation updates.
- Notes on how you validated the change (commands run, artifacts generated).

## Agent-Specific Instructions

See `CLAUDE.md` for prompt development rules, workflow testing steps, and the agentic implementation model. When in doubt, update the command docs and examples alongside any prompt logic changes.
