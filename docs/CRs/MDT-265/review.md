# MDT-265 final investigation and review

Scope: frontend key parsing, shared/backend parser risks, and the full frontend
verification failures. Baseline commit: bf75438f1c765b341bd72a8d88d9a029311e4ee3.
Earlier implementation changes were preserved during follow-up investigation.

| Check | Result | Evidence |
|-------|--------|----------|
| Canonical key syntax has one owner | PASS | domain-contracts/src/ticket/frontmatter.ts exports the body used by CR_CODE_PATTERN and consumers |
| Alphanumeric codes, bounded digits and whole tokens | PASS | frontend parser/SSE tests, including BAD-TP0-042.md and six-digit rejection |
| Historical CR-A001 links | PASS | linkProcessor and linkNormalization regression tests |
| Worktree branch identity has one owner | PASS | WorktreeService.extractTicketCode is reused by discovery and HEAD watcher |
| Worktree lifecycle | PASS | HEAD tests cover exact gitdir root, arbitrary folder names, new/startup removal, and duplicate-root isolation |
| Shared filename title fallback | PASS | 7 service tests cover canonical and invalid prefixes |
| HTML relative anchors | PASS | Shared .md/.html grammar and complete-filename protection before prose linking |
| Rendering tests use production behavior | PASS | Actual useMarkdownProcessor hook and its converter factory; real DOMPurify bound to JSDOM |
| Preference migration and opt-out | PASS | Existing assertions updated to ticket-card.spec.md; explicit one-time migration/opt-out test added |
| Trace navigation update | PASS | External router update is wrapped in React act; full frontend suite passes |

## Diagnosed causes and corrections

- Two tests omitted externalRefs even though ticket-card.spec.md requires adding
  it once to saved pre-feature selections. Production policy was correct. The
  corrected tests retain filtering and persistence assertions and add opt-out
  coverage.
- Eleven rendering failures came from DOMPurify under Happy DOM. A direct probe
  demonstrated lost markup and unsafe URI retention. Upstream recommends JSDOM:
  https://github.com/cure53/DOMPurify#running-dompurify-on-the-server
  JSDOM is dev-only; the test now executes the real hook and sanitizer rather
  than a copied renderer. Production browser sanitation is unchanged.
- The live HEAD watcher had a separate letters-only regex, a double-parent root
  calculation, and folder-name-based removal. It now delegates branch extraction
  to WorktreeService and retains HEAD identity through the watcher lifecycle.
- Shared title fallback used a letters-only regex. It now derives from the
  domain contract, retaining case-insensitive filename handling and H1 authority.
- Relative .html anchors previously failed the .md-only guard. The same document
  grammar now handles both supported viewer extensions, preserving URL guards.

## Verification

- Full frontend suite: 1305 pass, including document-context and whole-filename regressions.
- Shared title/worktree suites: 25 pass, 0 fail.
- Watcher boundary suites: 110 pass across six files, including lifetime races, relative metadata, duplicate-root isolation and a real chokidar case.
- Full monorepo build, changed-file TypeScript and scoped ESLint: pass.
- Meaningful rendering and XSS assertions retained; no tests skipped or removed.
- No browser E2E, deployment or server restart was performed.

The remaining letters-only DependencyGraph fast path is not a demonstrated
alphanumeric failure: its normalizeKey fallback correctly resolves TP0-042.
No dependency graph behavior was changed.

A fresh independent architect review and its resolved findings are recorded in
[architect-review.md](architect-review.md).
