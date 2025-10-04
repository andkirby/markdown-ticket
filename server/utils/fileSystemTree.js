import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

/**
 * Builds a file system tree for path selection using glob
 * @param {string} dirPath - Directory path to scan
 * @param {number} maxDepth - Maximum depth for scanning (default: 3)
 * @returns {Promise<Array>} Array of file/folder objects with tree structure
 */
export async function buildFileSystemTree(dirPath, maxDepth = 3) {
  try {
    // Read project config to get tickets path for ignoring
    const configPath = path.join(dirPath, '.mdt-config.toml');
    let ticketsPath = null;

    try {
      const configContent = await fs.readFile(configPath, 'utf8');
      const pathMatch = configContent.match(/path\s*=\s*["']?([^"'\n\r]+)["']?/);
      if (pathMatch) {
        ticketsPath = pathMatch[1].trim();
      }
    } catch {
      // Config doesn't exist or can't be read, continue without tickets path
    }

    // Build ignore patterns
    const ignorePatterns = [
      '**/.*/**',           // Hidden folders (.git, .vscode, etc.)
      '**/node_modules/**', // Node.js dependencies
      '**/dist/**',         // Build output
      '**/build/**',        // Build output
      '**/target/**',       // Rust/Java build output
      '**/bin/**',          // Binary output
      '**/obj/**',          // C#/C++ object files
      '**/out/**',          // General output folder
      '**/tmp/**',          // Temporary files
      '**/temp/**',         // Temporary files
      '**/cache/**',        // Cache folders
      '**/test*/**',        // Test folders (tests, test-data, etc.)
      '**/spec*/**',        // Spec folders
      '**/coverage/**',     // Test coverage
      '**/vendor/**',       // Third-party dependencies
      '**/packages/**',     // Package managers
      '**/DerivedData/**',  // Xcode build data
      '**/__pycache__/**',  // Python cache
      '**/venv/**',         // Python virtual env
      '**/.env/**'          // Environment folders
    ];

    // Add tickets path to ignore list if found
    if (ticketsPath && ticketsPath !== '.') {
      ignorePatterns.push(`**/${ticketsPath}/**`);
      console.log(`🚫 Ignoring tickets path: ${ticketsPath}`);
    } else if (ticketsPath === '.') {
      // When tickets are in root directory, ignore ticket files by pattern
      ignorePatterns.push('**/*-[0-9][0-9][0-9]-*.md');
      console.log(`🚫 Ignoring ticket files in root directory`);
    }

    // Find all .md files up to maxDepth levels
    const pattern = path.join(dirPath, '**/*.md');
    let mdFiles = await glob(pattern, {
      maxDepth,
      ignore: ignorePatterns
    });

    // Additional filtering to remove files in tickets path (in case glob didn't catch it)
    if (ticketsPath && ticketsPath !== '.') {
      const ticketsFullPath = path.join(dirPath, ticketsPath);
      mdFiles = mdFiles.filter(filePath => !filePath.startsWith(ticketsFullPath));
      console.log(`🚫 Filtered out ${ticketsPath} files, remaining: ${mdFiles.length}`);
    } else if (ticketsPath === '.') {
      // Filter out ticket files by pattern when in root directory
      mdFiles = mdFiles.filter(filePath => {
        const fileName = path.basename(filePath);
        return !fileName.match(/^[A-Z]+-\d{3}-.*\.md$/);
      });
      console.log(`🚫 Filtered out ticket files from root, remaining: ${mdFiles.length}`);
    }

    // Build tree structure from file paths
    const tree = {};
    const rootFiles = [];

    for (const filePath of mdFiles) {
      const relativePath = path.relative(dirPath, filePath);
      const parts = relativePath.split(path.sep);

      // If file is in root directory (only one part), add to rootFiles
      if (parts.length === 1) {
        rootFiles.push({
          name: parts[0],
          path: relativePath, // Use relative path
          type: 'file'
        });
        continue;
      }

      let current = tree;
      let currentRelativePath = '';

      // Build nested structure
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        currentRelativePath = currentRelativePath ? path.join(currentRelativePath, part) : part;
        if (!current[part]) {
          current[part] = { type: 'folder', children: {}, path: currentRelativePath }; // Use relative path
        }
        current = current[part].children;
      }

      // Add the file
      const fileName = parts[parts.length - 1];
      current[fileName] = {
        type: 'file',
        path: relativePath // Use relative path
      };
    }

    // Convert tree object to array format
    const result = treeToArray(tree);

    // If there are root files, add a root folder at the beginning
    if (rootFiles.length > 0) {
      result.unshift({
        name: './ (root files)',
        path: './',
        type: 'folder',
        children: rootFiles
      });
    }

    return result;
  } catch (error) {
    console.error(`Error building file system tree for ${dirPath}:`, error);
    return [];
  }
}

/**
 * Converts tree object structure to array format
 * @param {Object} obj - Tree object
 * @param {string} basePath - Base path (not used currently)
 * @returns {Array} Array of file/folder items
 */
function treeToArray(obj, basePath = '') {
  const items = [];

  for (const [name, item] of Object.entries(obj)) {
    if (item.type === 'folder') {
      const children = treeToArray(item.children);
      if (children.length > 0) { // Only include folders with .md files
        items.push({
          name,
          path: item.path,
          type: 'folder',
          children
        });
      }
    } else {
      items.push({
        name,
        path: item.path,
        type: 'file'
      });
    }
  }

  return items.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}
