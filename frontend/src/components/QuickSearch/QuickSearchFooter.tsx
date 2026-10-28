/**
 * @testid quick-search-footer — fixed bottom keyboard status and help
 * @testid quick-search-keyboard-help — optional shortcut explanation
 */
export function QuickSearchFooter({ hintId }: { hintId: string }) {
  return (
    <footer className="search-footer" data-testid="quick-search-footer">
      <p id={hintId} className="search-footer__hint">
        <span>
          <kbd>↑↓</kbd>
          {' '}
          Move
        </span>
        <span>
          <kbd>Enter</kbd>
          {' '}
          Open
        </span>
        <span>
          <kbd>Tab</kbd>
          {' '}
          Controls
        </span>
        <span>
          <kbd>Esc</kbd>
          {' '}
          Close
        </span>
      </p>
      <details className="search-footer__help">
        <summary data-testid="quick-search-keyboard-help">Keyboard shortcuts</summary>
        <p>
          <kbd>F6</kbd>
          {' '}
          Focus selected result ·
          {' '}
          <kbd>Shift+F6</kbd>
          {' '}
          Back to search
        </p>
        <p>Use Tab / Shift+Tab through controls and reference links. Use ← / → to change the result type when a tab is focused.</p>
      </details>
    </footer>
  )
}
