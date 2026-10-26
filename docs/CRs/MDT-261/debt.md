# MDT-261 Technical Debt Analysis

## Scope and Findings

Reviewed canonical schemas, catalog/projections, pure detector, staged adapter, thin CLI/hook and creation consumers against approved ownership. No blocking structural debt identified before independent completion review.

- One detector and shared message constructor; no copied placeholder policy in CLI, MCP, HTTP, browser or shell.
- File templates are checked generated projections of the compiled catalog; the separate legacy registry is compatibility data, not another generator.
- Creation diagnostics remain operation metadata. Legacy entity API and HTTP result fields are preserved; formatter provenance does not alter cloud coordinator drafts or identity.
- The Git adapter uses a limited existing-format identity/status scalar extractor because importing MarkdownService would trigger configuration writes. Tests cover quoted scalars/comments, identity conflicts and staged-only behavior. A broader frontmatter parser refactor is unnecessary for this ticket.

## Deferred Distribution

The external shared-hooks repository and other consuming projects remain unchanged. Distribution requires the recorded local CLI/build contract and version compatibility evidence plus a separate consumer verification. This is the agreed rollout boundary, not missing local enforcement.

## Remaining Limits

The guard detects deterministic scaffolding rather than semantic prose quality. Explicit custom template instructions require the documented markers. Fresh live BB/DSH host discovery was not rerun because plugin runtime code is unchanged; real CLI-backed runner and adapter preservation checks cover the changed output.

## Independent Review Follow-Ups Resolved

Existing development-guide template instructions now point to the authored catalog and compile/generate/check sequence. The staged scalar extractor matches existing delimiter/key whitespace normalization, with LF/CRLF and spaced-key regression coverage. CLI human formatting avoids repeating the correction already present in the canonical message. Docker checker inputs are explicitly copied/retained; images are not claimed executed.
