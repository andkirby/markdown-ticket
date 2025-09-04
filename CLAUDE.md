# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (React + Vite + TypeScript)
- `npm run dev` - Start frontend development server (localhost:5173)
- `npm run build` - Build for production (TypeScript + Vite)
- `npm run lint` - Run ESLint with TypeScript rules
- `npm run preview` - Preview production build

### Backend (Express.js)
- `npm run dev:server` or `cd server && npm run dev` - Start backend with nodemon (localhost:3001)
- `npm run server` or `cd server && npm start` - Start backend in production mode
- `cd server && npm run create-samples` - Create sample ticket files

### Full Stack Development
- `npm run dev:full` - Start both frontend and backend concurrently (recommended for development)

### Testing
- `npm run test:e2e` - Run Playwright end-to-end tests across browsers
- `npm run test:e2e:ui` - Run Playwright tests with UI
- `npm run test:e2e:headed` - Run Playwright tests in headed mode
- `npm run test:e2e:report` - Show Playwright test report
- `cd server && npm test` - Run backend Jest tests

## Architecture Overview

### Core Concept
This is a Kanban-style ticket board application where tickets are stored as Markdown files in the `docs/CRs/` directory. The application provides real-time synchronization between the file system and the React frontend.

### Frontend Architecture (src/)
- **React Components**: Board, Column, TicketCard components for Kanban interface
- **Services Layer**: 
  - `fileService.ts` - Handles ticket CRUD operations, API calls, and localStorage fallbacks
  - `fileWatcher.ts` - Polls for file system changes and updates UI in real-time
  - `markdownParser.ts` - Parses ticket frontmatter and content
- **State Management**: Custom React hooks, no external state management library
- **Styling**: Tailwind CSS with responsive design and drag-and-drop support

### Backend Architecture (server/)
- **Express.js API**: RESTful endpoints for file operations
- **File System Storage**: Direct markdown file manipulation in `docs/CRs/`
- **API Endpoints**:
  - `GET /api/tasks` - List all ticket files
  - `GET /api/tasks/:filename` - Get specific ticket content
  - `POST /api/tasks/save` - Save ticket file
  - `DELETE /api/tasks/:filename` - Delete ticket file
  - `GET /api/status` - Server health check

### Data Flow
1. Tickets stored as `.md` files with YAML frontmatter in `docs/CRs/`
2. Backend API provides file system access
3. Frontend `fileService` loads tickets via API with localStorage fallback
4. `fileWatcher` polls for changes and triggers UI updates
5. Drag-and-drop operations update ticket status and save via API

## Key Technical Details

### Ticket File Format
Tickets are stored as Markdown files with YAML frontmatter containing metadata (code, title, status, priority, dates, etc.) followed by markdown content.

### Real-time Updates
The `fileWatcher` service polls the `/api/tasks` endpoint every 1 second to detect file changes and automatically updates the UI without page refresh.

### Drag-and-Drop Implementation
Uses HTML5 Drag and Drop API with visual feedback. Status changes trigger API calls to save updated ticket files.

### TypeScript Configuration
Strict TypeScript with bundler module resolution, targeting ES2020, configured for both React JSX and Node.js backend.

### Testing Strategy
- Playwright E2E tests covering Chrome, Firefox, Safari, and mobile viewports
- Tests start both frontend and backend servers automatically
- Backend has Jest unit tests

## Development Tips

### Starting Development
Always use `npm run dev:full` to start both servers simultaneously. Frontend runs on port 5173, backend on port 3001.

### File Watching Behavior
The file watcher automatically detects changes to `.md` files in `docs/CRs/`. You can edit tickets directly in the file system or through the UI.

### API Integration
Frontend uses fetch() to communicate with backend. All file operations go through the API layer with localStorage as fallback for offline functionality.

### Build and Deployment
Run `npm run build` for production build. The application expects the backend server to be running and accessible for full functionality.
- Always follow @docs/create_ticket.md document for managing CRs/bugs, etc.