---
code: MDT-019
title: Markdown document viewer with tree navigation
status: Implemented
dateCreated: 2025-09-06T16:37:05.822Z
type: Feature Enhancement
priority: Medium
phaseEpic: Documentation Features
lastModified: 2025-09-06T21:43:22.000Z
---

# Markdown document viewer with tree navigation

## 1. Description

### Problem Statement
As a web user, I want to be able to view .md documents within the application so that I don't need an external viewer to read project documentation.

### Current State
- Users must use external tools to view markdown files
- No integrated documentation viewing capability
- Documentation scattered across project directories

### Desired State
- Integrated markdown document viewer within single project view
- Tree navigation showing folder structure up to 3 levels deep
- Collapsible folders for better organization
- Seamless switching between Board and Documents views

### Rationale
Improves user workflow by eliminating the need for external markdown viewers and provides integrated access to project documentation.

### Impact Areas
- User Interface
- File System
- Navigation

## 2. Solution Analysis

### UI Design Decisions
1. **View Toggle**: "Board/Documents" toggle within single project view ✅
2. **File Display**: Show only .md files in tree navigation ✅
3. **Root Detection**: Start from project's configured path (from project.toml) ✅
4. **Navigation Component**: Use `react-arborist` or `@mui/x-tree-view` ✅
5. **Content Display**: Render markdown using existing showdown converter ✅

### Technical Considerations
1. **File Discovery**: Scan up to 3 levels from project's configured path
2. **Project Path**: Use `path` field from `~/.config/markdown-ticket/projects/[project].toml`
3. **Exclusions**: Read `.mdt-config.toml` from project path for exclusion rules
4. **Markdown Rendering**: Use existing showdown converter (same as tickets)
5. **File Filtering**: Only display .md files in tree navigation

## 3. Implementation Specification

### Frontend Components
```
DocumentsView/
├── DocumentsLayout.tsx      # Main layout with sidebar + content
├── FileTree.tsx            # Tree navigation component
├── MarkdownViewer.tsx      # Markdown content renderer
├── PathSelector.tsx        # Phase 1.2: Path selection interface
└── ViewToggle.tsx          # Board/Documents toggle
```

### Phase 1.2: Path Selection Interface (✅ Completed)
**Components Added:**
- `PathSelector.tsx` - Checkbox-based file/folder selection interface
- Enhanced `DocumentsLayout.tsx` - Detects unconfigured projects and shows PathSelector

**API Endpoints Added:**
- `GET /api/filesystem` - Browse file system with tree structure
- `POST /api/documents/configure` - Save selected paths to project configuration
- Enhanced `GET /api/documents` - Returns 404 for unconfigured projects

**Workflow:**
1. When opening Documents view, check if `document_paths` exists in `.mdt-config.toml`
2. If not configured, show PathSelector with checkbox tree of project files
3. User selects desired files/folders and clicks "Save Selection"
4. Configuration is saved to `.mdt-config.toml` and Documents view reloads

### File Discovery Logic
- Read `document_paths` from `.mdt-config.toml` in project root
- Support both single files (e.g., "README.md") and directories (e.g., "docs")
- For directories: scan up to max_depth levels for .md files
- For single files: include if they end with .md
- Exclude directories listed in exclude_folders during directory scanning

### Configuration Integration
```toml
# .mdt-config.toml
[project]
name = "Markdown Ticket Board"
code = "MDT"
path = "docs/CRs"
# ... other project settings

# Documents configuration (under [project] section)
document_paths = [
  "README.md", # Single file from root
  "docs", # Directory (will scan for .md files)
  "CHANGELOG.md" # Another single file
]
exclude_folders = [
  "docs/CRs", # Exclude tickets folder
  "node_modules",
  ".git"
]
max_depth = 3
```

### Navigation Tree Structure (Only .md files)
```
📁 Project Root
├── 📁 docs/
│   ├── 📄 TOML Configuration Specification for Ticket Board
│   │   CONFIG_SPECIFICATION.md
│   └── 📄 Project-Specific AI Instructions Template
│       AI_PROJECT_SPECIFIC_instruction.md
├── 📄 MD Ticket Board
│   PROJECT.md
└── 📄 Markdown Ticket Board
    README.md
```
*Note: Shows H1 titles as primary labels with filenames as footnotes*

## 4. Acceptance Criteria

