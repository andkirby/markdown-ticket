---
code: MDT-076
title: No Projects Found UI Architecture - Configuration-Driven Project Discovery
status: Implemented
dateCreated: 2025-11-12T03:25:20.400Z
type: Architecture
priority: High
phaseEpic: Architecture Phase A
---

# No Projects Found UI Architecture - Configuration-Driven Project Discovery

## 1. Description

This ADR documents the architectural approach for handling the "No Projects Found" state in the Markdown Ticket application. The solution introduces a configuration-driven project discovery system with enhanced backend TOML parsing, a dedicated configuration API endpoint, and a clean separation between empty state and project views.

### Current State
The application currently requires manual project registration and provides no helpful feedback when no projects are configured. Users experience confusion and uncertainty about the system status.

### Desired State
The application provides clear, actionable feedback when no projects are detected, with automatic discovery capabilities and detailed configuration information to guide users through the setup process.

## 2. Rationale

### Problem Statement
1. **Poor User Experience**: Users see a blank interface with no guidance when no projects are configured
2. **Manual Configuration Burden**: Project registration requires manual setup without clear discovery patterns
3. **Limited Visibility**: Users cannot understand what the system is detecting or why no projects appear
4. **Architectural Inconsistency**: Different parsing approaches create maintenance complexity and potential bugs

### Why This Change is Necessary
- **Improved User Onboarding**: Clear UI guidance reduces confusion for new users
- **Enhanced Developer Experience**: Automated discovery with detailed feedback aids in development workflows
- **Architectural Consistency**: Standardized TOML parsing eliminates regex-based parsing inconsistencies
- **Maintainability**: Centralized configuration API provides a single source of truth for system configuration

### Alignment with Project Goals
This solution aligns with the project's goals of providing a user-friendly, self-documenting system that requires minimal manual setup while maintaining robust error handling and feedback mechanisms.

## 3. Solution Analysis

### Evaluated Alternatives

#### Option A: Enhanced Discovery with Improved UI
**Approach**: Implement robust TOML parsing, configuration API, and clean empty state UI
**Pros**: 
- Comprehensive solution addressing both backend and frontend issues
- Clear user guidance and feedback
- Maintains architectural consistency
- Extensible for future configuration features
**Cons**:
- Requires backend API changes
- Frontend UI restructuring needed
- More complex implementation than minimal solutions
**Trade-offs**: Higher initial complexity but significantly better user experience and maintainability

#### Option B: Manual Configuration Enhancement Only
**Approach**: Focus on improving manual project setup without automatic discovery
**Pros**:
- Simpler implementation
- Lower risk surface
- Addresses immediate pain points
**Cons**:
- Doesn't solve discovery automation
- Still requires manual setup
- Limited architectural improvements
**Trade-offs**: Quicker wins but incomplete solution

#### Option C: Regex-based Parsing Improvements
**Approach**: Enhance existing regex-based TOML parsing with better error handling
**Pros**:
- No architectural changes needed
- Lower implementation complexity
**Cons**:
- Regex-based parsing is fragile and unmaintainable
- Doesn't address UI/UX issues
- Creates long-term maintenance burden
**Trade-offs**: Quick fix but perpetuates architectural problems

### Selected Approach
**Option A: Enhanced Discovery with Improved UI** was selected because:
1. **Comprehensive Solution**: Addresses both technical debt and user experience issues
2. **Future-Proof Architecture**: Standardized TOML parsing enables future configuration features
3. **Superior User Experience**: Provides clear guidance and feedback for all users
4. **Consistency**: Aligns with project architecture principles and maintainability goals

### Rejected Options
- **Option B** was rejected as it only addresses symptoms, not the root causes
- **Option C** was rejected as it perpetuates technical debt and architectural inconsistencies

## 4. Implementation Specification

### Backend Architecture Changes

#### TOML Configuration Parsing
- Replace regex-based parsing with proper TOML library (toml.js)
- Implement `ProjectConfigTOMLParser` with type-safe configuration loading
- Add comprehensive error handling for malformed TOML files
- Support both global registry and local configuration files

#### Configuration API Endpoint
- New `/api/config` endpoint returning system configuration information
- Exposes `CONFIG_DIR`, discovery status, search paths, and project registry details
- Handles both configured and unconfigured states gracefully
- Provides machine-readable and human-readable configuration details

