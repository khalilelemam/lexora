'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LexoraLogo } from '@/components/shared/lexora-logo';

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
        <div className="flex min-h-screen items-center justify-center bg-[#e3dcc2] p-8 text-[#1b2021]">
          <div className="w-full max-w-xl border border-[#51513d]/18 bg-[#f3edd7] p-8 text-center shadow-[0_24px_70px_rgba(27,32,33,0.16)]">
            <LexoraLogo size="sm" className="mx-auto mb-7 justify-center" />
            <div className="mx-auto flex h-16 w-16 items-center justify-center border border-[#e3dc95] bg-[#e3dc95]/25">
              <AlertTriangle className="h-8 w-8 text-[#51513d]" />
            </div>
            <div className="mt-6">
              <h2 className="mb-2 text-2xl font-black tracking-tight">Something went wrong</h2>
              <p className="text-sm leading-relaxed text-[#1b2021]/68">
                An error occurred in the test component. This might be caused by a browser
                compatibility issue or a temporary rendering problem.
              </p>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="mt-5 w-full overflow-auto border border-[#51513d]/18 bg-[#e3dcc2]/45 p-4 text-left text-xs text-[#51513d]">
                {this.state.error.message}
              </pre>
            )}
            <div className="mt-7 flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="border-[#51513d]/30 text-[#51513d] hover:bg-[#e3dcc2]"
              >
                Reload Page
              </Button>
              <Button
                onClick={this.handleRetry}
                className="gap-2 bg-[#51513d] text-[#f3edd7] hover:bg-[#1b2021]"
              >
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
