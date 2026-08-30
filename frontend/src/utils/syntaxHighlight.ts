import Prism from 'prismjs'

// Import common languages
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-markup-templating'
import 'prismjs/components/prism-php'
import 'prismjs/components/prism-go'

export { loadPrismTheme } from '../styles/prism-theme-loader'

export function highlightCodeBlocks(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const codeBlocks = doc.querySelectorAll('pre code')

  codeBlocks.forEach((block) => {
    const codeElement = block as HTMLElement
    const className = codeElement.className

    // Try multiple class name patterns
    const languageMatch = className.match(/(?:language-|lang-)(\w+)/)

    if (languageMatch) {
      const language = languageMatch[1]
      const code = codeElement.textContent || ''

      if (Prism.languages[language]) {
        codeElement.innerHTML = Prism.highlight(code, Prism.languages[language], language)
        codeElement.classList.add(`language-${language}`)
      }
    }
  })

  return doc.body.innerHTML
}
