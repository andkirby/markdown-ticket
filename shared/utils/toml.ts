import toml from 'toml';

/**
 * Parse TOML string to JavaScript object
 * @param content - TOML content as string
 * @returns Parsed JavaScript object
 */
export function parse(content: string): any {
  return toml.parse(content);
}

/**
 * Convert JavaScript object to TOML string
 * @param obj - Object to serialize to TOML
 * @returns TOML formatted string
 */
export function stringify(obj: any): string {
  let toml = '';

  for (const [section, data] of Object.entries(obj)) {
    // Skip sections with no data
    if (!data || typeof data !== 'object') {
      continue;
    }

    toml += `[${section}]\n`;
    for (const [key, value] of Object.entries(data as any)) {
      // Skip undefined/null values
      if (value === undefined || value === null) {
        continue;
      }

      if (typeof value === 'string') {
        toml += `${key} = "${value}"\n`;
      } else if (typeof value === 'boolean') {
        toml += `${key} = ${value}\n`;
      } else if (typeof value === 'number') {
        toml += `${key} = ${value}\n`;
      } else if (Array.isArray(value)) {
        // Handle arrays properly
        if (value.length > 0) {
          toml += `${key} = [${value.map(item => `"${item}"`).join(', ')}]\n`;
        }
      } else {
        // Fallback for other types
        toml += `${key} = "${value}"\n`;
      }
    }
    toml += '\n';
  }

  return toml.trim() + '\n'; // Ensure single trailing newline
}