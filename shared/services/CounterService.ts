import type { CounterResponse } from '../models/Counter.js';

export class CounterService {
  static async generateTicket(projectId: string): Promise<CounterResponse | null> {
    try {
      const response = await fetch('/api/counter/generate-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });

      if (!response.ok) {
        console.warn('Counter API unavailable, using fallback');
        return null;
      }

      return await response.json() as CounterResponse;
    } catch (error) {
      console.warn('Counter API error:', error);
      return null;
    }
  }

  static async testConnection(): Promise<boolean> {
    try {
      const response = await fetch('/api/counter/test-connection', {
        method: 'POST'
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
