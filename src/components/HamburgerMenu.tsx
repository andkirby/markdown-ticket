import React, { useState, useRef, useEffect } from 'react';
import { Menu, Plus, Edit, Hash, Trash2 } from 'lucide-react';
import { Button } from './UI/index';
import { useConfig } from '../hooks/useConfig';
import { clearAllCache, nuclearCacheClear } from '../utils/cache';

interface HamburgerMenuProps {
  onAddProject: () => void;
  onEditProject?: () => void;
  onCounterAPI?: () => void;
  hasActiveProject?: boolean;
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  onAddProject,
  onEditProject,
  onCounterAPI,
  hasActiveProject = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { isCounterAPIEnabled } = useConfig();

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

  const handleEditProject = () => {
    setIsOpen(false);
    onEditProject?.();
  };

  const handleCounterAPI = () => {
    setIsOpen(false);
    onCounterAPI?.();
  };

  const handleClearCache = () => {
    console.log('🔧 Cache clear button clicked');
    setIsOpen(false);
    nuclearCacheClear();
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
            {hasActiveProject && onEditProject && (
              <button
                onClick={handleEditProject}
                className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Project
              </button>
            )}
            {isCounterAPIEnabled() && onCounterAPI && (
              <button
                onClick={handleCounterAPI}
                className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Hash className="h-4 w-4 mr-2" />
                Counter API
              </button>
            )}
            <button
              onClick={handleClearCache}
              className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Cache
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
