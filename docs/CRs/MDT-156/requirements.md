# Requirements: MDT-156

**Source**: [MDT-156](../MDT-156-security-hardening.md)
**Generated**: 2026-05-18

## Overview

MDT-156 hardens existing unauthenticated local/server surfaces without introducing the authentication model owned by MDT-157. The requirements focus on observable security behavior: CORS consistency for streams, bounded filesystem disclosure, MCP HTTP production defaults, backend headers, dependency posture, and tracked-file secret hygiene.

Use `requirements.trace.md` for canonical requirement rows, routes, and summaries. This file records scope framing, semantic decisions, and carryover obligations for architecture/tests/tasks.

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | architecture.md CORS boundary, tests.md SSE/devtools CORS cases, tasks.md backend CORS implementation |
| C2 | architecture.md compatibility rules, tests.md no-Origin request cases |
| C3 | architecture.md filesystem root policy decision before implementation |
| C4 | architecture.md canonical path utility, tests.md symlink/encoded/Unicode path cases |
| C5 | architecture.md module/API boundary section |
| C6 | architecture.md deployment compatibility, tests.md proxy compatibility notes if changed |
| C7 | architecture.md scope boundaries with MDT-157 |
| C8 | tests.md secret scan evidence, tasks.md remediation step if scan finds tracked secrets |
| C9 | architecture.md MCP rate-limit policy decision |

## Non-Ambiguity Table

| Concept | Final Semantic (chosen truth) | Rejected Semantic | Why |
|---------|-------------------------------|-------------------|-----|
| CORS source of truth | REST, SSE, and devtools streams use one allowed-origin decision. | Keep wildcard stream headers because browser CORS still applies elsewhere. | Wildcard stream headers are the reported vulnerability. |
| No-Origin requests | Requests without `Origin` remain allowed for curl, server-to-server, and local tools. | Treat no-Origin as unauthorized. | The CR explicitly requires this compatibility. |
| Filesystem authorization | Authorization is based on canonical resolved containment before returning directory/existence data. | Check after stat/read or rely on string `..` filtering only. | Prevents host reconnaissance and symlink bypasses. |
| Allowed filesystem roots | Decision required in architecture; likely discovery search paths plus configured project roots. | Hard-code only project roots in requirements. | New-project browsing may need discovery roots before a project is configured. |
| MCP production hardening | Production Docker enables origin validation and rate limiting by default; stdio remains unaffected. | Require auth everywhere or change stdio behavior. | Authentication is deferred to MDT-157; stdio is local-only by design. |
| Devtools production exposure | Decision required in architecture: production-disabled by default or explicit `DEVTOOLS_ENABLED` opt-in. | Leave devtools exposed whenever routes are registered. | Logs/session controls are debug surfaces, not production API behavior. |
| Config/maintenance endpoints | Decision required in architecture: minimum MDT-156 filtering/gating or explicit MDT-157 deferral. | Ignore endpoint exposure because auth is out of scope. | The assess stage identified immediate information-disclosure risk. |
| Secret scan scope | Tracked-file secret removal is in MDT-156; broader rotation policy is deferred. | Treat all secret lifecycle work as MDT-156. | Ticket success condition requires no tracked secrets, not full incident response. |
| Dependency target | Production/runtime critical and high vulnerabilities are the MDT-156 target. | Require zero advisories across all dev/test tooling. | Audit notes distinguish runtime risk from dev-only advisories. |

## Configuration

| Setting | Description | Default | When Absent |
|---------|-------------|---------|-------------|
| `ALLOWED_DOMAINS` | Existing backend allowlist extension used for browser origins. | Localhost development origins only. | Only built-in local origins are accepted for browser CORS. |
| `MCP_SECURITY_ORIGIN_VALIDATION` | Enables MCP HTTP origin validation. | Production Docker: enabled; local/dev: may remain configurable. | Architecture must define safe fallback without breaking stdio. |
| `MCP_ALLOWED_ORIGINS` | Allowed MCP HTTP browser origins. | Deployment-specific. | Architecture must define whether startup fails closed or uses documented local defaults. |
| `MCP_SECURITY_RATE_LIMITING` | Enables MCP HTTP rate limiting. | Production Docker: enabled. | Architecture must define local/dev behavior and caller-key semantics. |
| `DEVTOOLS_ENABLED` | Candidate opt-in for devtools exposure outside development. | Decision needed. | Architecture must choose disabled-in-production or explicit opt-in behavior. |

## Decision Needed Before Architecture Completes

| Decision | Options | Requirement IDs |
|----------|---------|-----------------|
| Filesystem allowed roots | Project roots only; discovery roots only; discovery roots plus project roots. | C3, BR-2.1, BR-2.2, BR-2.3 |
| Devtools production policy | Disable when `NODE_ENV=production`; require explicit `DEVTOOLS_ENABLED=true`; both. | BR-7.1 |
| Config/maintenance exposure | Minimum filtering/gating in MDT-156; defer full authorization to MDT-157 with documented residual risk. | BR-8.1 |
| MCP session visibility | Hide/deny `/sessions` outside development; allow behind explicit security control. | BR-3.4 |
| MCP rate-limit key | Caller-aware in MDT-156; defer to MDT-157/follow-up. | C9 |
| Dependency audit threshold | Production/runtime high+critical only; all dependencies high+critical. | BR-5.1, Edge-3 |

## Validation Summary

- Requirements scope: full, from CR section `Requirements Scope`.
- Canonical requirements written through `spec-trace requirement upsert`.
- Validation: `spec-trace validate MDT-156 --stage requirements --format json` returned no issues.
- Trace projection: `docs/CRs/MDT-156/requirements.trace.md`.

---
Use `requirements.trace.md` for canonical requirement rows and route summaries.

## Reviewer Gap Addendum

- `C10` requires all existing unit and E2E suites to pass after MDT-156 changes, with any environment-specific exclusions documented.
- `BR-9.1` requires Docker/MCP production defaults and required environment variables to be documented in relevant Docker/MCP docs or compose comments.
- `BR-3.5` preserves MCP HTTP compatibility for clients using no `Origin` or configured allowed origins.
- `BR-9.2` requires migration guidance for production Docker MCP security behavior changes.
- `requirements.trace.md` now includes a source reference matrix mapping requirement groups to ticket acceptance criteria, security-audit findings, plan slices, and assess mismatch points.
