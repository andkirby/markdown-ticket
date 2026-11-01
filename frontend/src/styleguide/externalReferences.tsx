import type { ExternalReference } from '@mdt/domain-contracts'
import { resolveExternalReferences } from '@mdt/shared/services/externalReferences'
import { createRoot } from 'react-dom/client'
import { ExternalReferenceBadges } from '../components/Badge/ExternalReferenceBadges'
import '../index.css'

const work = { kind: 'jira', baseUrl: 'https://jira.example.test/jira', projectKeys: ['PRJ'] }
const client = { kind: 'jira', baseUrl: 'https://client.example.test', projectKeys: ['PRJ'] }
const gh = { kind: 'github', baseUrl: 'https://github.example.test' }
const demos: Record<string, ExternalReference[]> = {
  grouped: resolveExternalReferences(['work:PRJ-95', 'work:PRJ-68'], { work }),
  unavailable: resolveExternalReferences(['gh:acme/widgets#42', 'legacy:OPS-7'], { gh }),
  overflow: resolveExternalReferences([
    'work:PRJ-123',
    'work:PRJ-124',
    'work:PRJ-125',
    'work:PRJ-126',
    'work:PRJ-127',
    'client:PRJ-123',
    'gh:acme/a-very-long-repository-name-for-layout#42',
  ], { work, client, gh }),
  search: resolveExternalReferences(['work:JRP-95', 'work:JRP-59', 'work:JRP-68'], {
    work: { ...work, projectKeys: ['SMAR'] },
  }),
}

for (const element of document.querySelectorAll<HTMLElement>('[data-reference-demo]')) {
  const references = demos[element.dataset.referenceDemo ?? '']
  if (references)
    createRoot(element).render(<ExternalReferenceBadges externalRefs={references} />)
}
