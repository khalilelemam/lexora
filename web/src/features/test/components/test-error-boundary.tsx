'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  /** Optional fallback UI. If not provided, a default recovery card is shown. */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary for test/calibration components.
 *
 * Canvas rendering and WebGL operations can throw in ways that React's
 * normal error handling doesn't catch. This boundary prevents a full
 * white-screen crash and offers a recovery path.
 */
export class TestErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[TestErrorBoundary]', error, errorInfo.componentStack);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="bg-background flex min-h-screen items-center justify-center p-8">
          <div className="flex max-w-md flex-col items-center gap-6 text-center">
            <div className="bg-destructive/10 flex h-16 w-16 items-center justify-center rounded-2xl">
              <AlertTriangle className="text-destructive h-8 w-8" />
            </div>
            <div>
              <h2 className="mb-2 text-xl font-semibold">Something went wrong</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                An error occurred in the test component. This might be caused by a browser
                compatibility issue or a temporary rendering problem.
              </p>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="bg-muted text-muted-foreground w-full overflow-auto rounded-lg p-4 text-left text-xs">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => window.location.reload()}>
                Reload Page
              </Button>
              <Button onClick={this.handleRetry} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
