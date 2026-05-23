/// <reference types="jest" />

import { promises as fs } from 'node:fs'
import { join, relative } from 'node:path'
import { buildRuntimeConfig, getRuntimeConfig } from '../../config/runtimeConfig'

describe('runtimeConfig - MDT-178', () => {
  it('parses backend runtime configuration once from an explicit env map', () => {
    const config = buildRuntimeConfig({
      NODE_ENV: 'production',
      CONFIG_DIR: '/tmp/mdt-config',
      API_SECURITY_AUTH: 'true',
      API_AUTH_TOKEN: 'owner-token',
      API_READ_SESSION_SECRET: 'read-session-secret',
      PUBLIC_ORIGIN: 'https://share.example.com/',
    } as NodeJS.ProcessEnv)

    expect(config).toMatchObject({
      configDir: '/tmp/mdt-config',
      nodeEnv: 'production',
      auth: {
        enabled: true,
        token: 'owner-token',
        migrationWarningRequired: false,
      },
      readSessions: {
        secret: 'read-session-secret',
        allowLocalFallback: false,
      },
      system: {
        devtoolsEnabled: false,
        isProduction: true,
        isTest: false,
        maintenanceEndpointsEnabled: false,
      },
    })
    expect(config.origins.publicOrigin).toBe('https://share.example.com')
    expect(config.origins.allowedOrigins).toEqual(expect.arrayContaining([
      'https://share.example.com',
    ]))
  })

  it('does not add deployment origins when PUBLIC_ORIGIN is absent', () => {
    const config = buildRuntimeConfig({
      NODE_ENV: 'production',
      CONFIG_DIR: '/tmp/mdt-config',
      ALLOWED_DOMAINS: 'share.example.com',
      ALLOWED_ORIGINS: 'https://app.example.com',
      PUBLIC_LINK_ORIGINS: 'https://legacy-share.example.com',
    } as NodeJS.ProcessEnv)

    expect(config.origins.publicOrigin).toBeUndefined()
    expect(config.origins.allowedOrigins).not.toContain('https://share.example.com')
    expect(config.origins.allowedOrigins).not.toContain('http://share.example.com')
    expect(config.origins.allowedOrigins).not.toContain('https://app.example.com')
    expect(config.origins.allowedOrigins).not.toContain('https://legacy-share.example.com')
  })

  it('uses the explicit env map for default config dir resolution', () => {
    const config = buildRuntimeConfig({
      NODE_ENV: 'test',
      HOME: '/explicit-home',
    } as NodeJS.ProcessEnv)

    expect(config.configDir).toBe('/explicit-home/.config/markdown-ticket')
  })

  it('keeps local/test read-session fallback inside runtime config', () => {
    const config = buildRuntimeConfig({
      NODE_ENV: 'test',
      CONFIG_DIR: '/tmp/mdt-config',
    } as NodeJS.ProcessEnv)

    expect(config.auth.enabled).toBe(false)
    expect(config.readSessions.secret).toBe('mdt-local-read-session-secret')
    expect(config.readSessions.allowLocalFallback).toBe(true)
    expect(config.system).toMatchObject({
      devtoolsEnabled: true,
      isProduction: false,
      isTest: true,
      maintenanceEndpointsEnabled: true,
    })
  })

  it('fails fast when request handlers run without app-local runtime config', () => {
    expect(() => getRuntimeConfig({
      app: {
        locals: {},
      },
    } as Parameters<typeof getRuntimeConfig>[0])).toThrow(/RuntimeConfig is not initialized/)
  })

  it('keeps direct process.env reads inside startup and runtime config boundaries', async () => {
    const serverRoot = process.cwd()
    const files = await collectTypeScriptFiles(serverRoot)
    const offenders: string[] = []

    for (const file of files) {
      const relativePath = relative(serverRoot, file)
      if (isAllowedEnvBoundary(relativePath) || isLegacyConfigDirConsumer(relativePath)) {
        continue
      }

      const content = await fs.readFile(file, 'utf8')
      if (hasRuntimeConfigBypass(content)) {
        offenders.push(relativePath)
      }
    }

    expect(offenders).toEqual([])
  })
})

async function collectTypeScriptFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      if (['dist', 'docs', 'mcp-dev-tools', 'node_modules', 'tests'].includes(entry.name)) {
        continue
      }

      files.push(...(await collectTypeScriptFiles(path)))
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(path)
    }
  }

  return files
}

function isAllowedEnvBoundary(relativePath: string): boolean {
  return relativePath.startsWith('config/')
    || relativePath === 'server.ts'
}

function isLegacyConfigDirConsumer(relativePath: string): boolean {
  return [
    'services/DocumentFavStateService.ts',
    'services/fileWatcher/PathWatcherService.ts',
  ].includes(relativePath)
}

function hasRuntimeConfigBypass(content: string): boolean {
  return content.includes('process.env')
    || content.includes('getConfigDir(')
    || content.includes('getDefaultPaths().CONFIG_DIR')
    || content.includes('buildRuntimeConfig()')
}
