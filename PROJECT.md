# MD Ticket Board

A modern, responsive Kanban-style ticket board application built with React, TypeScript, and Tailwind CSS. This application provides an intuitive interface for managing tickets organized by different statuses (Proposed, In Progress, Implemented, Done).

## Features

### Core Functionality
- **Kanban Board Interface**: Drag-and-drop ticket management across columns
- **Markdown-based Tickets**: Tickets stored as individual markdown files
- **Real-time Updates**: File watcher automatically updates the board when tickets change
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Multi-browser Support**: Optimized for Chrome, Firefox, Safari, and mobile browsers

### Ticket Management
- **Ticket Creation**: Add new tickets with title, description, priority, and status
- **Ticket Editing**: Inline editing for ticket properties
- **Drag & Drop**: Move tickets between columns with visual feedback
- **Priority System**: Visual priority indicators (High, Medium, Low)
- **Status Tracking**: Track tickets through different workflow stages

### Technical Implementation
- **Frontend**: React 18 with TypeScript and Tailwind CSS v4
- **Backend**: Node.js server with Express.js
- **File System**: Direct markdown file manipulation with atomic writes
- **State Management**: Custom React hooks for ticket data management
- **Testing**: Comprehensive test suite including unit, component, and E2E tests

## Architecture

### Frontend Structure
```
src/
├── components/
│   ├── Board.tsx          # Main board container
│   ├── Column.tsx         # Individual status columns
│   ├── Ticket.tsx         # Individual ticket components
│   ├── Button.tsx         # Reusable button component
│   ├── Modal.tsx          # Modal dialogs
│   └── Select.tsx         # Select dropdown component
├── services/
│   ├── fileService.ts     # File system operations
│   ├── fileWatcher.ts     # Directory watching
│   └── useTicketData.ts   # State management hook
├── types/
│   └── ticket.ts          # TypeScript interfaces
└── index.css              # Global styles with Tailwind
```

### Backend Structure
```
server/
├── server.js              # Express server
├── routes/
│   └── tickets.js         # API routes
├── services/
│   └── ticketService.js   # Business logic
└── tasks/                 # Sample ticket data
```

### Data Storage
- **Tickets**: Individual markdown files in `server/tasks/`
- **File Structure**: Each ticket is a separate `.md` file
- **Metadata**: Frontmatter contains ticket properties (title, priority, status, etc.)
- **Real-time Updates**: File watcher detects changes and updates UI automatically

### Configuration
#### Task File Path Configuration
The application uses a hardcoded path for task files located at `server/tasks/`. To configure a different path:

1. **Backend Configuration** (`server/server.js`):
   - The `tasksDirectory` variable is set to `path.join(__dirname, 'tasks')`
   - To change the path, modify this line to point to your desired directory
   - Example: `const tasksDirectory = path.join(__dirname, '../my-tasks');`

2. **Frontend Configuration** (`src/services/fileService.ts`):
   - The API base URL is hardcoded to `http://localhost:3001`
   - File operations use the `/api/tickets` endpoint
   - Ensure the backend server is running on the same port

3. **Environment Variables** (Optional):
   - Create a `.env` file in the root directory
   - Add `TASKS_DIR=path/to/your/tasks`
   - Note: Currently the application doesn't read from environment variables, so you'll need to modify the code to use them

#### Current Path Structure
```
md-ticket-board/
├── server/
│   └── tasks/           # Default ticket files location
│       ├── CR-A001.md
│       ├── CR-A002.md
│       └── ...
└── src/
    └── services/
        └── fileService.ts  # Handles file operations
```

#### Changing the Task Directory
1. Create your desired task directory structure
2. Update the `tasksDirectory` path in `server/server.js`
3. Ensure the directory exists and is readable/writable
4. Restart the backend server for changes to take effect

## Development Workflow

### Setup and Installation
```bash
# Clone and install dependencies
cd md-ticket-board
npm install

# Start development servers
npm run dev:full    # Both frontend and backend
npm run server:dev  # Backend only
npm run dev         # Frontend only

# Run tests
npm run test        # Unit and component tests
npm run test:e2e    # End-to-end tests
```

### Available Scripts
- `npm run dev`: Start frontend development server
- `npm run server:dev`: Start backend server
- `npm run dev:full`: Start both servers
- `npm run build`: Build for production
- `npm run test`: Run unit and component tests
- `npm run test:e2e`: Run end-to-end tests
- `npm run lint`: Run ESLint
- `npm run preview`: Preview production build

## Testing Strategy

