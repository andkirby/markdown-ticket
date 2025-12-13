import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import ProjectView from './components/ProjectView';
import TicketViewer from './components/TicketViewer';
import { EventHistory } from './components/DevTools/EventHistory';
import { ProjectSelector, getProjectCode } from './components/ProjectSelector';
import { RedirectToCurrentProject } from './components/RedirectToCurrentProject';
import { DirectTicketAccess } from './components/DirectTicketAccess';
import { RouteErrorModal } from './components/RouteErrorModal';
import { Ticket } from './types';
import { useTheme } from './hooks/useTheme';
import { useProjectManager } from './hooks/useProjectManager';
import { normalizeTicketKey, setCurrentProject, validateProjectCode } from './utils/routing';
import './utils/cache'; // Import cache utilities for development
import './services/sseClient'; // Initialize SSE connection
import { Toaster } from './components/UI/sonner';

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

function ProjectRouteHandler() {
  const { projectCode } = useParams<{ projectCode: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { theme, toggleTheme } = useTheme();
  
  const { 
    projects, 
    selectedProject, 
    setSelectedProject, 
    tickets,
    refreshProjects,
    loading: projectsLoading 
  } = useProjectManager({ autoSelectFirst: false, handleSSEEvents: true });

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Determine current view mode from URL
  const getCurrentViewMode = (): 'board' | 'list' | 'documents' => {
    if (location.pathname.includes('/list')) return 'list';
    if (location.pathname.includes('/documents')) return 'documents';
    return 'board';
  };

  const viewMode = getCurrentViewMode();

  // Handle project selection and validation
  useEffect(() => {
    if (projectsLoading) {
      setError(null); // Clear errors when loading
      return;
    }
    
    if (!projectCode) return;

    // Validate project code format
    if (!validateProjectCode(projectCode)) {
      setError(`Invalid project code format: '${projectCode}'`);
      return;
    }

    const project = projects.find(p => getProjectCode(p) === projectCode);
    if (!project) {
      setError(`Project '${projectCode}' not found`);
      return;
    }

    if (!selectedProject || getProjectCode(selectedProject) !== projectCode) {
      setSelectedProject(project);
      setCurrentProject(projectCode);
    }
    setError(null);
  }, [projectCode, projects, projectsLoading, selectedProject, setSelectedProject]);

  // Handle ticket modal from URL
  useEffect(() => {
    const ticketMatch = location.pathname.match(/\/ticket\/([^\/]+)/);
    if (ticketMatch) {
      const ticketKey = normalizeTicketKey(ticketMatch[1]);
      const ticket = tickets.find(t => t.code === ticketKey);
      if (ticket) {
        setSelectedTicket(ticket);
        setError(null); // Clear any previous error
      } else if (!projectsLoading && selectedProject) {
        // Only set error if projects are loaded and we have a selected project with loaded tickets
        // This prevents false errors during initial loading
        setError(`Ticket '${ticketMatch[1]}' not found`);
      }
    } else {
      setSelectedTicket(null);
    }
  }, [location.pathname, tickets, projectsLoading, selectedProject]);

  const handleViewModeChange = (mode: 'board' | 'list' | 'documents') => {
    const basePath = `/prj/${projectCode}`;
    const newPath = mode === 'board' ? basePath : `${basePath}/${mode}`;
    // Store current view mode preference
    localStorage.setItem('lastViewMode', mode);
    navigate(newPath);
  };

  const handleProjectSelect = (project: any) => {
    // Preserve current view mode when switching projects
    const lastViewMode = localStorage.getItem('lastViewMode') || 'board';
    const projectCode = getProjectCode(project);
    const basePath = `/prj/${projectCode}`;
    const newPath = lastViewMode === 'board' ? basePath : `${basePath}/${lastViewMode}`;
    navigate(newPath);
  };

  const handleTicketClick = (ticket: Ticket) => {
    const viewParam = viewMode !== 'board' ? `?view=${viewMode}` : '';
    navigate(`/prj/${projectCode}/ticket/${ticket.code}${viewParam}`);
  };

  const handleTicketClose = () => {
    const viewContext = searchParams.get('view') || 'board';
    const basePath = `/prj/${projectCode}`;
    const targetPath = viewContext === 'board' ? basePath : `${basePath}/${viewContext}`;
    navigate(targetPath);
  };

  if (projectsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return <RouteErrorModal error={error} />;
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
              <ViewModeSwitcher viewMode={viewMode} onViewModeChange={handleViewModeChange} />
              <ProjectSelector 
                projects={projects}
                selectedProject={selectedProject}
                onProjectSelect={handleProjectSelect}
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
      
      <ProjectView 
        onTicketClick={handleTicketClick}
        selectedProject={selectedProject} 
        tickets={tickets}
        viewMode={viewMode}
        refreshProjects={refreshProjects}
      />
      
      <TicketViewer 
        ticket={selectedTicket} 
        isOpen={!!selectedTicket} 
        onClose={handleTicketClose} 
      />

      <EventHistory />
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RedirectToCurrentProject />} />
        <Route path="/:ticketKey" element={<DirectTicketAccess />} />
        <Route path="/prj/:projectCode" element={<ProjectRouteHandler />} />
        <Route path="/prj/:projectCode/list" element={<ProjectRouteHandler />} />
        <Route path="/prj/:projectCode/documents" element={<ProjectRouteHandler />} />
        <Route path="/prj/:projectCode/ticket/:ticketKey" element={<ProjectRouteHandler />} />
        <Route path="*" element={<RouteErrorModal error="Page not found" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;