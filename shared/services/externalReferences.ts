import type { ExternalReference, TrackerConfig } from '@mdt/domain-contracts'
import { JiraProjectDisplay, RepositoryDisplay, TrackerConfigSchema, TrackerKind } from '@mdt/domain-contracts'

/**
 * Public result contract of parseExternalIdentity on the shared service subpath.
 * @public
 */
export interface ExternalIdentity {
  instance: string
  key: string
  number?: string
  projectKey?: string
  repository?: string
}

export function parseExternalIdentity(ref: string): ExternalIdentity {
  const separator = ref.indexOf(':')
  const instance = separator > 0 ? ref.slice(0, separator) : ''
  const key = separator > 0 ? ref.slice(separator + 1) : ref
  const jira = /^([a-z]\w*)-(\d+)$/i.exec(key)
  if (jira && /[1-9]/.test(jira[2]!))
    return { instance, key, projectKey: jira[1], number: jira[2] }
  const repository = /^([^#][^#/]*\/[^#]+)#(\d+)$/.exec(key)
  if (repository && /[1-9]/.test(repository[2]!) && validRepository(repository[1]!))
    return { instance, key, repository: repository[1], number: repository[2] }
  return { instance, key }
}

export function validRepository(repository: string): boolean {
  const segments = repository.split('/')
  return segments.length >= 2 && segments.every(segment => /^[\w.-]+$/.test(segment) && segment !== '.' && segment !== '..')
}

export function trackerEntries(trackers: unknown): Record<string, unknown> {
  return trackers && typeof trackers === 'object' && !Array.isArray(trackers) ? trackers as Record<string, unknown> : {}
}

function displayKey(identity: ExternalIdentity, config: TrackerConfig): string {
  if (config.kind === TrackerKind.JIRA) {
    return config.display?.projectCode !== JiraProjectDisplay.ALWAYS
      && config.projectKeys?.length === 1 && config.projectKeys[0] === identity.projectKey
      ? identity.number!
      : identity.key
  }
  if (config.display?.repository === RepositoryDisplay.NONE && identity.repository === config.defaultRepo)
    return `#${identity.number}`
  return `${identity.repository!.split('/').slice(-1)[0]}#${identity.number}`
}

function issueUrl(identity: ExternalIdentity, config: TrackerConfig): string {
  const base = new URL(config.baseUrl)
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash)
    throw new Error('Tracker base URL must be credential-free HTTP(S) without a query or fragment')
  const baseUrl = base.href.replace(/\/$/, '')
  const template = config.urlTemplate ?? (config.kind === TrackerKind.JIRA
    ? '{baseUrl}/browse/{key}'
    : config.kind === TrackerKind.GITHUB ? '{baseUrl}/{repo}/issues/{number}' : '{baseUrl}/{repo}/-/issues/{number}')
  const requiredTokens = config.kind === TrackerKind.JIRA ? ['baseUrl', 'key'] : ['baseUrl', 'repo', 'number']
  if (requiredTokens.some(token => !template.includes(`{${token}}`)))
    throw new Error('Issue URL template must include the base URL and complete issue identity')
  const values: Record<string, string | undefined> = {
    baseUrl,
    key: config.kind === TrackerKind.JIRA ? encodeURIComponent(identity.key) : undefined,
    repo: identity.repository?.split('/').map(encodeURIComponent).join('/'),
    number: identity.number,
  }
  const expanded = template.replace(/\{([^{}]+)\}/g, (_token, name: string) => {
    if (!Object.prototype.hasOwnProperty.call(values, name) || values[name] === undefined)
      throw new Error(`Unsupported template placeholder: ${name}`)
    return values[name]
  })
  if (/[{}]/.test(expanded))
    throw new Error('Unresolved template placeholder')
  const destination = new URL(expanded)
  if (!['http:', 'https:'].includes(destination.protocol) || destination.username || destination.password || destination.origin !== base.origin)
    throw new Error('Issue URL must remain on the configured tracker origin')
  return destination.href
}

function resolveReference(ref: string, entries: Record<string, unknown>, kindCounts: Map<string, number>): ExternalReference {
  const identity = parseExternalIdentity(ref)
  const result: ExternalReference = { ref, instance: identity.instance, key: identity.key, displayKey: ref }
  if (!identity.instance || !(identity.instance in entries))
    return { ...result, unavailableReason: 'Tracker instance is not configured' }
  const parsed = TrackerConfigSchema.safeParse(entries[identity.instance])
  if (!parsed.success)
    return { ...result, unavailableReason: 'Tracker configuration is invalid or unsupported' }
  const config = parsed.data
  result.kind = config.kind
  if ((kindCounts.get(config.kind) ?? 0) > 1)
    result.instanceLabel = identity.instance
  const compatible = config.kind === TrackerKind.JIRA
    ? Boolean(identity.projectKey)
    : Boolean(identity.repository) && (config.kind !== TrackerKind.GITHUB || identity.repository!.split('/').length === 2)
  if (!compatible)
    return { ...result, unavailableReason: 'Unsupported issue identifier; stored shorthand requires an explicit replacement' }
  try {
    return { ...result, displayKey: displayKey(identity, config), url: issueUrl(identity, config) }
  }
  catch (error) {
    return { ...result, unavailableReason: error instanceof Error ? error.message : 'Issue URL is unavailable' }
  }
}

export function resolveExternalReferences(refs: readonly string[], trackers: unknown): ExternalReference[] {
  const entries = trackerEntries(trackers)
  const kindCounts = new Map<string, number>()
  for (const entry of Object.values(entries)) {
    if (entry && typeof entry === 'object' && 'kind' in entry && typeof entry.kind === 'string')
      kindCounts.set(entry.kind, (kindCounts.get(entry.kind) ?? 0) + 1)
  }
  return refs.map(ref => resolveReference(ref, entries, kindCounts))
}
