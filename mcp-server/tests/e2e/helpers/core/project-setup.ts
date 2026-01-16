/**
 * Project Setup Utility
 *
 * Extracted from ProjectFactory to handle project structure creation.
 * Provides directory creation and config file writing functionality.
 */

import type { TestEnvironment } from '../test-environment'

import type { DefaultProjectConfig, ProjectConfig } from '../types/project-factory-types'
import process from 'node:process'
import { ConfigurationGenerator } from '../config/configuration-generator'
import { ProjectFactoryError } from '../types/project-factory-types'
import { FileHelper } from '../utils/file-helper'
import { ValidationRules } from '../utils/validation-rules'

export interface ProjectSetupOptions { testEnv: TestEnvironment, configGenerator?: ConfigurationGenerator }

export class ProjectSetup {
  private testEnv: TestEnvironment
  private configGenerator: ConfigurationGenerator
  private static readonly DEFAULT_CONFIG: DefaultProjectConfig = {
    crPath: 'docs/CRs',
    documentPaths: ['docs'],
    excludeFolders: ['node_modules', '.git', 'test-results'],
  }

  constructor(options: ProjectSetupOptions) {
    if (!options.testEnv)
      throw new ProjectFactoryError('TestEnvironment is required')

    this.testEnv = options.testEnv
    this.configGenerator = options.configGenerator || new ConfigurationGenerator({
      configDir: this.testEnv.getConfigDir(),
      projectsConfigDir: FileHelper.joinPath(this.testEnv.getConfigDir(), 'projects'),
    })
  }

  async createProjectStructure(
    projectCode: string,
    projectName: string,
    config: ProjectConfig = {},
  ): Promise<string> {
    this.validateProjectCode(projectCode)
    this.validateProjectName(projectName)

    const finalConfig = { ...ProjectSetup.DEFAULT_CONFIG, ...config }

    try {
      const configDir = this.testEnv.getConfigDir()
      const projectsConfigDir = FileHelper.joinPath(configDir, 'projects')
      FileHelper.createDir(projectsConfigDir)

      const projectDir = this.testEnv.createProjectDir(projectCode)
      const configPackage = this.configGenerator.generateProjectConfigPackage(
        projectCode,
        projectName,
        finalConfig,
      )

      this.testEnv.createProjectStructure(projectCode, {
        [finalConfig.crPath!]: true,
        '.mdt-config.toml': configPackage.mdtConfig,
        '.mdt-next': '0',
        'README.md': configPackage.readmeContent,
      })

      this.configGenerator.createProjectRegistration({
        projectCode,
        projectPath: projectDir,
        registered: new Date().toISOString(),
        active: true,
      })

      process.env.CONFIG_DIR = configDir
      return projectDir
    }
    catch (error) {
      if (error instanceof ProjectFactoryError)
        throw error
      throw new ProjectFactoryError(
        `Failed to create project structure for ${projectCode}`,
        error instanceof Error ? error : new Error(String(error)),
      )
    }
  }

  createProjectDirectories(projectCode: string, config: ProjectConfig = {}): string {
    const finalConfig = { ...ProjectSetup.DEFAULT_CONFIG, ...config }
    const projectDir = this.testEnv.createProjectDir(projectCode)

    if (finalConfig.crPath) {
      FileHelper.createDir(FileHelper.joinPath(projectDir, finalConfig.crPath))
    }

    return projectDir
  }

  writeConfigurationFiles(
    projectDir: string,
    projectCode: string,
    projectName: string,
    config: ProjectConfig = {},
  ): void {
    const finalConfig = { ...ProjectSetup.DEFAULT_CONFIG, ...config }
    const configPackage = this.configGenerator.generateProjectConfigPackage(
      projectCode,
      projectName,
      finalConfig,
    )

    FileHelper.createDir(projectDir)
    FileHelper.writeFile(FileHelper.joinPath(projectDir, '.mdt-config.toml'), configPackage.mdtConfig)
    FileHelper.writeFile(FileHelper.joinPath(projectDir, 'README.md'), configPackage.readmeContent)
    FileHelper.writeFile(FileHelper.joinPath(projectDir, '.mdt-next'), '0')
  }

  registerProject(projectCode: string, projectPath: string): void {
    const configDir = this.testEnv.getConfigDir()
    const projectsConfigDir = FileHelper.joinPath(configDir, 'projects')
    FileHelper.createDir(projectsConfigDir)

    this.configGenerator.createProjectRegistration({
      projectCode,
      projectPath,
      registered: new Date().toISOString(),
      active: true,
    })
  }

  private validateProjectCode(projectCode: string): void {
    const result = ValidationRules.validateProjectCode(projectCode)
    if (!result.valid)
      throw new ProjectFactoryError(result.errors.map(e => e.message).join('; '))
  }

  private validateProjectName(projectName: string): void {
    const result = ValidationRules.validateProjectName(projectName)
    if (!result.valid)
      throw new ProjectFactoryError(result.errors.map(e => e.message).join('; '))
  }

  getDefaults(): DefaultProjectConfig {
    return { ...ProjectSetup.DEFAULT_CONFIG }
  }

  getConfigGenerator(): ConfigurationGenerator {
    return this.configGenerator
  }

  getTestEnvironment(): TestEnvironment {
    return this.testEnv
  }
}
