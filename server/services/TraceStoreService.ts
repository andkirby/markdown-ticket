import type { ResolvedTicketLocation } from '@mdt/shared/services/ticket/types.js'
import { existsSync, lstatSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative } from 'node:path'

export interface TraceStoreMetadata {
  exists: boolean
  ticketCode: string
  label: string
}

export interface TraceStoreReadResult {
  metadata: TraceStoreMetadata
  store: unknown
}

export class TraceStoreService {
  getMetadata(location: ResolvedTicketLocation, ticketCode: string): TraceStoreMetadata {
    const storePath = this.resolveStorePath(location, ticketCode)

    return {
      exists: this.isReadableStorePath(storePath),
      ticketCode,
      label: `${ticketCode}/${basename(storePath)}`,
    }
  }

  read(location: ResolvedTicketLocation, ticketCode: string): TraceStoreReadResult {
    const storePath = this.resolveStorePath(location, ticketCode)

    if (!this.isReadableStorePath(storePath)) {
      throw new Error('TraceStore not found')
    }

    const contents = readFileSync(storePath, 'utf8')
    let store: unknown

    try {
      store = JSON.parse(contents)
    }
    catch {
      throw new Error('TraceStore invalid')
    }

    return {
      metadata: {
        exists: true,
        ticketCode,
        label: `${ticketCode}/${basename(storePath)}`,
      },
      store,
    }
  }

  private resolveStorePath(location: ResolvedTicketLocation, ticketCode: string): string {
    return join(location.projectRoot, location.ticketsPath, '.trace', ticketCode, 'store.json')
  }

  private isReadableStorePath(storePath: string): boolean {
    if (!existsSync(storePath)) {
      return false
    }

    try {
      const lstat = lstatSync(storePath)
      if (!lstat.isFile() || lstat.isSymbolicLink()) {
        return false
      }

      const traceTicketDir = dirname(storePath)
      const realStorePath = realpathSync(storePath)
      const realTraceTicketDir = realpathSync(traceTicketDir)

      if (!isContainedPath(realStorePath, realTraceTicketDir)) {
        return false
      }

      return statSync(storePath).isFile()
    }
    catch {
      return false
    }
  }
}

function isContainedPath(resolved: string, root: string): boolean {
  const relativePath = relative(root, resolved)
  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath))
}
