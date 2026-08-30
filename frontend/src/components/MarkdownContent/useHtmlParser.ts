import type { DOMNode, HTMLReactParserOptions } from 'html-react-parser'
import { domToReact, Element } from 'html-react-parser'
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
        // Skip heading anchor permalinks from markdown-it-anchor
        if (domNode.attribs?.class?.includes('header-anchor')) {
          return undefined
        }

        const href = domNode.attribs?.href || ''

        const parsedLink = classifyLink(href, currentProject)

        // Extract text content from the link node
        const linkText = domNode.children
          ? extractText({ children: domNode.children })
          : href

        parsedLink.text = linkText || href

        // Guard (PV-3): sanitized markdown-it output cannot contain nested
        // anchors, but if one ever appears, fall back to flattened text
        // instead of rendering SmartLink-in-SmartLink.
        const hasNestedAnchor = domNode.children?.some(
          child => child instanceof Element && child.name === 'a',
        )

        return React.createElement(
          SmartLink,
          {
            link: parsedLink,
            currentProject,
            className: domNode.attribs?.class,
            // MDT-237: preserve rich children (e.g. <code> inside a converted
            // inline-code document reference) instead of flattening to text.
            children: hasNestedAnchor
              ? (linkText || href)
              : domToReact(domNode.children as DOMNode[]),
          },
        )
      }
      return undefined
    },
  }
}
