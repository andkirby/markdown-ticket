import { Request, Response, NextFunction } from 'express';
/**
 * Request validation middleware
 */
/**
 * Validate required query parameters
 * @param requiredParams - Array of required parameter names
 * @returns Middleware function
 */
export declare function validateQueryParams(...requiredParams: string[]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Validate required body fields
 * @param requiredFields - Array of required field names
 * @returns Middleware function
 */
export declare function validateBodyFields(...requiredFields: string[]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Validate request content type
 * @param expectedType - Expected content type (e.g., 'application/json')
 * @returns Middleware function
 */
export declare function validateContentType(expectedType: string): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
