import React, { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/UI/scroll-area';

interface PathItem {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: PathItem[];
  selected?: boolean;
}

interface PathSelectorProps {
  projectId: string;
  onPathsSelected: (paths: string[]) => void;
  onCancel: () => void;
}

export default function PathSelector({ projectId, onPathsSelected, onCancel }: PathSelectorProps) {
  const [items, setItems] = useState<PathItem[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFileSystem();
    loadCurrentDocumentPaths();
  }, [projectId]);

  const loadCurrentDocumentPaths = async () => {
    try {
      // Get the actual configured paths from the config file
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/config`);

      if (response.ok) {
        const data = await response.json();

        // Use only the top-level document paths from config, not the expanded tree
        const configuredPaths = new Set<string>(data.config?.document?.paths || data.config?.project?.document_paths || []);
        setSelectedPaths(configuredPaths);
      }
    } catch (error) {
      console.log('No existing document configuration found');
    }
  };

  const loadFileSystem = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/filesystem?projectId=${encodeURIComponent(projectId)}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Failed to load file system:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (path: string, _isFolder: boolean, _item?: PathItem) => {
    const newSelected = new Set(selectedPaths);

    // Simple toggle - don't auto-select/deselect children
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }

    setSelectedPaths(newSelected);
  };

  const renderItem = (item: PathItem, depth = 0) => {
    const isSelected = selectedPaths.has(item.path);

    const hasSelectedChildren = Array.from(selectedPaths).some(path =>
      path.startsWith(item.path + '/') && path !== item.path
    );

    return (
      <div key={item.path} style={{ marginLeft: `${depth * 20}px` }}>
        <label
          className="flex items-center py-1 hover:bg-accent rounded cursor-pointer"
          htmlFor={`checkbox-${item.path}`}
        >
          <input
            id={`checkbox-${item.path}`}
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelection(item.path, item.type === 'folder', item)}
            className="mr-2 cursor-pointer"
          />
          <span className={`text-sm ${item.type === 'folder' ? 'font-medium' : ''} ${hasSelectedChildren ? 'text-primary' : ''}`}>
            {item.type === 'folder' ? '📁' : '📄'} {item.name}
          </span>
        </label>
        {item.children && item.children.map(child => renderItem(child, depth + 1))}
      </div>
    );
  };

  const handleSave = () => {
    onPathsSelected(Array.from(selectedPaths));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading file system...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[70vh]">
      {/* Fixed Header */}
      <div className="flex-shrink-0 p-6 border-b">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Select Document Paths</h3>
        <p className="text-sm text-gray-600">
          Choose the files and folders you want to include in the documents view.
        </p>
      </div>

      {/* Scrollable Content Area */}
      <ScrollArea
        type="hover"
        scrollHideDelay={600}
        className="flex-1"
        style={{ height: 'calc(80vh - 250px)' }}
      >
          <div className="p-6">
            <div className="border border-gray-200 rounded-lg">
              <div className="p-4">
                {items.map(item => renderItem(item))}
              </div>
            </div>
          </div>
        </ScrollArea>

      {/* Fixed Footer */}
      <div className="flex-shrink-0 border-t p-6">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedPaths.size} item{selectedPaths.size !== 1 ? 's' : ''} selected
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={selectedPaths.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
