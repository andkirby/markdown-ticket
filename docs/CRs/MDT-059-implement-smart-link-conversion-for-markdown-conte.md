---
code: MDT-059
title: Implement smart link conversion for markdown content with React Router integration
status: Proposed
dateCreated: 2025-10-03T13:52:40.563Z
type: Feature Enhancement
priority: High
relatedTickets: MDT-017
dependsOn: MDT-017
---













# Implement smart link conversion for markdown content with React Router integration

# Implement smart link conversion for markdown content with React Router integration

## 1. Description

### Problem Statement
Currently, markdown content rendered by Showdown.js converts all links to standard HTML `<a>` tags, causing full page reloads and breaking the client-side navigation experience provided by React Router (MDT-017). Users cannot seamlessly navigate between tickets, documents, and external resources while maintaining application state.

### Current State
- Showdown.js performs basic markdown → HTML conversion
- All links render as plain `<a href="...">` tags
- Clicking internal links (ticket references, document links) causes page reloads
- No distinction between external URLs and internal navigation
- No security attributes on external links
- Three separate markdown rendering locations: TicketViewer, List, DocumentsView

### Desired State
- Internal links (tickets, documents) use React Router for client-side navigation
- External links open in new tabs with security attributes (`rel="noopener noreferrer"`)
- Consistent link handling across all markdown rendering components
- Visual distinction between link types (external, ticket, document, anchor)
- Preserved application state during navigation
- Support for anchor links within tickets and documents

### Rationale
With MDT-017 complete, users have URL-based routing but cannot benefit from it within markdown content. This creates a jarring user experience where:
- Clicking a ticket reference (e.g., "See MDT-001") reloads the entire app
- Navigation history and state are lost
- External links lack security best practices
- Users cannot distinguish link types before clicking

### Impact Areas
- **Frontend Components**: TicketViewer, List, DocumentsView/MarkdownViewer
- **Utilities**: New linkProcessor and htmlToReact utilities
- **Components**: New SmartLink component
- **Routing**: Integration with existing React Router setup
- **Security**: XSS prevention, external link security
- **User Experience**: Seamless navigation, visual feedback

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

### Approaches Considered

#### Option 1: Showdown Extension (Rejected)
**Description**: Create custom Showdown extension to transform links during markdown conversion

**Pros**:
- Single-pass processing during markdown conversion
- Happens at transformation time
- Clean separation from React

**Cons**:
- Cannot use React Router components (would need to generate plain HTML)
- Forces page reloads for internal links
- Complex state handling between extension and React
- Limited TypeScript support in Showdown extensions
- Would still need custom click handlers in React

**Verdict**: ❌ Rejected - Cannot leverage React Router for client-side navigation

#### Option 2: Post-Processing HTML → React Components (Recommended)
**Description**: Let Showdown convert markdown → HTML, then post-process HTML to identify and replace links with React components

**Pros**:
- Native React Router integration via `<Link>` components
- Preserves client-side navigation and state
- Full TypeScript support
- Clean separation: Showdown handles markdown, React handles navigation
- Incremental rollout possible (one component at a time)
- Better security through React's built-in protections

**Cons**:
- Two-pass processing (markdown → HTML → React)
- Slightly more complex implementation
- Need to parse HTML strings or create full React element tree

**Verdict**: ✅ Recommended - Best integration with existing React Router infrastructure

#### Option 3: Replace Showdown with React-Markdown (Deferred)
**Description**: Migrate from Showdown to react-markdown library for native React rendering

**Pros**:
- Native React component output
- No HTML string parsing needed
- Built-in support for custom components
- Better security (no dangerouslySetInnerHTML)

**Cons**:
- Major refactoring of existing markdown rendering
- Migration risk for existing content
- Learning curve for new library
- Potential compatibility issues with current markdown features

**Verdict**: 🔄 Consider for future (Phase 6) - Too risky for initial implementation

### Chosen Approach: Post-Processing with React Router

**Architecture**:
```
┌─────────────────────────────────────────┐
│   Markdown Content (CRs, Docs)          │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│   Showdown.js                            │
│   • Basic markdown → HTML                │
│   • Preserve link attributes             │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│   LinkProcessor Utility (NEW)            │
│   • Parse HTML <a> tags                  │
│   • Classify link types                  │
│   • Prepare link metadata                │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│   SmartLink Component (NEW)              │
│   • External: <a target="_blank">       │
│   • Internal: <Link> (React Router)      │
│   • Broken: Visual indicator             │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│   MarkdownContent Component (NEW)        │
│   • Orchestrates conversion pipeline     │
│   • Renders processed content            │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│   Rendered in TicketViewer/List/Docs    │
└─────────────────────────────────────────┘
```

