'use client';

import { AlertCircle, Home, RefreshCw, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LexoraLogo } from '@/components/shared/lexora-logo';

interface ErrorScreenProps {
  error: string;
  /** Re-submit the same data (only useful for transient network errors) */
  onRetry?: () => void;
  /** Restart the entire test flow from the beginning */
  onStartOver?: () => void;
  onGoHome?: () => void;
}

export function ErrorScreen({ error, onRetry, onStartOver, onGoHome }: ErrorScreenProps) {
  const canRetry = Boolean(onRetry);

  return (
    <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4">
      <LexoraLogo size="sm" />

      <div className="w-full border border-[#51513d]/18 bg-[#f3edd7]/92 p-6 text-center shadow-[12px_12px_0_rgba(81,81,61,.1)] sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center border border-[#e3dc95] bg-[#e3dc95]/30">
          <AlertCircle className="h-8 w-8 text-[#51513d]" />
        </div>

        <p className="mt-6 text-xs font-black tracking-[0.28em] text-[#51513d] uppercase">
          Test interrupted
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-[#1b2021]">
          We could not finish analysis
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#51513d]">
          Lexora received an issue while processing this attempt. The message below may come from
          the analysis service, network, or saved test data.
        </p>

        <div className="mx-auto mt-6 max-w-xl border border-[#51513d]/14 bg-[#e3dcc2]/55 p-4 text-left">
          <p className="text-[10px] font-black tracking-[0.22em] text-[#51513d]/70 uppercase">
            Service message
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#1b2021]">{error}</p>
        </div>

        <div className="mt-6 grid gap-3 text-left sm:grid-cols-3">
          {[
            canRetry ? 'Retry sends same data again' : 'Start over captures fresh data',
            'Check camera or tracker signal',
            'Keep lighting steady before retry',
          ].map((item, index) => (
            <div key={item} className="border border-[#51513d]/14 bg-[#e3dcc2]/45 p-3">
              <span className="font-mono text-[10px] font-black text-[#a6a867]">0{index + 1}</span>
              <p className="mt-1 text-xs font-bold text-[#1b2021]">{item}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {onRetry && (
            <Button
              type="button"
              onClick={onRetry}
              className="bg-[#51513d] text-[#e3dcc2] hover:bg-[#1b2021]"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Retry Submission
            </Button>
          )}
          {onStartOver && (
            <Button
              type="button"
              variant={onRetry ? 'outline' : 'default'}
              onClick={onStartOver}
              className={
                onRetry
                  ? 'border-[#51513d]/30 bg-[#f3edd7] text-[#51513d] hover:bg-[#e3dcc2] hover:text-[#1b2021]'
                  : 'bg-[#51513d] text-[#e3dcc2] hover:bg-[#1b2021]'
              }
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Start Over
            </Button>
          )}
          {onGoHome && (
            <Button
              type="button"
              variant="outline"
              onClick={onGoHome}
              className="border-[#51513d]/30 bg-[#f3edd7] text-[#51513d] hover:bg-[#e3dcc2] hover:text-[#1b2021]"
            >
              <Home className="mr-2 h-4 w-4" />
              Back Home
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
