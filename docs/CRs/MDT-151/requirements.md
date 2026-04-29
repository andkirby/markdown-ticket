# Requirements: MDT-151

**Source**: [MDT-151](../MDT-151-harden-path-resolution.md)
**Generated**: 2026-04-29

## Overview

Harden the path resolution layer for public deployment. The system currently trusts all path inputs (subdocument names, config paths) because it was designed as a local-only tool. Moving to public/remote deployment means HTTP users are untrusted — path traversal exploits are realistic. This CR adds a containment boundary between resolved file paths and their intended directory roots without changing the API contract.

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | architecture.md (Runtime Prereqs), tasks.md (Verify) |
| C2 | tests.md (regression suite), tasks.md (Verify) |
| C3 | architecture.md (Invariants), tests.md (API contract tests) |

## Non-Ambiguity Table

| Concept | Final Semantic (chosen truth) | Rejected Semantic | Why |
|---------|-------------------------------|-------------------|-----|
| Path traversal | Any subDocName that resolves outside ticketDir after decoding and normalization | Only literal `..` segments | Express decodes `%2F` before routing; must validate after decoding |
| Rejection status | 404 for rejected paths | 403 | 404 avoids information leakage about directory structure |
| Symlink default | Not followed (deny by default) | Followed with post-check | Default-deny is safer; explicit opt-in via config |
| allowSymlinks scope | Per-project config in `.mdt-config.toml` | Global config | Per-project aligns with existing config model; different projects have different trust levels |
| ticketsPath validation timing | At config load time | At each request | Fail fast on bad config; no runtime cost per request |
| Valid subDocName characters | Alphanumeric, hyphens, underscores, forward slash (for namespaced paths), dots (for file extension notation) — but NOT `..` segments | Any string | Whitelist approach is safer than blacklist for security; `..` explicitly blocked at input validation |

## Configuration

| Setting | Description | Default | When Absent |
|---------|-------------|---------|-------------|
| `project.allowSymlinks` | Whether to follow symlinks inside ticketDir with containment check | `false` | Symlinks not followed |


---
Use `requirements.trace.md` for canonical requirement rows and route summaries.
