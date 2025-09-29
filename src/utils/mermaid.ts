import mermaid from 'mermaid';

let initialized = false;

export function initMermaid() {
  if (!initialized) {
    mermaid.initialize({ startOnLoad: false });
    initialized = true;
  }
}

export function processMermaidBlocks(html: string): string {
  return html
    .replace(
      /<pre><code class="mermaid language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
      (match, content) => {
        const decoded = content.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
        return `<code class="mermaid">${decoded}</code>`;
      }
    )
    .replace(
      /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
      (match, content) => {
        const decoded = content.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
        return `<code class="mermaid">${decoded}</code>`;
      }
    );
}

export async function renderMermaid() {
  initMermaid();
  await mermaid.run();
}
