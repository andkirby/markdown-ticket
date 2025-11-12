#!/usr/bin/env node

import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TIMEOUT = 5000; // 5 seconds
const MCP_SERVER_PATH = join(__dirname, 'dist', 'index.js');

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  output: string;
}

function healthCheck(): Promise<HealthCheckResult> {
  return new Promise((resolve, reject) => {
    const child: ChildProcess = spawn('node', [MCP_SERVER_PATH], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let hasInitialized = false;

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('Health check timeout'));
    }, TIMEOUT);

    child.stdout?.on('data', (data: Buffer) => {
      output += data.toString();
    });

    child.stderr?.on('data', (data: Buffer) => {
      const stderr = data.toString();
      output += stderr;
      if (stderr.includes('MCP Dev Tools server running')) {
        hasInitialized = true;
        clearTimeout(timeout);
        child.kill();
        resolve({ status: 'healthy', output });
      }
    });

    child.on('close', (code: number | null) => {
      clearTimeout(timeout);
      if (hasInitialized) {
        resolve({ status: 'healthy', output });
      } else if (code === 0) {
        resolve({ status: 'healthy', output });
      } else {
        reject(new Error(`Process exited with code ${code}: ${output}`));
      }
    });

    child.on('error', (error: Error) => {
      clearTimeout(timeout);
      reject(error);
    });

    // Send initialization message
    child.stdin?.write(JSON.stringify({
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

async function main(): Promise<void> {
  console.log('🔍 Running mdt-logging MCP health check...');

  try {
    const result = await healthCheck();
    console.log('✅ Health check passed');
    console.log(`Status: ${result.status}`);
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Health check failed');
    console.error(`Error: ${errorMessage}`);
    process.exit(1);
  }
}

main();