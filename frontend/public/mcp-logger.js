// Early console interceptor - loads before React, works even when app is broken
// Updated: 2025-09-15T23:28:00 - Comprehensive error capture
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
  if (autoStartEnabled) {
    // Delay auto-start to give backend time to initialize
    setTimeout(autoStartSession, 1000);
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
        sessionActive = true;
      }
    } catch (error) {
      // Reset flag to allow retry later
      autoStartAttempted = false;
    }
  }

  // Client-side rate limiting for status checks
  let lastStatusCheck = 0;
  const STATUS_CHECK_INTERVAL = 12000; // 12 seconds (less than server's 10s limit)

  // Check session status
  async function checkSessionStatus() {
    const now = Date.now();
    if (now - lastStatusCheck < STATUS_CHECK_INTERVAL) {
      // Skip this check due to rate limiting
      return;
    }
    
    try {
      lastStatusCheck = now;
      const response = await fetch('/api/frontend/logs/status');
      if (response.status === 429) {
        // Rate limited, skip this check
        return;
      }
      const data = await response.json();
      sessionActive = data.active;

      // Only auto-start if session isn't active and we haven't tried yet
      if (autoStartEnabled && !sessionActive && !autoStartAttempted) {
        await autoStartSession();
      }
    } catch (error) {
      sessionActive = false;
    }
  }
  
  // Send logs to backend with retry logic
  async function flushLogs() {
    if (logBuffer.length === 0 || !sessionActive) return;

    const logsToSend = [...logBuffer];
    
    try {
      const response = await fetch('/api/frontend/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: logsToSend })
      });
      
      if (response.ok) {
        // Success - clear the buffer
        logBuffer.length = 0;
      } else {
        // Backend not ready - keep logs in buffer, don't clear
      }
    } catch (error) {
      // Network error - keep logs in buffer for retry
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

        // Schedule flush with more aggressive retry during startup
        if (flushTimer) clearTimeout(flushTimer);
        
        // If we have many logs buffered, try more frequently (backend might be starting up)
        const flushDelay = logBuffer.length > 10 ? 500 : 1000;
        flushTimer = setTimeout(flushLogs, flushDelay);
      }
    };
  }
  
  // Intercept console methods (except error which is handled above)
  ['log', 'warn', 'info', 'debug'].forEach(interceptConsole);

  // Intercept network errors
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    try {
      const response = await originalFetch.apply(this, args);
      
      // Log failed requests (except rate limiting on status endpoint)
      if (!response.ok) {
        const url = typeof args[0] === 'string' ? args[0] : args[0].url;
        // Don't log 429 errors for status endpoint (expected due to rate limiting)
        if (!(response.status === 429 && url.includes('/api/frontend/logs/status'))) {
          console.error(`FETCH ${response.status} (${response.statusText}) ${url}`);
        }
      }
      
      return response;
    } catch (error) {
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      console.error(`FETCH ERROR ${url}: ${error.message}`);
      throw error;
    }
  };

  // Intercept XMLHttpRequest errors (for Vite dev server requests)
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this._method = method;
    this._url = url;
    return originalXHROpen.call(this, method, url, ...args);
  };
  
  XMLHttpRequest.prototype.send = function(...args) {
    const xhr = this;
    
    // Store original handlers
    const originalOnError = xhr.onerror;
    const originalOnLoad = xhr.onload;
    const originalOnReadyStateChange = xhr.onreadystatechange;
    
    // Override error handler
    xhr.onerror = function(event) {
      console.error(`GET ${xhr._url} net::ERR_ABORTED ${xhr.status || 500} (Internal Server Error)`);
      if (originalOnError) originalOnError.call(this, event);
    };
    
    // Override load handler for HTTP errors
    xhr.onload = function(event) {
      if (xhr.status >= 400) {
        console.error(`GET ${xhr._url} ${xhr.status} (${xhr.statusText})`);
      }
      if (originalOnLoad) originalOnLoad.call(this, event);
    };
    
    // Override readystatechange for more comprehensive error catching
    xhr.onreadystatechange = function(event) {
      if (xhr.readyState === 4 && xhr.status >= 400) {
        console.error(`GET ${xhr._url} ${xhr.status} (${xhr.statusText || 'Internal Server Error'})`);
      }
      if (originalOnReadyStateChange) originalOnReadyStateChange.call(this, event);
    };
    
    return originalXHRSend.call(this, ...args);
  };

  // Check session status periodically (disabled to prevent 429 errors)
  checkSessionStatus();
  // setInterval(checkSessionStatus, 15000); // Disabled - only check once on load

  // Comprehensive error capture - override native error reporting
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    console.error(`WINDOW ERROR: ${message} at ${source}:${lineno}:${colno}`);
    if (originalOnError) return originalOnError.apply(this, arguments);
    return false;
  };

  // Global error handlers
  window.addEventListener('error', (event) => {
    // Capture both script errors and resource loading errors
    if (event.target && event.target !== window) {
      // Resource loading error (script, img, etc.)
      const element = event.target;
      const tagName = element.tagName?.toLowerCase();
      const src = element.src || element.href;
      console.error(`RESOURCE ERROR: ${tagName} failed to load ${src}`);
    } else {
      // JavaScript error
      console.error(`EVENT ERROR: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`);
    }
  }, true); // Use capture phase

  window.addEventListener('unhandledrejection', (event) => {
    console.error(`UNHANDLED PROMISE REJECTION: ${event.reason}`);
  });

  // Override console.error to capture immediate evaluation errors
  const originalConsoleError = console.error;
  console.error = function(...args) {
    // Call original first
    originalConsoleError.apply(console, args);
    
    // Then our interceptor
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');

    const logEntry = {
      timestamp: Date.now(),
      level: 'error',
      message,
      url: window.location.href,
      userAgent: navigator.userAgent.substring(0, 100)
    };

    // Session logging
    if (sessionActive) {
      logBuffer.push({ ...logEntry });

      // Trim buffer if too large
      if (logBuffer.length > MAX_BUFFER_SIZE) {
        logBuffer.splice(0, logBuffer.length - MAX_BUFFER_SIZE);
      }

      // Schedule flush with more aggressive retry during startup
      if (flushTimer) clearTimeout(flushTimer);
      const flushDelay = logBuffer.length > 10 ? 500 : 1000;
      flushTimer = setTimeout(flushLogs, flushDelay);
    }
  };

  // Intercept dynamic import errors (ES modules)
  const originalImport = window.__vitePreload || window.import;
  if (originalImport) {
    window.__vitePreload = async function(...args) {
      try {
        return await originalImport.apply(this, args);
      } catch (error) {
        console.error(`MODULE IMPORT ERROR: ${args[0]} - ${error.message}`);
        throw error;
      }
    };
  }

  // Flush logs on page unload
  window.addEventListener('beforeunload', () => {
    flushLogs();
  });

  // Initialize logging message
  const initMessages = [];
  if (autoStartEnabled) {
    initMessages.push('🔍 Auto-start enabled - frontend logging session will start automatically');
  }

  initMessages.forEach(msg => console.log(msg));
})();
