# BDD

## Overview

The acceptance surface is covered by focused frontend tests rather than new Playwright flows. The behavior is internal to markdown source-path propagation and link classification.

## Acceptance Strategy

- Component test: opening a subdocument passes its discovered `filePath` to `MarkdownContent`.
- Unit test: standalone `.md` references are converted, while URL-like/email-like/code/link-protected values are not.
- Existing regression test: relative and absolute ticket subdocument routes with anchors classify as document links.

## Execution Notes

Use Bun frontend tests:

```bash
bun test ./src/components/TicketViewer/TicketViewer.test.tsx ./src/utils/markdownPreprocessor.mdt155.test.ts ./src/utils/markdownPreprocessor.mdt150.test.ts ./src/utils/linkProcessor.mdt150.test.ts
bun run fe:test
```

> BDD trace projection: [bdd.trace.md](./bdd.trace.md)
