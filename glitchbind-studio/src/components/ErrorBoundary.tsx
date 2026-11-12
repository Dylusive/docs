import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State { error: Error | null }

/**
 * Last line of defence. Books autosave to IndexedDB continuously, so if something unexpected breaks the
 * screen the right message is "your book is safe, reload" — never a blank window.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }
  static getDerivedStateFromError(error: Error): State { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo): void { console.error('GlitchBind Studio hit an unexpected error', error, info.componentStack) }
  render(): ReactNode {
    if (!this.state.error) return this.props.children
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6 bg-ink-900" role="alert" data-testid="error-screen">
        <h1 className="font-display text-xl text-white">Something went wrong on screen</h1>
        <p className="text-fog-300 mt-3 max-w-md leading-relaxed">Your book is safe: it is saved in this browser automatically, and nothing was deleted. Reload to carry on where you were.</p>
        <p className="text-fog-400 mt-3 max-w-md text-[12px] font-mono break-words">{this.state.error.message}</p>
        <button type="button" className="gb-btn-solid mt-6" onClick={() => location.reload()}>Reload GlitchBind Studio</button>
      </div>
    )
  }
}