### Unit Tests
- **File Service**: Testing markdown parsing and file operations
- **Component Tests**: Testing board and column components
- **Integration Tests**: Testing file system integration

### End-to-End Tests
- **Board Loading**: Test initial board rendering and data loading
- **Ticket Management**: Test ticket creation, editing, and movement
- **Error Handling**: Test API error scenarios
- **Responsive Layout**: Test different screen sizes and devices

### Test Coverage
- **Multiple Browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Cross-browser Compatibility**: Ensures consistent experience across browsers
- **Visual Testing**: Verifies UI elements and interactions

## Technology Stack

### Frontend
- **React 18**: Modern React with hooks and concurrent features
- **TypeScript**: Type-safe JavaScript development
- **Tailwind CSS v4**: Utility-first CSS framework
- **Playwright**: E2E testing framework
- **Vite**: Fast build tool and development server

### Backend
- **Node.js**: JavaScript runtime
- **Express.js**: Web framework for API server
- **Nodemon**: Development server with auto-reload

### Development Tools
- **ESLint**: Code linting and style enforcement
- **Prettier**: Code formatting
- **TypeScript**: Static type checking

## Key Features in Detail

### 1. File-based Architecture
- Each ticket is stored as a separate markdown file
- Frontmatter contains structured ticket data
- Atomic file operations prevent data corruption
- Real-time file watching for instant updates

### 2. Drag and Drop Interface
- Native HTML5 drag and drop API
- Visual feedback during drag operations
- Smooth animations and transitions
- Cross-column ticket movement

### 3. Responsive Design
- Mobile-first approach with Tailwind CSS
- Adaptive layouts for different screen sizes
- Touch-friendly interactions on mobile devices
- Optimized for both desktop and mobile workflows

### 4. State Management
- Custom React hooks for local state
- Efficient re-rendering with React.memo
- Debounced file operations for performance
- Optimistic UI updates

### 5. Error Handling
- Graceful API error handling
- File system error recovery
- User-friendly error messages
- Fallback UI states

## Project Status

### Completed Features
✅ **Core Board Functionality**: Basic Kanban board with columns and tickets
✅ **File Service**: Robust file system operations with markdown parsing
✅ **File Watcher**: Real-time directory monitoring for automatic updates
✅ **State Management**: Efficient state management with custom hooks
✅ **UI Components**: Reusable button, modal, and select components
✅ **Tailwind CSS Integration**: Complete conversion to Tailwind CSS v4
✅ **Testing Suite**: Comprehensive unit, component, and E2E tests
✅ **Build Configuration**: Production-ready build setup
✅ **Deployment Scripts**: Automated deployment workflows

### Pending Tasks (TODOs)
🔄 **Task 5.1**: Inline Priority Editor - Implement InlineEditor.tsx
🔄 **Task 5.2**: Extended Form Modal - Implement ExtendedForm.tsx
🔄 **Task 5.3**: Form Sections - Implement form sections
🔄 **Task 6.1**: Suggestion Service - Implement autoSuggest.ts
🔄 **Task 6.2**: Auto-Suggest Component - Implement AutoSuggest.tsx

### Known Issues
⚠️ **E2E Test Setup**: Tests failing due to server startup configuration
⚠️ **TypeScript Configuration**: Node.js type definitions need refinement
⚠️ **Script Dependencies**: Some npm scripts may need adjustment

## Future Enhancements

### Planned Features
- **User Authentication**: Multi-user support with permissions
- **Database Integration**: Replace file system with database backend
- **Collaborative Features**: Real-time collaboration with WebSockets
- **Advanced Filtering**: Search, filter, and sort capabilities
- **Export/Import**: Data export to various formats
- **Themes**: Dark/light theme support
- **Notifications**: Email and in-app notifications
- **Analytics**: Ticket metrics and reporting

### Technical Improvements
- **Performance Optimization**: Lazy loading and virtual scrolling
- **Accessibility**: WCAG compliance improvements
- **Internationalization**: Multi-language support
- **Offline Mode**: Offline functionality with service workers
- **PWA Support**: Progressive Web App features

## Contributing

### Development Guidelines
- Follow TypeScript best practices
- Use ESLint and Prettier for code consistency
- Write comprehensive tests for new features
- Update documentation for significant changes
- Follow semantic versioning for releases

### Code Style
- Use functional components and hooks
- Implement proper error boundaries
- Write descriptive comments for complex logic
- Use TypeScript interfaces for type safety
- Follow React component composition patterns

## License

This project is open source and available under the MIT License.

## Acknowledgments

Built with modern web technologies and following industry best practices for React applications, TypeScript development, and responsive design.