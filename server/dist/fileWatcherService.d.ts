import { EventEmitter } from 'events';
interface ProjectPath {
    id: string;
    path: string;
}
interface SSEEvent {
    type: string;
    data: any;
}
interface FileInvoker {
    invalidateFile(filePath: string): void;
}
interface ResponseLike {
    write(data: string): void;
    on(event: string, callback: (...args: any[]) => void): void;
    headersSent: boolean;
    destroyed?: boolean;
    closed?: boolean;
    end?(): void;
}
/**
 * File watcher service for monitoring changes to markdown files and project configurations
 */
declare class FileWatcherService extends EventEmitter {
    private watchers;
    private eventQueue;
    private clients;
    private debounceTimers;
    private watchPaths;
    private fileInvoker;
    constructor();
    /**
     * Set file operation invoker for cache invalidation
     */
    setFileInvoker(fileInvoker: FileInvoker): void;
    initFileWatcher(watchPath?: string): FileWatcherService;
    initMultiProjectWatcher(projectPaths: ProjectPath[]): FileWatcherService;
    /**
     * Initialize file watcher for global project registry
     * Watches ~/.config/markdown-ticket/projects/*.toml for project lifecycle events
     */
    initGlobalRegistryWatcher(): void;
    /**
     * Handle global registry file events
     * @param eventType - 'add', 'change', or 'unlink'
     * @param filePath - Full path to the .toml file
     */
    handleRegistryEvent(eventType: string, filePath: string): void;
    handleFileEvent(eventType: string, filePath: string, projectId: string): void;
    getProjectPath(projectId: string): string;
    broadcastFileChange(eventType: string, filename: string, projectId: string): Promise<void>;
    addClient(response: ResponseLike): void;
    removeClient(response: ResponseLike): void;
    sendSSEEvent(response: ResponseLike, event: SSEEvent): void;
    startHeartbeat(intervalMs?: number): void;
    getClientCount(): number;
    stop(): void;
}
export default FileWatcherService;
