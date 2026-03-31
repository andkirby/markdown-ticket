# Tests: MDT-143

**Source**: [MDT-143](../MDT-143-cli-entrypoint-alternative-to-mcp.md)
**Generated**: 2026-03-26

## Overview

CLI acceptance for `MDT-143` should run as real-process E2E in `cli/tests/e2e/`, using `@mdt/shared/test-lib` for isolated temp projects, config, and process helpers. The suite should prove the canonical `commander` tree, the retained shortcut set, shared-service integration, and the operator-visible output rules.

## Module -> Test Mapping

| Module | Test File | Tests |
|--------|-----------|-------|
| CLI bootstrap + shortcuts | `cli/tests/e2e/smoke/cli-bootstrap.spec.ts` | 6 |
| Ticket read/list | `cli/tests/e2e/ticket/read.spec.ts` | 12 |
| Project namespace | `cli/tests/e2e/project/project.spec.ts` | 10 |
| Ticket create | `cli/tests/e2e/ticket/create.spec.ts` | 10 |
| Ticket attr | `cli/tests/e2e/ticket/attr.spec.ts` | 12 |
| Ticket list enhancements | `cli/tests/e2e/ticket/list-enhancements.spec.ts` | TBA |
| Attr output format | `cli/tests/e2e/ticket/attr-output.spec.ts` | TBA |
| CLI color scheme | `cli/tests/e2e/output/color-scheme.spec.ts` | TBA |
| Command guide | `cli/tests/e2e/guide.spec.ts` | TBA |

## Test Details

### CLI Bootstrap (`cli/tests/e2e/smoke/cli-bootstrap.spec.ts`)

| Test Name | Covers |
|-----------|--------|
| should execute the built mdt-cli binary with commander help output | TEST-cli-bootstrap |
| should preserve canonical entity-action help for ticket and project namespaces | TEST-cli-bootstrap |
| should normalize bare ticket-key shortcuts before commander parse | TEST-cli-bootstrap |
| should normalize top-level create alias to ticket create | TEST-cli-bootstrap |
| should normalize top-level attr alias to ticket attr | TEST-cli-bootstrap |
| should reject unsupported shortcut forms with corrective help | TEST-cli-bootstrap, Edge-2 |

### Ticket Read/List (`cli/tests/e2e/ticket/read.spec.ts`)

| Test Name | Covers |
|-----------|--------|
| should view a ticket through bare numeric shorthand inside a detected project | BR-1, BR-2 |
| should view a ticket through canonical ticket get | BR-1 |
| should resolve explicit cross-project ticket lookup outside the project directory | BR-3 |
| should list tickets through canonical ticket list | BR-4 |
| should list tickets through list and ls shortcuts | BR-4 |
| should search parent directories to filesystem root for shorthand resolution | C4 |
| should reject shorthand ticket lookup outside detected project context | Edge-3 |
| should reject invalid ticket keys with a clear format error | Edge-1 |
| should render relative paths by default | BR-12, C1 |
| should render absolute paths when configured | BR-13 |
| should gate ANSI output to interactive terminals only | BR-11, C6 |
| should keep badge color categories aligned with the web badge definitions | BR-11, C3 |

### Project Namespace (`cli/tests/e2e/project/project.spec.ts`)

| Test Name | Covers |
|-----------|--------|
| should show current project details through project current | BR-14 |
| should show the same current project details through bare project shortcut | BR-14 |
| should list projects through project list | BR-5 |
| should list projects through project ls | BR-5 |
| should resolve explicit project lookup through project get | BR-15 |
| should resolve explicit project lookup through project info | BR-15 |
| should resolve bare project code shortcut case-insensitively | BR-15 |
| should treat lowercase list and ls as reserved list aliases | BR-17 |
| should treat LIST or LS as project-code lookup values, not list aliases | BR-17 |
| should initialize a project in the current folder through project init | BR-16, Edge-2 |

### Ticket Create (`cli/tests/e2e/ticket/create.spec.ts`)

| Test Name | Covers |
|-----------|--------|
| should create a ticket through canonical ticket create | BR-6 |
| should create a ticket through top-level create alias | BR-6 |
| should treat type and priority tokens as order-independent | BR-7 |
| should derive title from slug when no quoted title is provided | BR-8 |
| should append literal piped stdin body after generated frontmatter and H1 | BR-9, C5 |
| should skip template generation when stdin is present | BR-9 |
| should print the created key and path after create | BR-6 |
| should reject unknown create tokens with a corrective message | Edge-2 |
| should keep project-root-relative path output by default after create | BR-12, C1 |
| should avoid shell expansion or interpolation of create input data | C5 |

