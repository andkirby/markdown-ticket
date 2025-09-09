// Early console interceptor - loads before React, works even when app is broken
(function() {
  'use strict';
  
  const logBuffer = [];
  const MAX_BUFFER_SIZE = 100;
  let sessionActive = false;
  let flushTimer = null;
  
  // Store original console methods
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug
  };
  
  // Check session status
  async function checkSessionStatus() {
    try {
      const response = await fetch('/api/frontend/logs/status');
      const data = await response.json();
      sessionActive = data.active;
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
      
      // Only capture if session active
      if (sessionActive) {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        
        logBuffer.push({
          timestamp: Date.now(),
          level,
          message,
          url: window.location.href,
          userAgent: navigator.userAgent.substring(0, 100)
        });
        
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
  window.addEventListener('beforeunload', flushLogs);
  
  console.log('🔍 MCP Logger initialized - will capture logs when session active');
})();
