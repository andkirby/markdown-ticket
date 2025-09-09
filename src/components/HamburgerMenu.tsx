import React, { useState, useRef, useEffect } from 'react';
import { Menu, Plus, RefreshCw } from 'lucide-react';
import { Button } from './UI/index';

interface HamburgerMenuProps {
  onAddProject: () => void;
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({ onAddProject }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddProject = () => {
    setIsOpen(false);
    onAddProject();
  };

  const handleRefreshConfig = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/cache/clear', { method: 'POST' });
      if (response.ok) {
        console.log('Config cache cleared successfully');
        // Refresh the page to reload projects
        window.location.reload();
      } else {
        console.error('Failed to clear config cache');
      }
    } catch (error) {
      console.error('Error clearing config cache:', error);
    } finally {
      setIsRefreshing(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2"
      >
        <Menu className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-md shadow-lg z-50">
          <div className="py-1">
            <button
              onClick={handleAddProject}
              className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </button>
            <button
              onClick={handleRefreshConfig}
              disabled={isRefreshing}
              className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh Config
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
