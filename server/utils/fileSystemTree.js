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
    // Read project config to get tickets path and exclude folders
    const configPath = path.join(dirPath, '.mdt-config.toml');
    let ticketsPath = null;
    let configuredExcludes = [];

    try {
      const configContent = await fs.readFile(configPath, 'utf8');

      // Parse tickets path
      const pathMatch = configContent.match(/path\s*=\s*["']?([^"'\n\r]+)["']?/);
      if (pathMatch) {
        ticketsPath = pathMatch[1].trim();
      }

      // Parse exclude_folders from config
      const excludeMatch = configContent.match(/exclude_folders\s*=\s*\[([\s\S]*?)\]/);
      if (excludeMatch) {
        configuredExcludes = excludeMatch[1]
          .split(/[,\n]/)
          .map(s => s.trim().replace(/['"]/g, '').replace(/#.*$/, '').trim())
          .filter(s => s.length > 0);
      }
    } catch {
      // Config doesn't exist or can't be read, continue with defaults
    }

    // Build ignore patterns
    const ignorePatterns = [
      // Version control & IDE
      '**/.*/**',           // Hidden folders (.git, .vscode, .idea, .venv, etc.)

      // Dependencies
      '**/node_modules/**', // Node.js dependencies
      '**/vendor/**',       // PHP/Go dependencies
      '**/packages/**',     // Package managers
      '**/Pods/**',         // iOS CocoaPods

      // Build outputs
      '**/dist/**',         // Build output
      '**/build/**',        // Build output
      '**/out/**',          // General output folder
      '**/target/**',       // Rust/Java build output
      '**/bin/**',          // Binary output
      '**/obj/**',          // C#/C++ object files
      '**/public/build/**', // Frontend build in public
      '**/DerivedData/**',  // Xcode build data

      // Framework-specific
      '**/.next/**',        // Next.js
      '**/.nuxt/**',        // Nuxt.js
      '**/.output/**',      // Nuxt.js/Nitro
      '**/.svelte-kit/**',  // SvelteKit
      '**/_site/**',        // Jekyll/static generators
      '**/.docusaurus/**',  // Docusaurus

      // Python
      '**/__pycache__/**',  // Python bytecode cache
      '**/venv/**',         // Python virtual env
      '**/.venv/**',        // Python virtual env (hidden)
      '**/.pytest_cache/**',// Pytest cache
      '**/.mypy_cache/**',  // MyPy type checker
      '**/.ruff_cache/**',  // Ruff linter cache
      '**/htmlcov/**',      // Coverage HTML reports
      '**/.tox/**',         // Tox testing
      '**/eggs/**',         // Python eggs
      '**/*.egg-info/**',   // Python package info

      // Testing & Coverage
      '**/test*/**',        // Test folders (tests, test-data, etc.)
      '**/spec*/**',        // Spec folders
      '**/coverage/**',     // Test coverage

      // Infrastructure & Deployment
      '**/.terraform/**',   // Terraform state
      '**/.serverless/**',  // Serverless framework
      '**/.gradle/**',      // Gradle cache
      '**/.cargo/**',       // Rust cargo cache

      // Temporary & Cache
      '**/tmp/**',          // Temporary files
      '**/temp/**',         // Temporary files
      '**/cache/**',        // Cache folders
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

    // Helper to check if a path matches any ignore pattern
    const shouldIgnorePath = (pathToCheck) => {
      // Normalize path for checking
      const normalizedPath = pathToCheck.replace(/\\/g, '/');

      // Check common ignore patterns that might not be caught by glob
      const commonIgnores = [
        'node_modules', 'vendor', 'venv', '.venv', 'dist', 'build',
        'target', 'bin', 'obj', 'out', '__pycache__', 'coverage',
        '.next', '.nuxt', '.svelte-kit', 'Pods', '.gradle', '.cargo',
        'DerivedData', 'tmp', 'temp', 'cache', 'test-results'
      ];

      // Merge configured excludes with common ignores
      const allIgnores = [...commonIgnores, ...configuredExcludes];

      // Check if the path starts with any configured exclude
      if (configuredExcludes.some(exclude => {
        const excludeNormalized = exclude.replace(/\\/g, '/');
        return normalizedPath === excludeNormalized || normalizedPath.startsWith(excludeNormalized + '/');
      })) {
        return true;
      }

      // Check if any part of the path matches ignore patterns
      const pathParts = normalizedPath.split('/');
      return pathParts.some(part => {
        // Ignore hidden folders/files
        if (part.startsWith('.')) return true;
        // Ignore common patterns
        if (allIgnores.includes(part)) return true;
        return false;
      });
    };

    // Build tree structure from file paths
    const tree = {};
    const rootFiles = [];

    for (const filePath of mdFiles) {
      const relativePath = path.relative(dirPath, filePath);
      const parts = relativePath.split(path.sep);

      // Skip if any parent directory should be ignored
      if (shouldIgnorePath(relativePath)) {
        continue;
      }

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

        // Skip creating folder nodes for ignored paths
        if (shouldIgnorePath(currentRelativePath)) {
          break;
        }

        if (!current[part]) {
          current[part] = { type: 'folder', children: {}, path: currentRelativePath }; // Use relative path
        }
        current = current[part].children;
      }

      // Add the file (only if we didn't break out of the loop above)
      if (!shouldIgnorePath(path.dirname(relativePath))) {
        const fileName = parts[parts.length - 1];
        current[fileName] = {
          type: 'file',
          path: relativePath // Use relative path
        };
      }
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
