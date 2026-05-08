'use client';

import { AlertCircle, RotateCcw, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <div className="flex flex-col items-center gap-6">
      <div className="bg-destructive/10 flex h-16 w-16 items-center justify-center rounded-full">
        <AlertCircle className="text-destructive h-8 w-8" />
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground mt-2 max-w-md">{error}</p>
      </div>

      <div className="flex gap-3">
        {onRetry && (
          <Button onClick={onRetry}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Retry Submission
          </Button>
        )}
        {onStartOver && (
          <Button variant={onRetry ? 'outline' : 'default'} onClick={onStartOver}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Start Over
          </Button>
        )}
        {onGoHome && (
          <Button variant="outline" onClick={onGoHome}>
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        )}
      </div>
    </div>
  );
}
