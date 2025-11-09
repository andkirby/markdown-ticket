#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import { relative, dirname, join, resolve } from 'path';

console.log('🔧 Fixing @shared/* imports in dist/...');

// Find all .js files in dist
const files = glob.sync('dist/**/*.js');

let totalReplacements = 0;

// Get absolute paths for calculation
const projectRoot = resolve('.');
const sharedDistAbs = resolve('..', 'shared', 'dist');

files.forEach(file => {
  let content = readFileSync(file, 'utf-8');
  let modified = false;

  // Replace @shared/* imports with relative paths
  const replacedContent = content.replace(
    /from ['"]@shared\/([^'"]+)['"]/g,
    (match, importPath) => {
      modified = true;
      totalReplacements++;

      // Calculate relative path from current file to ../shared/dist
      const fileAbs = resolve(file);
      const fileDir = dirname(fileAbs);
      const targetPath = join(sharedDistAbs, importPath);
      const relativePath = relative(fileDir, targetPath).replace(/\\/g, '/');

      return `from '${relativePath.startsWith('.') ? relativePath : './' + relativePath}'`;
    }
  );

  if (modified) {
    writeFileSync(file, replacedContent, 'utf-8');
  }
});

console.log(`✅ Fixed ${totalReplacements} @shared/* imports in ${files.length} files`);
