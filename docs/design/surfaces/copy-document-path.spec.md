# Copy Document Path

One-click copy of a document's project-relative path to the clipboard, from any file row in the Documents sidebar.

## Composition

```text
FileTree (file row)
├── File icon
├── Title + filename text
├── CopyPathButton (trailing action)
└── FavStarButton (trailing action)

FavDocuments (fav row)
├── File/Folder icon
├── Title + filename text
├── CopyPathButton (trailing action)
└── FavStarButton (trailing action)

RecentDocuments (recent row)
├── File icon
├── Title + filename text
└── CopyPathButton (trailing action)
```

## Children

| Child | Component | Spec | Conditional |
|-------|-----------|------|-------------|
| CopyPathButton | inline in `FileTree.tsx`, `FavDocuments.tsx`, `RecentDocuments.tsx` | this spec | on file-type rows only |
| FileTree | `src/components/DocumentsView/FileTree.tsx` | `documents-view-navigation.spec.md` | always |
| FavDocuments | `src/components/DocumentsView/FavDocuments.tsx` | `documents-view-navigation.spec.md` | when reconciled favs exist |
| RecentDocuments | `src/components/DocumentsView/RecentDocuments.tsx` | `documents-view-navigation.spec.md` | when user has opened documents |

## Source files

| Type | Path |
|------|------|
| File tree | `src/components/DocumentsView/FileTree.tsx` |
| Favs | `src/components/DocumentsView/FavDocuments.tsx` |
| Recent | `src/components/DocumentsView/RecentDocuments.tsx` |
| Toast hook | `src/hooks/useToast.ts` |
| Sonner setup | `src/components/ui/sonner.tsx` |
| Documents CSS | `src/components/DocumentsView/documents-view.css` |
| Navigation spec | `docs/design/surfaces/documents-view-navigation.spec.md` |

## Behavior

- Clicking `CopyPathButton` copies the file's project-relative path (e.g. `docs/guides/setup.md`) to the system clipboard.
- The copied path uses forward slashes and excludes leading `./`.
- On success, a sonner toast fires: `success("Path copied", { description: "docs/guides/setup.md" })` with duration 2000ms.
- `CopyPathButton` calls `event.stopPropagation()` to prevent the row's `onFileSelect` handler from firing.
- `CopyPathButton` does not render on folder rows — only file-type rows.
- The button is always visible (not hover-only) to ensure discoverability and accessibility.

## Layout

- `CopyPathButton` sits in the trailing-action zone of the file row, before the fav star button when both are present.
- Row trailing-action order (left to right): `CopyPathButton`, then `FavStarButton`.
- The button uses the same compact inline sizing as the fav star button (`w-4 h-4` icon, `p-0` button).
- The button must not increase the height of the row beyond the existing row height.
- On rows without a fav star (read-only, or synthetic root `./`), `CopyPathButton` still appears on file rows.

## States

| State | Trigger | Visual Change |
|-------|---------|---------------|
| default | file row renders | Copy icon visible at `--muted-foreground` color, opacity 0.5 |
| hover | mouse enters button | opacity 1, `--foreground` color |
| pressed | mouse down | opacity 0.7, brief scale(0.92) |
| copied | click success | icon briefly changes to `Check` (1.2s), then reverts to `Copy` |
| focus | keyboard tab to button | visible focus ring (`ring-2 ring-ring rounded-sm`) |
| clipboard denied | `navigator.clipboard.writeText` rejects | toast `error("Copy failed", { description: "Clipboard access was denied" })` |

## Responsive

| Breakpoint | Change |
|------------|--------|
| < 640px | Same behavior; button remains visible in mobile document list |
| ≥ 640px | Same behavior |

## Tokens used

| Element | Token | Usage |
|---------|-------|-------|
| icon default | `--muted-foreground` | resting state |
| icon hover | `--foreground` | interactive state |
| icon copied | `--primary` | check icon success color |
| focus ring | `--ring` | keyboard focus outline |

## Classes used

| Element | Class | Source |
|---------|-------|--------|
| copy button | `.copy-path-btn` | `documents-view.css` |
| copy icon | `.copy-path-btn__icon` | `documents-view.css` |
| copied icon | `.copy-path-btn__icon--copied` | `documents-view.css` |
| fav star button | `.fav-star-btn`, `.fav-star-btn--document` | `fav-star.css` |
| file row | inline Tailwind in FileTree | `FileTree.tsx` |

## Extension notes

- Do not add copy-on-row-click; it conflicts with document selection.
- Do not add copy to folder rows; folder paths are ambiguous (trailing slash conventions differ).
- Do not add a modifier-key variant; the dedicated button removes ambiguity.
- If keyboard shortcut copy is needed later, it should be a separate global shortcut, not overloading the row click.
- The toast description shows the path so the user can verify what was copied.