### Ticket Attr (`cli/tests/e2e/ticket/attr.spec.ts`)

| Test Name | Covers |
|-----------|--------|
| should update a scalar attribute through canonical ticket attr | BR-10 |
| should update a scalar attribute through top-level attr alias | BR-10 |
| should normalize accepted status aliases before persistence | BR-10 |
| should replace relation values with = | BR-10 |
| should append relation values with += and dedupe | BR-10, C2 |
| should remove relation values with -= | BR-10, C2 |
| should update multiple supported attributes in one command | BR-10 |
| should reject unsupported attr operators for scalar fields | C2, Edge-2 |
| should reject unsupported attribute keys with a corrective error | C2, Edge-2 |
| should reject missing attr arguments with a corrective error | Edge-2 |
| should keep attr values as literal data without shell interpolation | C5 |
| should print one confirmation response with the applied changes | BR-10 |

### Ticket List Enhancements (`cli/tests/e2e/ticket/list-enhancements.spec.ts`)

| Test Name | Covers |
|-----------|--------|
| should default to 10 tickets sorted newest-first | BR-4 |
| should show all tickets with --all flag | BR-4 |
| should show N tickets with --limit N | BR-4 |
| should filter by single field with exact match | BR-18 |
| should filter by single field with fuzzy match (e.g., status=impl) | BR-18 |
| should filter by single field with comma-separated values (OR within field) | BR-18 |
| should combine multiple filters with AND across fields | BR-18 |
| should show file paths only with --files | BR-4 |
| should show info without paths with --info | BR-4 |
| should support ticket ls alias | BR-4 |

### Attr Output Format (`cli/tests/e2e/ticket/attr-output.spec.ts`)

| Test Name | Covers |
|-----------|--------|
| should print pipe-separated old→new confirmation on successful update | BR-10 |
| should print multiple pipe-separated changes when updating multiple attributes | BR-10 |
| should print unchanged message and exit 0 when value is already set | BR-10 |

### CLI Color Scheme (`cli/tests/e2e/output/color-scheme.spec.ts`)

| Test Name | Covers |
|-----------|--------|
| should render ticket key in light-cyan | BR-11 |
| should render ticket title in white | BR-11 |
| should render project code in dark cyan | BR-11 |
| should render project ID in gray parentheses | BR-11 |
| should render file paths in gray | BR-11 |

### Command Guide (`cli/tests/e2e/guide.spec.ts`)

| Test Name | Covers |
|-----------|--------|
| should print full command manual with --guide at global scope | BR-19 |
| should print ticket commands only with ticket --guide | BR-19 |
| should print project commands only with project --guide | BR-19 |
| should include all registered aliases in guide output | BR-19 |

## Constraint Coverage

| Constraint ID | Test File | Tests |
|---------------|-----------|-------|
| C1 | `ticket/read.spec.ts`, `ticket/create.spec.ts` | CLI config defaults and relative-path output |
| C2 | `ticket/attr.spec.ts` | Attr operator and mutable-field validation |
| C3 | `ticket/read.spec.ts` | Color-category parity with web badge mappings |
| C4 | `ticket/read.spec.ts` | Root-up project detection for shorthand reads |
| C5 | `ticket/create.spec.ts`, `ticket/attr.spec.ts` | Literal stdin and attr value handling |
| C6 | `ticket/read.spec.ts` | No ANSI output for redirected or non-TTY execution |

## Verify

```bash
# Run the full MDT-143 CLI E2E slice
bun test cli/tests/e2e

# Run focused suites
bun test cli/tests/e2e/smoke/cli-bootstrap.spec.ts
bun test cli/tests/e2e/ticket/read.spec.ts
bun test cli/tests/e2e/project/project.spec.ts
bun test cli/tests/e2e/ticket/create.spec.ts
bun test cli/tests/e2e/ticket/attr.spec.ts
```

---
*Canonical test-plan projection: [tests.trace.md](./tests.trace.md)*
*Rendered by /mdt:tests via spec-trace*
