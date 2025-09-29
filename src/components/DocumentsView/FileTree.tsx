import React, { useState } from 'react';
import { File, Folder, ChevronRight, ChevronDown } from 'lucide-react';

interface DocumentFile {
  name: string;
  path: string;
  type: 'file' | 'folder';
  title?: string;
  children?: DocumentFile[];
}

interface FileTreeProps {
  files: DocumentFile[];
  onFileSelect: (path: string) => void;
  selectedFile: string | null;
  level?: number;
}

export default function FileTree({ files, onFileSelect, selectedFile, level = 0 }: FileTreeProps) {
  const getAllFolderPaths = (fileList: DocumentFile[]): string[] => {
    const paths: string[] = [];
    fileList.forEach(file => {
      if (file.type === 'folder') {
        paths.push(file.path);
        if (file.children) {
          paths.push(...getAllFolderPaths(file.children));
        }
      }
    });
    return paths;
  };

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set(getAllFolderPaths(files)));

  const handleFileClick = (file: DocumentFile) => {
    if (file.type === 'file') {
      onFileSelect(file.path);
    } else {
      setExpandedFolders(prev => {
        const newSet = new Set(prev);
        if (newSet.has(file.path)) {
          newSet.delete(file.path);
        } else {
          newSet.add(file.path);
        }
        return newSet;
      });
    }
  };

  return (
    <div className="space-y-1">
      {files.map((file) => (
        <div key={file.path}>
          <div
            className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-muted transition-colors ${
              selectedFile === file.path ? 'bg-primary/10 text-primary' : 'text-foreground'
            }`}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onClick={() => handleFileClick(file)}
          >
            {file.type === 'folder' ? (
              <>
                {expandedFolders.has(file.path) ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <Folder className="w-4 h-4 text-muted-foreground" />
              </>
            ) : (
              <File className="w-4 h-4 text-muted-foreground" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">
                {file.type === 'file' && file.title ? file.title : file.name}
              </div>
              {file.type === 'file' && file.title && (
                <div className="text-xs text-muted-foreground truncate">
                  {file.name}
                </div>
              )}
            </div>
          </div>
          {file.children && file.children.length > 0 && expandedFolders.has(file.path) && (
            <FileTree
              files={file.children}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
              level={level + 1}
            />
          )}
        </div>
      ))}
    </div>
  );
}