**Decision Factors**:
- Must leverage existing MDT-017 React Router infrastructure
- Need to maintain application state during navigation
- Want incremental rollout to minimize risk
- Require full TypeScript support for maintainability
- Security is critical (XSS prevention, external link handling)

### Link Type Taxonomy

#### 1. External URLs
- **Pattern**: `https://`, `http://`, `mailto:`, `tel:`
- **Examples**: `[GitHub](https://github.com/example/repo)`, `[Email](mailto:user@example.com)`
- **Handling**: Open in new tab with `target="_blank" rel="noopener noreferrer"`
- **Visual**: External link icon (🔗)

#### 2. Ticket References
- **Patterns**: 
  - Bare reference: `MDT-001`
  - Markdown link: `[text](MDT-001)`, `[text](MDT-001.md)`
  - With anchor: `[text](MDT-001#implementation)`
- **Examples**: `See MDT-001 for details`, `[Previous work](MDT-045.md)`
- **Handling**: React Router `<Link to="/prj/:projectCode/ticket/:ticketKey">`
- **Visual**: Distinct color (purple), ticket icon

#### 3. Document References
- **Patterns**: `docs/*.md`, `*.md`, `./relative/path.md`
- **Examples**: `[Architecture](docs/architecture.md)`, `[Setup](README.md)`
- **Handling**: React Router `<Link to="/prj/:projectCode/documents?doc=...">`
- **Visual**: Document color (green), document icon

#### 4. Section Anchors
- **Patterns**: `#heading`, `MDT-001#implementation`
- **Examples**: `[Jump to solution](#solution-analysis)`, `[See implementation](MDT-001#implementation)`
- **Handling**: 
  - Same-page: Standard `<a href="#...">`
  - Cross-ticket: React Router with hash
- **Visual**: Anchor icon

#### 5. Cross-Project References (Future)
- **Pattern**: `PROJECT-###` (e.g., `API-042`, `WEB-015`)
- **Examples**: `Depends on API-042`
- **Handling**: React Router with project switching
- **Visual**: Project badge

#### 6. File References
- **Patterns**: `*.pdf`, `*.png`, `*.json`, `*.svg`
- **Examples**: `[Diagram](architecture.png)`, `[Config](config.json)`
- **Handling**: 
  - Images: Inline preview or modal
  - Other files: Download or open in viewer
- **Visual**: File type icon

## 4. Implementation Specification

### Phase 1: Foundation (Week 1)
**Goal**: Create core link processing infrastructure

#### 4.1.1 Create Link Processor Utility
**File**: `src/utils/linkProcessor.ts`

**TypeScript Interfaces**:
```typescript
export enum LinkType {
  EXTERNAL = 'external',
  TICKET = 'ticket',
  DOCUMENT = 'document',
  ANCHOR = 'anchor',
  FILE = 'file',
  CROSS_PROJECT = 'cross-project',
  UNKNOWN = 'unknown'
}

export interface ParsedLink {
  type: LinkType;
  href: string;          // Original href value
  text: string;          // Link text content
  projectCode?: string;  // For ticket/document links
  ticketKey?: string;    // For ticket references (e.g., "MDT-001")
  documentPath?: string; // For document references
  anchor?: string;       // Hash fragment (e.g., "#solution")
  isValid?: boolean;     // Link validation result
}
```

**Core Function**:
```typescript
export function classifyLink(
  href: string, 
  currentProject: string
): ParsedLink
```

**Classification Logic**:
1. External URL: `/^https?:\/\//` → `LinkType.EXTERNAL`
2. Ticket reference: `/^([A-Z]+-\d+)(\.md)?(#.*)?$/` → `LinkType.TICKET`
3. Document reference: `/\.md$/` → `LinkType.DOCUMENT`
4. Anchor only: `/^#/` → `LinkType.ANCHOR`
5. File reference: Check extension → `LinkType.FILE`
6. Unknown: `LinkType.UNKNOWN`

**Security Validation**:
```typescript
export function isValidURL(href: string): boolean {
  try {
    const url = new URL(href, window.location.origin);
    // Block dangerous protocols
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    return allowedProtocols.includes(url.protocol);
  } catch {
    return false;
  }
}
```

#### 4.1.2 Create SmartLink Component
**File**: `src/components/SmartLink.tsx`

**Component Interface**:
```typescript
interface SmartLinkProps {
  link: ParsedLink;
  currentProject: string;
  children: React.ReactNode;
  className?: string;
}
```

