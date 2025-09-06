import React, { useState, useEffect } from 'react';
import FileTree from './FileTree';
import MarkdownViewer from './MarkdownViewer';

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

  useEffect(() => {
    loadDocuments();
  }, [projectPath]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/documents?projectPath=${encodeURIComponent(projectPath)}`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

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
          <h3 className="font-semibold text-foreground">Documents</h3>
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
