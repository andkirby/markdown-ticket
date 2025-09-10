import React, { useState, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import FileTree from './FileTree';
import MarkdownViewer from './MarkdownViewer';
import PathSelector from './PathSelector';

interface DocumentFile {
  name: string;
  path: string;
  type: 'file' | 'folder';
  title?: string;
  children?: DocumentFile[];
}

interface DocumentsLayoutProps {
  projectPath: string;
}

export default function DocumentsLayout({ projectPath }: DocumentsLayoutProps) {
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPathSelector, setShowPathSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedFile(null); // Clear selected file when project changes
    loadDocuments();
  }, [projectPath]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/documents?projectPath=${encodeURIComponent(projectPath)}`);
      
      if (response.status === 404) {
        // No documents configured, show path selector
        setShowPathSelector(true);
        setFiles([]);
      } else if (response.ok) {
        const data = await response.json();
        setFiles(data);
        setShowPathSelector(false);
      } else {
        throw new Error(`Failed to load documents: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
      setError(error instanceof Error ? error.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handlePathsSelected = async (paths: string[]) => {
    try {
      // Save the selected paths to configuration
      const response = await fetch('/api/documents/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectPath,
          documentPaths: paths
        })
      });

      if (response.ok) {
        // Reload documents after configuration
        await loadDocuments();
      } else {
        throw new Error('Failed to save document configuration');
      }
    } catch (error) {
      console.error('Failed to configure documents:', error);
      setError(error instanceof Error ? error.message : 'Failed to configure documents');
    }
  };

  const handleCancelPathSelection = () => {
    setShowPathSelector(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading documents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-destructive mb-2">Error loading documents</div>
          <div className="text-sm text-muted-foreground">{error}</div>
        </div>
      </div>
    );
  }

  if (showPathSelector) {
    return (
      <PathSelector
        projectPath={projectPath}
        onPathsSelected={handlePathsSelected}
        onCancel={handleCancelPathSelection}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-1/3 border-r border-border bg-muted/30">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Documents</h3>
            <button
              onClick={() => setShowPathSelector(true)}
              className="p-1 hover:bg-muted rounded transition-colors"
              title="Configure document paths"
            >
              <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        </div>
        <div className="p-2">
          <FileTree 
            files={files} 
            onFileSelect={setSelectedFile}
            selectedFile={selectedFile}
          />
        </div>
      </div>
      <div className="flex-1">
        {selectedFile ? (
          <MarkdownViewer filePath={selectedFile} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a document to view
          </div>
        )}
      </div>
    </div>
  );
}
