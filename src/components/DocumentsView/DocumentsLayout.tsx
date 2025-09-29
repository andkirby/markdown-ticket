import React, { useState, useEffect } from 'react';
import { Pencil, Search, ChevronDown, ChevronUp } from 'lucide-react';
import FileTree from './FileTree';
import MarkdownViewer from './MarkdownViewer';
import PathSelector from './PathSelector';

interface DocumentFile {
  name: string;
  path: string;
  type: 'file' | 'folder';
  title?: string;
  children?: DocumentFile[];
  dateCreated?: Date | string;
  lastModified?: Date | string;
}

interface DocumentsLayoutProps {
  projectPath: string;
}

export default function DocumentsLayout({ projectPath }: DocumentsLayoutProps) {
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<DocumentFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPathSelector, setShowPathSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'title' | 'created' | 'modified'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    setSelectedFile(null); // Clear selected file when project changes
    loadDocuments();
  }, [projectPath]);

  // Filter and sort files
  useEffect(() => {
    let processedFiles = files;

    // Apply filtering
    if (searchQuery.trim()) {
      const filterFiles = (fileList: DocumentFile[]): DocumentFile[] => {
        return fileList.reduce((filtered: DocumentFile[], file) => {
          const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/);
          const fileName = file.name.toLowerCase();
          const fileTitle = file.title?.toLowerCase() || '';

          // Check if all search terms match either filename or title
          const matchesSearch = searchTerms.every(term =>
            fileName.includes(term) || fileTitle.includes(term)
          );

          if (file.type === 'folder') {
            // For folders, filter children and include folder if it has matching children
            const filteredChildren = filterFiles(file.children || []);
            if (filteredChildren.length > 0 || matchesSearch) {
              filtered.push({
                ...file,
                children: filteredChildren
              });
            }
          } else if (matchesSearch) {
            // For files, include if it matches search
            filtered.push(file);
          }

          return filtered;
        }, []);
      };

      processedFiles = filterFiles(files);
    }

    // Apply sorting
    const sortFiles = (fileList: DocumentFile[]): DocumentFile[] => {
      return fileList.map(file => {
        if (file.type === 'folder' && file.children) {
          return {
            ...file,
            children: sortFiles(file.children)
          };
        }
        return file;
      }).sort((a, b) => {
        let aValue: string;
        let bValue: string;

        if (sortBy === 'created' || sortBy === 'modified') {
          // Date-based sorting
          const aDate = sortBy === 'created' ? a.dateCreated : a.lastModified;
          const bDate = sortBy === 'created' ? b.dateCreated : b.lastModified;

          const aTime = aDate ? new Date(aDate).getTime() : 0;
          const bTime = bDate ? new Date(bDate).getTime() : 0;

          const comparison = aTime - bTime;
          return sortDirection === 'asc' ? comparison : -comparison;
        } else {
          // String-based sorting (name, title)
          switch (sortBy) {
            case 'title':
              aValue = a.title || a.name;
              bValue = b.title || b.name;
              break;
            case 'name':
            default:
              aValue = a.name;
              bValue = b.name;
              break;
          }

          const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
          return sortDirection === 'asc' ? comparison : -comparison;
        }
      });
    };

    setFilteredFiles(sortFiles(processedFiles));
  }, [files, searchQuery, sortBy, sortDirection]);

  // Helper function to find file by path in nested structure
  const findFileByPath = (fileList: DocumentFile[], targetPath: string): DocumentFile | null => {
    for (const file of fileList) {
      if (file.path === targetPath) {
        return file;
      }
      if (file.children) {
        const found = findFileByPath(file.children, targetPath);
        if (found) return found;
      }
    }
    return null;
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/documents?projectPath=${encodeURIComponent(projectPath)}`);
      
      if (response.status === 404) {
        // No documents configured, show path selector
        setShowPathSelector(true);
        setFiles([]);
        setFilteredFiles([]);
      } else if (response.ok) {
        const data = await response.json();
        setFiles(data);
        setFilteredFiles(data);
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
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <h3 className="font-semibold text-foreground">Documents</h3>
              <div className="flex items-center space-x-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'title' | 'created' | 'modified')}
                  className="text-xs border border-border rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-28"
                  title="Sort by"
                >
                  <option value="name">Filename</option>
                  <option value="title">Title</option>
                  <option value="created">Created Date</option>
                  <option value="modified">Update Date</option>
                </select>
                <button
                  onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  className="p-1 border border-border rounded bg-background hover:bg-muted transition-colors"
                  title={`Sort ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
                >
                  {sortDirection === 'asc' ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowPathSelector(true)}
              className="p-1 hover:bg-muted rounded transition-colors"
              title="Configure document paths"
            >
              <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
        <div className="p-2">
          <FileTree
            files={filteredFiles}
            onFileSelect={setSelectedFile}
            selectedFile={selectedFile}
          />
        </div>
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        {selectedFile ? (
          <MarkdownViewer
            filePath={selectedFile}
            fileInfo={findFileByPath(filteredFiles, selectedFile)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a document to view
          </div>
        )}
      </div>
    </div>
  );
}
