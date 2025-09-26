import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import SingleProjectView from './components/SingleProjectView';
import MultiProjectDashboard from './components/MultiProjectDashboard';
import TicketViewer from './components/TicketViewer';
import { ProjectSelector } from './components/ProjectSelector';
import { Ticket } from './types';
import { useTheme } from './hooks/useTheme';
import { useMultiProjectData } from './hooks/useMultiProjectData';

type ViewMode = 'single-project' | 'multi-project';

const VIEW_MODE_KEY = 'markdown-ticket-view-mode';

interface ViewModeSwitcherProps {
  viewMode: 'board' | 'list' | 'documents';
  onViewModeChange: (mode: 'board' | 'list' | 'documents') => void;
}

function ViewModeSwitcher({ viewMode, onViewModeChange }: ViewModeSwitcherProps) {
  return (
    <div className="flex space-x-1">
      <button
        onClick={() => onViewModeChange('board')}
        className={`h-12 w-12 rounded-md transition-all ${
          viewMode === 'board'
            ? 'border-2 border-primary'
            : 'border-2 border-transparent hover:border-muted-foreground/30'
        }`}
        title="Board View"
      >
        <img 
          src="/icon_board_col_64.webp" 
          alt="Board" 
          className="w-8 h-8 mx-auto dark:invert"
        />
      </button>
      <button
        onClick={() => onViewModeChange('list')}
        className={`h-12 w-12 rounded-md transition-all ${
          viewMode === 'list'
            ? 'border-2 border-primary'
            : 'border-2 border-transparent hover:border-muted-foreground/30'
        }`}
        title="List View"
      >
        <img 
          src="/icon_list_64.webp" 
          alt="List" 
          className="w-8 h-8 mx-auto dark:invert"
        />
      </button>
      <button
        onClick={() => onViewModeChange('documents')}
        className={`h-12 w-12 rounded-md transition-all ${
          viewMode === 'documents'
            ? 'border-2 border-primary'
            : 'border-2 border-transparent hover:border-muted-foreground/30'
        }`}
        title="Documents View"
      >
        <img 
          src="/icon_docs_64.webp" 
          alt="Documents" 
          className="w-8 h-8 mx-auto dark:invert"
        />
      </button>
    </div>
  );
}

function App() {
  // Initialize view mode from localStorage with fallback to 'single-project'
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    return (saved === 'single-project' || saved === 'multi-project') ? saved : 'single-project';
  });
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  
  // Add internal view mode state for Board/List/Docs
  const [internalViewMode, setInternalViewMode] = useState<'board' | 'list' | 'documents'>(() => {
    const saved = localStorage.getItem('internal-view-mode');
    const validModes = ['board', 'list', 'documents'];
    return (saved && validModes.includes(saved)) ? saved as 'board' | 'list' | 'documents' : 'board';
  });
  
  const { theme, toggleTheme } = useTheme();
  
  // Project management at app level
  const { 
    projects, 
    selectedProject, 
    setSelectedProject, 
    tickets,
    refreshProjects,
    loading: projectsLoading 
  } = useMultiProjectData({ autoSelectFirst: true });

  // Listen for project creation events from SSE
  useEffect(() => {
    const handleProjectCreated = () => {
      console.log('Project created event received, refreshing projects...');
      refreshProjects();
    };

    window.addEventListener('projectCreated', handleProjectCreated);
    return () => window.removeEventListener('projectCreated', handleProjectCreated);
  }, [refreshProjects]);

  // Custom setter that saves to localStorage
  const _setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  };

  // Custom setter for internal view mode
  const setInternalViewModeWithStorage = (mode: 'board' | 'list' | 'documents') => {
    setInternalViewMode(mode);
    localStorage.setItem('internal-view-mode', mode);
  };

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsViewerOpen(true);
  };

  const handleViewerClose = () => {
    setIsViewerOpen(false);
    setSelectedTicket(null);
  };

  // If we're in multi-project mode, skip loading/error states from single project
  if (viewMode === 'multi-project') {
    return (
      <div className="App min-h-screen bg-background">
        {/* Navigation Bar */}
        <nav className="bg-card border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-8">
                <div className="flex-shrink-0">
                  <img src="/logo.jpeg" alt="Logo" className="w-auto dark:invert" style={{ height: '3.8rem' }} />
                </div>
                <ViewModeSwitcher viewMode={internalViewMode} onViewModeChange={setInternalViewModeWithStorage} />
                <ProjectSelector 
                  projects={projects}
                  selectedProject={selectedProject}
                  onProjectSelect={setSelectedProject}
                  loading={projectsLoading}
                />
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleTheme}
                  className="btn btn-ghost p-2 h-10 w-10"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </nav>
        <MultiProjectDashboard selectedProject={selectedProject} />
        <TicketViewer 
          ticket={selectedTicket} 
          isOpen={isViewerOpen} 
          onClose={handleViewerClose} 
        />
      </div>
    );
  }

  return (
    <div className="App min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="bg-card border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="flex-shrink-0">
                <img src="/logo.jpeg" alt="Logo" className="w-auto dark:invert" style={{ height: '3.8rem' }} />
              </div>
              <ViewModeSwitcher viewMode={internalViewMode} onViewModeChange={setInternalViewModeWithStorage} />
              <ProjectSelector 
                projects={projects}
                selectedProject={selectedProject}
                onProjectSelect={setSelectedProject}
                loading={projectsLoading}
              />
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="btn btn-ghost p-2 h-10 w-10"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>
      <SingleProjectView 
        onTicketClick={handleTicketClick} 
        selectedProject={selectedProject} 
        tickets={tickets}
        onAddProject={() => console.log('Add Project from SingleProjectView - need to implement')}
        viewMode={internalViewMode}
        refreshProjects={refreshProjects}
      />
      <TicketViewer 
        ticket={selectedTicket} 
        isOpen={isViewerOpen} 
        onClose={handleViewerClose} 
      />
    </div>
  );
}

export default App;