#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { globSync } from 'glob';

// First, run the TypeScript build
console.log('🏗️  Running TypeScript build...');
execSync('tsc -p tsconfig.build.json', { stdio: 'inherit' });

// Fix import statements to add .js extensions
console.log('🔧 Fixing import statements for ES modules...');
const jsFiles = globSync('dist/**/*.js');

for (const filePath of jsFiles) {
  let content = readFileSync(filePath, 'utf-8');

  // Fix relative imports from @mdt/shared
  content = content.replace(
    /from ['"](@mdt\/shared\/[^'"]+)['"]/g,
    (match, importPath) => {
      // Check if it's already got an extension
      if (importPath.endsWith('.js')) {
        return match;
      }
      return `from "${importPath}"`;
    }
  );

  // Fix relative imports within shared
  content = content.replace(
    /from ['"]\.\.\/\.\.\/models\/([^'"]+)['"]/g,
    (match, importPath) => {
      if (importPath.endsWith('.js')) {
        return match;
      }
      return `from "../../models/${importPath}.js"`;
    }
  );

  content = content.replace(
    /from ['"]\.\.\/\.\.\/services\/([^'"]+)['"]/g,
    (match, importPath) => {
      if (importPath.endsWith('.js')) {
        return match;
      }
      return `from "../../services/${importPath}.js"`;
    }
  );

  content = content.replace(
    /from ['"]\.\.\/\.\.\/utils\/([^'"]+)['"]/g,
    (match, importPath) => {
      if (importPath.endsWith('.js')) {
        return match;
      }
      return `from "../../utils/${importPath}.js"`;
    }
  );

  content = content.replace(
    /from ['"]\.\.\/\.\.\/tools\/([^'"]+)['"]/g,
    (match, importPath) => {
      if (importPath.endsWith('.js')) {
        return match;
      }
      return `from "../../tools/${importPath}.js"`;
    }
  );

  content = content.replace(
    /from ['"]\.\.\/\.\.\/templates\/([^'"]+)['"]/g,
    (match, importPath) => {
      if (importPath.endsWith('.js')) {
        return match;
      }
      return `from "../../templates/${importPath}.js"`;
    }
  );

  // Fix imports in mcp-server dist - no .js needed for package exports
  content = content.replace(
    /from ['"]@mdt\/shared\/models\/([^'"]+)['"]/g,
    'from "@mdt/shared/models/$1"'
  );

  content = content.replace(
    /from ['"]@mdt\/shared\/services\/([^'"]+)['"]/g,
    'from "@mdt/shared/services/$1"'
  );

  content = content.replace(
    /from ['"]@mdt\/shared\/utils\/([^'"]+)['"]/g,
    'from "@mdt/shared/utils/$1"'
  );

  content = content.replace(
    /from ['"]@mdt\/shared\/tools\/([^'"]+)['"]/g,
    'from "@mdt/shared/tools/$1"'
  );

  content = content.replace(
    /from ['"]@mdt\/shared\/templates\/([^'"]+)['"]/g,
    'from "@mdt/shared/templates/$1"'
  );

  writeFileSync(filePath, content);
}

console.log('✅ Build completed - imports fixed for ES modules');