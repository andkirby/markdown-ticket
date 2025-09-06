import React from 'react';
import { File, Folder } from 'lucide-react';

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
  const handleFileClick = (file: DocumentFile) => {
    if (file.type === 'file') {
      onFileSelect(file.path);
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
              <Folder className="w-4 h-4 text-muted-foreground" />
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
          {file.children && file.children.length > 0 && (
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
