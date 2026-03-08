---
code: MDT-130
status: Implemented
dateCreated: 2026-03-02T19:14:42.300Z
type: Technical Debt
priority: Medium
---

# Add markdown rendering E2E coverage

## 1. Description
The frontend markdown rendering pipeline currently lacks focused end-to-end coverage for rich markdown output in ticket detail and documents views. Recent investigation around nested list rendering showed that regressions can slip through because existing E2E tests only assert that some markdown HTML exists, not that critical structures render correctly.

Current state:
- `tests/e2e/ticket/detail.spec.ts` checks only for the presence of generic markdown HTML.
- `tests/e2e/documents/view.spec.ts` validates that content appears, but not specific rendered constructs.
- Markdown rendering behavior in `src/components/MarkdownContent.tsx` includes preprocessing, Showdown conversion, Mermaid transformation, syntax highlighting, and sanitization, which creates multiple regression points.

Desired state:
- Add targeted Playwright E2E coverage for markdown rendering in ticket detail and documents views.
- Verify nested lists, Mermaid diagrams, tables, fenced code blocks, and blockquotes render as expected.
- Use isolated test data that exercises the shared markdown rendering pipeline in realistic UI flows.

Business and technical justification:
- Markdown rendering is a core user-facing behavior.
- Regressions in rendering are hard to catch through shallow smoke tests.
- Focused E2E coverage reduces risk when changing markdown preprocessing, parser configuration, sanitization, or Mermaid handling.

## 2. Rationale
This change is necessary because the application relies on a layered markdown pipeline with behavior that is sensitive to parser options and preprocessing transforms. Adding explicit UI-level verification closes an important gap between low-level logic changes and the user-visible rendered output. It aligns with project goals around reliable markdown-based ticket and document workflows.

## 3. Solution Analysis
Evaluated alternatives:
- Keep only unit tests around preprocessing: insufficient because rendering regressions can occur after preprocessing, during HTML conversion, sanitization, or Mermaid enhancement.
- Expand existing smoke assertions slightly: better than current state, but still too broad and likely to miss structural regressions.
- Add focused Playwright specs with purpose-built markdown fixtures: selected because it verifies actual DOM output in the running application with manageable maintenance cost.

Selected approach:
- Add dedicated E2E tests in the existing Playwright structure.
- Use custom project and content fixtures to exercise ticket detail and document rendering.
- Assert rendered DOM structure for nested lists and presence of Mermaid SVG output, tables, blockquotes, and code blocks.

Rejected options:
- Snapshot-heavy tests were rejected because they are brittle and make failures harder to interpret.
- Parser replacement or broader rendering refactors are out of scope for this CR.

## 4. Implementation Specification
- Create Playwright specs in the appropriate `tests/e2e/` feature folders.
- Build isolated test projects with markdown content that includes:
  - nested unordered lists
  - Mermaid fenced code blocks
  - markdown tables
  - fenced code blocks
  - blockquotes
- For ticket coverage, create a test CR and open its detail view.
- For document coverage, write a markdown file into the isolated project docs path and open it in documents view.
- Assert DOM structure rather than raw source text where meaningful.
- Reuse existing fixtures, helpers, and selectors where possible.
- Keep tests targeted and deterministic.

Testing requirements and success criteria:
- New Playwright specs pass in Chromium.
- Tests prove nested list structure is nested rather than flattened.
- Tests prove Mermaid fenced blocks render to diagram output in the UI.
- Tests verify at least a few additional markdown constructs beyond lists and Mermaid.

## 5. Acceptance Criteria
- A CR exists documenting the markdown rendering E2E coverage work.
- Ticket detail view has Playwright coverage for nested lists, Mermaid, and additional markdown constructs.
- Documents view has Playwright coverage for the same rendering pipeline behaviors.
- Tests use isolated test data and do not depend on user projects.
- New tests pass in the supported Playwright workflow.