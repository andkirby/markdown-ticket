import fs from 'fs/promises';
import path from 'path';

/**
 * Service layer for document discovery and management
 */
export class DocumentService {
  constructor(projectDiscovery) {
    this.projectDiscovery = projectDiscovery;
  }

  /**
   * Discover documents for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} Array of document objects
   */
  async discoverDocuments(projectId) {
    const projects = await this.projectDiscovery.getAllProjects();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    const projectPath = project.project.path;

    // Check if config exists and has document_paths
    const configPath = path.join(projectPath, '.mdt-config.toml');
    try {
      await fs.access(configPath);
      const configContent = await fs.readFile(configPath, 'utf8');
      const pathsMatch = configContent.match(/document_paths\s*=\s*\[(.*?)\]/s);

      if (!pathsMatch || pathsMatch[1].trim().length === 0) {
        throw new Error('No document configuration found');
      }
    } catch (error) {
      if (error.message === 'No document configuration found') {
        throw error;
      }
      throw new Error('No document configuration found');
    }

    return await this._discoverDocumentsInPath(projectPath);
  }

  /**
   * Get document content
   * @param {string} projectId - Project ID
   * @param {string} filePath - Relative file path
   * @returns {Promise<string>} Document content
   */
  async getDocumentContent(projectId, filePath) {
    // Security: Block path traversal attempts
    if (filePath.includes('..')) {
      throw new Error('Invalid file path');
    }

    // Security: Only allow markdown files
    if (!filePath.endsWith('.md')) {
      throw new Error('Only markdown files are allowed');
    }

    const projects = await this.projectDiscovery.getAllProjects();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    // Resolve file path relative to project root
    const projectPath = project.project.path;
    const resolvedPath = path.join(projectPath, filePath);

    // Security: Ensure resolved path is within project directory
    if (!resolvedPath.startsWith(projectPath)) {
      throw new Error('Access denied');
    }

    return await fs.readFile(resolvedPath, 'utf8');
  }

  /**
   * Internal method to discover documents in a path
   * @param {string} projectPath - Project path
   * @param {number} currentDepth - Current depth
   * @param {number} maxDepth - Maximum depth (default: 3)
   * @returns {Promise<Array>} Array of documents
   */
  async _discoverDocumentsInPath(projectPath, currentDepth = 0, maxDepth = 3) {
    try {
      // Read document paths from .mdt-config.toml
      const configPath = path.join(projectPath, '.mdt-config.toml');
      let documentPaths = [];
      let excludeFolders = ['docs/CRs', 'node_modules', '.git'];

      // Check if config exists
      try {
        await fs.access(configPath);
      } catch {
        throw new Error('CONFIG_NOT_FOUND');
      }

      try {
        const configContent = await fs.readFile(configPath, 'utf8');

        // Parse document_paths
        const pathsMatch = configContent.match(/document_paths\s*=\s*\[(.*?)\]/s);
        if (pathsMatch) {
          documentPaths = pathsMatch[1]
            .split(/[,\n]/)
            .map(s => s.trim().replace(/['"]/g, '').replace(/#.*$/, '').trim())
            .filter(s => s.length > 0);
        }

        // If no document paths configured, throw error
        if (documentPaths.length === 0) {
          throw new Error('NO_DOCUMENT_PATHS');
        }

        // Parse exclude_folders
        const excludeMatch = configContent.match(/exclude_folders\s*=\s*\[(.*?)\]/s);
        if (excludeMatch) {
          excludeFolders = excludeMatch[1]
            .split(/[,\n]/)
            .map(s => s.trim().replace(/['"]/g, '').replace(/#.*$/, '').trim())
            .filter(s => s.length > 0);
        }
      } catch (configError) {
        if (configError.message === 'NO_DOCUMENT_PATHS') {
          throw configError;
        }
        throw new Error('CONFIG_NOT_FOUND');
      }

      const documents = [];

      for (const docPath of documentPaths) {
        const fullPath = path.resolve(projectPath, docPath);

        try {
          const stats = await fs.stat(fullPath);

          if (stats.isFile() && docPath.endsWith('.md')) {
            // Single file - extract H1 title
            const h1Title = await this._extractH1Title(fullPath);
            const fileStats = await fs.stat(fullPath);
            documents.push({
              name: path.basename(docPath),
              title: h1Title,
              path: docPath, // Relative path
              type: 'file',
              dateCreated: fileStats.birthtime || fileStats.ctime,
              lastModified: fileStats.mtime
            });
          } else if (stats.isDirectory()) {
            // Directory - scan for .md files
            const dirDocs = await this._scanDirectory(fullPath, docPath, excludeFolders, 0, maxDepth);
            if (dirDocs.length > 0) {
              documents.push({
                name: path.basename(docPath),
                path: docPath, // Relative path (consistent with files)
                type: 'folder',
                children: dirDocs
              });
            }
          }
        } catch (error) {
          console.warn(`⚠️  Document path not found: ${fullPath}`);
        }
      }

      return documents.sort((a, b) => {
        // Folders first, then files
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error(`Error discovering documents in ${projectPath}:`, error);
      return [];
    }
  }

  /**
   * Extract H1 title from markdown file
   * @param {string} filePath - File path
   * @returns {Promise<string|null>} H1 title or null
   */
  async _extractH1Title(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const h1Match = content.match(/^#\s+(.+)$/m);
      return h1Match ? h1Match[1].trim() : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Scan directory for markdown files
   * @param {string} dirPath - Directory path
   * @param {string} relativePath - Relative path from project root
   * @param {Array<string>} excludeFolders - Folders to exclude
   * @param {number} currentDepth - Current depth
   * @param {number} maxDepth - Maximum depth
   * @returns {Promise<Array>} Array of documents
   */
  async _scanDirectory(dirPath, relativePath, excludeFolders, currentDepth, maxDepth) {
    if (currentDepth >= maxDepth) {
      return [];
    }

    const documents = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const entryRelativePath = path.join(relativePath, entry.name);

      // Skip excluded folders
      if (excludeFolders.some(exclude => entryRelativePath.startsWith(exclude))) {
        continue;
      }

      if (entry.isDirectory()) {
        const children = await this._scanDirectory(fullPath, entryRelativePath, excludeFolders, currentDepth + 1, maxDepth);
        if (children.length > 0) {
          documents.push({
            name: entry.name,
            path: entryRelativePath,
            type: 'folder',
            children
          });
        }
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const h1Title = await this._extractH1Title(fullPath);
        const fileStats = await fs.stat(fullPath);
        documents.push({
          name: entry.name,
          title: h1Title,
          path: entryRelativePath,
          type: 'file',
          dateCreated: fileStats.birthtime || fileStats.ctime,
          lastModified: fileStats.mtime
        });
      }
    }

    return documents;
  }
}
