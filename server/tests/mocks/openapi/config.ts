/**
 * Mock of openapi/config for testing
 */

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'MDT API',
    version: '1.0.0',
  },
  paths: {},
};

export const validateResponse = () => ({ valid: true });
