# Frontend Architecture

The Markdown Ticket Board frontend is a modern React application built with TypeScript, providing an intuitive and responsive interface for project management and ticket tracking.

## Key Features

- **🎨 Modern UI/UX**: Clean, responsive design with Tailwind CSS and Radix UI components
- **🌓 Theme Support**: Dark/light mode with system preference detection
- **📱 Responsive Design**: Works seamlessly across desktop, tablet, and mobile devices
- **⚡ Real-time Updates**: Live synchronization using Server-Sent Events (SSE)
- **🎯 Drag & Drop**: Intuitive ticket movement between status columns
- **🔍 Multi-view Support**: Board, List, and Documents view modes
- **🏗️ Multi-project Management**: Switch between projects with persistent state
- **📝 Rich Markdown Rendering**: Syntax highlighting and Mermaid diagram support

## Project Structure

```
src/
├── App.tsx                    # Main application component
├── main.tsx                   # Application entry point
├── index.css                  # Global styles and Tailwind imports
├── components/                # React components
│   ├── UI/                   # Reusable UI components
│   │   ├── Button.tsx        # Custom button component
│   │   ├── Card.tsx          # Card container component
│   │   ├── Modal.tsx         # Modal dialog component
│   │   ├── Toast.tsx         # Toast notification component
│   │   ├── badge.tsx         # Badge/tag component
│   │   ├── scroll-area.tsx   # Custom scroll area
│   │   └── ...               # Other UI primitives
│   ├── Board.tsx             # Kanban board component
│   ├── Column.tsx            # Board column component
│   ├── TicketCard.tsx        # Individual ticket card
│   ├── TicketViewer.tsx      # Ticket detail viewer
│   ├── ProjectSelector.tsx   # Project selection component
│   ├── MultiProjectDashboard.tsx # Multi-project overview
│   ├── SingleProjectView.tsx # Single project board view
│   ├── DocumentsView/        # Document viewer components
│   │   ├── DocumentsLayout.tsx
│   │   ├── FileTree.tsx
│   │   ├── MarkdownViewer.tsx
│   │   └── PathSelector.tsx
│   └── ...                   # Other feature components
├── hooks/                    # Custom React hooks
│   ├── useTicketData.ts      # Ticket data management
│   ├── useMultiProjectData.ts # Multi-project state
│   ├── useConfig.ts          # Configuration management
│   ├── useTheme.ts           # Theme management
│   └── useToast.ts           # Toast notifications
├── services/                 # Frontend services
│   ├── fileWatcher.ts        # SSE connection management
│   ├── markdownParser.ts     # Markdown processing
│   └── realtimeFileWatcher.ts # Real-time updates
├── types/                    # TypeScript type definitions
│   ├── index.ts              # Common types
│   └── ticket.ts             # Ticket-specific types
├── config/                   # Configuration files
│   ├── sorting.ts            # Sort configuration
│   ├── statusConfig.ts       # Status definitions
│   └── ticketAttributes.ts   # Ticket attribute config
└── utils/                    # Utility functions
    ├── sorting.ts            # Sorting utilities
    └── mermaid.ts            # Mermaid diagram rendering
```

## Component Architecture

### Core Application Components

#### App.tsx
The main application component that orchestrates the entire frontend:

```typescript
// Key responsibilities:
- Theme management and persistence
- View mode switching (board/list/documents)
- Project selection state management
- Global error boundary handling
- SSE connection initialization
```

#### MultiProjectDashboard.tsx
Provides overview and management of multiple projects:

```typescript
// Features:
- Project grid layout with visual cards
- Quick project switching
- Project creation and editing
- Project statistics and metadata display
- Search and filtering capabilities
```

#### SingleProjectView.tsx
Focused view for individual project management:

```typescript
// Features:
- Kanban board layout
- Ticket filtering and sorting
- Real-time ticket updates
- Drag-and-drop functionality
- Status column management
```

### UI Component Library

#### Custom UI Components (`components/UI/`)
Reusable components built on top of Radix UI primitives:

- **Button**: Customizable button with variants (primary, secondary, ghost)
- **Card**: Container component with consistent styling
- **Modal**: Accessible modal dialogs with backdrop
- **Toast**: Non-intrusive notification system
- **Badge**: Status and category indicators
- **ScrollArea**: Custom scrollable areas with styled scrollbars

#### Ticket Management Components

