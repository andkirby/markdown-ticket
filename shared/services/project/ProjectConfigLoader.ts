import { validateProjectConfig, isLegacyConfig } from '../../models/Project.js';
import { CONFIG_FILES } from '../../utils/constants.js';
import { logQuiet } from '../../utils/logger.js';
import { parseToml, stringify } from '../../utils/toml.js';
import { fileExists, readFile, writeFile } from '../../utils/file-utils.js';
import { buildConfigFilePath } from '../../utils/path-resolver.js';

/**
 * Utility class for handling project configuration operations
 * Extracted from ProjectDiscoveryService to reduce file size
 */
export class ProjectConfigLoader {
  private quiet: boolean;

  constructor(quiet: boolean = false) {
    this.quiet = quiet;
  }

  /**
   * Get project configuration from local .mdt-config.toml
   * Automatically migrates legacy configurations on read
   */
  getProjectConfig(projectPath: string): any {
    try {
      const configPath = buildConfigFilePath(projectPath, CONFIG_FILES.PROJECT_CONFIG);

      if (!fileExists(configPath)) {
        return null;
      }

      const content = readFile(configPath);
      const config = parseToml(content);

      if (validateProjectConfig(config)) {
        // Check for legacy configuration and migrate automatically
        if (isLegacyConfig(config)) {
          logQuiet(this.quiet, `Automatically migrating legacy configuration format for project at ${projectPath}...`);
          const migratedConfig = this.migrateLegacyConfigWithCleanup(config, configPath);

          return migratedConfig;
        }
        return config;
      }

      return null;
    } catch (error) {
      logQuiet(this.quiet, `Error reading project config from ${projectPath}:`, error);
      return null;
    }
  }

  /**
   * Enhanced migration method that properly cleans up legacy configurations
   * Moves project.path (tickets) to project.ticketsPath and sets project.path to "."
   */
  private migrateLegacyConfigWithCleanup(config: any, configPath: string): any {
    if (!isLegacyConfig(config)) {
      return config;
    }

    // At this point, config.project.path is guaranteed to be a string (not undefined)
    // because isLegacyConfig() checks for its existence and non-undefined value
    const legacyTicketsPath = config.project.path!; // Non-null assertion - safe due to isLegacyConfig check

    // Create a clean migrated configuration
    const migratedConfig = {
      ...config,
      project: {
        ...config.project,
        // Set project.path to "." since it represents the project root
        // The legacy path was actually the tickets path, not the project root
        path: ".",
        // Move the legacy path to ticketsPath where it belongs
        ticketsPath: legacyTicketsPath
      }
    };

    // Write the migrated config back to disk to clean up the legacy format
    // This ensures the migration is persisted and future reads are fast
    const tomlContent = stringify(migratedConfig);
    writeFile(configPath, tomlContent);
    logQuiet(this.quiet, `Updated legacy config to clean format at ${configPath}`);

    return migratedConfig;
  }
}