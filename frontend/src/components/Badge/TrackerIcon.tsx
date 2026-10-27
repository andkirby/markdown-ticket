import type { TrackerKindValue } from '@mdt/domain-contracts'
import { Github, Gitlab, Link } from 'lucide-react'

export function TrackerIcon({ kind }: { kind?: TrackerKindValue }) {
  if (kind === 'github')
    return <Github className="external-reference__icon" aria-hidden="true" />
  if (kind === 'gitlab')
    return <Gitlab className="external-reference__icon" aria-hidden="true" />
  if (kind === 'jira')
    return <img src="/icons/trackers/jira.svg" className="external-reference__icon" alt="" aria-hidden="true" draggable={false} />
  return <Link className="external-reference__icon" aria-hidden="true" />
}
