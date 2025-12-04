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

// With rootDir set to "./src", files are already in the right place
console.log('✅ Build completed - index.js available at dist/index.js with all dependencies');
