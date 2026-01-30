---
code: MDT-012
title: Sortable Ticket Attributes with Admin Configuration
status: Implemented
dateCreated: 2025-09-06T11:26:53.692Z
type: Feature Enhancement
priority: Medium
phaseEpic: UI Enhancement
lastModified: 2025-09-06T16:22:34.783Z
---

# Sortable Ticket Attributes with Admin Configuration

## 1. Description

### Problem Statement
As a web user I want to be able to sort tickets by some attributes (key is default) in asc/desc direction. As an admin, I want to be able add/remove attributes to this dropdown, so that tickets will be sorted in various way.

### Current State
- Tickets are displayed without sorting options
- No user control over ticket ordering
- Frontend uses "code" terminology instead of "key"
- Buttons may lack proper labels in some views

### Desired State
- Sort dropdown near refresh button: `[ Name v] 🔽 [ Refresh ]`
- Configurable sorting attributes via `~/.config/markdown-ticket/user.toml`
- Default sorting by Key (desc), with Title (asc) and Created Date (desc) options
- Admin can add/remove custom attributes (system attributes protected)
- Consistent button labeling: [ Refresh ] [ Create ]
- Frontend uses "key" instead of "code"

### Rationale
Users need flexible sorting options to organize and find tickets efficiently. Admin configuration allows customization for different project needs while maintaining system integrity.

### Impact Areas
- Frontend UI
- Configuration Management
- User Experience

## 2. Solution Analysis

### UI Components
- **Sort Dropdown**: Attribute selection (Key, Title, Created Date + custom)
- **Direction Toggle**: Arrow button (🔽/🔼) for asc/desc
- **Location**: Near refresh button in both multi and single view
- **Layout**: `[ Attribute v] 🔽 [ Refresh ]`

### Configuration System
- **Storage**: `~/.config/markdown-ticket/user.toml`
- **Format**: TOML with attributes array and user preferences
- **Scope**: Global application
- **Protection**: System attributes cannot be removed

### Default Attributes
| Attribute | Default Direction | System |
|-----------|------------------|--------|
| Key | desc (default) | Yes |
| Title | asc | Yes |
| Created Date | desc | Yes |
| Update Date | desc | Yes |

## 3. Implementation Specification

### Configuration Format
```toml
# ~/.config/markdown-ticket/user.toml
[sorting]
attributes = [
    { name = "key", label = "Key", default_direction = "desc", system = true },
    { name = "title", label = "Title", default_direction = "asc", system = true },
    { name = "created_date", label = "Created Date", default_direction = "desc", system = true },
    { name = "lastModified", label = "Update Date", default_direction = "desc", system = true }
]
    { name = "created_date", label = "Created Date", default_direction = "desc", system = true },
    { name = "lastModified", label = "Update Date", default_direction = "desc", system = true }
]

[sorting.preferences]
selected_attribute = "key"
selected_direction = "desc"
```

### Backend Changes
1. TOML configuration reader/writer
2. Validation for system attribute protection
3. Default configuration creation
4. Sort logic implementation
5. **Auto-populate lastModified from file timestamp on ticket load**

### Frontend Changes
1. Add sort dropdown component to ticket list views
2. Add direction toggle button with visual state
3. Update terminology: "code" → "key"
4. Ensure button labels: "Refresh" and "Create"
5. Persist user sort preferences
6. **Add "Update Date" to default sorting attributes**

## 4. Acceptance Criteria

### UI Requirements
- [ ] Sort dropdown appears near refresh button in both views
- [ ] Direction toggle button works (🔽/🔼 visual feedback)
- [ ] Layout matches: `[ Attribute v] 🔽 [ Refresh ]`
- [ ] Button labels present: "Refresh" and "Create"
- [ ] Frontend uses "key" instead of "code"

### Functionality Requirements
- [ ] Default sorting by Key (desc) works
- [ ] All three default attributes sort correctly
- [ ] User preferences are persisted between sessions
- [ ] Configuration file created with defaults if missing

### Configuration Requirements
- [ ] TOML config file structure implemented
- [ ] System attributes cannot be removed
- [ ] Custom attributes can be added via config
- [ ] Configuration changes apply globally
- [ ] Invalid configurations handled gracefully

### Admin Requirements
- [ ] Admin can add custom sortable attributes
- [ ] System attribute protection enforced
- [ ] Configuration validation prevents corruption

## 5. Implementation Notes

### Questions for Consideration
1. **Custom Attribute Types**: Should custom attributes support different data types (string, number, date) for proper sorting?
2. **Validation**: Should there be validation for custom attribute names to ensure they exist in ticket data?
3. **Performance**: For large ticket lists, should sorting be done client-side or server-side?
4. **Migration**: How should existing users be handled when this feature is introduced?

### Technical Considerations
- State management for sort preferences
- Configuration file location and permissions
- Error handling for missing/invalid attributes
- Performance optimization for large datasets

### Change Notes
1. Ensure both buttons in both views have names: [ Refresh ] [ Create ]
2. Rename ticket "code" to "key" in frontend
3. System attributes restriction prevents accidental removal

## 6. References
- User configuration storage: `~/.config/markdown-ticket/user.toml`
- UI location: Near refresh button in multi and single view
- Default sort: Key (desc) → Title (asc) → Created Date (desc)

## 7. Implementation Notes

### 2025-09-06 - System-Managed Timestamps
**Change**: Made `dateCreated` and `lastModified` system-managed fields

**Rationale**: These fields should reflect actual file operations, not user input, to ensure data integrity and provide reliable audit trails.

**Implementation**:
- **MCP Server**: Removed manual population of `dateCreated`/`lastModified` in CR creation and updates
- **Main Server**: Skip manual `lastModified` updates, rely on file system timestamps
- **Both Servers**: Use `stats.birthtime` for `dateCreated` and `stats.mtime` for `lastModified` as fallbacks
- **Frontend**: No changes needed - continues to use these fields for sorting

**Benefits**:
- Automatic accuracy - timestamps always reflect actual file operations
- No user confusion - system fields are invisible to users
- Reliable audit trail - file system provides authoritative timestamps
- Simplified API - users don't need to manage system fields