**TicketCard.tsx**:
```typescript
// Displays individual tickets with:
- Ticket code and title
- Status and priority badges
- Assignee information
- Drag-and-drop handles
- Quick action buttons
- Hover effects and animations
```

**TicketViewer.tsx**:
```typescript
// Detailed ticket view featuring:
- Full markdown content rendering
- Mermaid diagram support
- Attribute editing capabilities
- Relationship visualization
- Action history tracking
```

**Board.tsx & Column.tsx**:
```typescript
// Kanban board implementation:
- Drag-and-drop between columns
- Status-based column organization
- Real-time updates and animations
- Responsive column sizing
- Empty state handling
```

### State Management

#### Custom Hooks Architecture

**useTicketData.ts**:
```typescript
// Manages ticket state including:
- Ticket fetching and caching
- Real-time update integration
- Optimistic UI updates
- Error handling and retry logic
- Local state synchronization
```

**useMultiProjectData.ts**:
```typescript
// Handles multi-project state:
- Project discovery and loading
- Project switching logic
- Configuration management
- Cross-project data sharing
```

**useTheme.ts**:
```typescript
// Theme management:
- System preference detection
- Theme persistence in localStorage
- CSS custom property updates
- Component re-rendering optimization
```

### Real-time Updates

#### SSE Integration (`services/fileWatcher.ts`)

```typescript
class FileWatcherService {
  // Establishes SSE connection to backend
  // Handles connection lifecycle (connect/disconnect/reconnect)
  // Processes real-time update events
  // Manages connection state and error recovery
}
```

**Update Flow**:
1. Backend file watcher detects changes
2. SSE event broadcast to connected clients
3. Frontend receives and processes update
4. UI components re-render with new data
5. Optimistic updates provide immediate feedback

### Styling Architecture

#### Tailwind CSS Configuration

```javascript
// tailwind.config.js highlights:
- Custom color palette for light/dark themes
- Component-specific utility classes
- Responsive breakpoint definitions
- Animation and transition configurations
- Typography scale and font definitions
```

#### CSS Custom Properties
```css
/* Theme-aware CSS variables */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  /* ... */
}

[data-theme="dark"] {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}
```

## Build & Deploy

### Development Setup

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Run with backend
bun run dev:full
```

### Build Process

```bash
# Production build
bun run build

# Preview production build
bun run preview

# Deploy to GitHub Pages
bun run deploy
```

### Build Configuration

**Vite Configuration** (`vite.config.ts`):
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-scroll-area', '@radix-ui/react-tooltip']
        }
      }
    }
  }
})
```

### Performance Optimizations

#### Code Splitting
- **Route-based splitting**: Lazy loading for different views
- **Component splitting**: Dynamic imports for heavy components
- **Vendor chunking**: Separate chunks for third-party libraries

#### Bundle Optimization
- **Tree shaking**: Eliminates unused code
- **Asset optimization**: Image and font optimization
- **CSS purging**: Removes unused Tailwind classes

#### Runtime Performance
- **React.memo**: Prevents unnecessary re-renders
- **useMemo/useCallback**: Optimizes expensive computations
- **Virtual scrolling**: Handles large ticket lists efficiently

### Testing Strategy

#### End-to-End Testing (Playwright)

```bash
# Run E2E tests
bun run test:e2e

# Run tests with UI
bun run test:e2e:ui

# Run tests in headed mode
bun run test:e2e:headed
```

**Test Coverage**:
- Board loading and rendering
- Drag-and-drop functionality
- Real-time synchronization
- Project switching
- Ticket creation and editing
- Theme switching
- Responsive behavior

#### Component Testing
- Unit tests for utility functions
- Component integration tests
- Hook testing with React Testing Library
- Mock service integration

### Deployment Options

#### GitHub Pages
```bash
bun run deploy
```

#### Static Hosting (Netlify, Vercel)
- Build command: `bun run build`
- Publish directory: `dist`
- Environment variables: Configure API endpoints

#### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 5173
CMD ["npm", "run", "preview"]
```

### Browser Compatibility

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **ES2020 Features**: Native support required
- **CSS Grid/Flexbox**: Full support required
- **WebSocket/SSE**: Native EventSource API support

### Accessibility Features

- **ARIA Labels**: Comprehensive screen reader support
- **Keyboard Navigation**: Full keyboard accessibility
- **Focus Management**: Proper focus handling in modals and dropdowns
- **Color Contrast**: WCAG AA compliant color schemes
- **Semantic HTML**: Proper heading hierarchy and landmarks
