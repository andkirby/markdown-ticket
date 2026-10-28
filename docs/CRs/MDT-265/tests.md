# Tests: MDT-265

TEST-1 through TEST-5 are canonical unit-test plans (see tests.trace.md).
Add regression tests before runtime edits for alphanumeric projects, five-digit
keys, invalid lengths and partial tokens, relative paths and anchors, HTML
subdocuments, code protection, legacy links and SSE event identity.

Acceptance smoke: execute the new markdown and link tests against the real
preprocessor/classifier. This scoped parser correction adds no UI surface;
browser E2E is not required for this task. Run the complete frontend unit suite
and frontend build, plus changed-file TypeScript and lint checks.

Document coverage includes anchored .md and .html references, inline HTML spans,
and absolute HTML routes. The follow-up fixes the former relative HTML-anchor
guard and protects whole ticket-shaped HTML filenames before prose conversion.

Review follow-up: TEST-1 also requires whole-token filename protection; a suffix
such as TP0-042.md inside BAD-TP0-042.md must never become a partial ticket link.

Follow-up TEST-6–TEST-12 cover WorktreeService branch identity, shared title
fallback, HEAD watcher add/remove and exact root, real-hook sanitation through
JSDOM, migration/opt-out, Settings serialization and act-wrapped navigation.
Keep rendering/XSS assertions and replace only their duplicated test pipeline.
The HTML-anchors limitation is now explicitly in scope under C6.
Watcher coverage also locks first-root selection for duplicates, including
metadata-absence fallback: HEAD ownership comes from the selected root's own
Git pointer rather than a ticket-only lookup or the triggering duplicate.

Architect review adds deferred-discovery tests for HEAD unlink, stopProject,
global stop, old queued callbacks and initial discovery. Shutdown tests cover
same-project replacement, similar project IDs, and exclusion-state restart.
Document-context HTML references preserve full paths with and without an index.
