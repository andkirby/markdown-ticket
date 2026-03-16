/**
 * Extracts text content from a DOM node recursively.
 * Used to get link text from parsed HTML nodes.
 */

interface TextNode {
  type?: string
  data?: string
  children?: unknown[]
}

/**
 * Recursively extracts text content from a DOM node structure.
 *
 * @param node - DOM node or string to extract text from
 * @returns Concatenated text content
 */
export function extractText(node: TextNode | string): string {
  if (!node) {
    return ''
  }

  if (typeof node === 'string') {
    return node
  }

  if (node.type === 'text') {
    return node.data || ''
  }

  if (node.children && Array.isArray(node.children)) {
    return node.children
      .map(child => extractText(child as TextNode | string))
      .join('')
  }

  return ''
}
