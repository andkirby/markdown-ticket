# Ticket Task Board - Architecture Guide

## Project Overview
A React/TypeScript application for managing Change Request (CR) markdown files as an interactive task board with real-time file synchronization.

## Project Structure
```
md-ticket-board/
├── src/
│   ├── components/
│   │   ├── Board/
│   │   │   ├── Board.tsx
│   │   │   ├── Column.tsx
│   │   │   └── TicketCard.tsx
│   │   ├── Editor/
│   │   │   ├── InlineEditor.tsx
│   │   │   ├── ExtendedForm.tsx
│   │   │   └── AutoSuggest.tsx
│   │   ├── Layout/
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   └── UI/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       └── Select.tsx
│   ├── config/
│   │   ├── ticketAttributes.ts
│   │   ├── statusConfig.ts
│   │   └── priorities.ts
│   ├── services/
│   │   ├── fileService.ts
│   │   ├── ticketParser.ts
│   │   └── autoSuggest.ts
│   ├── types/
│   │   ├── ticket.ts
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useTicketData.ts
│   │   ├── useAutoSuggest.ts
│   │   └── useFileWatcher.ts
│   ├── utils/
│   │   ├── markdownParser.ts
│   │   ├── dateUtils.ts
│   │   └── validation.ts
│   └── App.tsx
├── public/
├── package.json
├── tsconfig.json
└── README.md
```

## Comprehensive Configuration

### CR Attribute Configuration (`src/config/ticketAttributes.ts`)

```typescript
export const CR_ATTRIBUTES = {
  // Required Core Attributes
  code: { type: 'string', pattern: /^[A-Z]{2,}-[A-Z]\d{3}$/, required: true },
  title: { type: 'string', required: true },
  status: { 
    type: 'enum', 
    required: true,
    values: [
      'Proposed', 'Approved', 'In Progress', 'Implemented', 'On Hold',
      'Rejected', 'Superseded', 'Deprecated', 'Duplicate', 'Partially Implemented'
    ]
  },
  dateCreated: { type: 'date', required: true },
  type: {
    type: 'enum',
    required: true,
    values: [
      'Feature Enhancement', 'Bug Fix', 'Technical Debt', 
      'Architecture', 'Documentation'
    ]
  },
  priority: {
    type: 'enum',
    required: true,
    values: ['Low', 'Medium', 'High', 'Critical']
  },
  phaseEpic: {
    type: 'enum',
    required: true,
    values: ['Phase A (Foundation)', 'Phase B (Enhancement)', 'Phase C', 'Phase D']
  },

  // Optional Attributes
  source: {
    type: 'enum',
    values: ['User Request', 'Technical Debt', 'Bug Report', 'Performance Issue']
  },
  impact: {
    type: 'enum',
    values: ['Major', 'Minor', 'Patch']
  },
  effort: {
    type: 'enum',
    values: ['Small', 'Medium', 'Large']
  },
  relatedTickets: { type: 'array<string>', pattern: /^[A-Z]{2,}-[A-Z]\d{3}$/' },
  supersedes: { type: 'string', pattern: /^[A-Z]{2,}-[A-Z]\d{3}$/' },
  dependsOn: { type: 'array<string>', pattern: /^[A-Z]{2,}-[A-Z]\d{3}$/' },
  blocks: { type: 'array<string>', pattern: /^[A-Z]{2,}-[A-Z]\d{3}$/' },
  relatedDocuments: { type: 'array<string>' },
  implementationDate: { type: 'date' },
  implementationNotes: { type: 'string' }
};
```

### Status Configuration (`src/config/statusConfig.ts`)

```typescript
export const STATUS_CONFIG = {
  columns: [
    { id: 'proposed', title: 'Proposed', status: 'Proposed' },
    { id: 'approved', title: 'Approved', status: 'Approved' },
    { id: 'in-progress', title: 'In Progress', status: 'In Progress' },
    { id: 'implemented', title: 'Implemented', status: 'Implemented' },
    { id: 'on-hold', title: 'On Hold', status: 'On Hold' },
    { id: 'resolution', title: 'Resolution', 
      statuses: ['Rejected', 'Superseded', 'Deprecated', 'Duplicate', 'Partially Implemented'] }
  ],
  workflow: {
    'Proposed': ['Approved', 'Rejected'],
    'Approved': ['In Progress', 'On Hold'],
    'In Progress': ['Implemented', 'On Hold', 'Partially Implemented'],
    'On Hold': ['In Progress', 'Approved'],
    'Implemented': [],
    'Rejected': [],
    'Superseded': [],
    'Deprecated': [],
    'Duplicate': [],
    'Partially Implemented': ['Implemented']
  }
};
```

