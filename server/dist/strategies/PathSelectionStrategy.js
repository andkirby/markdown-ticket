import path from 'path';
import { TreeBuildingStrategy } from './TreeBuildingStrategy.js';
/**
 * Strategy for building trees for path selection (no metadata)
 */
export class PathSelectionStrategy extends TreeBuildingStrategy {
    async buildTree(filePaths, projectPath, _config) {
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
                        name: part,
                        path: currentRelativePath,
                        children: {}
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
                const folderItem = item;
                const children = this._treeToArray(folderItem.children);
                if (children.length > 0) {
                    items.push({
                        name,
                        path: folderItem.path,
                        type: 'folder',
                        children
                    });
                }
            }
            else {
                const fileItem = item;
                items.push({ name: fileItem.name, path: fileItem.path, type: fileItem.type });
            }
        }
        return items.sort((a, b) => {
            if (a.type !== b.type)
                return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
    }
}
//# sourceMappingURL=PathSelectionStrategy.js.map