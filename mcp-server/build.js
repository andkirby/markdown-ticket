#!/usr/bin/env node
import { execSync } from 'child_process';
import { copyFileSync, mkdirSync, rmSync, cpSync } from 'fs';
import { dirname } from 'path';

// Clean dist
try {
  rmSync('dist', { recursive: true, force: true });
} catch (e) {}

// Run TypeScript build
execSync('tsc', { stdio: 'inherit' });

// Copy main index.js to root of dist and preserve the full structure
try {
  copyFileSync('dist/mcp-server/src/index.js', 'dist/index.js');
  copyFileSync('dist/mcp-server/src/index.js.map', 'dist/index.js.map');
  copyFileSync('dist/mcp-server/src/index.d.ts', 'dist/index.d.ts');

  // Also copy the config, services, tools, transports, and utils directories to the root level
  cpSync('dist/mcp-server/src/config', 'dist/config', { recursive: true });
  cpSync('dist/mcp-server/src/services', 'dist/services', { recursive: true });
  cpSync('dist/mcp-server/src/tools', 'dist/tools', { recursive: true });
  cpSync('dist/mcp-server/src/transports', 'dist/transports', { recursive: true });
  cpSync('dist/mcp-server/src/utils', 'dist/utils', { recursive: true });

  console.log('✅ Files copied to dist/ root');
} catch (error) {
  console.error('❌ Failed to copy files:', error.message);
  process.exit(1);
}

console.log('✅ Build completed - index.js available at dist/index.js with all dependencies');
