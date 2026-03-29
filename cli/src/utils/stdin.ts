/**
 * CLI Stdin Reader (MDT-143)
 *
 * Detects and reads piped stdin content.
 * Returns literal data without shell expansion.
 */

/**
 * Read stdin content if piped
 *
 * @returns Raw stdin content as string, or null if not piped
 */
export async function readStdin(): Promise<string | null> {
  // Check if stdin is a TTY (interactive terminal)
  // If isTTY is true, stdin is not piped
  if (process.stdin.isTTY) {
    return null
  }

  // Stdin is piped - read all content
  return new Promise((resolve) => {
    let data = ''

    process.stdin.setEncoding('utf8')

    process.stdin.on('data', (chunk) => {
      data += chunk
    })

    process.stdin.on('end', () => {
      resolve(data)
    })

    process.stdin.on('error', () => {
      resolve(null)
    })
  })
}
