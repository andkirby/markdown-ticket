# Project Edit Form — Wireframe Schema

Related spec: `specs/project-edit-form.md`

## Default State

```wireframe
┌──────────────────────────────────────────────────────────┐
│ [backdrop: bg-black/50]                                  │
│                                                          │
│   ┌──────────────────────────────────────────────────┐   │
│   │ Edit Project                                [✕] │   │
│   ├──────────────────────────────────────────────────┤   │
│   │ Project Name *                                  │   │
│   │ [Markdown Ticket                              ] │   │
│   │                                                  │   │
│   │ Project Code *                                  │   │
│   │ [MDT                         read-only        ] │   │
│   │                                                  │   │
│   │ Project Path *       [info]                     │   │
│   │ [~/workspace/markdown-ticket         ✓ locked] │   │
│   │                                                  │   │
│   │ Tickets Directory *        [?]                  │   │
│   │ [docs/CRs                    read-only        ] │   │
│   │                                                  │   │
│   │ Description                                      │   │
│   │ [Markdown ticket dashboard                    ] │   │
│   │                                                  │   │
│   │ Repository URL                                   │   │
│   │ [https://github.com/...                       ] │   │
│   ├──────────────────────────────────────────────────┤   │
│   │                         [Cancel] [Update Project]│   │
│   └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

## Variants

### Submitting

```wireframe state:project-edit-form submitting
┌──────────────────────────────────────────────────┐
│ Edit Project                                [✕] │
├──────────────────────────────────────────────────┤
│ ... fields remain visible with current values ... │
├──────────────────────────────────────────────────┤
│                             [Cancel] [Updating...]│
└──────────────────────────────────────────────────┘
```

### Success

```wireframe state:project-edit-form success
┌────────────────────────────────────────┐
│                  ✓                     │
│ Project Updated Successfully!          │
│                                        │
│        [Create Another] [Done]         │
└────────────────────────────────────────┘
```

### Mobile

```wireframe viewport:mobile
┌──────────────────────────────┐
│ [backdrop: bg-black/50]      │
│ ┌──────────────────────────┐ │
│ │ Edit Project         [✕]│ │
│ ├──────────────────────────┤ │
│ │ Project Name *          │ │
│ │ [Markdown Ticket      ] │ │
│ │ Project Code *          │ │
│ │ [MDT read-only        ] │ │
│ │ Project Path *          │ │
│ │ [/Users/... locked ✓  ] │ │
│ │ Tickets Directory *     │ │
│ │ [docs/CRs read-only   ] │ │
│ │ Description             │ │
│ │ [text area             ]│ │
│ │ Repository URL          │ │
│ │ [https://...           ]│ │
│ ├──────────────────────────┤ │
│ │ [Cancel] [Update Project]│ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

## Annotations

| Element | Token | Class | Notes |
|---------|-------|-------|-------|
| Backdrop | — | `bg-black/50` | Matches modal standard |
| Modal surface | `--card` | `bg-white dark:bg-gray-800` | Existing modal surface |
| Header/footer border | `--border` | `border-gray-200 dark:border-gray-700` | Separates fixed regions |
| Read-only fields | `--muted` | `bg-gray-50 dark:bg-gray-700 cursor-not-allowed` | Identity/filesystem fields cannot be changed |
| Success icon | green semantic utility | `bg-green-100 text-green-600` | Existing success dialog style |

## Current Implementation Notes

- Submit disables only the submit button while showing `Updating...`; form fields are not disabled during the request.
- The shared project path tooltip still includes creation-oriented global config and auto-discovery guidance in edit mode.
- The success dialog currently includes `Create Another` even when editing.
