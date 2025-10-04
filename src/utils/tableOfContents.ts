export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function extractTableOfContents(content: string): TocItem[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const toc: TocItem[] = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const rawText = match[2].trim();
    
    // Clean formatting symbols and markdown
    const text = rawText
      .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove bold **text**
      .replace(/\*(.*?)\*/g, '$1')      // Remove italic *text*
      .replace(/`(.*?)`/g, '$1')        // Remove code `text`
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links [text](url)
      .replace(/[_~]/g, '')             // Remove underscores and tildes
      .trim();
    
    const id = text.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    
    toc.push({ id, text, level });
  }

  return toc;
}
