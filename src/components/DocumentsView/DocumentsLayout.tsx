import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pencil, Search, ChevronDown, ChevronUp } from 'lucide-react';
import FileTree from './FileTree';
import MarkdownViewer from './MarkdownViewer';
import PathSelector from './PathSelector';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { getDocumentSortPreferences, setDocumentSortPreferences } from '../../config/documentSorting';

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
  projectId: string;
}

export default function DocumentsLayout({ projectId }: DocumentsLayoutProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<DocumentFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPathSelector, setShowPathSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load sort preferences from localStorage on mount
  const savedPreferences = getDocumentSortPreferences(projectId);
  const [sortBy, setSortBy] = useState<'name' | 'title' | 'created' | 'modified'>(savedPreferences.sortBy);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(savedPreferences.sortDirection);

  // Helper to sanitize and validate relative path (blocks .. traversal)
  const sanitizePath = (relativePath: string): string | null => {
    // Decode URL encoding to catch encoded traversal attempts
    let decoded = relativePath;
    try {
      decoded = decodeURIComponent(relativePath);
    } catch {
      console.warn('Invalid URL encoding blocked:', relativePath);
      return null;
    }

    // Block path traversal attempts (including encoded variants)
    if (decoded.includes('..') || decoded.includes('%2e%2e')) {
      console.warn('Path traversal attempt blocked:', relativePath);
      return null;
    }

    // Block absolute paths
    if (decoded.startsWith('/')) {
      console.warn('Absolute path attempt blocked:', relativePath);
      return null;
    }

    // Normalize slashes
    return decoded.replace(/\/+/g, '/');
  };

  // File paths are now always relative - no conversion needed

  // Reset and load sort preferences when project changes
  useEffect(() => {
    const preferences = getDocumentSortPreferences(projectId);
    setSortBy(preferences.sortBy);
    setSortDirection(preferences.sortDirection);
  }, [projectId]);

  // Persist sort preferences to localStorage when they change
  useEffect(() => {
    setDocumentSortPreferences(projectId, { sortBy, sortDirection });
  }, [projectId, sortBy, sortDirection]);

  // Initialize selected file from URL parameter
  useEffect(() => {
    const fileParam = searchParams.get('file');
    if (fileParam) {
      const sanitized = sanitizePath(fileParam);
      if (sanitized) {
        setSelectedFile(sanitized);
      } else {
        setSelectedFile(null);
        setError('Invalid file path');
      }
    } else {
      setSelectedFile(null);
    }
  }, [searchParams]);

  useEffect(() => {
    loadDocuments();
  }, [projectId]);

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
      const response = await fetch(`/api/documents?projectId=${encodeURIComponent(projectId)}`);
      
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
          projectId,
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
      <Modal
        isOpen={showPathSelector}
        onClose={handleCancelPathSelection}
        size="lg"
      >
        <PathSelector
          projectId={projectId}
          onPathsSelected={handlePathsSelected}
          onCancel={handleCancelPathSelection}
        />
      </Modal>
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
      <div className="w-1/3 border-r border-border bg-muted/30 flex flex-col">
        <div className="p-4 border-b border-border flex-shrink-0">
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
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="p-2">
            <FileTree
              files={filteredFiles}
              onFileSelect={(filePath) => {
                setSelectedFile(filePath);
                if (filePath) {
                  // Encode each path segment separately to keep slashes visible
                  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
                  const newUrl = `${window.location.pathname}?file=${encodedPath}`;
                  window.history.pushState({}, '', newUrl);
                } else {
                  window.history.pushState({}, '', window.location.pathname);
                }
              }}
              selectedFile={selectedFile}
            />
          </div>
        </ScrollArea>
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        {selectedFile ? (
          <MarkdownViewer
            projectId={projectId}
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
