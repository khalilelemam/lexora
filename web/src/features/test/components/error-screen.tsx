'use client';

import { AlertCircle, RotateCcw, RefreshCw, Home, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorScreenProps {
  error: string;
  /** Re-submit the same data (only useful for transient network errors) */
  onRetry?: () => void;
  /** Restart the entire test flow from the beginning */
  onStartOver?: () => void;
  onGoHome?: () => void;
}

/**
 * Maps raw ML service error messages to user-friendly explanations with tips.
 * The ML service returns technical errors like "No valid fixations detected"
 * which are confusing for end-users.
 */
function getUserFriendlyError(rawError: string): {
  message: string;
  tips: string[];
} {
  const lower = rawError.toLowerCase();

  if (lower.includes('no valid fixations') || lower.includes('fixations detected')) {
    return {
      message: "We couldn't detect enough eye movements during the reading task.",
      tips: [
        'Make sure your camera can see your face clearly',
        'Ensure good, even lighting on your face',
        "Sit at arm's length from the screen",
        'Try to keep your head still and only move your eyes',
      ],
    };
  }

  if (lower.includes('insufficient') && (lower.includes('data') || lower.includes('sequence'))) {
    return {
      message: 'The reading session was too short to generate a reliable analysis.',
      tips: [
        "Read the full passage — don't skip ahead",
        'Ensure good lighting so the camera can track your eyes',
        'Keep your face visible throughout the entire task',
      ],
    };
  }

  if (lower.includes('insufficient gaze points') || lower.includes('need at least')) {
    return {
      message: 'Not enough gaze data was captured during the test.',
      tips: [
        'Sit closer to the screen for better tracking accuracy',
        "Make sure nothing is blocking the camera's view of your face",
        'Try recalibrating before starting the reading task',
      ],
    };
  }

  if (lower.includes('timeout') || lower.includes('timed out')) {
    return {
      message: 'The analysis took too long to complete. This is usually a temporary server issue.',
      tips: ['Wait a moment and try submitting again', 'Check your internet connection'],
    };
  }

  if (lower.includes('network') || lower.includes('connect') || lower.includes('fetch')) {
    return {
      message: 'Unable to connect to the analysis service.',
      tips: [
        'Check your internet connection',
        'Try again in a few moments',
        'If the problem persists, the service may be temporarily down',
      ],
    };
  }

  // Generic fallback
  return {
    message: rawError || 'Something went wrong during the analysis.',
    tips: [
      'Try the test again with good lighting and a clear camera view',
      'If this keeps happening, try using a different browser',
    ],
  };
}

export function ErrorScreen({ error, onRetry, onStartOver, onGoHome }: ErrorScreenProps) {
  const { message, tips } = getUserFriendlyError(error);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 text-center">
      <div className="bg-destructive/10 flex h-16 w-16 items-center justify-center rounded-full">
        <AlertCircle className="text-destructive h-8 w-8" />
      </div>

      <div>
        <h2 className="text-2xl font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground mt-2 leading-relaxed">{message}</p>
      </div>

      {/* Tips section */}
      {tips.length > 0 && (
        <div className="w-full rounded-xl border border-amber-200/50 bg-amber-50/60 p-4 text-left">
          <div className="mb-2.5 flex items-center gap-2 text-sm font-medium text-amber-800">
            <Lightbulb className="h-4 w-4 shrink-0" />
            <span>Tips for next time</span>
          </div>
          <ul className="space-y-1.5 text-xs leading-relaxed text-amber-700">
            {tips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-amber-400">·</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

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
