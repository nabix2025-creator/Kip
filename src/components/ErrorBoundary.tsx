import { Component, type ReactNode } from 'react'

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="m-8 rounded-panel bg-secondary p-6 text-primary">
          <div className="text-header font-semibold">Kip hit a problem</div>
          <pre className="mt-3 whitespace-pre-wrap text-body text-secondary">{this.state.error.message}</pre>
        </div>
      )
    }
    return this.props.children
  }
}
