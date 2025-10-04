import path from 'path';
import { TreeBuildingStrategy } from './TreeBuildingStrategy.js';

/**
 * Strategy for building trees for path selection (no metadata)
 */
export class PathSelectionStrategy extends TreeBuildingStrategy {
  async buildTree(filePaths, projectPath, config) {
    const tree = {};
    const rootFiles = [];

    for (const filePath of filePaths) {
      const relativePath = path.relative(projectPath, filePath);
      const parts = relativePath.split(path.sep);

      if (parts.length === 1) {
        rootFiles.push(await this.processFile(filePath, relativePath));
        continue;
      }

      let current = tree;
      let currentRelativePath = '';

      // Build nested structure
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        currentRelativePath = currentRelativePath ? path.join(currentRelativePath, part) : part;

        if (!current[part]) {
          current[part] = { 
            type: 'folder', 
            children: {}, 
            path: currentRelativePath 
          };
        }
        current = current[part].children;
      }

      // Add the file
      const fileName = parts[parts.length - 1];
      current[fileName] = await this.processFile(filePath, relativePath);
    }

    const result = this._treeToArray(tree);

    if (rootFiles.length > 0) {
      result.unshift({
        name: './ (root files)',
        path: './',
        type: 'folder',
        children: rootFiles
      });
    }

    return result;
  }

  _treeToArray(obj) {
    const items = [];
    for (const [name, item] of Object.entries(obj)) {
      if (item.type === 'folder') {
        const children = this._treeToArray(item.children);
        if (children.length > 0) {
          items.push({
            name,
            path: item.path,
            type: 'folder',
            children
          });
        }
      } else {
        items.push({ name, ...item });
      }
    }
    return items.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }
}
