---
code: MDT-103
status: Implemented
dateCreated: 2025-12-24T12:18:49.315Z
type: Technical Debt
priority: Medium
phaseEpic: Phase 1b - Integration
---

# Add TypeScript validation scripts for post-commit file checking

## 1. Description

### Problem

- TypeScript files modified during development are not validated before commit
- No automated check ensures `.ts` files compile without errors
- Manual validation requires remembering to run `npx tsc` on each changed file
- CLAUDE.md specifies TypeScript validation requirement but no automated tool exists

### Affected Artifacts

- `package.json` - npm scripts for validation
- `scripts/validate-changed-ts.sh` - NEW: Validates only modified files
- `scripts/validate-all-ts.sh` - NEW: Validates all TypeScript files
- `CLAUDE.md` - Documentation reference to validation command

### Scope

- **Changes**: 
  - Add two bash scripts for TypeScript validation
  - Add npm script entries for running validation
  - Update CLAUDE.md with validation instruction
- **Unchanged**: 
  - TypeScript configuration files
  - Build process
  - Test infrastructure

## 2. Decision

### Chosen Approach

Add executable bash scripts that wrap `npx tsc --skipLibCheck --noEmit` for individual file validation.

### Rationale

- Bash scripts provide flexible file selection (changed files vs. all files)
- npm script integration allows simple `npm run validate:ts` invocation
- Per-file validation shows clear pass/fail status for each file
- Exit code propagation enables CI/CD integration
- No external dependencies required (uses existing `npx tsc`)

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Bash scripts with npm integration** | Shell scripts + npm run commands | **ACCEPTED** - Simple, no dependencies, clear output |
| Husky pre-commit hook | Automatic validation on git commit | Requires additional dependency, runs on every commit (slower) |
| TypeScript full project check | `tsc --noEmit` on entire project | Slower for large codebases, doesn't show which file failed |
| ESLint TypeScript rules | Lint-based type checking | Doesn't catch all TypeScript errors, requires config |

## 4. Artifact Specifications

### New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| `scripts/validate-changed-ts.sh` | Bash script | Validate `.ts`/`.tsx` files modified in working directory |
| `scripts/validate-all-ts.sh` | Bash script | Validate all `.ts`/`.tsx` files in project |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `package.json` | Scripts added | `validate:ts` and `validate:ts:all` entries |
| `CLAUDE.md` | Documentation added | Instruction for post-change TypeScript validation |

### Integration Points

| From | To | Interface |
|------|----|-----------|
| `npm run validate:ts` | `validate-changed-ts.sh` | Shell execution |
| `validate-changed-ts.sh` | `npx tsc` | CLI invocation with file argument |
| `validate-changed-ts.sh` | `git status` | File change detection |

### Key Patterns

- **Exit code propagation**: Scripts exit with status 1 if any file fails validation
- **Colored output**: Green/red/yellow ANSI codes for pass/fail/skip status
- **Git integration**: Uses `git status --porcelain` to detect changed files
- **File filtering**: Skips `.d.ts` declaration files and non-TypeScript files

## 5. Acceptance Criteria

### Functional

- [ ] `scripts/validate-changed-ts.sh` exists and is executable
- [ ] `scripts/validate-all-ts.sh` exists and is executable
- [ ] `npm run validate:ts` runs validation on changed files only
- [ ] `npm run validate:ts:all` runs validation on all TypeScript files
- [ ] Scripts show colored output (green=pass, red=fail, yellow=skip)
- [ ] Scripts exit with code 1 when any file fails validation
- [ ] Scripts skip `.d.ts` declaration files
- [ ] `validate-changed-ts.sh` accepts file paths as arguments

### Non-Functional

- [ ] Script execution completes in < 5 seconds for typical change set (≤10 files)
- [ ] Error output shows TypeScript error message (not just "failed")
- [ ] Summary line shows pass/fail/skip counts

### Testing

- Unit: Run `npm run validate:ts` with no changes - exits cleanly with 0 files
- Unit: Run `npm run validate:ts` with valid `.ts` file change - shows pass status
- Unit: Run `npm run validate:ts` with invalid `.ts` file change - shows fail with error
- Integration: Create intentional type error in `.ts` file - script catches it
- Manual: Run `npm run validate:ts file1.ts file2.ts` - validates only specified files

## 6. Verification

### By CR Type

- **Technical Debt**: Scripts exist, `npm run validate:ts` validates changed files, exit codes propagate correctly

## 7. Deployment

### Single-Step Deployment

- Scripts are self-contained, no build process required
- Scripts require execute permission (`chmod +x`)
- No configuration changes required
- No rollback needed (scripts can be deleted if problematic)

### Usage

```bash
# After editing TypeScript files
npm run validate:ts

# Or validate specific files
bash scripts/validate-changed-ts.sh path/to/file.ts
```
