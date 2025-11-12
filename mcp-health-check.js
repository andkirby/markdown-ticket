#!/usr/bin/env node

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const TIMEOUT = 10000; // 10 seconds
const MCP_CONFIG_PATH = join(homedir(), '.aws', 'amazonq', 'mcp.json');

function loadMcpConfig() {
  try {
    const config = JSON.parse(readFileSync(MCP_CONFIG_PATH, 'utf8'));
    return config.mcpServers || {};
  } catch (error) {
    throw new Error(`Failed to load MCP config: ${error.message}`);
  }
}

function healthCheck(mcpName, mcpConfig) {
  return new Promise((resolve, reject) => {
    const child = spawn(mcpConfig.command, mcpConfig.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...mcpConfig.env }
    });

    let stdout = '';
    let stderr = '';
    let initResponse = null;
    let toolsResponse = null;
    let hasResponded = false;

    const timeout = setTimeout(() => {
      if (!hasResponded) {
        child.kill();
        reject(new Error(`Health check timeout after ${TIMEOUT}ms - MCP server did not respond to initialization`));
      }
    }, TIMEOUT);

    child.stdout.on('data', (data) => {
      stdout += data.toString();

      // Look for MCP responses
      try {
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.trim() && line.includes('"jsonrpc"')) {
            const response = JSON.parse(line);

            // Check for JSON-RPC errors
            if (response.error) {
              clearTimeout(timeout);
              child.kill();
              reject(new Error(`MCP server returned error: ${response.error.code}: ${response.error.message}`));
              return;
            }

            // Initialize response
            if (response.id === 1 && response.result) {
              initResponse = response.result;

              // Request tools list
              child.stdin.write(JSON.stringify({
                jsonrpc: '2.0',
                id: 2,
                method: 'tools/list',
                params: {}
              }) + '\n');
            }

            // Tools list response
            if (response.id === 2 && response.result) {
              toolsResponse = response.result;
              hasResponded = true;
              clearTimeout(timeout);
              child.kill();

              // Note: Ignoring stderr verbosity for now (diagnostic messages are common)

              resolve({
                status: 'healthy',
                serverInfo: initResponse.serverInfo,
                tools: toolsResponse.tools || [],
                output: stdout + stderr
              });
              return;
            }
          }
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (!hasResponded) {
        reject(new Error(`MCP server exited before responding (exit code: ${code}). Check stderr: ${stderr}`));
      }
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    // Send initialization message after a brief delay
    setTimeout(() => {
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
    }, 1000);
  });
}

async function main() {
  const mcpName = process.argv[2];
  
  if (!mcpName) {
    console.error('Usage: node mcp-health-check.js <mcp-name>');
    console.error('Example: node mcp-health-check.js mdt-logging');
    process.exit(1);
  }

  console.log(`🔍 Running health check for MCP: ${mcpName}`);
  
  try {
    const mcpServers = loadMcpConfig();
    const mcpConfig = mcpServers[mcpName];
    
    if (!mcpConfig) {
      console.error(`❌ MCP server '${mcpName}' not found in config`);
      console.error(`Available servers: ${Object.keys(mcpServers).join(', ')}`);
      process.exit(1);
    }

    if (mcpConfig.disabled) {
      console.error(`❌ MCP server '${mcpName}' is disabled`);
      process.exit(1);
    }

    const result = await healthCheck(mcpName, mcpConfig);
    console.log('✅ Health check passed');
    console.log(`Status: ${result.status}`);

    if (result.serverInfo) {
      console.log(`\nServer: ${result.serverInfo.name} v${result.serverInfo.version}`);
    }

    if (result.tools && result.tools.length > 0) {
      console.log(`\n📦 Available Tools (${result.tools.length}):`);
      result.tools.forEach((tool, index) => {
        console.log(`  ${index + 1}. ${tool.name}`);
        if (tool.description) {
          console.log(`     ${tool.description.substring(0, 80)}${tool.description.length > 80 ? '...' : ''}`);
        }
      });
    } else {
      console.log('\n⚠️  No tools available');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Health check failed');
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
