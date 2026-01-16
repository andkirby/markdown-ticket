// Import Darcula theme for both dark and light modes
import 'prism-themes/themes/prism-darcula.css'

let initialized = false

export function loadPrismTheme(_theme: 'light' | 'dark') {
  if (initialized)
    return
  initialized = true
  // Theme is loaded via static import above
}
