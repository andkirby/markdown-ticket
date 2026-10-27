import type { TrackerKindValue } from '@mdt/domain-contracts'
import { Github, Gitlab, Link } from 'lucide-react'

export function TrackerIcon({ kind }: { kind?: TrackerKindValue }) {
  if (kind === 'github')
    return <Github className="external-reference__icon" aria-hidden="true" />
  if (kind === 'gitlab')
    return <Gitlab className="external-reference__icon" aria-hidden="true" />
  if (kind === 'jira') {
    return (
      <svg className="external-reference__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="m12 2 7 7-7 7-7-7 7-7Zm0 4-3 3 3 3 3-3-3-3Zm-5 8 5 5 5-5 3 3-8 7-8-7 3-3Z" />
      </svg>
    )
  }
  return <Link className="external-reference__icon" aria-hidden="true" />
}
