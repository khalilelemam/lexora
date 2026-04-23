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
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    ringColor: '#10b981',
    message: 'Your calibration is highly accurate. You\'re ready to start the test.',
  },
  acceptable: {
    icon: AlertTriangle,
    label: 'Acceptable',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    ringColor: '#f59e0b',
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
      className="flex flex-col items-center gap-6 w-full max-w-3xl mx-auto px-4"
      style={{ animation: 'float-up 0.5s ease-out' }}
    >
      {/* Logo */}
      <LexoraLogo size="sm" className="mb-1" />

      <h2 className="font-bold text-2xl tracking-tight text-[#2D2A26]">Calibration Complete</h2>

      {/* Main card — horizontal layout */}
      <div className={cn(
        'w-full rounded-2xl border p-6 sm:p-8',
        'flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-10',
        quality.bg, quality.border,
      )}>
        {/* Left: Accuracy gauge */}
        <div className="flex flex-col items-center shrink-0">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(212,203,189,0.4)" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="52"
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
              <span className="text-[#8B857E] text-[11px]">accuracy</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mt-3">
            <Icon className={cn('w-4 h-4', quality.color)} />
            <span className={cn('font-semibold text-sm', quality.color)}>
              {quality.label}
            </span>
          </div>
        </div>

        {/* Right: Details + actions */}
        <div className="flex flex-col gap-4 flex-1 min-w-0 text-center sm:text-left">
          <p className="text-[#6B6560] text-sm leading-relaxed">
            {quality.message}
          </p>

          {/* Validation warning */}
          {quickValidationAccuracy != null && !quickValidationPassed && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-700 text-sm leading-relaxed">
              Validation score is below 70%. The test can still proceed, but retrying is recommended.
            </div>
          )}

          {/* Tips for poor calibration */}
          {result.quality === 'poor' && (
            <div className="bg-white/80 border border-[#E8E0D4] p-4 rounded-xl text-[#6B6560] text-sm">
              <p className="font-semibold text-[#2D2A26] mb-2">Tips for better results:</p>
              <ul className="space-y-1.5 list-disc list-inside text-[13px]">
                <li>Keep your face centered and stable</li>
                <li>Use even front lighting — avoid backlighting</li>
                <li>Use only your eyes to follow the target</li>
                <li>Avoid sudden head movements</li>
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1 justify-center sm:justify-start">
            <Button
              variant="outline"
              onClick={onRetry}
              className="border-[#D4CBBD] text-[#6B6560] hover:text-[#2D2A26]"
            >
              <RefreshCw className="mr-2 w-4 h-4" />
              Retry
            </Button>
            {canProceed && (
              <Button
                onClick={onContinue}
                className="px-8 bg-[#4A7C59] hover:bg-[#3D6A4B] text-white"
              >
                Continue to Test
              </Button>
            )}
          </div>

          {result.quality === 'poor' && blockOnPoor && (
            <p className="text-red-600 text-xs">
              Calibration quality is too low to proceed. Please retry.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
