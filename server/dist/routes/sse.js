import { Router } from 'express';
/**
 * Router for Server-Sent Events endpoints
 * @param fileWatcher - File watcher service instance
 * @returns Express router
 */
export function createSSERouter(fileWatcher) {
    const router = Router();
    // Server-Sent Events endpoint for real-time file updates
    router.get('/', (req, res) => {
        // Set SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        });
        // Send initial connection event
        res.write('data: {"type":"connection","data":{"status":"connected","timestamp":' + Date.now() + '}}\n\n');
        // Add client to file watcher service
        fileWatcher.addClient(res);
        console.log(`SSE client connected. Total clients: ${fileWatcher.getClientCount()}`);
        // Handle client disconnect
        req.on('close', () => {
            console.log('SSE client disconnected');
            fileWatcher.removeClient(res);
        });
        req.on('aborted', () => {
            console.log('SSE client aborted');
            fileWatcher.removeClient(res);
        });
    });
    return router;
}
//# sourceMappingURL=sse.js.map