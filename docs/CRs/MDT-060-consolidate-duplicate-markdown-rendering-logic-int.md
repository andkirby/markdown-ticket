---
code: MDT-060
title: Consolidate duplicate markdown rendering logic into single reusable component
status: Implemented
dateCreated: 2025-10-03T21:10:06.132Z
type: Technical Debt
priority: Medium
---

# Consolidate duplicate markdown rendering logic into single reusable component

# Consolidate duplicate markdown rendering logic into single reusable component

## Description

### Problem Statement
Currently, there are two separate markdown rendering implementations:
1. **TicketViewer** (`src/components/TicketViewer.tsx`) - Renders ticket content in a modal
2. **MarkdownViewer** (`src/components/DocumentsView/MarkdownViewer.tsx`) - Renders documents in the Documents view

Both implementations:
- Use the same Showdown converter configuration
- Apply the same markdown processing pipeline (Showdown → Mermaid → Prism)
- Call the same utility functions (`processMermaidBlocks`, `renderMermaid`, `highlightCodeBlocks`, `loadPrismTheme`)
- Have nearly identical prose styling classes
- Duplicate the same markdown rendering logic

### Current State
- Two separate components with duplicated code
- Different prop interfaces but similar functionality
- Risk of divergence when updating markdown features
- Harder to maintain consistency across views

### Desired State
- Single reusable markdown rendering component
- Shared between TicketViewer and DocumentsView
- Consistent rendering behavior
- Easier to maintain and extend

### Impact Areas
- `src/components/TicketViewer.tsx`
- `src/components/DocumentsView/MarkdownViewer.tsx`
- New shared component location (e.g., `src/components/shared/MarkdownRenderer.tsx`)

## Rationale

- **DRY Principle**: Eliminates code duplication and reduces maintenance burden
- **Consistency**: Ensures identical markdown rendering behavior across all views
- **Maintainability**: Single place to update markdown features (syntax highlighting, diagrams, etc.)
- **Testing**: Easier to test one component thoroughly vs. two similar components
- **Future Features**: Any new markdown features automatically work in both views

## Solution Analysis
### Approaches Considered

1. **Create Shared MarkdownRenderer Component** (Recommended)
   - Pros: Clean separation, reusable, testable
   - Cons: Requires refactoring existing components
   - Effort: Medium

2. **Extract to Custom Hook**
   - Pros: Lightweight, easy to adopt
   - Cons: Still duplicates JSX, only shares logic
   - Effort: Low

3. **Keep As-Is**
   - Pros: No work required
   - Cons: Technical debt accumulates, risk of divergence
   - Effort: None

### Recommended Approach

Create a shared `MarkdownRenderer` component with the following interface:

```typescript
interface MarkdownRendererProps {
  content: string
  className?: string
  onRenderComplete?: () => void
}
```

The component will:
- Accept raw markdown content
- Handle all processing (Showdown → Mermaid → Prism)
- Manage theme loading via `useTheme` hook
- Apply consistent prose styling
- Notify when rendering is complete (for Mermaid)

### Key Differences Between Current Implementations

**TicketViewer specifics:**
- `headerLevelStart: 3` - Headers start at h3 to avoid modal title conflicts
- Renders `<TicketAttributes>` metadata component
- Wrapped in `<Modal>` with custom header
- Only renders Mermaid when modal is open

**DocumentsView/MarkdownViewer specifics:**
- `headerLevelStart: 1` - Default header levels
- Displays file metadata (created/modified dates)
- Not in a modal, full page view
- Always renders Mermaid

### Proposed Solution

The shared `MarkdownRenderer` component should accept:
```typescript
interface MarkdownRendererProps {
  content: string
  className?: string
  headerLevelStart?: number // Allow customization (default: 1)
  onRenderComplete?: () => void
}
```

This allows each parent component to:
- **TicketViewer**: Pass `headerLevelStart={3}` and handle metadata/modal separately
- **DocumentsView**: Use default `headerLevelStart={1}` and handle file metadata separately

The markdown **content rendering** is shared, while **metadata display** and **container structure** remain in parent components.
## Implementation

### Step 1: Create Shared Component

1. Create `src/components/shared/MarkdownRenderer.tsx`:
   - Accept `content`, `className`, `onRenderComplete` props
   - Initialize Showdown converter (same config as current)
   - Use `useTheme` hook to load Prism theme
   - Process markdown through Showdown → Mermaid → Prism pipeline
   - Render with consistent prose classes
   - Trigger `onRenderComplete` callback after Mermaid renders

### Step 2: Refactor TicketViewer

1. Remove markdown processing logic from `TicketViewer.tsx`
2. Import and use `<MarkdownRenderer content={ticket.content} />`
3. Remove Showdown converter, processing functions, and theme loading
4. Keep ticket metadata display and modal structure

### Step 3: Refactor DocumentsView/MarkdownViewer

1. Update `MarkdownViewer.tsx` to use shared component
2. Keep file loading logic and metadata display
3. Replace markdown processing with `<MarkdownRenderer content={content} />`
4. Remove duplicate Showdown converter and processing logic

### Step 4: Testing

1. Verify syntax highlighting works in both views
2. Verify Mermaid diagrams render correctly
3. Test dark/light mode switching
4. Verify all markdown features (tables, links, code blocks, etc.)
5. Test in both TicketViewer modal and DocumentsView

## Acceptance Criteria

- [ ] Single `MarkdownRenderer` component created in `src/components/shared/`
- [ ] TicketViewer uses shared MarkdownRenderer component
- [ ] DocumentsView/MarkdownViewer uses shared MarkdownRenderer component
- [ ] All markdown features work identically in both views (syntax highlighting, Mermaid, tables, links)
- [ ] Dark/light theme switching works correctly
- [ ] No visual regressions in either view
- [ ] Code duplication eliminated
- [ ] Showdown converter configuration is identical between uses

## Additional Notes

### Benefits
- Reduces codebase by ~50 lines of duplicated logic
- Future markdown features only need to be added once
- Easier to maintain consistent styling
- Better testability with single component

### Risks
- May uncover subtle differences between current implementations
- Requires careful testing to avoid regressions
- Need to ensure both use cases are properly handled

### Related Tickets
- MDT-057: Syntax highlighting implementation (just completed)
- MDT-049: Mermaid diagram rendering
