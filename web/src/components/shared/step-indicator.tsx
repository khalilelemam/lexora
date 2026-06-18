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
 * Codex-style step progress bar — editorial-geometric horizontal stepper.
 * Uses the Lexora brand palette with sharp edges and monospace numbering.
 */
export function StepIndicator({ steps, currentStepKey, className }: StepIndicatorProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStepKey);

  return (
    <div className={cn('flex w-full items-stretch', className)}>
      {steps.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;

        return (
          <div key={step.key} className="flex flex-1 items-stretch">
            {/* Step block */}
            <div
              className={cn(
                'flex flex-1 items-center gap-2.5 border-b-[3px] px-3 py-3 transition-colors sm:px-4',
                isCompleted && 'border-[#a6a867] bg-[#a6a867]/8',
                isCurrent && 'border-[#51513d] bg-[#51513d]/8',
                !isCompleted && !isCurrent && 'border-[#51513d]/12 bg-transparent',
              )}
            >
              {/* Step number */}
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center font-mono text-[11px] font-black transition-colors',
                  isCompleted && 'bg-[#a6a867] text-[#1b2021]',
                  isCurrent && 'bg-[#51513d] text-[#e3dcc2]',
                  !isCompleted && !isCurrent && 'bg-[#51513d]/10 text-[#51513d]/50',
                )}
              >
                {isCompleted ? '✓' : i + 1}
              </span>

              {/* Step label */}
              <span
                className={cn(
                  'hidden text-[11px] font-black tracking-[0.08em] uppercase sm:inline',
                  isCurrent && 'text-[#1b2021]',
                  isCompleted && 'text-[#51513d]',
                  !isCompleted && !isCurrent && 'text-[#51513d]/40',
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
