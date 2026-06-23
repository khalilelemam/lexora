'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';
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
  initialLaunchCountdown?: number | null;
}

const QUALITY_UI = {
  good: {
    icon: CheckCircle2,
    label: 'Great reading!',
    color: 'text-[#51513d]',
    bg: 'bg-[#a6a867]/15',
    border: 'border-[#a6a867]/45',
    ringColor: '#a6a867',
    message: 'Tracking looks steady. Lexora is ready to record the reading sample.',
  },
  acceptable: {
    icon: AlertTriangle,
    label: 'Not bad!',
    color: 'text-[#8b6f25]',
    bg: 'bg-[#e3dc95]/25',
    border: 'border-[#e3dc95]',
    ringColor: '#e3dc95',
    message:
      'Tracking is usable. One more calibration pass may improve confidence, but you can continue.',
  },
  poor: {
    icon: XCircle,
    label: 'Needs another try',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    ringColor: '#ef4444',
    message: 'Tracking was unstable. Another pass will give the reading test a better signal.',
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
  initialLaunchCountdown = null,
}: CalibrationResultProps) {
  const quality = QUALITY_UI[result.quality];
  const Icon = quality.icon;
  const canProceed = result.quality !== 'poor' || !blockOnPoor;
  const [launchCountdown, setLaunchCountdown] = useState<number | null>(initialLaunchCountdown);
  const continuedRef = useRef(false);

  // Visual accuracy score — prefer validation accuracy, fall back to calibration error
  const displayScore = quickValidationAccuracy ?? Math.round((1 - result.averageError) * 100);

  useEffect(() => {
    if (launchCountdown == null) return;

    if (launchCountdown <= 0) {
      if (!continuedRef.current) {
        continuedRef.current = true;
        onContinue();
      }
      return;
    }

    const timer = window.setTimeout(() => {
      setLaunchCountdown((value) => (value == null ? null : value - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [launchCountdown, onContinue]);

  if (launchCountdown != null) {
    return (
      <div
        className="relative mx-auto flex w-full max-w-2xl flex-col items-center px-5 text-center"
        style={{ animation: 'float-up 0.4s ease-out' }}
      >
        <LexoraLogo size="sm" className="mb-8" />
        <div className="w-full border border-[#51513d]/18 bg-[#f3edd7]/92 px-6 py-8 shadow-[12px_12px_0_rgba(81,81,61,.1)]">
          <p className="text-xs font-black tracking-[0.28em] text-[#51513d] uppercase">
            Reading test begins
          </p>
          <div className="relative mx-auto my-7 flex h-36 w-36 items-center justify-center">
            <div className="absolute h-36 w-36 rounded-full border border-[#51513d]/12" />
            <div className="absolute h-28 w-28 rounded-full border border-[#a6a867]/45 bg-[#e3dcc2]/55" />
            <div className="absolute h-px w-32 bg-[#51513d]/25" />
            <div className="absolute h-32 w-px bg-[#51513d]/25" />
            <span className="relative font-mono text-6xl font-black text-[#1b2021]">
              {Math.max(launchCountdown, 1)}
            </span>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-[#1b2021]">Read naturally</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#51513d]">
            When the reader reaches the final word, press Enter. A confirmation dialog will appear;
            choose Done reading only after the reader has fully finished.
          </p>
          <div className="mt-6 grid gap-3 text-left sm:grid-cols-3">
            {['Eyes on text', 'No rushing', 'Enter at finish'].map((item, index) => (
              <div key={item} className="border border-[#51513d]/14 bg-[#e3dcc2]/55 p-3">
                <span className="font-mono text-[10px] font-black text-[#a6a867]">
                  0{index + 1}
                </span>
                <p className="mt-1 text-xs font-bold text-[#1b2021]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-4"
      style={{ animation: 'float-up 0.5s ease-out' }}
    >
      {/* Logo */}
      <LexoraLogo size="sm" className="mb-1" />

      <div className="text-center">
        <p className="text-xs font-black tracking-[0.28em] text-[#51513d] uppercase">
          Calibration complete
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-[#1b2021]">
          Eye tracking is ready
        </h2>
      </div>

      {/* Main card — horizontal layout */}
      <div
        className={cn(
          'w-full border p-6 shadow-[12px_12px_0_rgba(81,81,61,.08)] sm:p-8',
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
              <span className="text-[11px] font-bold tracking-wider text-[#51513d] uppercase">
                match
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            <Icon className={cn('h-4 w-4', quality.color)} />
            <span className={cn('text-sm font-semibold', quality.color)}>{quality.label}</span>
          </div>
        </div>

        {/* Right: Details + actions */}
        <div className="flex min-w-0 flex-1 flex-col gap-4 text-center sm:text-left">
          <div>
            <h3 className="text-xl font-black tracking-tight text-[#1b2021]">{quality.label}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#51513d]">{quality.message}</p>
          </div>

          {/* Validation warning */}
          {quickValidationAccuracy != null && !quickValidationPassed && (
            <div className="border border-[#e3dc95] bg-[#e3dc95]/25 p-3 text-sm leading-relaxed text-[#51513d]">
              Validation landed below target confidence. Continuing is allowed, but recalibrating
              usually improves the reading analysis.
            </div>
          )}

          {/* Tips for poor calibration */}
          {result.quality === 'poor' && (
            <div className="border border-[#51513d]/20 bg-[#f3edd7]/90 p-4 text-sm text-[#1b2021]">
              <p className="mb-2 font-semibold text-[#1b2021]">Before retrying:</p>
              <ul className="list-inside list-disc space-y-1.5 text-[13px] text-[#51513d]">
                <li>Keep face well-lit from the front</li>
                <li>Hold head still while eyes move</li>
                <li>Follow targets until they complete</li>
                <li>Move closer if the camera loses the eyes</li>
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
              Try Again
            </Button>
            {canProceed && (
              <Button
                onClick={() => setLaunchCountdown(4)}
                className="bg-[#51513d] px-8 text-[#f3edd7] hover:bg-[#1b2021]"
              >
                Start Reading Prep
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>

          {result.quality === 'poor' && blockOnPoor && (
            <p className="text-xs text-red-600">
              We need a slightly better reading before we can start the test. Let&apos;s try again!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
