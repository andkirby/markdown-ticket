# MD Ticket Board - Setup Guide

## Overview
This is a Markdown-based ticket board application with a React frontend and Express.js backend. The application allows you to manage tickets stored as Markdown files with a drag-and-drop Kanban board interface.

## Architecture
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Express.js server with file system integration
- **Data Storage**: Markdown files in the `server/tasks/` directory
- **Real-time Updates**: File watcher for automatic ticket updates

## Prerequisites
- Node.js (v18 or higher)
- npm or yarn

## Setup Instructions

### 1. Install Dependencies
```bash
# Install frontend dependencies
cd md-ticket-board
npm install

# Install server dependencies
cd server
npm install
```

### 2. Create Sample Tickets (Optional)
To populate the board with sample data, run:
```bash
cd server
npm run create-samples
```

This will create 4 sample tickets in the `server/tasks/` directory:
- CR-A001: User authentication system (In Progress)
- CR-A002: Mobile responsive design fixes (Proposed)
- CR-A003: Comprehensive error handling (Approved)
- CR-B001: Dark mode support (Implemented)

### 3. Start the Application

#### Option A: Full Development Mode (Recommended)
```bash
cd md-ticket-board
npm run dev:full
```
This starts both the frontend (port 5173) and backend (port 3001) servers with automatic restart on file changes.

#### Option B: Separate Servers
```bash
# Terminal 1 - Frontend
cd md-ticket-board
npm run dev

# Terminal 2 - Backend
cd md-ticket-board/server
npm run dev
```

### 4. Access the Application
Open your browser and navigate to: `http://localhost:5173`

## API Endpoints

The backend server provides the following API endpoints (proxied through the frontend):

- `GET /api/status` - Server status and configuration
- `GET /api/tasks` - List all ticket files
- `GET /api/tasks/:filename` - Get specific ticket content
- `POST /api/tasks/save` - Save ticket file
- `DELETE /api/tasks/:filename` - Delete ticket file

## File Structure

```
md-ticket-board/
├── src/                    # React frontend source code
│   ├── components/         # React components
│   ├── services/          # Business logic services
│   ├── hooks/             # Custom React hooks
│   ├── types/             # TypeScript type definitions
│   └── config/            # Configuration files
├── server/                # Express.js backend
│   ├── server.js          # Main server file
│   ├── tasks/             # Markdown ticket files
│   └── createSampleTickets.js  # Sample data generator
├── public/                # Static assets
└── package.json           # Frontend dependencies and scripts
```

## Development Workflow

### Adding New Tickets
1. Create a new Markdown file in the `server/tasks/` directory
2. Follow the front matter format shown in existing tickets
3. The file watcher will automatically detect and load the new ticket

### Modifying Existing Tickets
1. Edit the Markdown files directly in `server/tasks/`
2. Changes are automatically detected and reflected in the UI
3. Or use the web interface to modify tickets

### Ticket Status Flow
- **Proposed** → **Approved** → **In Progress** → **Implemented** → **Closed**

## Key Features

### File Service (`src/services/fileService.ts`)
- Loads tickets from Markdown files
- Fallback to localStorage if files are unavailable
- Automatic ticket parsing and validation

### File Watcher (`src/services/fileWatcher.ts`)
- Monitors the tasks directory for changes
- Automatically updates the UI when files are modified
- Supports file creation, modification, and deletion

### State Management (`src/hooks/useTicketData.ts`)
- Manages ticket state and loading
- Handles drag-and-drop operations
- Integrates with file watcher for real-time updates

### Markdown Parser (`src/services/markdownParser.ts`)
- Parses front matter from Markdown files
- Converts between ticket objects and Markdown format
- Handles date parsing and validation

## Configuration

### Environment Variables
The application uses the following environment variables (with defaults):

- `PORT`: Backend server port (default: 3001)
- `VITE_API_BASE_URL`: API base URL for production

### Tailwind CSS
The application uses Tailwind CSS for styling. Configuration is in:
- `tailwind.config.js` - Tailwind configuration
- `postcss.config.js` - PostCSS configuration
- `src/index.css` - Global styles with Tailwind imports

## Scripts

### Frontend Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Backend Scripts
- `npm run start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run create-samples` - Create sample ticket data
- `npm run test` - Run tests
- `npm run lint` - Run ESLint

### Combined Scripts
- `npm run dev:full` - Start both frontend and backend in development mode
- `npm run server:dev` - Start backend from root directory

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   - Change the port in `vite.config.js` (frontend) or `server.js` (backend)
   - Or kill the existing process: `lsof -ti:5173 | xargs kill -9`

2. **File Permission Issues**
   - Ensure the `server/tasks/` directory is writable
   - Check file permissions on the project directory

3. **CORS Issues**
   - The proxy configuration in `vite.config.js` handles CORS
   - Make sure both servers are running when testing

4. **Module Not Found Errors**
   - Run `npm install` in both the root and server directories
   - Check that all dependencies are properly installed

### Debug Mode
Enable debug logging by setting the `DEBUG` environment variable:
```bash
DEBUG=* npm run dev:full
```

## Deployment

### Production Build
```bash
# Build frontend
cd md-ticket-board
npm run build

# Start backend
cd server
npm start
```

### Environment Setup
1. Set the `VITE_API_BASE_URL` environment variable
2. Ensure the tasks directory is writable
3. Configure any reverse proxy as needed

## Contributing

1. Follow the existing code style and patterns
2. Add tests for new functionality
3. Update documentation as needed
4. Test both frontend and backend changes

## License
This project is open source and available under the MIT License.