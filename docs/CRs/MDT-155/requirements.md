# Requirements: MDT-155

**Source**: [MDT-155](../MDT-155-mdt-150-harden.md)
**Generated**: 2026-05-22

## Overview

MDT-155 hardens the MDT-150 markdown link path without changing SmartLink rendering or document resolution semantics. The work focuses on using discovered subdocument metadata for source paths and narrowing automatic `.md` reference conversion.

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | architecture.md, tests.md, tasks.md |
| C2 | architecture.md, tests.md, tasks.md |
| C3 | architecture.md, tasks.md |
| C4 | tests.md, tasks.md |

## Non-Ambiguity Table

| Concept | Final Semantic | Rejected Semantic | Why |
|---------|----------------|-------------------|-----|
| Subdocument sourcePath | Use the selected `SubDocument.filePath` when available | Rebuild from selected API path interpolation | `filePath` is the discovered source-of-truth path. |
| Auto-linked `.md` reference | Standalone relative markdown file token with optional `#anchor` | Any non-space token ending in `.md` | Broad matching risks false positives outside intended markdown refs. |
| Relative `.md#anchor` href classification | Document link with anchor preserved | Unknown/broken link | Existing SmartLink behavior must stay stable. |
| MDT-152 files | Do not modify as part of MDT-155 | Move or rewrite files in this CR | Scope only requires they stay out of this diff. |
| Regression command | Existing frontend Bun suite remains green | Only focused tests run | The CR explicitly asks for all existing tests to keep passing. |

## Review Notes

> Requirements trace projection: [requirements.trace.md](./requirements.trace.md)
