#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TIMEOUT = 5000; // 5 seconds
const MCP_SERVER_PATH = join(__dirname, 'dist', 'index.js');

function healthCheck() {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [MCP_SERVER_PATH], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let hasInitialized = false;
    
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('Health check timeout'));
    }, TIMEOUT);

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      const stderr = data.toString();
      output += stderr;
      if (stderr.includes('MCP Dev Tools server running')) {
        hasInitialized = true;
        clearTimeout(timeout);
        child.kill();
        resolve({ status: 'healthy', output });
      }
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (hasInitialized) {
        resolve({ status: 'healthy', output });
      } else if (code === 0) {
        resolve({ status: 'healthy', output });
      } else {
        reject(new Error(`Process exited with code ${code}: ${output}`));
      }
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    // Send initialization message
    child.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'health-check', version: '1.0.0' }
      }
    }) + '\n');
  });
}

async function main() {
  console.log('🔍 Running mdt-logging MCP health check...');
  
  try {
    const result = await healthCheck();
    console.log('✅ Health check passed');
    console.log(`Status: ${result.status}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Health check failed');
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
