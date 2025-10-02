import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-markup-templating'; // Required for PHP
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-go';
import 'prismjs/themes/prism.css';

export function highlightCodeBlocks(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const codeBlocks = doc.querySelectorAll('pre code');

  codeBlocks.forEach((block) => {
    const codeElement = block as HTMLElement;
    const className = codeElement.className;
    const languageMatch = className.match(/language-(\w+)/);
    
    if (languageMatch) {
      const language = languageMatch[1];
      const code = codeElement.textContent || '';
      
      if (Prism.languages[language]) {
        const highlighted = Prism.highlight(code, Prism.languages[language], language);
        codeElement.innerHTML = highlighted;
        codeElement.classList.add(`language-${language}`);
      }
    }
  });

  return doc.body.innerHTML;
}
