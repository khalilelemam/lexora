'use client';

import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorScreenProps {
  error: string;
  onRetry?: () => void;
  onGoHome?: () => void;
}

export function ErrorScreen({ error, onRetry, onGoHome }: ErrorScreenProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-semibold">Something went wrong</h2>
        <p className="mt-2 max-w-md text-muted-foreground">{error}</p>
      </div>

      <div className="flex gap-3">
        {onRetry && (
          <Button onClick={onRetry}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Try Again
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
