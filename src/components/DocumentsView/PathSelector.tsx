import React, { useState, useEffect } from 'react';
import { Button } from '../UI/index';

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

        // Use only the top-level document_paths from config, not the expanded tree
        const configuredPaths = new Set<string>(data.config?.project?.document_paths || []);
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

  const toggleSelection = (path: string, isFolder: boolean, item?: PathItem) => {
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
    <div className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground mb-2">Select Document Paths</h3>
        <p className="text-sm text-muted-foreground">
          Choose the files and folders you want to include in the documents view.
        </p>
      </div>
      
      <div className="border border-border rounded-lg p-4 max-h-96 overflow-y-auto mb-4">
        {items.map(item => renderItem(item))}
      </div>
      
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {selectedPaths.size} item{selectedPaths.size !== 1 ? 's' : ''} selected
        </div>
        <div className="flex space-x-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={selectedPaths.size === 0}
          >
            Save Selection
          </Button>
        </div>
      </div>
    </div>
  );
}
