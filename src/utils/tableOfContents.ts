import showdown from 'showdown'

export interface TocItem {
  id: string
  text: string
  level: number
}

export function extractTableOfContents(content: string, headerLevelStart: number = 1): TocItem[] {
  const converter = new showdown.Converter({
    tables: true,
    strikethrough: true,
    tasklists: true,
    ghCodeBlocks: true,
    smoothLivePreview: true,
    simpleLineBreaks: true,
    headerLevelStart,
    parseImgDimensions: true,
    simplifiedAutoLink: true,
    excludeTrailingPunctuationFromURLs: true,
    literalMidWordUnderscores: true,
    ghCompatibleHeaderId: true,
  })

  const html = converter.makeHtml(content)
  return extractTableOfContentsFromHtml(html)
}

function extractTableOfContentsFromHtml(html: string): TocItem[] {
  const toc: TocItem[] = []
  const headingRegex = /<h([1-6])(?:\s+id="([^"]*)")?[^>]*>(.*?)<\/h[1-6]>/gi
  let match

  for (;;) {
    match = headingRegex.exec(html)
    if (!match)
      break

    const level = Number.parseInt(match[1])
    const id = match[2] || ''
    const htmlContent = match[3]

    const text = htmlContent
      .replace(/<[^>]*>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, '\'')
      .trim()

    const finalId = id || text.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')

    toc.push({ id: finalId, text, level })
  }

  return toc
}
