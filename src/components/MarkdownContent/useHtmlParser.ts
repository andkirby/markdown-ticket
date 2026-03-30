import type { DOMNode, HTMLReactParserOptions } from 'html-react-parser'
import { Element } from 'html-react-parser'
import * as React from 'react'
import SmartLink from '../SmartLink'
import { extractText } from './extractText'
import { classifyLink, getLinkConfigForProcessor } from './useMarkdownProcessor'

/**
 * Creates parser options for converting HTML to React elements.
 * Replaces anchor tags with SmartLink components.
 */
export function getHtmlParserOptions(currentProject: string): HTMLReactParserOptions {
  // Get link config for reference (used by classifyLink internally)
  getLinkConfigForProcessor()

  return {
    replace: (domNode: DOMNode) => {
      if (domNode instanceof Element && domNode.name === 'a') {
        const href = domNode.attribs?.href || ''

        const parsedLink = classifyLink(href, currentProject)

        // Extract text content from the link node
        const linkText = domNode.children
          ? extractText({ children: domNode.children })
          : href

        parsedLink.text = linkText || href

        return React.createElement(
          SmartLink,
          {
            link: parsedLink,
            currentProject,
            className: domNode.attribs?.class,
            children: linkText || href,
          },
        )
      }
      return undefined
    },
  }
}
