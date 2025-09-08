# Browser Console MCP Integration

This document outlines methods to capture browser console logs and make them accessible through MCP tools for AI assistant debugging.

## Method 1: Console Intercept + API Endpoint

### Frontend Setup

Add to your main JavaScript file:

```javascript
// Intercept console logs
const logs = [];
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

function interceptConsole(level, originalFn) {
  return (...args) => {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message: args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ')
    };
    
    logs.push(entry);
    originalFn(...args);
    
    // Send to backend (silent fail)
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    }).catch(() => {});
  };
}

console.log = interceptConsole('log', originalLog);
console.error = interceptConsole('error', originalError);
console.warn = interceptConsole('warn', originalWarn);
```

### Backend Setup

Add to your server (server/server.js):

```javascript
const browserLogs = [];

// Store browser logs
app.post('/api/logs', (req, res) => {
  browserLogs.push(req.body);
  // Keep only last 1000 logs
  if (browserLogs.length > 1000) {
    browserLogs.shift();
  }
  res.status(200).send('OK');
});

// Get browser logs
app.get('/api/logs', (req, res) => {
  const count = parseInt(req.query.count) || 50;
  const level = req.query.level;
  
  let filteredLogs = browserLogs;
  if (level) {
    filteredLogs = browserLogs.filter(log => log.level === level);
  }
  
  res.json(filteredLogs.slice(-count));
});
```

### MCP Tool

Add to your MCP server (mcp-server/src/index.ts):

```typescript
{
  name: "get_browser_logs",
  description: "Get recent browser console logs from the frontend",
  inputSchema: {
    type: "object",
    properties: {
      count: { 
        type: "number", 
        default: 50,
        description: "Number of recent logs to retrieve"
      },
      level: {
        type: "string",
        enum: ["log", "error", "warn"],
        description: "Filter by log level"
      }
    }
  }
}

// Implementation
async function getBrowserLogs(args: { count?: number; level?: string }) {
  const { count = 50, level } = args;
  const url = `http://localhost:3000/api/logs?count=${count}${level ? `&level=${level}` : ''}`;
  
  try {
    const response = await fetch(url);
    const logs = await response.json();
    return {
      success: true,
      logs,
      total: logs.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

## Method 2: Ready-to-Use Solutions

### Option A: Puppeteer Console Capture

```bash
npm install puppeteer
```

Add to MCP server:

```javascript
const puppeteer = require('puppeteer');

let browser = null;
let page = null;
const consoleLogs = [];

async function startBrowserMonitoring() {
  browser = await puppeteer.launch({ headless: true });
  page = await browser.newPage();
  
  page.on('console', msg => {
    consoleLogs.push({
      timestamp: new Date().toISOString(),
      level: msg.type(),
      message: msg.text()
    });
  });
  
  await page.goto('http://localhost:5173');
}

// MCP Tool
{
  name: "monitor_browser_console",
  description: "Start/stop monitoring browser console with Puppeteer",
  inputSchema: {
    type: "object",
    properties: {
      action: { type: "string", enum: ["start", "stop", "get_logs"] }
    }
  }
}
```

### Option B: Chrome DevTools Protocol

```bash
npm install chrome-remote-interface
```

```javascript
const CDP = require('chrome-remote-interface');

let client = null;
const consoleLogs = [];

async function connectToChrome() {
  client = await CDP();
  const {Runtime} = client;
  
  await Runtime.enable();
  Runtime.consoleAPICalled((params) => {
    consoleLogs.push({
      timestamp: new Date().toISOString(),
      level: params.type,
      message: params.args.map(arg => arg.value || arg.description).join(' ')
    });
  });
}
```

### Option C: Playwright

```bash
npm install playwright
```

```javascript
const { chromium } = require('playwright');

let browser = null;
let page = null;
const consoleLogs = [];

async function startPlaywrightMonitoring() {
  browser = await chromium.launch();
  page = await browser.newPage();
  
  page.on('console', msg => {
    consoleLogs.push({
      timestamp: new Date().toISOString(),
      level: msg.type(),
      message: msg.text()
    });
  });
  
  await page.goto('http://localhost:5173');
}
```

## Recommended Implementation

For the markdown-ticket project, **Method 1 (Console Intercept + API)** is recommended because:

- No additional browser instances needed
- Works with existing development setup
- Real-time log capture
- Minimal performance impact
- Easy to implement and maintain

## Usage Examples

Once implemented, you can use MCP tools like:

```
Get recent browser logs:
- get_browser_logs with count=20

Get only error logs:
- get_browser_logs with level="error"

Monitor console during ticket operations:
- get_browser_logs before and after actions
```

This enables AI assistants to see frontend console output for debugging ticket board operations, drag-and-drop issues, API calls, and other frontend behavior.