**Rendering Logic**:
- `LinkType.EXTERNAL`: `<a target="_blank" rel="noopener noreferrer">`
- `LinkType.TICKET`: `<Link to={/prj/${currentProject}/ticket/${ticketKey}}>`
- `LinkType.DOCUMENT`: `<Link to={/prj/${currentProject}/documents?doc=...}>`
- `LinkType.ANCHOR`: `<a href={anchor}>`
- `LinkType.UNKNOWN`: `<span className="broken-link">`

**Styling**:
```typescript
const linkStyles = {
  external: 'text-blue-600 hover:underline external-link',
  ticket: 'text-purple-600 hover:underline ticket-link',
  document: 'text-green-600 hover:underline document-link',
  anchor: 'text-gray-600 hover:underline anchor-link',
  broken: 'text-red-400 line-through broken-link'
};
```

### Phase 2: HTML Post-Processing (Week 1-2)
**Goal**: Transform Showdown HTML to React components

#### 4.2.1 Create MarkdownContent Component
**File**: `src/components/MarkdownContent.tsx`

**Component Interface**:
```typescript
interface MarkdownContentProps {
  markdown: string;
  currentProject: string;
  className?: string;
}
```

**Processing Pipeline**:
1. Convert markdown → HTML using Showdown
2. Parse HTML and find all `<a>` tags
3. Classify each link using `linkProcessor`
4. Replace with `<SmartLink>` components
5. Sanitize output using DOMPurify
6. Render with proper React components

**Implementation Approach**:
```typescript
export function MarkdownContent({ markdown, currentProject, className }: MarkdownContentProps) {
  const processedContent = useMemo(() => {
    // Step 1: Markdown → HTML
    const converter = new Showdown.Converter({
      tables: true,
      tasklists: true,
      ghCodeBlocks: true,
      simpleLineBreaks: true
    });
    const rawHTML = converter.makeHtml(markdown);
    
    // Step 2-4: Parse and classify links
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHTML, 'text/html');
    const links = doc.querySelectorAll('a');
    
    links.forEach((link, index) => {
      const href = link.getAttribute('href') || '';
      const text = link.textContent || '';
      const parsedLink = classifyLink(href, currentProject);
      
      // Store link metadata in data attributes
      link.setAttribute('data-smart-link', JSON.stringify(parsedLink));
      link.setAttribute('data-link-index', index.toString());
    });
    
    // Step 5: Sanitize
    const processedHTML = doc.body.innerHTML;
    return DOMPurify.sanitize(processedHTML, {
      ALLOWED_TAGS: ['a', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                     'code', 'pre', 'ul', 'ol', 'li', 'blockquote',
                     'strong', 'em', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
      ALLOWED_ATTR: ['href', 'data-smart-link', 'data-link-index', 'class', 'id']
    });
  }, [markdown, currentProject]);
  
  return (
    <div 
      className={`markdown-content ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
}
```

**Alternative Approach** (Phase 5 - No dangerouslySetInnerHTML):
- Parse HTML to full React element tree
- Use libraries like `html-react-parser`
- Safer but more complex

### Phase 3: Integration (Week 2)
**Goal**: Update existing components to use new system

#### 4.3.1 Update TicketViewer
**File**: `src/components/TicketViewer.tsx`

**Changes**:
- Replace Showdown rendering with `<MarkdownContent>`
- Pass current project context
- Test ticket → ticket navigation

**Before**:
```typescript
const converter = new Showdown.Converter();
const html = converter.makeHtml(ticket.content);
return <div dangerouslySetInnerHTML={{ __html: html }} />;
```

**After**:
```typescript
import { MarkdownContent } from './MarkdownContent';

return (
  <MarkdownContent 
    markdown={ticket.content}
    currentProject={currentProjectCode}
  />
);
```

#### 4.3.2 Update List Component
**File**: `src/components/List.tsx`

**Changes**:
- Same replacement as TicketViewer
- Ensure links work in list preview mode

#### 4.3.3 Update DocumentsView
**File**: `src/components/DocumentsView/MarkdownViewer.tsx`

**Changes**:
- Replace Showdown rendering
- Handle document-to-document navigation
- Test anchor link navigation within documents

### Phase 4: Enhanced Features (Week 3)
**Goal**: Polish and edge case handling

#### 4.4.1 Link Validation
**Feature**: Detect and highlight broken ticket/document references

**Implementation**:
```typescript
export function validateTicketLink(
  ticketKey: string, 
  availableTickets: Ticket[]
): boolean {
  return availableTickets.some(t => t.code === ticketKey);
}

