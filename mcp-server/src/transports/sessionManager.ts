import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

/**
 * Session data for tracking client connections
 */
export interface Session {
  id: string;
  createdAt: Date;
  lastActivity: Date;
  clientInfo?: {
    userAgent?: string;
    origin?: string;
  };
  eventEmitter: EventEmitter;
}

/**
 * Session manager for MCP HTTP transport
 * Handles session creation, validation, and cleanup
 */
export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private sessionTimeout: number; // milliseconds
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(sessionTimeoutMs: number = 30 * 60 * 1000) { // 30 minutes default
    this.sessionTimeout = sessionTimeoutMs;
    this.startCleanupTask();
  }

  /**
   * Create a new session
   */
  createSession(clientInfo?: { userAgent?: string; origin?: string }): Session {
    const sessionId = uuidv4();
    const session: Session = {
      id: sessionId,
      createdAt: new Date(),
      lastActivity: new Date(),
      clientInfo,
      eventEmitter: new EventEmitter()
    };

    this.sessions.set(sessionId, session);
    console.error(`📝 Session created: ${sessionId}`);

    return session;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): Session | undefined {
    const session = this.sessions.get(sessionId);

    if (session) {
      // Update last activity
      session.lastActivity = new Date();
    }

    return session;
  }

  /**
   * Validate session exists and is not expired
   */
  validateSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return false;
    }

    // Check if expired
    const now = Date.now();
    const lastActivity = session.lastActivity.getTime();

    if (now - lastActivity > this.sessionTimeout) {
      this.deleteSession(sessionId);
      return false;
    }

    return true;
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);

    if (session) {
      // Close all event emitters
      session.eventEmitter.removeAllListeners();
      this.sessions.delete(sessionId);
      console.error(`🗑️  Session deleted: ${sessionId}`);
      return true;
    }

    return false;
  }

  /**
   * Emit an event to a specific session (for SSE)
   */
  emitToSession(sessionId: string, event: string, data: any): boolean {
    const session = this.sessions.get(sessionId);

    if (session) {
      session.eventEmitter.emit(event, data);
      return true;
    }

    return false;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Start cleanup task to remove expired sessions
   */
  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // Run every 5 minutes
  }

  /**
   * Cleanup expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const lastActivity = session.lastActivity.getTime();

      if (now - lastActivity > this.sessionTimeout) {
        this.deleteSession(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.error(`🧹 Cleaned up ${cleaned} expired session(s)`);
    }
  }

  /**
   * Stop cleanup task (for graceful shutdown)
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Close all sessions
    for (const [sessionId] of this.sessions.entries()) {
      this.deleteSession(sessionId);
    }

    console.error('🛑 Session manager shutdown complete');
  }
}
