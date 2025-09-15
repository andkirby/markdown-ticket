// Early console interceptor - loads before React, works even when app is broken
(function() {
  'use strict';

  const logBuffer = [];
  const MAX_BUFFER_SIZE = 100;
  let sessionActive = false;
  let flushTimer = null;
  let autoStartEnabled = false;
  let autoStartAttempted = false;

  // Store original console methods
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug
  };

  // Auto-start detection: Environment variable only
  function detectAutoStart() {
    // Check if we're in development mode with auto-start enabled
    // The environment variable is injected by Vite at build time
    return window.VITE_FRONTEND_LOGGING_AUTOSTART === true;
  }

  // Initialize auto-start
  autoStartEnabled = detectAutoStart();
  console.log('🔍 DEBUG: Auto-start enabled result:', autoStartEnabled);
  if (autoStartEnabled) {
    console.log('🔍 Frontend logging auto-start enabled');
    // Start session immediately when auto-start is enabled
    autoStartSession();
  }
  
  // Auto-start session if enabled
  async function autoStartSession() {
    if (!autoStartEnabled || autoStartAttempted) return;

    autoStartAttempted = true;

    try {
      const response = await fetch('/api/frontend/logs/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        console.log('🔍 Frontend logging session auto-started');
        sessionActive = true;
      }
    } catch (error) {
      console.log('🔍 Failed to auto-start frontend logging session');
    }
  }

  // Check session status
  async function checkSessionStatus() {
    try {
      const response = await fetch('/api/frontend/logs/status');
      const data = await response.json();
      sessionActive = data.active;

      // If auto-start is enabled and session isn't active, try to start it
      if (autoStartEnabled && !sessionActive && !autoStartAttempted) {
        await autoStartSession();
      }
    } catch (error) {
      sessionActive = false;
    }
  }
  
  // Send logs to backend
  async function flushLogs() {
    if (logBuffer.length === 0 || !sessionActive) return;

    const logsToSend = [...logBuffer];
    logBuffer.length = 0;

    try {
      await fetch('/api/frontend/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: logsToSend })
      });
    } catch (error) {
      // Silently fail - don't break the app further
    }
  }
  
  // Intercept console methods
  function interceptConsole(level) {
    console[level] = function(...args) {
      // Always call original console
      originalConsole[level].apply(console, args);

      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      const logEntry = {
        timestamp: Date.now(),
        level,
        message,
        url: window.location.href,
        userAgent: navigator.userAgent.substring(0, 100)
      };

      // Session logging (works with both manual and auto-started sessions)
      if (sessionActive) {
        logBuffer.push({ ...logEntry });

        // Trim buffer if too large
        if (logBuffer.length > MAX_BUFFER_SIZE) {
          logBuffer.splice(0, logBuffer.length - MAX_BUFFER_SIZE);
        }

        // Schedule flush
        if (flushTimer) clearTimeout(flushTimer);
        flushTimer = setTimeout(flushLogs, 1000);
      }
    };
  }
  
  // Set up console interception
  ['log', 'error', 'warn', 'info', 'debug'].forEach(interceptConsole);

  // Check session status periodically
  checkSessionStatus();
  setInterval(checkSessionStatus, 5000);

  // Flush logs on page unload
  window.addEventListener('beforeunload', () => {
    flushLogs();
  });

  // Initialize logging message
  const initMessages = ['🔍 MCP Logger initialized - will capture logs when session active'];
  if (autoStartEnabled) {
    initMessages.push('🔍 Auto-start enabled - frontend logging session will start automatically');
  }

  initMessages.forEach(msg => console.log(msg));
})();