export function validateDocumentLink(
  docPath: string,
  availableDocuments: string[]
): boolean {
  return availableDocuments.includes(docPath);
}
```

**UI**: Show warning icon for broken references

#### 4.4.2 Hover Tooltips
**Feature**: Show ticket title or document name on hover

**Implementation**:
- Use Radix UI Tooltip or native `title` attribute
- Fetch ticket/document metadata on hover
- Cache results to avoid repeated fetches

#### 4.4.3 Visual Link Icons
**Feature**: Add icons to distinguish link types

**Icons**:
- External: `<ExternalLink />` (lucide-react)
- Ticket: `<FileText />` or custom ticket icon
- Document: `<FileCode />` or `<Book />`
- Anchor: `<Hash />`

### Phase 5: Security & Performance (Week 3-4)
**Goal**: Production-ready hardening

#### 4.5.1 Security Measures

**DOMPurify Integration**:
```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

**Sanitization Config**:
```typescript
const ALLOWED_TAGS = [
  'a', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'code', 'pre', 'ul', 'ol', 'li', 'blockquote',
  'strong', 'em', 'del', 'table', 'thead', 'tbody',
  'tr', 'th', 'td', 'br', 'hr', 'img'
];

const ALLOWED_ATTR = [
  'href', 'title', 'class', 'id',
  'data-smart-link', 'data-link-index',
  'src', 'alt', 'width', 'height' // for images
];
```

**External Link Security**:
```typescript
// Always include for external links
rel="noopener noreferrer"
target="_blank"
```

**URL Protocol Validation**:
```typescript
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];
const BLOCKED_PROTOCOLS = ['javascript:', 'data:', 'file:', 'vbscript:'];
```

#### 4.5.2 Performance Optimization

**Memoization**:
```typescript
const processedHTML = useMemo(() => {
  // Processing logic
}, [markdown, currentProject]);
```

**Lazy Link Validation**:
- Don't validate all links on render
- Validate on hover or click
- Cache validation results

**Code Splitting**:
```typescript
const MarkdownContent = lazy(() => import('./components/MarkdownContent'));
```

### Phase 6: Future Enhancements (Optional)

#### 4.6.1 Migrate to react-markdown
- Evaluate react-markdown library
- Create migration plan
- A/B test performance and compatibility

#### 4.6.2 Advanced Features
- **Link Analytics**: Track which links are clicked most
- **Smart Suggestions**: Autocomplete ticket references in editor
- **Link Preview**: Show preview card on hover
- **Keyboard Navigation**: Arrow keys to navigate between links
- **Link Health Dashboard**: Report on broken links across all tickets

### Technical Requirements

#### Dependencies
```json
{
  "dependencies": {
    "dompurify": "^3.0.6",
    "lucide-react": "^0.292.0" // Already installed
  },
  "devDependencies": {
    "@types/dompurify": "^3.0.5"
  }
}
```

#### TypeScript Configuration
- Strict mode enabled
- No implicit any
- Strict null checks

#### Browser Support
- Modern browsers (ES2020+)
- React Router v6 compatible
- DOMParser API support

### API Changes
No backend API changes required. All processing is client-side.

### Configuration
Optional configuration for link processing:

```typescript
// src/config/linkConfig.ts
export interface LinkConfig {
  enableExternalIcons: boolean;
  enableTooltips: boolean;
  enableValidation: boolean;
  openExternalInNewTab: boolean;
  externalLinkRel: string;
}

export const defaultLinkConfig: LinkConfig = {
  enableExternalIcons: true,
  enableTooltips: true,
  enableValidation: true,
  openExternalInNewTab: true,
  externalLinkRel: 'noopener noreferrer'
};
```

## 5. Acceptance Criteria

### Functional Requirements

#### Must Have (Phase 1-3)
- [ ] Clicking ticket reference (e.g., "MDT-001") opens ticket modal without page reload
- [ ] External links open in new tab with `rel="noopener noreferrer"`
- [ ] Ticket links use React Router `<Link>` component for client-side navigation
- [ ] Document links navigate to documents view
- [ ] Anchor links scroll to correct section
- [ ] Application state preserved during navigation (theme, project selection)
- [ ] Links render with distinct visual styles by type (external=blue, ticket=purple, document=green)
- [ ] TicketViewer, List, and DocumentsView all use unified link processing
- [ ] TypeScript types for all link processing functions and components
- [ ] Browser back/forward buttons work correctly with link navigation

#### Should Have (Phase 4)
- [ ] Broken ticket references show visual warning indicator
- [ ] Hover tooltips show ticket title or document name
- [ ] External link icon (🔗) displays on external links
- [ ] Link validation detects non-existent tickets/documents
- [ ] Support for ticket links with anchors (e.g., "MDT-001#solution")
- [ ] Cross-project ticket references supported (if multiple projects configured)

