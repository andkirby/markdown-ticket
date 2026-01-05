# MDT Quick Reference

## Commands

| Command                | Purpose                                                         | Output                                                       |
|------------------------|-----------------------------------------------------------------|--------------------------------------------------------------|
| `/mdt:ticket-creation` | Create CR with flexible depth (WHAT only or WHAT+HOW)           | CR in MDT system                                             |
| `/mdt:requirements`    | Generate requirements (EARS + FR/NFR) with CR-type-aware format | `{TICKETS_PATH}/{CR-KEY}/requirements.md`                    |
| `/mdt:assess`          | Evaluate affected code fitness                                  | Decision: integrate / refactor / split                       |
| `/mdt:poc`             | Validate uncertain technical decisions                          | `{TICKETS_PATH}/{CR-KEY}/poc.md` + `poc/` folder             |
| `/mdt:domain-lens`     | Surface DDD constraints (optional)                              | `{TICKETS_PATH}/{CR-KEY}/domain.md`                          |
| `/mdt:domain-audit`    | Analyze code for DDD + structural issues                        | `{TICKETS_PATH}/{CR-KEY}/domain-audit.md`                    |
| `/mdt:tests`           | Generate BDD test specs + executable tests                      | `{TICKETS_PATH}/{CR-KEY}/[part-{X.Y}/]tests.md` + test files |
| `/mdt:architecture`    | Surface decisions, define structure + size limits               | CR section or `architecture.md`                              |
| `/mdt:clarification`   | Fill specification gaps                                         | Updated CR sections                                          |
| `/mdt:tasks`           | Break CR into constrained tasks                                 | `{TICKETS_PATH}/{CR-KEY}/[part-{X.Y}/]tasks.md`              |
| `/mdt:implement`       | Execute tasks with verification                                 | Code changes, updated tasks.md                               |
| `/mdt:tech-debt`       | Detect debt patterns                                            | `{TICKETS_PATH}/{CR-KEY}/debt.md`                            |
| `/mdt:reflection`      | Capture learnings                                               | Updated CR                                                   |

## When to Use What

| I need to...                                        | Run                                 |
|-----------------------------------------------------|-------------------------------------|
| **Create a new CR**                                 | `/mdt:ticket-creation`              |
| **Define requirements (new features/enhancements)** | `/mdt:requirements`                 |
| **Check if code needs refactoring first**           | `/mdt:assess`                       |
| **Validate uncertain technical decisions**          | `/mdt:poc`                          |
| **Add DDD constraints (business logic)**            | `/mdt:domain-lens`                  |
| **Diagnose DDD + structural issues**                | `/mdt:domain-audit`                 |
| **Generate tests from requirements**                | `/mdt:tests`                        |
| **Design architecture with size limits**            | `/mdt:architecture`                 |
| **Fill specification gaps**                         | `/mdt:clarification`                |
| **Break CR into tasks**                             | `/mdt:tasks`                        |
| **Execute tasks with verification**                 | `/mdt:implement`                    |
| **Find technical debt**                             | `/mdt:tech-debt`                    |
| **Capture learnings**                               | `/mdt:reflection`                   |
| **Design preparatory refactoring**                  | `/mdt:architecture {CR-KEY} --prep` |
| **Lock behavior before refactoring**                | `/mdt:tests {CR-KEY} --prep`        |
| **Generate refactoring tasks**                      | `/mdt:tasks {CR-KEY} --prep`        |
| **Execute preparatory refactoring**                 | `/mdt:implement {CR-KEY} --prep`    |

## Size Limits

| Role                              | Default | Hard Max |
|-----------------------------------|---------|----------|
| Orchestration (index, main)       | 100     | 150      |
| Feature module                    | 200     | 300      |
| Complex logic (parser, algorithm) | 300     | 450      |
| Utility / helper                  | 75      | 110      |

**Three Zones:**

- ✅ OK: ≤ Default → Proceed
- ⚠️ FLAG: Default to 1.5x → Complete with warning
- ⛔ STOP: > 1.5x → Cannot complete, must resolve

## Decision: Skip `/mdt:requirements`?

| CR Type         | Skip? | Alternative                         |
|-----------------|-------|-------------------------------------|
| New feature     | ❌ No  | —                                   |
| Enhancement     | ❌ No  | —                                   |
| Complex bug fix | ❌ No  | —                                   |
| Simple bug fix  | ✅ Yes | CR Acceptance Criteria              |
| Refactoring     | ✅ Yes | `/mdt:assess` → `/mdt:architecture` |
| Tech Debt       | ✅ Yes | `/mdt:architecture` directly        |
| Documentation   | ✅ Yes | No requirements needed              |
| Migration       | ❌ No  | —                                   |

## Session Context

Auto-injected variables (via `~/.claude/hooks/mdt-project-vars.sh`):

| Variable       | Source                             | Example                  |
|----------------|------------------------------------|--------------------------|
| `PROJECT_CODE` | `.mdt-config.toml` → `code`        | `MDT`, `API`, `WEB`      |
| `TICKETS_PATH` | `.mdt-config.toml` → `ticketsPath` | `docs/CRs`, `.mdt/specs` |

## Full Workflow Chain

```
/mdt:ticket-creation → /mdt:requirements (optional) → /mdt:assess (optional)
    → /mdt:poc (optional) → /mdt:tests → /mdt:domain-lens (optional)
    → /mdt:architecture → /mdt:clarification (as needed)
    → /mdt:tasks → /mdt:implement → /mdt:tech-debt → /mdt:reflection
```
