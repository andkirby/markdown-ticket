---
code: MDT-049
title: Add Mermaid diagram rendering support in ticket and document views
status: Implemented
dateCreated: 2025-09-28T21:35:32.758Z
type: Feature Enhancement
priority: Medium
description: Integrate Mermaid.js library to automatically convert Mermaid code blocks into interactive diagrams within ticket content and document views. This will enhance visual documentation capabilities for flowcharts, sequence diagrams, and other technical diagrams.
rationale: Visual diagrams significantly improve documentation clarity and technical communication. Adding Mermaid support allows users to create flowcharts, sequence diagrams, and other visual elements directly in markdown without external tools.
---


# Add Mermaid diagram rendering support in ticket and document views

## 1. Description

### Problem Statement
Integrate Mermaid.js library to automatically convert Mermaid code blocks into interactive diagrams within ticket content and document views. This will enhance visual documentation capabilities for flowcharts, sequence diagrams, and other technical diagrams.

### Current State
Markdown content in tickets and documents displays raw Mermaid code blocks as plain text without any visual rendering.

### Desired State
Mermaid code blocks are automatically converted to interactive SVG diagrams with fullscreen viewing capabilities and zoom/pan functionality.

### Rationale
Visual diagrams significantly improve documentation clarity and technical communication. Adding Mermaid support allows users to create flowcharts, sequence diagrams, and other visual elements directly in markdown without external tools.

### Impact Areas
- Frontend
- Ticket Viewer
- Document Viewer
- Markdown Rendering

## 2. Solution Analysis

### Approaches Considered
- **Client-side rendering with Mermaid.js**: Chosen approach for real-time rendering
- **Server-side pre-rendering**: Rejected due to complexity and maintenance overhead
- **External service integration**: Rejected due to security and dependency concerns

### Chosen Approach
Integrate Mermaid.js library directly into the frontend with custom processing pipeline and fullscreen capabilities.

## 3. Implementation Specification

### Technical Requirements
- Install and configure Mermaid.js library
- Create markdown processing pipeline to detect and convert Mermaid code blocks
- Implement automatic diagram rendering in TicketViewer and MarkdownViewer components
- Add fullscreen viewing capability with zoom/pan functionality
- Support both light and dark themes
- Ensure cross-browser compatibility

### Components Modified
- `src/utils/mermaid.ts`: Core mermaid processing and rendering logic
- `src/components/TicketViewer.tsx`: Integration in ticket modal
- `src/components/DocumentsView/MarkdownViewer.tsx`: Integration in document view
- `src/components/UI/FullscreenWrapper.tsx`: Reusable fullscreen component

## 4. Acceptance Criteria

✅ Mermaid code blocks in tickets automatically render as diagrams
✅ Mermaid code blocks in documents automatically render as diagrams
✅ Diagrams support both light and dark themes
✅ Fullscreen viewing capability with dedicated button
✅ Zoom in/out functionality using scroll wheel or trackpad
✅ Pan functionality using click and drag
✅ Touch support for mobile devices (pinch to zoom, drag to pan)
✅ Double-click/tap to reset zoom to 100%
✅ Proper cleanup when exiting fullscreen
✅ Cross-browser compatibility (Chrome, Firefox, Safari)

## 5. Implementation Notes

### Completion Date
2025-09-29

### Key Features Implemented
- **Automatic Mermaid Detection**: Processes both `language-mermaid` and `mermaid language-mermaid` code block formats
- **Theme Integration**: Automatically detects and applies light/dark theme based on document class
- **Fullscreen Mode**: Custom fullscreen implementation with proper background handling
- **Advanced Zoom/Pan**:
  - Scroll wheel zoom (0.1x to 5x range)
  - Trackpad pinch-to-zoom support
  - Click and drag panning with 1:1 cursor movement
  - Touch gestures for mobile devices
  - Double-click reset to original size
- **Performance Optimization**: Re-initializes mermaid on theme changes to ensure proper rendering
- **Cross-Platform Support**: Works on desktop (mouse/trackpad) and mobile (touch) devices

### Technical Implementation Details
- Uses `mermaid.run()` for diagram rendering with custom container wrapping
- Implements HTML5 Fullscreen API with vendor prefixes for compatibility
- Custom event handling for zoom/pan with proper scaling calculations
- Automatic cleanup of event listeners to prevent memory leaks
- **CSS Integration Fixes**:
  - Removed Tailwind prose backticks from Mermaid code blocks
  - Hidden raw code text to display only rendered SVG diagrams
  - Added proper padding and spacing overrides for clean presentation
  - Improved modal layout with 50% wider containers for better diagram viewing

### Follow-up Actions
None required - implementation is complete and functional.

## 6. References

### Code Changes
- **Primary Implementation**: `src/utils/mermaid.ts` - Core mermaid processing and fullscreen functionality
- **UI Integration**: `src/components/TicketViewer.tsx`, `src/components/DocumentsView/MarkdownViewer.tsx`
- **Reusable Component**: `src/components/UI/FullscreenWrapper.tsx` - Generic fullscreen wrapper for future use

### External Dependencies
- **Mermaid.js**: Diagram rendering library
- **Showdown.js**: Markdown to HTML conversion (existing dependency)

### Related CRs
None - This is a standalone feature enhancement.