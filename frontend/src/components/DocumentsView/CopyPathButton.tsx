import { Check, Copy } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useToast } from '@/hooks/useToast'

interface CopyPathButtonProps {
  path: string
}

const COPIED_FEEDBACK_MS = 1200
const TOAST_DURATION_MS = 2000

export default function CopyPathButton({ path }: CopyPathButtonProps) {
  const [copied, setCopied] = useState(false)
  const toast = useToast()

  const handleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation()

    navigator.clipboard
      .writeText(path)
      .then(() => {
        setCopied(true)
        toast.success('Path copied', {
          description: path,
          duration: TOAST_DURATION_MS,
        })
        setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS)
      })
      .catch(() => {
        toast.error('Copy failed', {
          description: 'Clipboard access was denied',
        })
      })
  }, [path, toast])

  return (
    <button
      type="button"
      className="copy-path-btn"
      data-copied={copied ? '' : undefined}
      onClick={handleClick}
      title={`Copy path: ${path}`}
      aria-label={`Copy path to clipboard: ${path}`}
      data-testid="copy-path-btn"
    >
      {copied
        ? (
            <Check className="copy-path-btn__icon copy-path-btn__icon--copied" />
          )
        : (
            <Copy className="copy-path-btn__icon" />
          )}
    </button>
  )
}
