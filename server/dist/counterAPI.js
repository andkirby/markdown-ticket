import { readConfig } from './config/configManager.js';
let counterAPI;
try {
    counterAPI = (await import('../counter-api/index.js'));
}
catch {
    console.warn('Counter API package not found. Counter functionality disabled.');
}
/**
 * Get counter configuration for a specific key type
 * @param keyType - The type of counter key (default: 'client')
 * @returns Counter configuration object
 * @throws Error if Counter API package is not installed
 */
export async function getCounterConfig(keyType = 'client') {
    if (!counterAPI) {
        throw new Error('Counter API package not installed');
    }
    const config = await readConfig();
    return counterAPI.getCounterConfig(config, keyType);
}
/**
 * Create a counter client for a specific key type
 * @param keyType - The type of counter key (default: 'client')
 * @returns Counter client instance
 * @throws Error if Counter API package is not installed
 */
export async function createCounterClient(keyType = 'client') {
    if (!counterAPI) {
        throw new Error('Counter API package not installed');
    }
    const config = await readConfig();
    return counterAPI.createCounterClient(config, keyType);
}
/**
 * Handle Counter API errors and send appropriate HTTP responses
 * @param error - The error object from Counter API
 * @param res - Express response object
 * @returns Express response with appropriate status and error message
 */
export function handleCounterAPIError(error, res) {
    console.error('Counter API Error:', error.message);
    if (error.message === 'Counter API not configured') {
        return res.status(400).json({
            error: 'Counter API not configured',
            code: 'NOT_CONFIGURED'
        });
    }
    if (error.response) {
        const status = error.response.status;
        const data = error.response.data || {};
        if (status === 401) {
            return res.status(401).json({
                error: 'Invalid API key',
                code: 'INVALID_API_KEY'
            });
        }
        if (status === 403) {
            return res.status(403).json({
                error: 'Access denied to project',
                code: 'ACCESS_DENIED'
            });
        }
        return res.status(status).json(data);
    }
    if (error.code === 'ECONNREFUSED') {
        return res.status(503).json({
            error: 'Counter API unavailable',
            code: 'SERVICE_UNAVAILABLE'
        });
    }
    if (error.code === 'ETIMEDOUT') {
        return res.status(504).json({
            error: 'Counter API timeout',
            code: 'TIMEOUT'
        });
    }
    res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
    });
}
//# sourceMappingURL=counterAPI.js.map