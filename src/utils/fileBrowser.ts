/**
 * File and folder browser utilities for React applications
 */

export interface FolderBrowserOptions {
  multiple?: boolean;
  startIn?: string;
}

/**
 * Modern folder picker using File System Access API
 * Available in Chrome, Edge, and other modern browsers
 */
export async function selectFolderModern(options: FolderBrowserOptions = {}): Promise<string[]> {
  if (!('showDirectoryPicker' in window)) {
    throw new Error('File System Access API not supported in this browser');
  }

  try {
    if (options.multiple) {
      // For multiple directories, we need to call showDirectoryPicker multiple times
      const directories: string[] = [];
      let keepAdding = true;

      while (keepAdding) {
        try {
          const dirHandle = await (window as any).showDirectoryPicker({
            mode: 'read',
            startIn: options.startIn ? await getDirectoryHandle(options.startIn) : undefined
          });

          // Convert to path (limited by security restrictions)
          directories.push(dirHandle.name);

          // Ask if user wants to add another directory
          keepAdding = confirm('Add another directory?');
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            throw err;
          }
          break;
        }
      }

      return directories;
    } else {
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'read',
        startIn: options.startIn ? await getDirectoryHandle(options.startIn) : undefined
      });

      return [dirHandle.name];
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return [];
    }
    throw error;
  }
}

/**
 * Legacy folder input using hidden file input with webkitdirectory attribute
 * Works in most browsers including Firefox
 */
export function selectFolderLegacy(callback: (paths: string[]) => void, options: FolderBrowserOptions = {}) {
  const input = document.createElement('input');
  input.type = 'file';
  input.style.display = 'none';

  // Use webkitdirectory for folder selection
  (input as any).webkitdirectory = true;

  input.addEventListener('change', (event) => {
    const files = (event.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      // Extract directory path from the first file
      const firstFile = files[0];
      const fullPath = (firstFile as any).webkitRelativePath;
      const directoryPath = fullPath.split('/')[0];

      if (options.multiple) {
        // For legacy mode, we can only select one folder at a time
        callback([directoryPath]);
      } else {
        callback([directoryPath]);
      }
    } else {
      callback([]);
    }

    // Clean up
    document.body.removeChild(input);
  });

  input.addEventListener('cancel', () => {
    callback([]);
    document.body.removeChild(input);
  });

  document.body.appendChild(input);
  input.click();
}

/**
 * Universal folder selector that tries modern API first, falls back to legacy
 */
export async function selectFolder(options: FolderBrowserOptions = {}): Promise<string[]> {
  // Try modern API first
  if ('showDirectoryPicker' in window) {
    try {
      return await selectFolderModern(options);
    } catch (error) {
      console.warn('Modern folder picker failed, falling back to legacy:', error);
    }
  }

  // Fall back to legacy approach
  return new Promise((resolve) => {
    selectFolderLegacy((paths) => {
      resolve(paths);
    }, options);
  });
}

/**
 * File picker utility for selecting files
 */
export function selectFile(callback: (file: File | null) => void, options: {
  accept?: string;
  multiple?: boolean;
} = {}) {
  const input = document.createElement('input');
  input.type = 'file';
  input.style.display = 'none';

  if (options.accept) {
    input.accept = options.accept;
  }

  if (options.multiple) {
    input.multiple = true;
  }

  input.addEventListener('change', (event) => {
    const files = (event.target as HTMLInputElement).files;
    if (options.multiple) {
      // For multiple files, return the FileList as an array
      callback(files && files.length > 0 ? Array.from(files)[0] : null);
    } else {
      callback(files && files.length > 0 ? files[0] : null);
    }

    document.body.removeChild(input);
  });

  input.addEventListener('cancel', () => {
    callback(null);
    document.body.removeChild(input);
  });

  document.body.appendChild(input);
  input.click();
}

/**
 * Helper to get directory handle from path string
 */
async function getDirectoryHandle(path: string): Promise<FileSystemDirectoryHandle | undefined> {
  try {
    return await (window as any).showDirectoryPicker({
      mode: 'read',
      startIn: path
    });
  } catch {
    return undefined;
  }
}

/**
 * Check if File System Access API is available
 */
export function isModernFileSystemAvailable(): boolean {
  return 'showDirectoryPicker' in window;
}