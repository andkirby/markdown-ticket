import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

describe('FileTree fav controls (MDT-171)', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders active and inactive star controls without selecting rows', () => {
    const onFileSelect = mock()
    const onToggleFavorite = mock()

    render(
      <FileTree
        files={[{
          ...files[0],
          favorite: true,
        }]}
        selectedFile={null}
        onFileSelect={onFileSelect}
        onToggleFavorite={onToggleFavorite}
      />,
    )

    const folderStar = screen.getByLabelText('Toggle favorite')

    expect(folderStar).toHaveAttribute('title', 'Click to unfavorite')
    expect(folderStar.querySelector('.fav-star')).toHaveClass('active')

    fireEvent.click(folderStar)

    expect(onToggleFavorite).toHaveBeenCalledWith(expect.objectContaining({ path: 'docs' }))
    expect(onFileSelect).not.toHaveBeenCalled()
  })

  it('does not render a fav star for the synthetic root grouping row', () => {
    render(
      <FileTree
        files={[{
          name: 'root files',
          path: './',
          type: 'folder',
        }]}
        selectedFile={null}
        onFileSelect={mock()}
        onToggleFavorite={mock()}
      />,
    )

    expect(screen.queryByTestId('document-tree-fav-star')).not.toBeInTheDocument()
  })

  it('locates folder favorites by expanding and marking the row', async () => {
    const ref = { current: null as import('./FileTree').FileTreeHandle | null }

    render(
      <FileTree
        ref={ref}
        files={files}
        selectedFile={null}
        onFileSelect={mock()}
      />,
    )

    expect(screen.queryByText('design')).not.toBeInTheDocument()

    act(() => {
      ref.current?.locatePath('docs/design')
    })

    await waitFor(() => {
      expect(screen.getByText('design').closest('[data-testid="folder-item"]')).toHaveAttribute('data-located', 'true')
      expect(screen.getByText('Navigation Spec')).toBeInTheDocument()
    })
  })
})
