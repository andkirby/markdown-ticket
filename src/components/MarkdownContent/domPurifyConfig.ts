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
  // Mermaid + Wireloom SVG elements
  'svg',
  'g',
  'path',
  'rect',
  'circle',
  'text',
  'tspan',
  'line',
  'polygon',
  'polyline',
  'ellipse',
  'defs',
  'clipPath',
  'style',
  'title', // SVG accessible name
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
  // Mermaid + Wireloom SVG attributes
  'viewBox',
  'xmlns',
  'd',
  'fill',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-dasharray',
  'x',
  'y',
  'rx',
  'ry',
  'cx',
  'cy',
  'r',
  'font-size',
  'font-family',
  'font-weight',
  'text-anchor',
  'dominant-baseline',
  'transform',
  'points',
  'x1',
  'y1',
  'x2',
  'y2',
  'offset',
  // Wireloom placeholder
  'data-source-encoded',
] as const
