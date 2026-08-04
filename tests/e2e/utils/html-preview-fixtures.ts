import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * MDT-221 — HTML preview E2E fixtures.
 *
 * Creates a self-contained, multi-file HTML document under docs/site/ that
 * references relative CSS, JS, and an image. The fixture script reports its
 * probe results back to the parent via postMessage, but the parent (sandboxed,
 * opaque origin) ignores them — the assertions read state the script writes to
 * its own DOM, which the test inspects inside the iframe.
 */

export const htmlPreviewDocumentPath = 'docs/site/index.html'

const PROBE_SCRIPT = `
  <script>
    (function () {
      var results = { scriptRan: true, parentAccess: null, fetchApi: null, assetLoaded: { css: null, js: null } };
      try {
        results.parentAccess = (typeof window.parent.document === 'object') ? 'leaked' : 'blocked-throw';
      } catch (e) {
        results.parentAccess = 'blocked';
      }
      try {
        results.localStorage = (typeof window.parent.localStorage !== 'undefined') ? 'leaked' : 'blocked-throw';
      } catch (e) {
        results.localStorage = 'blocked';
      }
      fetch('/api/status').then(function () {
        results.fetchApi = 'succeeded';
        document.getElementById('probe').setAttribute('data-fetch', 'succeeded');
      }).catch(function () {
        results.fetchApi = 'blocked';
        document.getElementById('probe').setAttribute('data-fetch', 'blocked');
      });
      // signal ready
      document.getElementById('probe').setAttribute('data-script-ran', 'true');
      document.getElementById('probe').setAttribute('data-parent', results.parentAccess);
      document.getElementById('probe').setAttribute('data-localstorage', results.localStorage);
      // asset load signals set by onload handlers below
    })();
  </script>
`

const HTML_FIXTURE = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>HTML Preview Fixture</title>
    <link rel="stylesheet" href="style.css">
  </head>
  <body>
    <h1 id="title">HTML Preview Fixture</h1>
    <p id="probe" data-script-ran="false" data-parent="unknown" data-localstorage="unknown" data-fetch="unknown" data-css="false" data-js="false">probe</p>
    <img src="image.png" alt="asset" onload="document.getElementById('probe').setAttribute('data-css','true')">
    <script src="app.js"></script>
    ${PROBE_SCRIPT}
  </body>
</html>
`

const CSS_FIXTURE = `body { color: red; }\n#title { font-weight: bold; }\n`
const JS_FIXTURE = `document.getElementById('probe').setAttribute('data-js','true');\n`
// 1x1 transparent PNG (base64) — a real, decodable image asset
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

export async function addHtmlPreviewDocs(projectDir: string): Promise<void> {
  const siteDir = join(projectDir, 'docs/site')
  await mkdir(siteDir, { recursive: true })
  await writeFile(join(siteDir, 'index.html'), HTML_FIXTURE, 'utf8')
  await writeFile(join(siteDir, 'style.css'), CSS_FIXTURE, 'utf8')
  await writeFile(join(siteDir, 'app.js'), JS_FIXTURE, 'utf8')
  await writeFile(join(siteDir, 'image.png'), Buffer.from(PNG_BASE64, 'base64'))
}