### UI Requirements
- [ ] Board/Documents view toggle in single project view
- [ ] Left sidebar tree navigation with collapsible folders
- [ ] Right content area for markdown rendering
- [ ] Consistent styling with existing UI

### Functionality Requirements
- [x] Read `document_paths` from `.mdt-config.toml` in project root
- [x] Support single files (README.md) and directories (docs/)
- [x] Tree navigation shows configured paths and .md files only
- [x] **Phase 1.2**: Path selection interface for unconfigured projects ✅
- [x] **Phase 1.2**: Checkbox-based file/folder selection ✅
- [x] **Phase 1.2**: Automatic configuration persistence ✅
- [x] **Phase 1.2**: Project switching with proper state clearing ✅
- [x] **Phase 1.2**: Smart filtering (excludes tickets folder and dev directories) ✅
- [x] **Phase 1.2**: Glob-based file discovery with `**/*.md` patterns ✅
- [x] Click on .md file renders content using showdown converter
- [x] Board/Documents view toggle in single project view
- [x] Extract H1 titles from markdown files for display labels
- [x] Show filename as footnote under H1 title
- [x] Preserve directory structure in tree (folders as collapsible nodes)
- [ ] Collapsible folder functionality
- [ ] Independent scrolling for panels

### Technical Requirements
- [ ] Integration with existing project configuration
- [ ] Markdown rendering with proper styling
- [ ] Responsive layout for different screen sizes
- [ ] Error handling for missing/unreadable files

## 5. Implementation Notes

### Phase 1 Implementation Update (2025-09-06)
**✅ COMPLETED**: Phase 1 MVP with additional enhancements

**Key Features Implemented**:
1. **Configuration-based Discovery**: Uses `document_paths` in `.mdt-config.toml` under `[project]` section
2. **H1 Title Extraction**: Reads first `# Title` from each markdown file for display labels
3. **Filename Footnotes**: Shows actual filename in smaller text below H1 title
4. **Directory Structure**: Preserves folder hierarchy (e.g., docs/ folder with children)
5. **Mixed Path Support**: Handles both individual files and directories in same config
6. **Proper Exclusions**: Respects `exclude_folders` during directory scanning

**Configuration Method**:
- Projects declare document paths in `.mdt-config.toml` under `[project]` section
- Support both single files (`README.md`) and directories (`docs/`)
- Only scan configured paths, not entire project directory
- Maintains exclude_folders for directory scanning

**Benefits**:
- Explicit control over what documents are shown
- Better performance (only scan configured paths)
- Support for individual files from any location
- User-friendly labels with H1 titles
- Maintains security through path configuration

### Phase 1.5 Enhancement (2025-09-30)
**✅ Collapsible Folders**: Added expand/collapse functionality to folder navigation with chevron icons. All folders start expanded by default. (`src/components/DocumentsView/FileTree.tsx`)

### Original Decisions (2025-09-06)
1. **UI**: Board/Documents toggle within single project view
2. **File Display**: Only .md files shown in tree navigation
3. **Root Detection**: Start from directory containing .mdt-config.toml
4. **Navigation**: Use react-arborist or @mui/x-tree-view
5. **Rendering**: Use existing showdown converter (same as tickets)

### Questions for Consideration

### UI/UX Questions
1. **File Types**: Show only .md files in tree, or show all files but only allow viewing .md?
2. **Default View**: Should Documents view remember last opened file?
3. **Search**: Should we add search functionality for documents?

### Technical Questions
1. **Caching**: Should we cache file tree structure for performance?
2. **Real-time Updates**: Should tree update when files are added/removed?
3. **Large Files**: How to handle very large markdown files?

### Configuration Questions
1. **Custom Exclusions**: Allow per-project exclusion patterns?
2. **Depth Limit**: Make max depth configurable per project?
3. **File Extensions**: Support other text formats (.txt, .rst)?

## 6. Recommended Implementation Phases

### Phase 1 (MVP)
- Basic tree navigation with .md files only
- Simple markdown rendering (HTML output like ticket view)
- Board/Documents toggle

### Phase 1.5 (Enhanced Navigation)
- Collapsible folders
- Collapsible left panel

### Phase 1.6 (UI Polish)
- Independent scrolling for left panel and document content

### Phase 2 (Enhanced Features)
- Search functionality
- File watching for real-time updates

### Phase 3 (Advanced)
- Custom exclusion patterns
- Multiple file format support
- Document bookmarking
