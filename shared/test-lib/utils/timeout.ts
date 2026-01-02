/**
 * Utility function to add a timeout to any promise.
 *
 * Races the provided promise against a timeout, rejecting if the promise
 * doesn't resolve within the specified time limit.
 *
 * @typeParam T - The type of value the promise resolves to
 * @param promise - The promise to wrap with a timeout
 * @param timeoutMs - Maximum time to wait in milliseconds (default: 5000)
 * @param errorMessage - Optional custom error message
 * @returns A promise that resolves with the original promise value or rejects on timeout
 *
 * @example
 * ```ts
 * const result = await withTimeout(
 *   fetchData(),
 *   3000,
 *   'Data fetch timed out'
 * );
 * ```
 *
 * @throws {Error} When the timeout is reached before the promise resolves
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number = 5000,
  errorMessage?: string
): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(errorMessage || `Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
};
