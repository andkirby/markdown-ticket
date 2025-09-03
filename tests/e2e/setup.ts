import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class TestSetup {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private serverProcess: any = null;
  private serverPort = 3001;
  private frontendPort = 5173;

  async setup() {
    console.log('🧪 Setting up test environment...');

    // Start the backend server
    await this.startServer();

    // Start the frontend development server
    await this.startFrontend();

    // Launch browser
    this.browser = await chromium.launch({
      headless: false,
      slowMo: 1000,
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    this.page = await this.context.newPage();

    // Wait for frontend to load
    await this.page.goto(`http://localhost:${this.frontendPort}`);
    await this.page.waitForLoadState('networkidle');

    console.log('✅ Test environment setup complete');
  }

  private async startServer() {
    console.log('🚀 Starting backend server...');
    
    return new Promise<void>((resolve, reject) => {
      this.serverProcess = spawn('npm', ['run', 'start'], {
        cwd: join(__dirname, '..', 'server'),
        stdio: 'pipe',
      });

      this.serverProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log(`[Server] ${output}`);
        if (output.includes('Server running on')) {
          resolve();
        }
      });

      this.serverProcess.stderr?.on('data', (data) => {
        console.error(`[Server Error] ${data.toString()}`);
      });

      this.serverProcess.on('error', (error) => {
        console.error('Failed to start server:', error);
        reject(error);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!this.serverProcess.killed) {
          console.log('Server startup timeout, continuing...');
          resolve();
        }
      }, 10000);
    });
  }

  private async startFrontend() {
    console.log('🚀 Starting frontend server...');
    
    return new Promise<void>((resolve, reject) => {
      const frontendProcess = spawn('npm', ['run', 'dev'], {
        cwd: join(__dirname, '..'),
        stdio: 'pipe',
        env: {
          ...process.env,
          BROWSER: 'none', // Don't open browser
        },
      });

      frontendProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log(`[Frontend] ${output}`);
        if (output.includes('Local:') || output.includes('running on')) {
          resolve();
        }
      });

      frontendProcess.stderr?.on('data', (data) => {
        console.error(`[Frontend Error] ${data.toString()}`);
      });

      frontendProcess.on('error', (error) => {
        console.error('Failed to start frontend:', error);
        reject(error);
      });

      // Store reference for cleanup
      (global as any).frontendProcess = frontendProcess;

      // Timeout after 15 seconds
      setTimeout(() => {
        if (!frontendProcess.killed) {
          console.log('Frontend startup timeout, continuing...');
          resolve();
        }
      }, 15000);
    });
  }

  async getPage(): Promise<Page> {
    if (!this.page) {
      throw new Error('Page not initialized. Call setup() first.');
    }
    return this.page;
  }

  async cleanup() {
    console.log('🧹 Cleaning up test environment...');

    // Close browser
    if (this.browser) {
      await this.browser.close();
    }

    // Stop frontend server
    if ((global as any).frontendProcess) {
      (global as any).frontendProcess.kill();
    }

    // Stop backend server
    if (this.serverProcess) {
      this.serverProcess.kill();
    }

    console.log('✅ Test environment cleaned up');
  }

  async waitForServerReady() {
    console.log('⏳ Waiting for server to be ready...');
    
    const maxAttempts = 10;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`http://localhost:${this.serverPort}/api/status`);
        if (response.ok) {
          console.log('✅ Server is ready');
          return;
        }
      } catch (error) {
        // Server not ready yet
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('⚠️ Server may not be fully ready, continuing with tests...');
  }
}