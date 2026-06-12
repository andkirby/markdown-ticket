# Copy Document Path

One-click copy of a document's project-relative path to the clipboard, from any row in the Documents sidebar. Appears on hover alongside the fav star button.

## Composition

```text
FileTree (any row — file or folder)
├── Chevron icon (folders only)
├── File/Folder icon
├── Title + filename text
├── CopyPathButton (trailing, hover-visible)
└── FavStarButton (trailing, hover-visible / always if active)

FavDocuments (fav row)
├── File/Folder icon
├── Title + filename text
├── CopyPathButton (trailing, hover-visible)
└── FavStarButton (trailing, always visible — all favs are active)

RecentDocuments (recent row)
├── File icon
├── Title + filename text
└── CopyPathButton (trailing, hover-visible)
```

## Children

| Child | Component | Spec | Conditional |
|-------|-----------|------|-------------|
| CopyPathButton | `CopyPathButton.tsx` | this spec | all rows (files and folders) |
| FavStarButton | inline in `FileTree.tsx`, `FavDocuments.tsx` | `fav-star.css` | when `onToggleFavorite` provided and path ≠ `./` |
| FileTree | `src/components/DocumentsView/FileTree.tsx` | `documents-view-navigation.spec.md` | always |
| FavDocuments | `src/components/DocumentsView/FavDocuments.tsx` | `documents-view-navigation.spec.md` | when reconciled favs exist |
| RecentDocuments | `src/components/DocumentsView/RecentDocuments.tsx` | `documents-view-navigation.spec.md` | when user has opened documents |

## Source files

| Type | Path |
|------|------|
| Component | `src/components/DocumentsView/CopyPathButton.tsx` |
| Documents CSS | `src/components/DocumentsView/documents-view.css` |
| Fav star CSS | `src/styles/entities/fav-star.css` |
| Toast hook | `src/hooks/useToast.ts` |
| Sonner setup | `src/components/ui/sonner.tsx` |

## Behavior

- **Trigger**: Click `CopyPathButton` to copy the row's project-relative path (e.g. `docs/guides/setup.md`) to the system clipboard. Works on both file and folder rows.
- **Event isolation**: `CopyPathButton` calls `event.stopPropagation()` to prevent the row's `onFileSelect` handler from firing.
- **Success feedback**: Icon changes from `Copy` to `Check` (1.2s). A sonner toast fires: `success("Path copied", { description: "<path>", duration: 2000 })`.
- **Error feedback**: If `navigator.clipboard.writeText` rejects, toast `error("Copy failed", { description: "Clipboard access was denied" })`.
- **Hover-only visibility**: Both `CopyPathButton` and the inactive fav star are hidden (`opacity: 0`) by default. They appear when the parent row is hovered (via `group-hover`). Active/favorited stars are always visible.

## Layout

- Trailing-action order (left to right): `CopyPathButton`, then `FavStarButton`.
- Both trailing actions sit in a flex row after the title text.
- The parent row container must have the `group` Tailwind class for hover cascade.
- Icons are 12px (`w-3 h-3`) — smaller than the row's 16px file/folder icons — to stay quiet.
- Buttons use `p-0` and do not increase row height.

## States

### CopyPathButton

| State | Trigger | Visual Change |
|-------|---------|---------------|
| hidden | row not hovered | `opacity: 0` via `.copy-path-btn` |
| visible | row hovered (`group:hover`) | `opacity: 1` |
| hover | mouse enters button | icon color → `--foreground` |
| pressed | mouse down | `scale(0.9)` |
| copied | click success | icon → `Check` (1.2s), `--primary` color, `data-copied` attribute keeps button visible |
| focus | keyboard tab | visible focus ring (`ring-2 ring-ring rounded-sm`), button becomes visible regardless of hover |
| error | clipboard denied | no visual change on button; toast fires |

### FavStarButton (document context)

| State | Trigger | Visual Change |
|-------|---------|---------------|
| hidden | row not hovered, not favorited | `opacity: 0` via `.fav-star-btn--document` |
| visible (hover) | row hovered (`group:hover`) | `opacity: 1` |
| visible (active) | `data-active` attribute present | `opacity: 1` always |
| hover | mouse enters button | `opacity: 1` |

## Responsive

| Breakpoint | Change |
|------------|--------|
| < 640px | Same behavior; hover works via tap on mobile |
| ≥ 640px | Same behavior |

## Tokens used

| Element | Token | Usage |
|---------|-------|-------|
| icon default | `--muted-foreground` | resting state (when visible) |
| icon hover | `--foreground` | interactive state |
| icon copied | `--primary` | check icon success color |
| focus ring | `--ring` | keyboard focus outline |

## Classes used

| Element | Class | Source |
|---------|-------|--------|
| row container | `.group` (Tailwind) | `FileTree.tsx`, `FavDocuments.tsx`, `RecentDocuments.tsx` |
| copy button | `.copy-path-btn` | `documents-view.css` |
| copy icon | `.copy-path-btn__icon` | `documents-view.css` |
| copied icon | `.copy-path-btn__icon--copied` | `documents-view.css` |
| fav star button | `.fav-star-btn--document` | `fav-star.css` |
| copied state attr | `[data-copied]` on `.copy-path-btn` | `CopyPathButton.tsx` |
| favorited state attr | `[data-active]` on `.fav-star-btn--document` | `FileTree.tsx`, `FavDocuments.tsx` |

## Extension notes

- Do not add copy-on-row-click; it conflicts with document selection.
- Do not add a modifier-key variant; the dedicated button removes ambiguity.
- If keyboard shortcut copy is needed later, it should be a separate global shortcut, not overloading the row click.
- The toast description shows the path so the user can verify what was copied.
- Both trailing actions share the same hover-reveal pattern. If a third trailing action is added, follow the same `group-hover` + `opacity` convention.
