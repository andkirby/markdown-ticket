/**
 * Mock of @mdt/shared/services/ProjectService for testing
 * Provides a functional mock that mimics the real ProjectService behavior
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'

// Get CONFIG_DIR from environment, with fallback
function getConfigDir(): string {
  return process.env.CONFIG_DIR || path.join(process.env.HOME || '', '.config', 'markdown-ticket')
}

interface ProjectRegistryEntry {
  name: string
  code: string
  ticketsPath: string
  path: string
  projectDir: string
  active: boolean
}

interface ProjectListEntry {
  id: string
  project: {
    name: string
    path: string
    active: boolean
  }
  configPath: string
}

interface ProjectConfigEntry {
  name: string
  code: string
  ticketsPath: string
  path: string
}

interface ProjectCR {
  code: string
  title: string
  status: string
  type: string
  priority: string
  filename: string
  path: string
}

interface ConfigureDocumentsResult {
  success: boolean
  message: string
}

// Shared registry across all ProjectService instances
const sharedProjectsRegistry: Map<string, ProjectRegistryEntry> = new Map()

export class ProjectService {
  private projectsRegistry: Map<string, ProjectRegistryEntry>
  private configDir: string

  constructor(_quiet: boolean = false) {
    this.configDir = getConfigDir()
    // Use shared registry so all instances see the same projects
    this.projectsRegistry = sharedProjectsRegistry
    this.loadProjectsRegistry()
  }

  /**
   * Load projects from the registry directory
   * Also scans the projects directory created by ProjectFactory
   */
  private loadProjectsRegistry(): void {
    // Clear registry and reload
    this.projectsRegistry.clear()

    // Always get fresh configDir from environment in case TestEnvironment changed it
    const currentConfigDir = getConfigDir()

    // 1. Load from registry pattern: configDir/projects/ (symlinks to actual projects)
    const projectsRegistryDir = path.join(currentConfigDir, 'projects')
    if (fs.existsSync(projectsRegistryDir)) {
      const entries = fs.readdirSync(projectsRegistryDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const configPath = path.join(projectsRegistryDir, entry.name, '.mdt-config.toml')
          if (fs.existsSync(configPath)) {
            this.loadProjectFromConfig(configPath, entry.name)
          }
        }
      }
    }

    // 2. Load from ProjectFactory pattern: {tempDir}/projects/ (actual project directories)
    // The configDir is usually {tempDir}/config, so projects would be at {tempDir}/projects
    const tempDirProjects = path.join(path.dirname(currentConfigDir), 'projects')
    if (fs.existsSync(tempDirProjects) && tempDirProjects !== projectsRegistryDir) {
      const entries = fs.readdirSync(tempDirProjects, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const configPath = path.join(tempDirProjects, entry.name, '.mdt-config.toml')
          if (fs.existsSync(configPath)) {
            // Don't overwrite existing entries from registry
            if (!this.projectsRegistry.has(entry.name)) {
              this.loadProjectFromConfig(configPath, entry.name)
            }
          }
        }
      }
    }
  }

  /**
   * Load a single project from its config file
   */
  private loadProjectFromConfig(configPath: string, entryName: string): void {
    try {
      const content = fs.readFileSync(configPath, 'utf-8')
      // Parse basic TOML (simplified for testing)
      const nameMatch = content.match(/name\s*=\s*["']([^"']+)["']/)
      const codeMatch = content.match(/code\s*=\s*["']([^"']+)["']/)
      const ticketsPathMatch = content.match(/ticketsPath\s*=\s*["']([^"']+)["']/)

      if (nameMatch && codeMatch) {
        // Store the project directory name as the path
        const projectDirName = path.basename(path.dirname(configPath))
        this.projectsRegistry.set(entryName, {
          name: nameMatch[1],
          code: codeMatch[1],
          ticketsPath: ticketsPathMatch ? ticketsPathMatch[1] : 'docs/CRs',
          path: path.dirname(configPath), // Full path for file operations
          projectDir: projectDirName, // Just the directory name for registry lookups
          active: true,
        })
      }
    }
    catch {
      // Skip invalid configs
    }
  }

  /**
   * Refresh projects registry (call this after creating new projects)
   */
  public refreshRegistry(): void {
    this.loadProjectsRegistry()
  }

  /**
   * Get all projects
   * Accepts bypassCache parameter for compatibility with controller expectations
   * Always refreshes registry to pick up projects created dynamically
   */
  async getAllProjects(_bypassCache?: boolean): Promise<ProjectListEntry[]> {
    // Always refresh to pick up projects created by ProjectFactory
    this.loadProjectsRegistry()

    const result = Array.from(this.projectsRegistry.values()).map(project => ({
      id: project.code,
      project: {
        name: project.name,
        path: project.path, // Always use the full path
        active: project.active,
      },
      configPath: path.join(project.path, '.mdt-config.toml'),
    }))
    return result
  }

  /**
   * Get project configuration by path
   */
  getProjectConfig(projectPath: string): ProjectConfigEntry | null {
    for (const [key, project] of this.projectsRegistry.entries()) {
      if (project.path === projectPath || key === projectPath || project.projectDir === projectPath || project.code === projectPath) {
        return {
          name: project.name,
          code: project.code,
          ticketsPath: project.ticketsPath,
          path: project.path,
        }
      }
    }
    return null
  }

  /**
   * Get all CRs for a project
   */
  async getProjectCRs(projectPath: string): Promise<ProjectCR[]> {
    const config = this.getProjectConfig(projectPath)
    if (!config) {
      return []
    }

    // Use the full path from config, not the input projectPath which might be just "API"
    const ticketsDir = path.join(config.path, config.ticketsPath)
    if (!fs.existsSync(ticketsDir)) {
      return []
    }

    const crs: ProjectCR[] = []
    const entries = fs.readdirSync(ticketsDir, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const markdownFiles = fs.readdirSync(path.join(ticketsDir, entry.name))
          .filter(f => f.endsWith('.md'))

        for (const mdFile of markdownFiles) {
          const mdPath = path.join(ticketsDir, entry.name, mdFile)
          try {
            const content = fs.readFileSync(mdPath, 'utf-8')
            const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/)
            if (yamlMatch) {
              const yaml = yamlMatch[1]
              const titleMatch = yaml.match(/title:\s*["']?([^"'\n]+)["']?/)
              const statusMatch = yaml.match(/status:\s*["']?([^"'\n]+)["']?/)
              const typeMatch = yaml.match(/type:\s*["']?([^"'\n]+)["']?/)
              const priorityMatch = yaml.match(/priority:\s*["']?([^"'\n]+)["']?/)

              crs.push({
                code: entry.name,
                title: titleMatch ? titleMatch[1].trim() : entry.name,
                status: statusMatch ? statusMatch[1].trim() : 'Proposed',
                type: typeMatch ? typeMatch[1].trim() : 'Feature Enhancement',
                priority: priorityMatch ? priorityMatch[1].trim() : 'Medium',
                filename: mdFile,
                path: mdPath,
              })
            }
          }
          catch {
            // Skip invalid files
          }
        }
      }
    }

    return crs
  }

  /**
   * Get system directories
   */
  async getSystemDirectories(rootPath?: string): Promise<string[]> {
    const dirs: string[] = []
    const startPath = rootPath || process.cwd()

    try {
      const entries = fs.readdirSync(startPath, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          dirs.push(entry.name)
        }
      }
    }
    catch {
      // Return empty array on error
    }

    return dirs
  }

  /**
   * Configure documents for a project
   * Persists the document paths to the project's TOML config file
   */
  async configureDocuments(projectId: string, documentPaths: string[]): Promise<ConfigureDocumentsResult> {
    // Refresh registry to pick up any newly created projects
    this.loadProjectsRegistry()

    // Try to find project by key (directory name) or by code
    let project = this.projectsRegistry.get(projectId)
    if (!project) {
      // Try to find by code
      for (const [, value] of this.projectsRegistry.entries()) {
        if (value.code === projectId) {
          project = value
          break
        }
      }
    }

    if (!project) {
      throw new Error('Project not found')
    }

    const configPath = path.join(project.path, '.mdt-config.toml')
    if (!fs.existsSync(configPath)) {
      throw new Error('Project configuration file not found')
    }

    // Read existing config
    let content = fs.readFileSync(configPath, 'utf-8')

    // Check if [document] section exists
    if (content.includes('[document]')) {
      // Replace existing paths
      content = content.replace(/paths\s*=\s*\[[^\]]*\]/, `paths = ${JSON.stringify(documentPaths)}`)
    }
    else {
      // Add [document] section
      content += '\n[document]\n'
      content += `paths = ${JSON.stringify(documentPaths)}\n`
    }

    // Write updated config
    fs.writeFileSync(configPath, content, 'utf-8')

    // Reload registry to pick up the changes
    this.loadProjectsRegistry()

    return { success: true, message: 'Documents configured' }
  }

  /**
   * Check if a directory exists
   */
  async checkDirectoryExists(dirPath: string): Promise<boolean> {
    return fs.existsSync(dirPath)
  }

  get projectDiscovery() {
    return this
  }
}

export const GlobalConfig = {}
export const Project = class {}
