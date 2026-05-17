import { describe, expect, it } from 'bun:test'
import { resolveDocumentFilenameTabs } from './documentFilenameTabModel'

const files = [
  {
    name: 'docs',
    path: 'docs',
    type: 'folder' as const,
    children: [
      {
        name: 'some-name.md',
        path: 'docs/some-name.md',
        type: 'file' as const,
        title: 'Main',
      },
      {
        name: 'some-name.one.md',
        path: 'docs/some-name.one.md',
        type: 'file' as const,
        title: 'One',
      },
      {
        name: 'some-name.two.md',
        path: 'docs/some-name.two.md',
        type: 'file' as const,
        title: 'Two',
      },
      {
        name: 'some-name.alpha.beta.md',
        path: 'docs/some-name.alpha.beta.md',
        type: 'file' as const,
        title: 'Alpha Beta',
      },
      {
        name: 'some-name-extra.one.md',
        path: 'docs/some-name-extra.one.md',
        type: 'file' as const,
        title: 'Different Base',
      },
      {
        name: 'standalone.md',
        path: 'docs/standalone.md',
        type: 'file' as const,
        title: 'Standalone',
      },
      {
        name: 'notes.txt',
        path: 'docs/notes.txt',
        type: 'file' as const,
      },
    ],
  },
]

describe('resolveDocumentFilenameTabs', () => {
  it('groups same-directory markdown root and variants into filename tabs', () => {
    const result = resolveDocumentFilenameTabs(files, 'docs/some-name.two.md')

    expect(result?.logicalBasePath).toBe('docs/some-name')
    expect(result?.activeTabKey).toBe('two')
    expect(result?.tabs.map(tab => [tab.key, tab.label, tab.filePath])).toEqual([
      ['main', 'main', 'docs/some-name.md'],
      ['alpha.beta', 'alpha.beta', 'docs/some-name.alpha.beta.md'],
      ['one', 'one', 'docs/some-name.one.md'],
      ['two', 'two', 'docs/some-name.two.md'],
    ])
  })

  it('keeps similar prefixes in separate logical groups', () => {
    const result = resolveDocumentFilenameTabs(files, 'docs/some-name-extra.one.md')

    expect(result?.logicalBasePath).toBe('docs/some-name-extra')
    expect(result?.tabs.map(tab => tab.filePath)).toEqual(['docs/some-name-extra.one.md'])
  })

  it('returns a grouped view for a lone dot-notation variant', () => {
    const result = resolveDocumentFilenameTabs(files, 'docs/some-name-extra.one.md')

    expect(result?.tabs).toHaveLength(1)
    expect(result?.activeTabKey).toBe('one')
  })

  it('returns null for standalone markdown and non-markdown files', () => {
    expect(resolveDocumentFilenameTabs(files, 'docs/standalone.md')).toBeNull()
    expect(resolveDocumentFilenameTabs(files, 'docs/notes.txt')).toBeNull()
  })
})
