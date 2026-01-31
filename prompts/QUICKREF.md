# MDT Quick Reference

## Commands

| Command                | Purpose                                                         | Output                                                       |
|------------------------|-----------------------------------------------------------------|--------------------------------------------------------------|
| `/mdt:ticket-creation` | Create CR with flexible depth (WHAT only or WHAT+HOW)           | CR in MDT system                                             |
| `/mdt:requirements`    | Generate requirements (EARS + FR/NFR) with CR-type-aware format | `{TICKETS_PATH}/{CR-KEY}/requirements.md`                    |
| `/mdt:bdd`             | Generate BDD acceptance tests (E2E, user-visible behavior)      | `{TICKETS_PATH}/{CR-KEY}/bdd.md` + E2E test files            |
| `/mdt:assess`          | Evaluate affected code fitness                                  | Decision: integrate / refactor / split                       |
| `/mdt:poc`             | Validate uncertain technical decisions                          | `{TICKETS_PATH}/{CR-KEY}/poc.md` + `poc/` folder             |
| `/mdt:domain-lens`     | Surface DDD constraints (optional)                              | `{TICKETS_PATH}/{CR-KEY}/domain.md`                          |
| `/mdt:domain-audit`    | Analyze code for DDD + structural issues                        | `{TICKETS_PATH}/{CR-KEY}/domain-audit.md`                    |
| `/mdt:architecture`    | Surface decisions, define structure + scope boundaries          | CR section or `architecture.md`                              |
| `/mdt:tests`           | Generate module tests (unit/integration) from architecture      | `{TICKETS_PATH}/{CR-KEY}/[part-{X.Y}/]tests.md` + test files |
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
| **Generate E2E acceptance tests**                   | `/mdt:bdd`                          |
| **Check if code needs refactoring first**           | `/mdt:assess`                       |
| **Validate uncertain technical decisions**          | `/mdt:poc`                          |
| **Add DDD constraints (business logic)**            | `/mdt:domain-lens`                  |
| **Diagnose DDD + structural issues**                | `/mdt:domain-audit`                 |
| **Design architecture with scope boundaries**       | `/mdt:architecture`                 |
| **Generate module tests from architecture**         | `/mdt:tests`                        |
| **Fill specification gaps**                         | `/mdt:clarification`                |
| **Break CR into tasks**                             | `/mdt:tasks`                        |
| **Execute tasks with verification**                 | `/mdt:implement`                    |
| **Find technical debt**                             | `/mdt:tech-debt`                    |
| **Capture learnings**                               | `/mdt:reflection`                   |
| **Design preparatory refactoring**                  | `/mdt:architecture {CR-KEY} --prep` |
| **Lock E2E behavior before refactoring**            | `/mdt:bdd {CR-KEY} --prep`          |
| **Lock module behavior before refactoring**         | `/mdt:tests {CR-KEY} --prep`        |
| **Generate refactoring tasks**                      | `/mdt:tasks {CR-KEY} --prep`        |
| **Execute preparatory refactoring**                 | `/mdt:implement {CR-KEY} --prep`    |

## Scope Boundaries

- Define what each module owns and what it must not touch
- Flag minor spillover; stop on boundary breaches

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
/mdt:ticket-creation → /mdt:requirements (optional) → /mdt:bdd
    → /mdt:assess (optional) → /mdt:poc (optional) → /mdt:domain-lens (optional)
    → /mdt:architecture → /mdt:tests → /mdt:clarification (as needed)
    → /mdt:tasks → /mdt:implement → /mdt:tech-debt → /mdt:reflection
```
