/**
 * DOMPurify configuration for markdown content sanitization.
 * Allows standard HTML elements plus Mermaid diagram SVG elements.
 */

export const ALLOWED_TAGS = [
  // Text formatting
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'strong',
  'em',
  'del',
  's',
  'br',
  'hr',
  'blockquote',
  // Code
  'code',
  'pre',
  // Lists
  'ul',
  'ol',
  'li',
  // Tables
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  // Links and media
  'a',
  'img',
  // Task list checkboxes
  'input',
  // Containers
  'div',
  'span',
  // Mermaid SVG elements
  'svg',
  'g',
  'path',
  'rect',
  'circle',
  'text',
] as const

export const ALLOWED_ATTR = [
  // Links
  'href',
  'target',
  'rel',
  // Media
  'src',
  'alt',
  'width',
  'height',
  // General
  'title',
  'class',
  'id',
  // Task list checkbox attributes
  'type',
  'disabled',
  'checked',
  // Mermaid SVG attributes
  'viewBox',
  'xmlns',
  'd',
  'fill',
  'stroke',
  'stroke-width',
  'x',
  'y',
  'rx',
  'ry',
  'cx',
  'cy',
  'r',
  'font-size',
  'text-anchor',
  'dominant-baseline',
  'transform',
] as const
