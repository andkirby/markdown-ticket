---
code: MDT-059
status: Approved
dateCreated: 2025-10-03T13:52:40.563Z
type: Feature Enhancement
priority: High
relatedTickets: MDT-017
dependsOn: MDT-017
implementationDate: 2025-10-08T14:35:45.725Z
implementationNotes: Status changed to Implemented on 10/8/2025
---

# Implement smart link conversion for markdown content with React Router integration 1111

## 1. Description
### Problem Statement
Markdown content rendered by Showdown.js converts all links to standard HTML `<a>` tags, causing full page reloads and breaking the client-side navigation experience provided by React Router. Users cannot seamlessly navigate between tickets, documents, and external resources while maintaining application state.

### Requirements
- Internal ticket references (e.g., `MDT-001`) should use React Router for client-side navigation
- Document references (e.g., `file.md`) should navigate to document viewer
- **Relative path resolution**: GitHub-compatible relative links (e.g., `../../file.md`) should resolve to web routes
- **Security**: Path traversal prevention - links cannot escape project directory boundaries
- External links should open in new tabs with security attributes
- Code blocks and inline code should be protected from link conversion
- Link conversion should be scoped to current project only
- Visual distinction between different link types
- Graceful error handling for malformed markdown
### Success Criteria
- Clicking ticket references navigates without page reload
- External links open securely in new tabs
- Mermaid diagrams and code blocks remain unaffected
- Performance maintained through proper caching
- No memory leaks or runtime errors
## 2. Rationale

### Business Value
- **Improved UX**: Instant navigation without page reloads improves perceived performance
- **Better Integration**: Leverages existing MDT-017 routing infrastructure
- **Enhanced Security**: Proper handling of external links prevents security vulnerabilities
- **Discoverability**: Visual link types help users understand navigation options
- **Consistency**: Unified link handling across all views

### Technical Value
- **React Best Practices**: Uses React Router for SPA navigation
- **Maintainability**: Centralized link processing logic
- **Extensibility**: Easy to add new link types (cross-project references, file previews)
- **Type Safety**: Full TypeScript support for link classification
- **Testability**: Clear separation of concerns enables comprehensive testing

### User Stories
- As a user, I want to click ticket references and see the ticket modal instantly without page reload
- As a user, I want external links to open in new tabs so I don't lose my place
- As a user, I want to see visual indicators showing what type of link I'm clicking
- As a developer, I want to reference other tickets in markdown and have them automatically become clickable
- As a project manager, I want to link to architecture documents from tickets seamlessly

## 3. Solution Analysis
### Architecture Overview
Create a smart link processing system that:
1. **Link Classification**: Identify different types of links (ticket, document, external, anchor)
2. **Code Protection**: Preserve code blocks and inline code from conversion
3. **Smart Rendering**: Use React Router for internal navigation, external handling for URLs
4. **Security**: Apply proper attributes and sanitization

### Technical Approach
- **MarkdownContent Component**: Central processing pipeline with error boundaries
- **SmartLink Component**: Renders appropriate link types with visual indicators
- **Link Processor**: Classifies and validates links with project scope
- **Placeholder Strategy**: Protect code blocks during processing
- **Configuration System**: User-controllable feature toggles

### Integration Points
- Replace Showdown rendering in TicketViewer, List, and DocumentsView
- Integrate with existing React Router setup
- Maintain compatibility with Mermaid diagrams and syntax highlighting
- Preserve performance through memoization and caching
## 4. Implementation Specification
### Core Components

#### MarkdownContent Component
```typescript
interface MarkdownContentProps {
  markdown: string;
  currentProject: string;
  className?: string;
  headerLevelStart?: number;
  onRenderComplete?: () => void;
}
```
- Processes markdown through secure pipeline
- Protects code blocks using placeholder strategy
- Integrates with Mermaid and syntax highlighting
- Includes error boundary for graceful failures

#### SmartLink Component
```typescript
interface SmartLinkProps {
  link: ParsedLink;
  currentProject: string;
  children: React.ReactNode;
  className?: string;
  showIcon?: boolean;
}
```
- Renders different link types appropriately
- Uses React Router Link for internal navigation
- Applies security attributes for external links
- Shows visual indicators for link types

#### Link Processor
```typescript
enum LinkType {
  EXTERNAL = 'external',
  TICKET = 'ticket',
  DOCUMENT = 'document',
  ANCHOR = 'anchor',
  FILE = 'file',
  UNKNOWN = 'unknown'
}

interface ParsedLink {
  type: LinkType;
  href: string;
  text: string;
  projectCode?: string;
  ticketKey?: string;
  documentPath?: string;
  anchor?: string;
  isValid?: boolean;
}
```

