# Architecture: MDT-077

**Source**: [MDT-077](../MDT-077.md)
**Generated**: 2026-02-08

## Overview

Consistent project management across CLI, Web UI, and MCP interfaces using Domain-Driven Design. Centralizes business logic in shared services, implements three-strategy configuration (global-only, project-first, auto-discovery) via factory pattern, and enforces single configuration class (`LocalProjectConfig`) with repository-based persistence.

## Constraint Carryover

| Constraint ID | Enforcement |
|---------------|-------------|
| C1 (Legacy Config) | `ProjectValidator` rejects non-spec fields, no migration code |
| C2 (ProjectConfig Removal) | Delete `ProjectConfig` class, use `LocalProjectConfig` only |
| C3 (Shared API Usage) | Use `ConfigurationGenerator.generateMdtConfig` for all config generation |
| C4 (Repository Pattern) | `ConfigurationRepository` is single source for all TOML writes |
| C5 (Code Format) | `CodeGenerator.generateCodeFromName()` + `ProjectValidator.validateCode()` |
| C6 (Test Coverage) | CLI test suite targets >90% coverage |
| C7 (Concurrency) | `ConfigurationRepository` uses file locking/version checks |
| C8 (Interface Consistency) | All interfaces route through `ProjectApplicationService` |
| C9 (Path Security) | `ProjectApplicationService` validates paths before filesystem operations |

## Pattern

**Domain-Driven Design (DDD) with Factory Strategy Pattern** — Aligns with existing domain model while providing clear aggregate boundaries.

The three-strategy configuration uses a factory that creates strategy objects based on deployment flags. All interfaces route through `ProjectApplicationService`, ensuring consistent business logic execution. Configuration persistence flows through `ConfigurationRepository`, enforcing the repository pattern for all TOML I/O.

## Key Dependencies

| Capability | Decision | Rationale |
|------------|----------|-----------|
| Schema validation | Zod (domain-contracts) | Type-safe runtime validation for Project shapes |
| Business validation | Custom (ProjectValidator) | Uniqueness checks, filesystem access, code generation |
| TOML parsing | `toml` npm package | Established in codebase via `shared/utils/toml.ts` |
| CLI parsing | Commander.js | Existing CLI standard in project |

## Runtime Prerequisites

| Dependency | Type | Required | When Absent |
|------------|------|----------|-------------|
| `PROJECT_CODE` | config value | Yes | Project code generation fails, CLI exits with validation error |
| `TICKETS_PATH` | config value | Yes | Ticket path resolution fails, project creation rejected |
| `~/.config/markdown-ticket/projects/` | directory | Yes | Global registry unavailable, global-only mode fails |
| `.mdt-config.toml` | file | Yes* | Local config required for project-first/auto-discovery modes |
| Node.js fs module | runtime | Yes | All file operations fail with error 1 |

*Not required for global-only mode.

## Error Philosophy

Validation failures exit with code 2 and display specific field errors. Not found exits with code 3 and suggests available projects. All interfaces use `ProjectErrorHandler` for consistent error formatting. Configuration write failures preserve original state and report exact failure location.

## Structure

```
cli/
├── src/
│   ├── commands/
│   │   ├── project/
│   │   │   ├── index.ts              → Command registration and routing
│   │   │   ├── create.ts             → Create project command
│   │   │   ├── list.ts               → List projects command
│   │   │   ├── update.ts             → Update project command
│   │   │   ├── delete.ts             → Delete project command
│   │   │   ├── enable-disable.ts     → Enable/disable command
│   │   │   └── validate.ts           → Validation command
│   │   └── index.ts                  → CLI entry point
│   ├── handlers/
│   │   ├── ProjectCLIHandler.ts      → CLI-specific logic
│   │   └── index.ts
│   └── index.ts                      → CLI main entry

shared/
├── services/
│   ├── ProjectApplicationService.ts  → Use case orchestration
│   ├── ConfigurationStrategyFactory.ts → Strategy factory
│   └── project/
│       ├── ProjectCacheService.ts    → TTL-based caching
│       ├── ProjectFileSystemService.ts → Mockable file operations
│       ├── ProjectConfigService.ts   → Local config management
│       ├── ProjectDiscoveryService.ts → Project scanning and registration
│       ├── ProjectRegistry.ts        → Global registry operations
│       └── ProjectScanner.ts         → Auto-discovery by scanning
├── validation/
│   ├── ProjectValidator.ts           → Centralized validation
│   └── index.ts
├── io/
│   ├── ConfigurationRepository.ts    → All TOML I/O operations
│   └── index.ts
├── generation/
│   ├── CodeGenerator.ts              → Project code generation
│   └── index.ts
└── errors/
    ├── ProjectErrorHandler.ts        → Consistent error handling
    └── index.ts

domain/
├── Project.ts                        → Project aggregate root
├── LocalProjectConfig.ts             → Configuration value objects
├── strategies/
│   ├── IConfigurationStrategy.ts     → Strategy interface
│   ├── GlobalOnlyStrategy.ts         → Global-only implementation
│   ├── ProjectFirstStrategy.ts       → Project-first implementation
│   ├── AutoDiscoveryStrategy.ts      → Auto-discovery implementation
│   └── index.ts
└── index.ts
```

## Module Boundaries

| Module | Owns | Must Not |
|--------|------|----------|
| `cli/src/commands/project/` | Command parsing, user interaction | Business logic, direct file I/O |
| `cli/src/handlers/` | CLI-specific request/response mapping | Domain rules, persistence |
| `shared/services/ProjectApplicationService.ts` | Business workflows, use case coordination | Direct file I/O, CLI concerns |
| `shared/services/ConfigurationStrategyFactory.ts` | Strategy selection and creation | Business logic, persistence |
| `shared/validation/ProjectValidator.ts` | Validation constraints (stateless) | File I/O, business rules |
| `shared/io/ConfigurationRepository.ts` | All TOML read/write operations | Business rules, validation |
| `shared/generation/CodeGenerator.ts` | Project code generation (pure functions) | File I/O, validation |
| `shared/errors/ProjectErrorHandler.ts` | Error message formatting, exit codes | Business logic |
| `domain/Project.ts` | Aggregate root, invariants | Persistence details |
| `domain/strategies/` | Strategy-specific config behavior | Cross-strategy logic |

## Extension Rule

To add new CLI command: create file in `cli/src/commands/project/`, add registration in `index.ts`, use `ProjectApplicationService` for business logic.

To add new configuration strategy: create in `domain/strategies/`, implement `IConfigurationStrategy` interface, register in `ConfigurationStrategyFactory`.

To add new validation rule: add method to `ProjectValidator.ts`, call from `ProjectApplicationService` before persistence.

---
*Generated by /mdt:architecture*
