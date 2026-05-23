import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import FavDocuments from './FavDocuments'

const documents = [
  { name: 'docs', path: 'docs', type: 'folder' as const, favorite: true, favoritedAt: '2026-05-18T10:00:00.000Z' },
  { name: 'guide.md', path: 'docs/guide.md', type: 'file' as const, title: 'Guide', favorite: true, favoritedAt: '2026-05-18T10:01:00.000Z' },
]

describe('FavDocuments (MDT-171)', () => {
  afterEach(() => {
    cleanup()
  })

  it('hides the Favs section when empty', () => {
    render(
      <FavDocuments
        documents={[]}
        isExpanded={true}
        showAll={false}
        onSelectDocument={mock()}
        onToggleFavorite={mock()}
        onExpandedChange={mock()}
        onShowAllChange={mock()}
      />,
    )

    expect(screen.queryByTestId('document-favs-toggle')).not.toBeInTheDocument()
  })

  it('renders compact active fav rows and removes through the active star', () => {
    const onToggleFavorite = mock()
    const onExpandedChange = mock()

    render(
      <FavDocuments
        documents={documents}
        isExpanded={true}
        showAll={false}
        onSelectDocument={mock()}
        onToggleFavorite={onToggleFavorite}
        onExpandedChange={onExpandedChange}
        onShowAllChange={mock()}
      />,
    )

    expect(screen.getByTestId('document-favs-toggle')).toHaveTextContent('Favs')
    expect(screen.getAllByTestId('document-fav-item')).toHaveLength(2)
    expect(screen.getAllByLabelText('Toggle favorite')[0]).toHaveAttribute('title', 'Click to unfavorite')
    expect(screen.getAllByLabelText('Toggle favorite')[0].querySelector('.fav-star')).toHaveClass('active')

    fireEvent.click(screen.getAllByLabelText('Toggle favorite')[0])

    expect(onToggleFavorite).toHaveBeenCalledWith(documents[0])

    fireEvent.click(screen.getByTestId('document-favs-toggle'))

    expect(onExpandedChange).toHaveBeenCalledWith(false)
  })

  it('hides favorite mutation controls when no toggle handler is provided', () => {
    render(
      <FavDocuments
        documents={documents}
        isExpanded={true}
        showAll={false}
        onSelectDocument={mock()}
        onExpandedChange={mock()}
        onShowAllChange={mock()}
      />,
    )

    expect(screen.getAllByTestId('document-fav-item')).toHaveLength(2)
    expect(screen.queryByTestId('document-fav-star')).not.toBeInTheDocument()
  })

  it('shows a five-row preview and trailing show-all action for overflow favs', () => {
    const manyDocuments = Array.from({ length: 7 }, (_, index) => ({
      name: `doc-${index}.md`,
      path: `docs/doc-${index}.md`,
      type: 'file' as const,
      favorite: true,
      favoritedAt: `2026-05-18T10:0${index}:00.000Z`,
    }))
    const onShowAllChange = mock()

    render(
      <FavDocuments
        documents={manyDocuments}
        isExpanded={true}
        showAll={false}
        onSelectDocument={mock()}
        onToggleFavorite={mock()}
        onExpandedChange={mock()}
        onShowAllChange={onShowAllChange}
      />,
    )

    expect(screen.getAllByTestId('document-fav-item')).toHaveLength(5)
    expect(screen.getByTestId('document-favs-show-all')).toHaveTextContent('Show all')

    fireEvent.click(screen.getByTestId('document-favs-show-all'))

    expect(onShowAllChange).toHaveBeenCalledWith(true)
  })

  it('shows all rows and a trailing show-less action when show-all is active', () => {
    const manyDocuments = Array.from({ length: 7 }, (_, index) => ({
      name: `doc-${index}.md`,
      path: `docs/doc-${index}.md`,
      type: 'file' as const,
      favorite: true,
      favoritedAt: `2026-05-18T10:0${index}:00.000Z`,
    }))
    const onShowAllChange = mock()

    render(
      <FavDocuments
        documents={manyDocuments}
        isExpanded={true}
        showAll={true}
        onSelectDocument={mock()}
        onToggleFavorite={mock()}
        onExpandedChange={mock()}
        onShowAllChange={onShowAllChange}
      />,
    )

    expect(screen.getAllByTestId('document-fav-item')).toHaveLength(7)
    expect(screen.getByTestId('document-favs-show-all')).toHaveTextContent('Show less')

    fireEvent.click(screen.getByTestId('document-favs-show-all'))

    expect(onShowAllChange).toHaveBeenCalledWith(false)
  })
})