#### Relative Path Resolver
```typescript
interface PathResolutionResult {
  resolvedPath: string;
  isValid: boolean;
  error?: string;
}

function resolveRelativePath(
  currentDocPath: string, 
  relativePath: string, 
  projectRoot: string
): PathResolutionResult {
  // Security: Resolve and validate path boundaries
  const resolved = path.resolve(path.dirname(currentDocPath), relativePath);
  const normalized = path.normalize(resolved);
  
  // Prevent directory traversal attacks
  if (!normalized.startsWith(projectRoot)) {
    return {
      resolvedPath: '',
      isValid: false,
      error: 'Path traversal outside project directory blocked'
    };
  }
  
  return {
    resolvedPath: path.relative(projectRoot, normalized),
    isValid: true
  };
}
```
### Processing Pipeline
1. **Protect existing links** - Replace `[text](url)` with placeholders
2. **Protect code blocks** - Replace ` ```code``` ` and `` `inline` `` with placeholders
3. **Convert bare references** - Transform `MDT-001` to `[MDT-001](MDT-001)` (current project only)
4. **Restore protected content** - Put back code blocks and original links
5. **Parse and render** - Convert to React components with SmartLink

6. **Validate restoration** - Ensure all placeholders are properly restored and no processing artifacts remain in final output
### Security Measures
- DOMPurify sanitization with allowed tags/attributes
- External link security: `rel="noopener noreferrer" target="_blank"`
- URL protocol validation (block javascript:, data:, etc.)
- XSS prevention through controlled HTML parsing

- **Path traversal protection**: Relative links validated against project boundaries using `path.resolve()` and `startsWith()` checks
- **Malicious path detection**: Block attempts to access `../../../etc/passwd` or similar attacks
### Configuration
```typescript
interface LinkConfig {
  enableAutoLinking: boolean;
  enableTicketLinks: boolean;
  enableDocumentLinks: boolean;
}
```
- Stored in localStorage with defaults enabled
- User-controllable feature toggles
- Proper cache invalidation on config changes
## 5. Acceptance Criteria
### Functional Requirements
- [ ] Ticket references (`MDT-001`) convert to clickable links that navigate via React Router
- [ ] Document references (`file.md`) convert to links that open in document viewer
- [ ] External URLs open in new tabs with security attributes
- [ ] Code blocks (` ```code``` `) and inline code (`` `code` ``) remain unaffected by link conversion
- [ ] Link conversion is scoped to current project only (no cross-project auto-linking)
- [ ] Visual indicators distinguish between link types (icons, colors)
- [ ] Existing markdown links `[text](url)` are preserved unchanged

- [ ] Relative paths (`../../file.md`) resolve correctly to web routes while maintaining GitHub compatibility
- [ ] Path traversal attacks are blocked (cannot access files outside project directory)
### Technical Requirements
- [ ] No memory leaks (proper useEffect cleanup)
- [ ] Error boundaries prevent crashes from malformed markdown
- [ ] Performance maintained through proper memoization
- [ ] Cache invalidation works correctly when configuration changes
- [ ] DOMPurify sanitization prevents XSS attacks
- [ ] Compatible with existing Mermaid diagrams and syntax highlighting

- [ ] **Clean output rendering**: Markdown processing must produce clean final output without processing artifacts or corrupted text
- [ ] Proper content restoration ensures rendered text matches expected markdown output
### User Experience
- [ ] Seamless navigation without page reloads for internal links
- [ ] Clear visual feedback for different link types
- [ ] Graceful degradation when link processing fails
- [ ] Configuration options accessible to users
- [ ] No breaking changes to existing markdown content
## 6. Implementation Notes
### Dependencies
```json
{
  "dependencies": {
    "dompurify": "^3.2.7",
    "html-react-parser": "^5.2.6"
  },
  "devDependencies": {
    "@types/dompurify": "^3.0.5"
  }
}
```

### File Structure
```
src/
├── components/
│   ├── MarkdownContent.tsx       # Main processing component
│   ├── MarkdownErrorBoundary.tsx # Error handling
│   └── SmartLink.tsx             # Link rendering
├── utils/
│   ├── linkProcessor.ts          # Link classification
│   ├── linkValidator.ts          # Development validation
│   └── linkBuilder.ts            # URL construction
└── config/
    └── linkConfig.ts             # Feature configuration
```

### Integration Points
- Update TicketViewer, List, DocumentsView to use MarkdownContent
- Maintain compatibility with existing Mermaid and syntax highlighting
- Preserve React Router navigation patterns
- No backend API changes required
## 7. References
### Related Tickets
- **MDT-017**: URL-based routing implementation (prerequisite)
- **MDT-060**: Consolidate duplicate markdown rendering logic

### Technical Documentation
- [React Router v6 Documentation](https://reactrouter.com/)
- [DOMPurify Security Guide](https://github.com/cure53/DOMPurify)
- [Showdown.js Configuration](https://github.com/showdownjs/showdown)

### Design Decisions
- Placeholder strategy chosen over regex parsing for code block protection
- Current project scope restriction to prevent cross-project pollution
- localStorage configuration for simplicity over file-based config
