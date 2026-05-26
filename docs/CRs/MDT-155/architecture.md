# Architecture

## Overview

MDT-155 keeps the existing markdown pipeline intact. TicketViewer remains responsible for supplying document context, while `markdownPreprocessor` remains responsible for converting bare document references before markdown-it rendering.

## TicketViewer Source Path

`src/components/TicketViewer/index.tsx` resolves the active subdocument by comparing `selectedPath` to `filePathToApiPath(subdocument.filePath, ticketCode)`. For subdocuments, `MarkdownContent.sourcePath` must come from the matching `SubDocument.filePath`; for the root ticket document it remains `{ticketCode}.md`.

## Markdown Reference Regex

`src/utils/markdownPreprocessor.ts` narrows automatic document reference conversion to relative `.md` references:

- allowed: `requirements.md`, `requirements.trace.md#br-13`, `./docs/guide.md`, `../README.md`
- excluded: `https://example.com/file.md`, `user@example.md`, markdown already protected as a link, code blocks, inline code

The change must preserve anchor text and existing ticket-key filename handling.

## Module Boundaries

- `TicketViewer`: chooses source-path context for rendered ticket content.
- `MarkdownContent`: continues to pass source path through to `useMarkdownProcessor`.
- `markdownPreprocessor`: owns auto-link token matching and document reference conversion.
- `linkProcessor`: no runtime change required for MDT-155; existing route classification remains covered.

## Link Classification Preservation

`src/utils/linkProcessor.mdt150.test.ts` remains the regression owner for both relative `.md#anchor` hrefs and absolute `/prj/<project>/ticket/<ticket>/<subdocument>.md#anchor` routes. MDT-155 does not change `linkProcessor.ts`.

## Verification Contract

Focused tests prove the changed behavior, and `bun run fe:test` proves the existing frontend suite remains green.

## Invariants

- No changes to SmartLink rendering behavior.
- No changes to document resolution rules beyond choosing the safer source path input.
- No changes to MDT-152 quick-search test files.

## Scope Exclusions

`src/hooks/useQuickSearch.test.ts` and `tests/e2e/quick-search/modal.spec.ts` are excluded from implementation ownership for this CR.

> Architecture trace projection: [architecture.trace.md](./architecture.trace.md)
