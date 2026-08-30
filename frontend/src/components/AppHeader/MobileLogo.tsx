/**
 * MobileLogo — the MDT logo shown in the header.
 *
 * The logo asset is a blue silhouette with the "#" glyph and "MDT" mark cut out
 * as transparent holes, rendered as a CSS mask (`.app-logo`). Its colour is
 * driven entirely by the `--primary-text` token — an accent tint of primary
 * (indigo in light mode, lighter indigo in dark mode). One masked element
 * scales crisply at any size.
 */
export function MobileLogo() {
  return (
    <span
      className="app-logo"
      role="img"
      aria-label="Markdown Ticket"
      data-testid="app-logo"
    />
  )
}
