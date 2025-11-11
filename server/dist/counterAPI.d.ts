import { CounterConfig } from '@shared/models/Counter.js';
interface ExpressResponse {
    status: (code: number) => ExpressResponse;
    json: (data: object) => void;
}
interface CounterAPIError extends Error {
    response?: {
        status: number;
        data?: object;
    };
    code?: string;
}
/**
 * Get counter configuration for a specific key type
 * @param keyType - The type of counter key (default: 'client')
 * @returns Counter configuration object
 * @throws Error if Counter API package is not installed
 */
export declare function getCounterConfig(keyType?: string): Promise<CounterConfig>;
/**
 * Create a counter client for a specific key type
 * @param keyType - The type of counter key (default: 'client')
 * @returns Counter client instance
 * @throws Error if Counter API package is not installed
 */
export declare function createCounterClient(keyType?: string): Promise<unknown>;
/**
 * Handle Counter API errors and send appropriate HTTP responses
 * @param error - The error object from Counter API
 * @param res - Express response object
 * @returns Express response with appropriate status and error message
 */
export declare function handleCounterAPIError(error: CounterAPIError, res: ExpressResponse): ExpressResponse | void;
export {};