#### Project Discovery Service Enhancement
- Extend `ProjectService` with enhanced discovery capabilities
- Implement recursive directory scanning for `.mdt-config.toml` files
- Add validation for configuration completeness and consistency
- Provide detailed error reporting for configuration issues

### Frontend Architecture Changes

#### Routing Separation
- Separate routing for empty state (`/`) vs project views (`/projects/:id`)
- Implement proper route guards and navigation handling
- Add transition animations for state changes
- Maintain URL consistency across all states

#### UI Component Architecture
- `RedirectToCurrentProject` component enhanced with "No Projects Found" view
- Clean header with logo, app title, and theme toggle only
- Configuration information display with visual status indicators
- Dual action buttons: "Create Project" and "Refresh Projects"
- Enhanced configuration guidance with syntax-highlighted code examples
- Responsive design across all device sizes
- Integration with existing `AddProjectModal` for project creation

#### State Management
- Enhanced `useProjectManager` with empty state handling
- Configuration state management with loading/error states
- Synchronization between configuration API and project discovery
- Optimistic updates for project creation flows

### Data Flow Architecture
```
User Request → Configuration API → TOML Parser → Project Service → Frontend State → UI Render

Empty State Flow:
User lands on "/" → RedirectToCurrentProject → Fetches /api/config → Displays configuration info
Create Project Flow:
Click "Create Project" → AddProjectModal → Project creation → Redirect to new project
```

### Error Handling Architecture
- Configuration validation errors with specific error messages
- Network error handling for API calls
- Graceful degradation when configuration is unavailable
- User-friendly error messages with suggested actions

## 5. Acceptance Criteria

### Functional Criteria
- [x] `/api/config` endpoint returns configuration information in consistent format
- [x] "No Projects Found" UI displays without project selector or view switchers
- [x] Configuration information shows discovery status, paths, and registry details
- [x] Project discovery works correctly with enhanced TOML parsing
- [x] Manual project creation functionality works from empty state
- [x] Routing properly separates empty state from project views
- [x] "Create Project" button triggers AddProjectModal for immediate project creation
- [x] Configuration guidance includes syntax-highlighted bash and YAML examples
- [x] Docker configuration guidance with compose file examples and recreation commands

### Non-Functional Criteria
- [x] All API endpoints handle errors gracefully with appropriate HTTP status codes
- [x] UI components are responsive and accessible across devices
- [x] Configuration parsing is robust against malformed TOML files
- [x] System performance is maintained with enhanced discovery capabilities
- [x] Error messages are user-friendly and actionable
- [x] Syntax highlighting works for both bash and YAML code examples
- [x] Left-aligned text formatting improves readability of configuration guidance
- [x] Theme support maintained across all UI components

### Integration Criteria
- [x] Frontend properly consumes `/api/config` endpoint
- [x] Configuration information syncs with project discovery service
- [x] MCP tools can access configuration information for debugging
- [x] All existing functionality continues to work when projects are configured
- [x] Configuration changes are reflected in real-time across the application
- [x] AddProjectModal integration works seamlessly with empty state UI
- [x] Project creation redirects properly to new project views
- [x] Configuration updates trigger appropriate state refreshes

## 6. Success Metrics

### User Experience Metrics
- **Reduction in Support Tickets**: Target 50% reduction in "no projects found" related support inquiries
- **User Task Completion**: 90% of users can successfully complete project setup within 5 minutes
- **User Satisfaction**: NPS score improvement of 20+ points for new user onboarding experience
- **Configuration Success Rate**: 95% of users successfully configure projects on first attempt

### Technical Metrics
- **Configuration Parsing Robustness**: 99.9% success rate on parsing various TOML file formats
- **API Response Time**: `/api/config` endpoint responds in < 200ms for typical configurations
- **Error Rate**: < 1% error rate for project discovery and configuration operations
- **Code Coverage**: 95%+ test coverage for new configuration and discovery functionality

### Architectural Metrics
- **Technical Debt Reduction**: Elimination of regex-based TOML parsing maintenance burden
- **System Maintainability**: 30% reduction in configuration-related bug reports
- **Extensibility**: New configuration features can be added with < 2 hours development effort
- **Documentation**: Complete API documentation and architectural diagrams for configuration system

### Business Metrics
- **User Adoption Rate**: 25% increase in new user adoption within 3 months
- **Developer Onboarding Time**: 40% reduction in time for developers to set up new projects
- **System Reliability**: 99.9% uptime for configuration and project discovery services
- **Customer Satisfaction**: CSAT score improvement of 15+ points for configuration experience