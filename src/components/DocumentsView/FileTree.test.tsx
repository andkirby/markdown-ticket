import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import FileTree from './FileTree'

const files = [
  {
    name: 'docs',
    path: 'docs',
    type: 'folder' as const,
    children: [
      {
        name: 'README.md',
        path: 'docs/README.md',
        type: 'file' as const,
        title: 'Readme',
      },
      {
        name: 'design',
        path: 'docs/design',
        type: 'folder' as const,
        children: [
          {
            name: 'navigation.md',
            path: 'docs/design/navigation.md',
            type: 'file' as const,
            title: 'Navigation Spec',
          },
        ],
      },
    ],
  },
]

describe('FileTree navigation state (MDT-162)', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders root folders collapsed by default (BR-1.1)', () => {
    render(
      <FileTree
        files={files}
        selectedFile={null}
        onFileSelect={mock()}
      />,
    )

    expect(screen.getByText('docs')).toBeInTheDocument()
    expect(screen.queryByText('Readme')).not.toBeInTheDocument()
    expect(screen.queryByText('Navigation Spec')).not.toBeInTheDocument()
  })

  it('expands selected document ancestors and highlights the selected file (BR-1.2)', () => {
    render(
      <FileTree
        files={files}
        selectedFile="docs/design/navigation.md"
        onFileSelect={mock()}
      />,
    )

    const selected = screen.getByText('Navigation Spec').closest('[data-testid="document-item"]')

    expect(screen.getByText('docs')).toBeInTheDocument()
    expect(screen.getByText('design')).toBeInTheDocument()
    expect(selected).toHaveAttribute('data-document-path', 'docs/design/navigation.md')
  })
})
