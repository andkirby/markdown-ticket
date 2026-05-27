# Documents Path Selector

Modal for choosing project-relative folders and Markdown files that should appear in Documents View.

## Composition

```text
PathSelector
├── Header
│   ├── Title
│   ├── Description
│   ├── MaxDepthMeta
│   └── TicketPathInfoTooltip
├── TreeToolbar
│   ├── ExpandAllButton
│   └── CollapseAllButton
├── PathSelectionTree
│   ├── FolderRow[chevron + checkbox + label]
│   └── FileRow[spacer + checkbox + label]
└── Footer
    ├── SelectedCount
    ├── CancelButton
    └── SaveSelectionButton
```

## Children

| Child | Component | Conditional |
|-------|-----------|-------------|
| PathSelector | `src/components/DocumentsView/PathSelector.tsx` | when owner/admin configures document paths |
| Tooltip | `src/components/ui/tooltip.tsx` | header info icon |
| ScrollArea | `src/components/ui/scroll-area.tsx` | tree body |
| Button | `src/components/ui/Button.tsx` | toolbar and footer actions |

## Layout

- Modal uses tight spacing: header/footer `px-4 py-3`, body `p-4`.
- Header title and description stay left aligned; metadata sits below in compact muted text.
- Info help is an icon-only button next to metadata, not visible paragraph copy.
- Tree toolbar is a single compact row above the bordered tree.
- Tree rows keep a stable height and indent by depth; chevrons do not resize rows.
- Footer keeps selected count left and actions right.

## States

| State | Trigger | Visual Change |
|-------|---------|---------------|
| default | modal opens with no nested selections | root rows visible, all folders collapsed |
| selected nested path | modal opens with `aa/bb/cc` selected | `aa` and `aa/bb` expand so `cc` is visible; `cc` stays collapsed |
| folder expanded | user clicks folder chevron | folder children render below the row |
| folder collapsed | user clicks expanded chevron | descendant rows hide; selected-descendant tint remains on ancestor |
| expand all | user selects toolbar action | all folder descendants render |
| collapse all | user selects toolbar action | all folders collapse |
| loading | tree request pending | centered loading text in tree area |
| empty | tree response has no rows | bordered empty message |
| error | tree request fails | bordered destructive message |
| info tooltip | user hovers/focuses info icon | tooltip shows configured tickets path exclusion copy |

## Tokens used

| Element | Token | Usage |
|---------|-------|-------|
| text | `--foreground` | title, row labels |
| muted text | `--muted-foreground` | description, count, metadata |
| border | `--border` | tree frame and section dividers |
| hover row | `--accent` | row hover background |
| selected descendant | `--primary` | folder label with selected child |
| error text | `--destructive` | error state |
| focus ring | `--ring` | icon and button focus |

## Classes used

| Element | Class | Source |
|---------|-------|--------|
| Modal sections | Tailwind inline utilities | `src/MODALS.md` tight layout |
| Tree rows | Tailwind inline utilities | local component pattern |
| Tooltip trigger/content | existing tooltip primitives | `src/components/ui/tooltip.tsx` |

## Extension notes

- Do not hardcode `docs/CRs`; use the configured tickets path from project config.
- Do not select folders when the chevron is clicked.
- On first load, expand ancestors of configured selected paths only; do not expand the selected folder itself.
- Keep tree expansion local to the open modal session.
- Keep the path selector separate from Documents View navigation tree preferences.
