import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/index';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, Folder } from 'lucide-react';

interface DirectoryItem {
  name: string;
  path: string;
  isDirectory: boolean;
}

interface DirectoryListing {
  currentPath: string;
  parentPath: string;
  directories: DirectoryItem[];
}

interface FolderBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFolderSelected: (path: string) => void;
  initialPath?: string;
  title?: string;
}

interface ClickState {
  [path: string]: {
    clickCount: number;
    lastClickTime: number;
  };
}

export default function FolderBrowserModal({
  isOpen,
  onClose,
  onFolderSelected,
  initialPath = '',
  title = 'Select Folder'
}: FolderBrowserModalProps) {
  const [directoryListing, setDirectoryListing] = useState<DirectoryListing | null>(null);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [clickState, setClickState] = useState<ClickState>({});

  useEffect(() => {
    if (isOpen) {
      // Start with initial path or home directory
      const startPath = initialPath || '';
      setCurrentPath(startPath);
      loadFileSystem(startPath);
    }
  }, [isOpen, initialPath]);

  const loadFileSystem = async (path: string = '') => {
    try {
      setLoading(true);
      const response = await fetch(`/api/directories${path ? `?path=${encodeURIComponent(path)}` : ''}`);
      if (response.ok) {
        const data: DirectoryListing = await response.json();
        setDirectoryListing(data);
        if (!selectedPath && data.currentPath) {
          setSelectedPath(data.currentPath);
        }
      } else {
        console.error('API response not ok:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to load file system:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = (path: string) => {
    setCurrentPath(path);
    loadFileSystem(path);
  };

  const navigateUp = () => {
    if (directoryListing?.parentPath) {
      setCurrentPath(directoryListing.parentPath);
      loadFileSystem(directoryListing.parentPath);
    }
  };

  const handleSelect = () => {
    if (selectedPath) {
      onFolderSelected(selectedPath);
      onClose();
    }
  };

  const handleItemClick = (item: DirectoryItem) => {
    if (!item.isDirectory) return;

    const now = Date.now();
    const currentClickState = clickState[item.path] || { clickCount: 0, lastClickTime: 0 };

    // Check if this is a rapid second click (double click behavior)
    const isDoubleClick = now - currentClickState.lastClickTime < 500;

    if (isDoubleClick) {
      // Second click - navigate into folder
      navigateToFolder(item.path);
      setClickState(prev => ({
        ...prev,
        [item.path]: { clickCount: 0, lastClickTime: 0 }
      }));
    } else {
      // First click - select folder
      setSelectedPath(item.path);
      setClickState(prev => ({
        ...prev,
        [item.path]: { clickCount: 1, lastClickTime: now }
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">
              Current: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{directoryListing?.currentPath || 'Loading...'}</code>
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2 hover:bg-gray-100"
          >
            ×
          </Button>
        </div>

        {/* Content */}
        <ScrollArea
          type="hover"
          scrollHideDelay={600}
          className="h-full"
          style={{ height: 'calc(80vh - 180px)' }}
        >
            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-muted-foreground">Loading folders...</div>
                </div>
              ) : !directoryListing || directoryListing.directories.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-muted-foreground">
                    No folders found
                    <div className="text-xs mt-2">
                      Debug: {directoryListing ? `Found ${directoryListing.directories.length} directories` : 'No directory listing'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg">
                  <div className="p-2">
                    {/* Add ".." parent directory link */}
                    {directoryListing.parentPath && (
                      <div
                        className={`flex items-center py-2 px-2 hover:bg-accent rounded cursor-pointer group ${
                          selectedPath === directoryListing.parentPath ? 'bg-primary/10 border-l-2 border-primary' : ''
                        }`}
                        onClick={() => navigateUp()}
                      >
                        <div className="flex items-center flex-1 min-w-0">
                          <Folder className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" />
                          <span className={`text-sm truncate ${
                            selectedPath === directoryListing.parentPath ? 'font-medium text-primary' : 'text-gray-700'
                          }`}>
                            ..
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 mr-2 opacity-0 group-hover:opacity-100" />
                      </div>
                    )}

                    {directoryListing.directories.map(item => {
                      const isSelected = selectedPath === item.path;
                      return (
                        <div
                          key={item.path}
                          className={`flex items-center py-2 px-2 hover:bg-accent rounded cursor-pointer group ${
                            isSelected ? 'bg-primary/10 border-l-2 border-primary' : ''
                          }`}
                          onClick={() => handleItemClick(item)}
                        >
                          <div className="flex items-center flex-1 min-w-0">
                            <Folder className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" />
                            <span className={`text-sm truncate ${
                              isSelected ? 'font-medium text-primary' : 'text-gray-700'
                            }`}>
                              {item.name}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 mr-2 opacity-0 group-hover:opacity-100" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

        {/* Footer */}
        <div className="border-t p-6 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {selectedPath && (
                <span>Selected: <code className="bg-gray-100 px-2 py-1 rounded text-xs max-w-xs truncate inline-block">{selectedPath}</code></span>
              )}
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSelect}
                disabled={!selectedPath}
              >
                Select Folder
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}