/**
 * MobileLogo — the MDT wordmark shown in the header.
 *
 * The logo is a single monochrome asset rendered as a CSS mask (`.app-logo`),
 * so its colour is driven entirely by the theme-aware `--logo-fg` token: deep
 * blue in light mode and a soft light-blue in dark mode. No per-viewport asset
 * swap is needed — one masked element scales crisply at any size.
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
