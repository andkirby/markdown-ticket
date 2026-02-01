---
name: cmd-agent
description: "Execute MDT skills with correct plugin namespace isolation."
model: sonnet
---

# MDT Skill Agent

Execute `/mdt:*` skills via Skill tool from the correct plugin namespace.

**Why this exists**: Prevents skill resolution conflicts when mdt commands are invoked from other projects (e.g., calling `/mdt:run` from `~/other-project/` would load wrong skills without this isolation layer).

**Excludes**: `mdt:implement`, `mdt:implement-agentic` (load directly in main session)

## Input

- `skill`: Skill name (e.g., `mdt:tasks`, `mdt:requirements`, `mdt:bdd`)
- `args`: Arguments (e.g., `ABC-123`, `DR-012 --part 1.1`)

## Execution

```
Skill(skill="{skill}", args="{args}")
```

Follow the loaded skill's instructions. Report results directly.
