import type { ReactNode } from 'react'
import * as React from 'react'
import { Component } from 'react'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class MarkdownErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Markdown rendering error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Alert variant="destructive">
          <AlertTitle>Failed to render markdown content</AlertTitle>
          <AlertDescription>
            {this.state.error?.message || 'Unknown error occurred'}
          </AlertDescription>
        </Alert>
      )
    }

    return this.props.children
  }
}
