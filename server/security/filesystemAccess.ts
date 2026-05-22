import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'

export class FilesystemAccessDeniedError extends Error {
  constructor() {
    super('Access denied')
  }
}

export function expandUserPath(inputPath: string): string {
  let decodedPath: string

  try {
    decodedPath = decodeURIComponent(inputPath).normalize('NFC')
  }
  catch {
    throw new FilesystemAccessDeniedError()
  }

  if (decodedPath.startsWith('~')) {
    return decodedPath.replace(/^~($|\/)/, `${os.homedir()}$1`)
  }

  return decodedPath
}

export async function realpathIfExists(inputPath: string): Promise<string> {
  return fs.realpath(path.resolve(expandUserPath(inputPath)))
}

export async function normalizeAllowedRoots(roots: Iterable<string>): Promise<string[]> {
  const normalizedRoots: string[] = []

  for (const root of roots) {
    try {
      normalizedRoots.push(await realpathIfExists(root))
    }
    catch {
      // Ignore configured roots that are not currently present.
    }
  }

  return Array.from(new Set(normalizedRoots))
}

export function isPathInsideAllowedRoots(realTargetPath: string, realAllowedRoots: readonly string[]): boolean {
  return realAllowedRoots.some((root) => {
    const relativePath = path.relative(root, realTargetPath)

    return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
  })
}

export async function authorizeFilesystemPath(inputPath: string, allowedRoots: Iterable<string>): Promise<string> {
  const [realTargetPath, realAllowedRoots] = await Promise.all([
    realpathIfExists(inputPath),
    normalizeAllowedRoots(allowedRoots),
  ])

  if (!isPathInsideAllowedRoots(realTargetPath, realAllowedRoots)) {
    throw new FilesystemAccessDeniedError()
  }

  return realTargetPath
}

export async function getProjectRoots(projectService: { getAllProjects?: (bypassCache?: boolean) => Promise<Array<{ project?: { path?: string }, path?: string }>> }): Promise<string[]> {
  if (!projectService.getAllProjects) {
    return []
  }

  const projects = await projectService.getAllProjects(true)

  return projects
    .map(project => project.project?.path || project.path)
    .filter((projectPath): projectPath is string => typeof projectPath === 'string' && projectPath.length > 0)
}