#### Nice to Have (Phase 5-6)
- [ ] Link click analytics tracked
- [ ] Keyboard navigation between links
- [ ] Link preview cards on hover
- [ ] Broken link dashboard/report
- [ ] Image file references show inline preview

### Non-Functional Requirements

#### Performance
- [ ] Link processing completes within 100ms for typical ticket (5KB markdown)
- [ ] No visible lag when opening tickets with many links
- [ ] Memoization prevents unnecessary re-processing
- [ ] Code splitting reduces initial bundle size

#### Security
- [ ] All HTML sanitized with DOMPurify
- [ ] External links include security attributes
- [ ] JavaScript/data/file protocol URLs blocked
- [ ] No XSS vulnerabilities in link processing
- [ ] Content Security Policy (CSP) compatible

#### Accessibility
- [ ] Links keyboard accessible (Tab navigation)
- [ ] Screen reader announces link type
- [ ] Focus visible on links
- [ ] ARIA labels for icon-only links
- [ ] Color contrast meets WCAG AA standards

#### Browser Compatibility
- [ ] Works in Chrome, Firefox, Safari, Edge (latest versions)
- [ ] Mobile browsers supported
- [ ] DOMParser API available in target browsers

### Testing Requirements

#### Unit Tests (Jest + React Testing Library)
- [ ] `linkProcessor.test.ts`: Test all link classification patterns
- [ ] `SmartLink.test.tsx`: Test rendering for each link type
- [ ] `MarkdownContent.test.tsx`: Test markdown processing pipeline
- [ ] Security: Test XSS prevention, protocol blocking
- [ ] Edge cases: Empty links, malformed URLs, special characters

#### Integration Tests
- [ ] Test TicketViewer → TicketViewer navigation
- [ ] Test List → TicketViewer navigation
- [ ] Test DocumentsView → TicketViewer navigation
- [ ] Test external link opening behavior
- [ ] Test browser history integration

#### E2E Tests (Playwright)
- [ ] User clicks ticket reference and modal opens
- [ ] User clicks external link and new tab opens
- [ ] User clicks document link and documents view loads
- [ ] User clicks anchor link and page scrolls
- [ ] User uses browser back button after clicking link
- [ ] Broken link shows warning indicator

#### Manual Testing Checklist
- [ ] Test all link types in TicketViewer
- [ ] Test all link types in List view
- [ ] Test all link types in Documents view
- [ ] Test link navigation preserves theme preference
- [ ] Test link navigation preserves project selection
- [ ] Test on mobile devices
- [ ] Test with screen reader
- [ ] Test with keyboard-only navigation

### Documentation Requirements
- [ ] Add JSDoc comments to all exported functions
- [ ] Update CLAUDE.md with link processing architecture
- [ ] Create examples of supported link formats in markdown
- [ ] Document link configuration options
- [ ] Add troubleshooting guide for common issues

### Rollback Criteria
- If critical bugs found: Revert MarkdownContent component, restore Showdown rendering
- Rollback flag: `FEATURE_FLAG_SMART_LINKS=false` in environment
- Backward compatibility: Old markdown content must still render correctly

## 6. Implementation Notes

### Development Approach
1. **Branch Strategy**: Create feature branch `feature/smart-link-conversion`
2. **Incremental Rollout**: 
   - Week 1: TicketViewer only
   - Week 2: Add List and DocumentsView
   - Week 3: Polish and edge cases
3. **Feature Flag**: Consider adding feature flag for gradual rollout
4. **Code Review**: Require review of security-critical code (sanitization, URL validation)

### Dependencies and Prerequisites
- MDT-017 must be fully implemented and stable
- React Router v6 installed and working
- Showdown.js existing setup

### Migration Path
No migration needed - enhancement is additive. Existing markdown content works without changes.

### Risk Mitigation
- **Risk**: XSS vulnerabilities in link processing
  - **Mitigation**: Comprehensive security testing, DOMPurify sanitization
- **Risk**: Performance degradation with large documents
  - **Mitigation**: Memoization, profiling, lazy validation
- **Risk**: Breaking existing markdown rendering
  - **Mitigation**: Comprehensive regression tests, feature flag for rollback

## 7. References

### Related Change Requests
- **MDT-017**: Implement URL-based state management for frontend routing and deep linking (Dependency)

### External Resources
- [React Router Documentation](https://reactrouter.com/)
- [Showdown.js Documentation](https://github.com/showdownjs/showdown)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

### Architecture Diagrams
*(To be added during implementation)*
- Link processing flow diagram
- Component architecture diagram
- Link type classification decision tree