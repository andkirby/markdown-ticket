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
  projectPath: string;
  onPathsSelected: (paths: string[]) => void;
  onCancel: () => void;
}

export default function PathSelector({ projectPath, onPathsSelected, onCancel }: PathSelectorProps) {
  const [items, setItems] = useState<PathItem[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFileSystem();
    loadCurrentDocumentPaths();
  }, [projectPath]);

  const loadCurrentDocumentPaths = async () => {
    try {
      // Try to get current document configuration
      const response = await fetch(`/api/documents?projectPath=${encodeURIComponent(projectPath)}`);
      
      if (response.ok) {
        const documents = await response.json();
        
        // Extract the configured paths from the documents
        const configuredPaths = new Set<string>();
        documents.forEach((doc: any) => {
          if (doc.path) {
            // Convert absolute path back to relative path for selection
            const relativePath = doc.path.replace(projectPath + '/', '');
            configuredPaths.add(relativePath);
          }
        });
        
        setSelectedPaths(configuredPaths);
      }
    } catch (error) {
      console.log('No existing document configuration found');
    }
  };

  const loadFileSystem = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/filesystem?path=${encodeURIComponent(projectPath)}`);
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

  const toggleSelection = (path: string, isFolder: boolean) => {
    const newSelected = new Set(selectedPaths);
    
    if (newSelected.has(path)) {
      newSelected.delete(path);
      // Remove all children if deselecting a folder
      if (isFolder) {
        Array.from(newSelected).forEach(selectedPath => {
          if (selectedPath.startsWith(path + '/')) {
            newSelected.delete(selectedPath);
          }
        });
      }
    } else {
      newSelected.add(path);
    }
    
    setSelectedPaths(newSelected);
  };

  const renderItem = (item: PathItem, depth = 0) => {
    // Convert absolute path to relative path for comparison
    const relativePath = item.path.replace(projectPath + '/', '');
    const isSelected = selectedPaths.has(relativePath);
    
    const hasSelectedChildren = Array.from(selectedPaths).some(path => 
      path.startsWith(relativePath + '/') && path !== relativePath
    );

    return (
      <div key={item.path} style={{ marginLeft: `${depth * 20}px` }}>
        <div className="flex items-center py-1 hover:bg-accent rounded">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelection(relativePath, item.type === 'folder')}
            className="mr-2"
          />
          <span className={`text-sm ${item.type === 'folder' ? 'font-medium' : ''} ${hasSelectedChildren ? 'text-primary' : ''}`}>
            {item.type === 'folder' ? '📁' : '📄'} {item.name}
          </span>
        </div>
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
