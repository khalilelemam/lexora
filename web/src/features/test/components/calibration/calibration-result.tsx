'use client';

import { RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LexoraLogo } from '@/components/shared/lexora-logo';
import type { CalibrationResult as CalibrationResultType } from '../../types';

interface CalibrationResultProps {
  result: CalibrationResultType;
  quickValidationAccuracy: number | null;
  quickValidationPassed: boolean;
  blockOnPoor: boolean;
  onRetry: () => void;
  onContinue: () => void;
}

const QUALITY_UI = {
  good: {
    icon: CheckCircle2,
    label: 'Excellent',
    color: 'text-[#51513d]',
    bg: 'bg-[#a6a867]/15',
    border: 'border-[#a6a867]/45',
    ringColor: '#a6a867',
    message: "Your calibration is highly accurate. You're ready to start the test.",
  },
  acceptable: {
    icon: AlertTriangle,
    label: 'Acceptable',
    color: 'text-[#8b6f25]',
    bg: 'bg-[#e3dc95]/25',
    border: 'border-[#e3dc95]',
    ringColor: '#e3dc95',
    message: 'Calibration is usable but could be better. Consider retrying for improved accuracy.',
  },
  poor: {
    icon: XCircle,
    label: 'Poor',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    ringColor: '#ef4444',
    message: 'Calibration quality is low. Retrying is strongly recommended.',
  },
} as const;

/**
 * Calibration result screen — premium horizontal layout.
 *
 * Design:
 * - Side-by-side layout: gauge left, details + actions right
 * - Clean, human-readable summary (not technical)
 * - Visual accuracy gauge instead of raw numbers
 * - Warm cream background (inherited from parent)
 */
export function CalibrationResult({
  result,
  quickValidationAccuracy,
  quickValidationPassed,
  blockOnPoor,
  onRetry,
  onContinue,
}: CalibrationResultProps) {
  const quality = QUALITY_UI[result.quality];
  const Icon = quality.icon;
  const canProceed = result.quality !== 'poor' || !blockOnPoor;

  // Visual accuracy score — prefer validation accuracy, fall back to calibration error
  const displayScore = quickValidationAccuracy ?? Math.round((1 - result.averageError) * 100);

  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4"
      style={{ animation: 'float-up 0.5s ease-out' }}
    >
      {/* Logo */}
      <LexoraLogo size="sm" className="mb-1" />

      <h2 className="text-2xl font-bold tracking-tight text-[#1b2021]">Calibration Complete</h2>

      {/* Main card — horizontal layout */}
      <div
        className={cn(
          'w-full rounded-2xl border p-6 sm:p-8',
          'flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-10',
          quality.bg,
          quality.border,
        )}
      >
        {/* Left: Accuracy gauge */}
        <div className="flex shrink-0 flex-col items-center">
          <div className="relative h-32 w-32">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="rgba(212,203,189,0.4)"
                strokeWidth="8"
              />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke={quality.ringColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${52 * 2 * Math.PI}`}
                strokeDashoffset={`${52 * 2 * Math.PI * (1 - displayScore / 100)}`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn('text-3xl font-bold', quality.color)}>{displayScore}%</span>
              <span className="text-[11px] text-[#1b2021]">accuracy</span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            <Icon className={cn('h-4 w-4', quality.color)} />
            <span className={cn('text-sm font-semibold', quality.color)}>{quality.label}</span>
          </div>
        </div>

        {/* Right: Details + actions */}
        <div className="flex min-w-0 flex-1 flex-col gap-4 text-center sm:text-left">
          <p className="text-sm leading-relaxed text-[#1b2021]">{quality.message}</p>

          {/* Validation warning */}
          {quickValidationAccuracy != null && !quickValidationPassed && (
            <div className="rounded-xl border border-[#e3dc95] bg-[#e3dc95]/25 p-3 text-sm leading-relaxed text-[#51513d]">
              Validation score is below 70%. The test can still proceed, but retrying is
              recommended.
            </div>
          )}

          {/* Tips for poor calibration */}
          {result.quality === 'poor' && (
            <div className="rounded-xl border border-[#51513d] bg-[#f3edd7]/90 p-4 text-sm text-[#1b2021]">
              <p className="mb-2 font-semibold text-[#1b2021]">Tips for better results:</p>
              <ul className="list-inside list-disc space-y-1.5 text-[13px]">
                <li>Keep your face centered and stable</li>
                <li>Use even front lighting — avoid backlighting</li>
                <li>Use only your eyes to follow the target</li>
                <li>Avoid sudden head movements</li>
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-center gap-3 pt-1 sm:justify-start">
            <Button
              variant="outline"
              onClick={onRetry}
              className="border-[#51513d] text-[#1b2021] hover:text-[#1b2021]"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
            {canProceed && (
              <Button
                onClick={onContinue}
                className="bg-[#51513d] px-8 text-[#f3edd7] hover:bg-[#1b2021]"
              >
                Continue to Test
              </Button>
            )}
          </div>

          {result.quality === 'poor' && blockOnPoor && (
            <p className="text-xs text-red-600">
              Calibration quality is too low to proceed. Please retry.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
