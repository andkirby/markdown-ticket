import React, { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import Board from './components/Board';
import MultiProjectDashboard from './components/MultiProjectDashboard';
import TicketViewer from './components/TicketViewer';
import { Ticket } from './types';
import { useTheme } from './hooks/useTheme';

type ViewMode = 'single-project' | 'multi-project';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const VIEW_MODE_KEY = 'markdown-ticket-view-mode';

function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
  return (
    <div className="flex rounded-md border border-border bg-muted p-1">
      <button
        onClick={() => onViewModeChange('single-project')}
        className={`flex-1 px-3 py-2 text-sm font-medium rounded-sm transition-all ${
          viewMode === 'single-project'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
        }`}
      >
        Single Project
      </button>
      <button
        onClick={() => onViewModeChange('multi-project')}
        className={`flex-1 px-3 py-2 text-sm font-medium rounded-sm transition-all ${
          viewMode === 'multi-project'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
        }`}
      >
        Multi Project
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
  const { theme, toggleTheme } = useTheme();

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
                <div className="flex justify-center">
                  <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
                </div>
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
      <MultiProjectDashboard />
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
              <div className="flex justify-center">
                <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
              </div>
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
      <Board onTicketClick={handleTicketClick} enableProjectSwitching={true} />
      <TicketViewer 
        ticket={selectedTicket} 
        isOpen={isViewerOpen} 
        onClose={handleViewerClose} 
      />
    </div>
  );
}

export default App;