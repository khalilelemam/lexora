'use client';

import { AlertCircle, RotateCcw, RefreshCw, Home } from 'lucide-react';

interface ErrorScreenProps {
  error: string;
  /** Re-submit the same data (only useful for transient network errors) */
  onRetry?: () => void;
  /** Restart the entire test flow from the beginning */
  onStartOver?: () => void;
  onGoHome?: () => void;
}

export function ErrorScreen({ error, onRetry, onStartOver, onGoHome }: ErrorScreenProps) {
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex h-16 w-16 items-center justify-center bg-[#e3dc95]/25">
        <AlertCircle className="h-8 w-8 text-[#51513d]" />
      </div>

      <div className="text-center">
        <h2 className="text-3xl font-black text-[#1b2021]">Something went wrong</h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-[#1b2021]/64">{error}</p>
      </div>

      <div className="flex gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center bg-[#51513d] px-5 py-2.5 text-sm font-black text-[#e3dcc2] transition-colors hover:bg-[#1b2021]"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Retry Submission
          </button>
        )}
        {onStartOver && (
          <button
            type="button"
            onClick={onStartOver}
            className={`inline-flex items-center px-5 py-2.5 text-sm font-black transition-colors ${
              onRetry
                ? 'border border-[#51513d]/25 bg-[#e3dcc2] text-[#51513d] hover:bg-[#51513d]/10'
                : 'bg-[#51513d] text-[#e3dcc2] hover:bg-[#1b2021]'
            }`}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Start Over
          </button>
        )}
        {onGoHome && (
          <button
            type="button"
            onClick={onGoHome}
            className="inline-flex items-center border border-[#51513d]/25 bg-[#e3dcc2] px-5 py-2.5 text-sm font-black text-[#51513d] transition-colors hover:bg-[#51513d]/10"
          >
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </button>
        )}
      </div>
    </div>
  );
}
