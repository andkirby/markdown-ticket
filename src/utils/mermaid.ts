import mermaid from 'mermaid';

let initialized = false;

export function initMermaid() {
  if (!initialized) {
    mermaid.initialize({ startOnLoad: true });
    initialized = true;
  }
}

export function processMermaidBlocks(html: string): string {
  return html.replace(
    /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
    '<code class="mermaid">$1</code>'
  );
}
