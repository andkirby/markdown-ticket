import type { Project, ProjectSharingModeValue, ProjectSharingSettings, RegistryData } from '@mdt/shared/models/Project.js'
import type { RequestAccessContext } from './apiAuth.js'
import { ProjectSharingMode } from '@mdt/shared/models/Project.js'
import { randomBytes } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { getDefaultPaths } from '@mdt/shared/utils/constants.js'
import { parseToml, stringify } from '@mdt/shared/utils/toml.js'

interface ProjectSharingUpdate {
  mode: ProjectSharingModeValue
  rotateShareId?: boolean
}

const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{12,128}$/u

function getProjectSharing(project: Project): ProjectSharingSettings {
  return project.metadata.sharing ?? { mode: ProjectSharingMode.PRIVATE }
}

export function isWriteAccess(access: RequestAccessContext | undefined): boolean {
  return access?.canWrite === true
}

export function isProjectVisibleToAccess(project: Project, access: RequestAccessContext | undefined): boolean {
  if (project.project.active !== true) {
    return false
  }

  if (isWriteAccess(access)) {
    return true
  }

  const sharing = getProjectSharing(project)
  if (sharing.mode === ProjectSharingMode.PUBLIC_READONLY) {
    return true
  }

  if (access?.shareIds.some(shareId => sharing.shareId === shareId && isReadOnlySharingMode(sharing.mode))) {
    return true
  }

  return access?.projectRefs.some(projectRef => projectMatchesStableRef(project, projectRef)) ?? false
}

export function filterProjectsForAccess(projects: Project[], access: RequestAccessContext | undefined): Project[] {
  return projects.filter(project => isProjectVisibleToAccess(project, access))
}

export function sanitizeProjectForAccess(project: Project, access: RequestAccessContext | undefined): Project {
  if (isWriteAccess(access)) {
    return project
  }

  const sanitized: Project = {
    ...project,
    project: {
      ...project.project,
      path: '',
      configFile: '',
    },
    metadata: {
      ...project.metadata,
      sharing: {
        mode: getProjectSharing(project).mode,
      },
    },
  }

  delete sanitized.configPath
  delete sanitized.registryFile

  return sanitized
}

export function sanitizeProjectsForAccess(projects: Project[], access: RequestAccessContext | undefined): Project[] {
  return projects.map(project => sanitizeProjectForAccess(project, access))
}

export function findProjectByRef(projects: Project[], projectRef: string): Project | null {
  return projects.find(project => projectMatchesRef(project, projectRef)) ?? null
}

export function findProjectByShareId(projects: Project[], shareId: string): Project | null {
  return projects.find((project) => {
    const sharing = getProjectSharing(project)
    return project.project.active === true
      && sharing.shareId === shareId
      && (sharing.mode === ProjectSharingMode.PUBLIC_READONLY || sharing.mode === ProjectSharingMode.UNLISTED_READONLY)
  }) ?? null
}

function projectMatchesRef(project: Project, projectRef: string): boolean {
  return project.id === projectRef
    || project.project.id === projectRef
    || project.project.code === projectRef
}

export async function updateProjectSharing(project: Project, update: ProjectSharingUpdate): Promise<Project> {
  validateSharingUpdate(update)

  const registryPath = project.registryFile || path.join(getDefaultPaths().PROJECTS_REGISTRY, `${project.id}.toml`)
  await mkdir(path.dirname(registryPath), { recursive: true })

  const registry = await readRegistry(registryPath, project)
  const now = new Date().toISOString().split('T')[0]
  const nextSharing: ProjectSharingSettings = {
    mode: update.mode,
    updatedAt: new Date().toISOString(),
  }

  if (update.mode !== ProjectSharingMode.PRIVATE) {
    nextSharing.shareId = await resolveShareId(registryPath, registry.metadata.sharing, update.rotateShareId === true)
  }

  registry.project = {
    ...registry.project,
    path: registry.project.path || project.project.path,
    active: project.project.active,
  }
  registry.metadata = {
    ...registry.metadata,
    dateRegistered: registry.metadata.dateRegistered || now,
    lastAccessed: now,
    version: registry.metadata.version || project.metadata.version || '1.0.0',
    sharing: nextSharing,
  }

  await writeFile(registryPath, stringify(registry), 'utf8')

  return {
    ...project,
    metadata: {
      ...project.metadata,
      sharing: nextSharing,
    },
    registryFile: registryPath,
  }
}

function validateSharingUpdate(update: ProjectSharingUpdate): void {
  if (!Object.values(ProjectSharingMode).includes(update.mode)) {
    throw new Error('Invalid sharing mode')
  }
}

function isReadOnlySharingMode(mode: ProjectSharingModeValue): boolean {
  return mode === ProjectSharingMode.PUBLIC_READONLY || mode === ProjectSharingMode.UNLISTED_READONLY
}

function projectMatchesStableRef(project: Project, projectRef: string): boolean {
  return project.id === projectRef
    || project.project.id === projectRef
    || project.project.code === projectRef
}

async function readRegistry(registryPath: string, project: Project): Promise<RegistryData> {
  try {
    return parseToml(await readFile(registryPath, 'utf8')) as RegistryData
  }
  catch {
    const now = new Date().toISOString().split('T')[0]
    return {
      project: {
        path: project.project.path,
        active: project.project.active,
      },
      metadata: {
        dateRegistered: project.metadata.dateRegistered || now,
        lastAccessed: now,
        version: project.metadata.version || '1.0.0',
      },
    }
  }
}

async function resolveShareId(registryPath: string, currentSharing: ProjectSharingSettings | undefined, rotateShareId: boolean): Promise<string> {
  const currentShareId = currentSharing?.shareId
  if (!rotateShareId && currentShareId && SHARE_ID_PATTERN.test(currentShareId) && !await shareIdCollides(registryPath, currentShareId)) {
    return currentShareId
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const shareId = generateShareId()
    if (!await shareIdCollides(registryPath, shareId)) {
      return shareId
    }
  }

  throw new Error('Invalid share ID collision')
}

async function shareIdCollides(currentRegistryPath: string, shareId: string): Promise<boolean> {
  try {
    const registryDir = path.dirname(currentRegistryPath)
    const files = await readdir(registryDir)
    const currentPath = path.resolve(currentRegistryPath)

    for (const file of files) {
      if (!file.endsWith('.toml')) {
        continue
      }

      const registryPath = path.resolve(registryDir, file)
      if (registryPath === currentPath) {
        continue
      }

      const registry = parseToml(await readFile(registryPath, 'utf8')) as Partial<RegistryData>
      if (registry.metadata?.sharing?.shareId === shareId) {
        return true
      }
    }
  }
  catch {
    return false
  }

  return false
}

function generateShareId(): string {
  return randomBytes(24).toString('base64url')
}
