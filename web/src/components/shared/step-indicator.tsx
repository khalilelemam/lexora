'use client';

import { cn } from '@/lib/utils';

interface Step {
  label: string;
  key: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStepKey: string;
  className?: string;
}

/**
 * Shows progress through test phases as a horizontal stepper.
 * Current step is highlighted, completed steps show a check.
 */
export function StepIndicator({ steps, currentStepKey, className }: StepIndicatorProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStepKey);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {steps.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;

        return (
          <div key={step.key} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={cn(
                  'h-0.5 w-6 rounded-full transition-colors',
                  isCompleted ? 'bg-primary' : 'bg-muted',
                )}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isCurrent && 'bg-primary text-primary-foreground ring-primary/30 ring-2',
                  !isCompleted && !isCurrent && 'bg-muted text-muted-foreground',
                )}
              >
                {isCompleted ? '✓' : i + 1}
              </div>
              <span
                className={cn(
                  'hidden text-xs font-medium sm:inline',
                  isCurrent ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
