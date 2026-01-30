# CR Creation Workflow (v9)

**Pattern**: Analyze context → Infer all parameters → Confirm/Refine → Execute

**Core distinction**: `full` mode = concrete artifacts (files, endpoints, methods); `requirements` mode = outcomes only (defer HOW to `/mdt:architecture`)

```text
$ARGUMENTS
```

Use `{TICKETS_PATH}` from `.mdt-config.toml` for file paths.

---

## Parameter Schema

Infer ALL parameters from context before asking user:

| Parameter | Valid Values | Default Logic |
|-----------|--------------|---------------|
| `SPEC_MODE` | `requirements`, `full` | `requirements` if vague/complex; `full` if specific files mentioned |
| `CR_TYPE` | `Feature Enhancement`, `Bug Fix`, `Architecture`, `Technical Debt`, `Documentation`, `Research` | Infer from keywords (fix→Bug, add→Feature, refactor→Debt, investigate→Research) |
| `REQUIREMENTS_SCOPE` | `full`, `brief`, `preservation`, `none` | See defaults table below |
| `MOTIVATION` | `User requirement`, `Technical limitation`, `Bug/defect`, `Performance issue`, `Maintenance burden`, `Architectural gap` | Infer from context |
| `AREAS` | `Frontend`, `Backend`, `API`, `Database`, `Config`, `Shared`, `Tests` | Infer from mentioned paths/keywords |
| `VERIFICATION` | `Files exist`, `Tests pass`, `Endpoints work`, `Performance met`, `Manual`, `Docs updated` | Based on CR_TYPE |

**REQUIREMENTS_SCOPE defaults**:
| CR_TYPE | Default |
|---------|---------|
| Feature Enhancement | `full` |
| Bug Fix | `brief` |
| Architecture / Technical Debt / Documentation / Research | `none` |

---

## Workflow

### 1. Analyze & Infer

Analyze user input, conversation history, and codebase context. Infer values for ALL parameters above.

### 2. Present for Confirmation

Use `AskUserQuestion` with inferred values in the question text:

```
Question: Based on "{summary}", I suggest:

| Parameter | Value | Reason |
|-----------|-------|--------|
| Mode | {SPEC_MODE} | {why} |
| Type | {CR_TYPE} | {why} |
| Scope | {REQUIREMENTS_SCOPE} | {why} |
| Motivation | {MOTIVATION} | {why} |
| Areas | {AREAS} | {why} |
| Verification | {VERIFICATION} | {why} |

Confirm or refine?

Header: Confirm
Options:
- Confirm: Proceed with these settings (Recommended)
- Refine: Adjust specific values
```

### 3. Handle Response

**Confirm** → Go to step 4

**Refine** → Ask which parameters to change (multi-select), then ask only those:

| Parameter | Question |
|-----------|----------|
| `SPEC_MODE` | "Requirements only (WHAT) or Full specification (WHAT+HOW)?" |
| `CR_TYPE` | "Type: Feature / Bug Fix / Architecture / Tech Debt / Docs / Research?" |
| `REQUIREMENTS_SCOPE` | "Scope: full / brief / preservation / none?" |
| `MOTIVATION` | "Trigger: User need / Tech limitation / Bug / Performance / Maintenance / Arch gap?" |
| `AREAS` | "Areas involved? (multi-select: Frontend, Backend, API, DB, Config, Shared, Tests)" |
| `VERIFICATION` | "Verify by? (multi-select: Files exist, Tests, Endpoints, Perf, Manual, Docs)" |

### 4. Execute

1. **Load template** based on final values:
   | Condition | Template |
   |-----------|----------|
   | `CR_TYPE` = Research | `references/ticket-templates/research.md` |
   | `SPEC_MODE` = full | `references/ticket-templates/full-spec.md` |
   | `SPEC_MODE` = requirements | `references/ticket-templates/requirements.md` |

   Also load `references/ticket-templates/quality-checks.md` (applies to all modes).

2. **Ask mode-specific questions** from template (Q4-Q8 for Full Specification mode)

3. **Generate content** using template structure. Apply quality rules. Mark gaps with "(Requires /mdt:clarification)"

4. **Create via MCP**:
   ```json
   {
     "project": "{PROJECT_CODE}",
     "type": "{CR_TYPE}",
     "data": {
       "title": "≤10 words, pattern: [Action] description",
       "phaseEpic": "(optional) if mentioned in context",
       "assignee": "(optional) if mentioned in context",
       "content": "markdown from template (no YAML)"
     }
   }
   ```

5. **Report & suggest next workflow**:
   | CR_TYPE | REQUIREMENTS_SCOPE | Next |
   |---------|-------------------|------|
   | Research | any | `/mdt:poc` → `/mdt:reflection` |
   | Feature | full | `/mdt:requirements` → `/mdt:bdd` → `/mdt:architecture` |
   | Feature | brief/none | `/mdt:architecture` → `/mdt:tasks` → `/mdt:implement` |
   | Bug Fix | brief | `/mdt:bdd` (RED) → `/mdt:architecture` → `/mdt:implement` |
   | Architecture | none | `/mdt:architecture` → `/mdt:tasks` |
   | Technical Debt | preservation | `/mdt:assess` → `/mdt:bdd --prep` → `/mdt:implement` |

6. **Offer refinement**: Ask if user wants to adjust any section
