import React, { useState } from 'react';
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
  viewMode: string;
  onViewModeChange: (mode: string) => void;
}

function ViewModeSwitcher({ viewMode, onViewModeChange }: ViewModeSwitcherProps) {
  return (
    <div className="flex space-x-1">
      <button
        onClick={() => onViewModeChange('board')}
        className={`p-2 rounded-md transition-all ${
          viewMode === 'board'
            ? 'border-2 border-primary'
            : 'border-2 border-transparent hover:border-muted-foreground/30'
        }`}
        title="Board View"
        style={{
          backgroundImage: 'url(/icon_board_col_64.webp)',
          backgroundSize: '20px 20px',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          width: '32px',
          height: '32px'
        }}
      />
      <button
        onClick={() => onViewModeChange('list')}
        className={`p-2 rounded-md transition-all ${
          viewMode === 'list'
            ? 'border-2 border-primary'
            : 'border-2 border-transparent hover:border-muted-foreground/30'
        }`}
        title="List View"
        style={{
          backgroundImage: 'url(/icon_list_64.webp)',
          backgroundSize: '20px 20px',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          width: '32px',
          height: '32px'
        }}
      />
      <button
        onClick={() => onViewModeChange('docs')}
        className={`p-2 rounded-md transition-all ${
          viewMode === 'docs'
            ? 'border-2 border-primary'
            : 'border-2 border-transparent hover:border-muted-foreground/30'
        }`}
        title="Documents View"
        style={{
          backgroundImage: 'url(/icon_docs_64.webp)',
          backgroundSize: '20px 20px',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          width: '32px',
          height: '32px'
        }}
      />
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
  const { theme, toggleTheme } = useTheme();
  
  // Project management at app level
  const { projects, selectedProject, setSelectedProject, loading: projectsLoading } = useMultiProjectData({ autoSelectFirst: true });

  // Custom setter that saves to localStorage
  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
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
                <ViewModeSwitcher viewMode="board" onViewModeChange={() => {}} />
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
              <ViewModeSwitcher viewMode="board" onViewModeChange={() => {}} />
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
        onAddProject={() => console.log('Add Project from SingleProjectView - need to implement')}
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