## Data Models

### Ticket Interface (`src/types/Ticket.ts`)

```typescript
interface Ticket {
  // Required Core Attributes
  code: string;
  title: string;
  status: string;
  dateCreated: Date;
  type: string;
  priority: string;
  phaseEpic: string;

  // Optional Attributes
  source?: string;
  impact?: string;
  effort?: string;
  relatedTickets?: string[];
  supersedes?: string;
  dependsOn?: string[];
  blocks?: string[];
  relatedDocuments?: string[];
  implementationDate?: Date;
  implementationNotes?: string;

  // Derived/System Fields
  filePath: string;
  lastModified: Date;
  content: string; // Full markdown content
}

interface TicketUpdate {
  code: string;
  updates: Partial<Ticket>;
  updateImplementationDate?: boolean;
}
```

## Board View Design

### Column Configuration
Each column corresponds to a status category with specific display rules:
- **Board View Display**: code, title, dateCreated, priority, type
- **Quick Actions**: Priority editing (inline dropdown)
- **Card Indicators**: Color-coded by priority, type icons

### Editing Mechanisms

**Inline Editing (Priority):**
- Single-click on priority badge
- Dropdown with all priority options
- Immediate save on selection change
- Visual feedback during update

**Extended Form Editing:**
- Triggered by edit (pencil) icon
- Modal popup with form sections:
  - Core Attributes (read-only: code, title, type, phaseEpic)
  - Status Management (dropdown with workflow validation)
  - Optional Attributes (source, impact, effort)
  - Relationships (auto-suggest for relatedCRs, dependsOn, blocks)
  - Implementation Details (notes, auto-date on status change)
- Form validation against attribute configuration
- Save/Cancel actions

## File System Integration

### File Service (`src/services/fileService.ts`)
```typescript
interface FileService {
  readCRDirectory(path: string): Promise<CR[]>;
  readCRFile(filePath: string): Promise<CR>;
  writeCRFile(cr: CR): Promise<void>;
  watchCRDirectory(path: string, callback: (event: FileEvent) => void): void;
  parseMarkdownHeader(content: string): Record<string, string>;
  generateMarkdownContent(cr: CR): string;
}

interface FileEvent {
  type: 'create' | 'update' | 'delete';
  filePath: string;
  cr?: CR;
}
```

### Markdown Parsing Strategy
- Parse YAML-like header section for attributes
- Preserve original content structure and formatting
- Handle multi-line values and complex formatting
- Maintain comments and non-header content intact

## Auto-Suggestion System

### Auto-Suggest Service (`src/services/autoSuggest.ts`)
```typescript
interface AutoSuggestService {
  suggestCRs(query: string, currentCR?: string): Promise<Suggestion[]>;
  getCRByCode(code: string): Promise<CR | undefined>;
  getCRsByTitlePattern(pattern: string): Promise<CR[]>;
}

interface Suggestion {
  code: string;
  title: string;
  type: string;
  status: string;
  matchScore: number;
}
```

**Suggestion Logic:**
- Search by CR code (prefix matching)
- Search by title keywords
- Prioritize exact matches
- Exclude current CR from suggestions
- Cache results for performance

## Real-time Updates

### Synchronization Strategy
1. **File Watcher**: Monitor tickets directory for changes
2. **Debounced Updates**: Batch rapid changes to avoid thrashing
3. **Conflict Resolution**: Detect and handle concurrent modifications
4. **State Management**: React Query or SWR for optimistic updates
5. **Error Handling**: Rollback on write failures with user notification

### Implementation Date Automation
- Hook on status change to 'Implemented'
- Set implementationDate to current date
- Only update if not already set
- Provide override option in extended form

## Technology Stack Recommendations

**Core Dependencies:**
- React 18+ with TypeScript
- React DnD for drag-and-drop
- React Hook Form for form management
- Zod for validation
- Chakra UI or Material-UI for components
- date-fns for date handling

**Development Tools:**
- Vite for fast development
- ESLint + Prettier for code quality
- Jest + React Testing Library
- Storybook for component development

## Performance Considerations

- Virtualized lists for large board views
- Debounced file system operations
- Indexed CR data for fast searches
- Efficient markdown parsing
- Memory management for file watchers

This architecture provides a solid foundation for a responsive, real-time CR management board that maintains synchronization with underlying markdown files while offering a modern, interactive user experience.