---
code: MDT-039
title: Shrink project bar with expanded active project display
status: Implemented
dateCreated: 2025-09-10T20:01:15.210Z
type: Feature Enhancement
priority: Medium
description: Optimize project bar space usage by showing only project codes for inactive projects while keeping active project expanded with full information
rationale: Current project bar takes up too much horizontal space. By showing only project codes for inactive projects and expanding the active one, we can improve screen real estate while maintaining usability through hover tooltips
---


# Shrink project bar with expanded active project display

## 1. Description

### Problem Statement
Optimize project bar space usage by showing only project codes for inactive projects while keeping active project expanded with full information

### Current State
All projects in the project bar displayed with full width showing both project code and name, consuming excessive horizontal space

### Desired State
- Active project: Expanded view (40% width) with horizontal layout - code on left, name on right with multi-line support
- Inactive projects: Compact view showing only project code with hover border effect
- Hover tooltips on inactive projects showing full name and description

### Rationale
Current project bar takes up too much horizontal space. By showing only project codes for inactive projects and expanding the active one, we can improve screen real estate while maintaining usability through hover tooltips

## 2. Solution Analysis

### Approach
Implement conditional rendering in ProjectSelector component:
- Active project gets expanded layout with fixed width
- Inactive projects get compact layout with tooltips
- Use TooltipProvider for hover information display

### Key Components Modified
- `src/components/ProjectSelector.tsx`: Main implementation
- Added tooltip UI components for enhanced UX
- Implemented project code mapping function

## 3. Implementation Specification

### Technical Changes
1. **ProjectSelector Component Refactor**:
   - Added conditional rendering based on `isActive` state
   - Active projects: 40% width, horizontal layout (code left, name right)
   - Inactive projects: Compact width (px-2), shows only code
   - Added hover border effect for inactive projects

2. **Active Project Layout**:
   - Horizontal flex layout with `flex items-center gap-2`
   - Code: `flex-shrink-0` to prevent shrinking
   - Name: `flex-1 min-w-0` with `break-words` for multi-line support
   - Width: `w-[40%]` for responsive sizing

3. **Inactive Project Enhancements**:
   - Added `border-2 border-transparent` with hover border effect
   - Hover: `hover:border-blue-300 dark:hover:border-blue-700`
   - Maintains compact layout with tooltip information

4. **New Dependencies**:
   - `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger` from UI components

5. **Project Code Mapping**:
   - Added `getProjectCode()` helper function
   - Maps known project IDs to standardized codes
   - Fallback to uppercase first 3 characters

## 4. Acceptance Criteria

✅ **Visual Layout**:
- Active project displays with 40% width in horizontal layout (code left, name right)
- Long project names wrap properly without breaking design
- Inactive projects show only project code in compact layout
- Overall horizontal space usage reduced significantly

✅ **User Experience**:
- Hover tooltips on inactive projects show full information
- Hover border effect on inactive projects provides visual feedback
- Smooth transitions between active/inactive states
- All projects remain clickable and functional

✅ **Technical Requirements**:
- No breaking changes to existing functionality
- Maintains responsive design principles
- Proper accessibility with tooltip implementation
- Multi-line text support for long project names

## 5. Implementation Notes

### Code Changes Summary
- **File Modified**: `src/components/ProjectSelector.tsx`
- **Lines Added**: ~50+ lines of enhanced logic
- **Key Features**: Conditional rendering, tooltip integration, project code mapping, hover effects

### Design Decisions
1. **Responsive Width for Active Project**: Used `w-[40%]` instead of fixed width for better adaptability
2. **Horizontal Layout**: Code on left, name on right maximizes space utilization
3. **Multi-line Support**: `break-words` and `min-w-0` prevent layout breaking with long names
4. **Hover Border Effect**: Provides visual feedback matching active project styling
5. **Tooltip Implementation**: Provides full context without cluttering UI
6. **Project Code Mapping**: Hardcoded mapping for known projects with fallback logic

### Recent Enhancements (2025-09-10)
- Added hover border effect for inactive projects
- Implemented horizontal layout for active project
- Fixed multi-line text wrapping for long project names
- Changed from fixed width (w-32) to responsive width (40%)

### Performance Impact
- Minimal: Only adds conditional rendering logic and CSS transitions
- Tooltip components are lightweight and render on-demand

### Future Considerations
- Project code mapping could be moved to configuration
- Consider max-width constraints for very wide screens

## 6. References

### Related Files
- `src/components/ProjectSelector.tsx` - Main implementation
- `src/components/ui/tooltip.tsx` - Tooltip components
- `src/components/ui/badge.tsx` - Badge component (imported)

### Git Commits
- Implementation was part of commit `ec59d79` (feat: implement document path selection interface)
- Changes integrated with MDT-019 Phase 1.2 development

### UI Components Used
- TooltipProvider, Tooltip, TooltipTrigger, TooltipContent
- Existing button and styling classes
- Tailwind CSS utilities for responsive design