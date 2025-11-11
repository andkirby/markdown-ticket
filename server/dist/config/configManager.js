import path from 'path';
import fs from 'fs';
import toml from 'toml';
/**
 * Read global configuration for Counter API
 * @returns Configuration object for Counter API
 */
export async function readConfig() {
    const configPath = path.join(process.cwd(), '.mdt-config.toml');
    try {
        if (!fs.existsSync(configPath)) {
            // Return default config if no config file exists
            return {
                counter: {
                    apiKey: process.env.COUNTER_API_KEY || null,
                    endpoint: process.env.COUNTER_API_ENDPOINT || 'https://api.example.com',
                    projectId: process.env.COUNTER_PROJECT_ID || null
                }
            };
        }
        const content = fs.readFileSync(configPath, 'utf8');
        const config = toml.parse(content);
        // Extract counter-related configuration
        return {
            counter: {
                apiKey: config.counter?.apiKey || process.env.COUNTER_API_KEY || null,
                endpoint: config.counter?.endpoint || process.env.COUNTER_API_ENDPOINT || 'https://api.example.com',
                projectId: config.counter?.projectId || process.env.COUNTER_PROJECT_ID || null
            }
        };
    }
    catch (error) {
        console.error('Error reading configuration:', error);
        // Return default config on error
        return {
            counter: {
                apiKey: process.env.COUNTER_API_KEY || null,
                endpoint: process.env.COUNTER_API_ENDPOINT || 'https://api.example.com',
                projectId: process.env.COUNTER_PROJECT_ID || null
            }
        };
    }
}
//# sourceMappingURL=configManager.js.map