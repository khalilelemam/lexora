'use client';

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CalibrationResult as CalibrationResultType } from '../../types';
import { QUALITY_CONFIG } from './calibration-constants';

interface CalibrationResultProps {
  result: CalibrationResultType;
  captureCount: number;
  quickValidationAccuracy: number | null;
  quickValidationPassed: boolean;
  blockOnPoor: boolean;
  onRetry: () => void;
  onContinue: () => void;
}

export function CalibrationResult({
  result,
  captureCount,
  quickValidationAccuracy,
  quickValidationPassed,
  blockOnPoor,
  onRetry,
  onContinue,
}: CalibrationResultProps) {
  const config = QUALITY_CONFIG[result.quality];
  const Icon = config.icon;
  const canProceed = result.quality !== 'poor' || !blockOnPoor;

  return (
    <div
      className="flex flex-col items-center gap-6 max-w-lg mx-auto"
      style={{ animation: 'float-up 0.5s ease-out' }}
    >
      <div className={cn('rounded-full p-4', result.quality === 'good' ? 'bg-green-100' : result.quality === 'acceptable' ? 'bg-yellow-100' : 'bg-red-100')}>
        <Icon className={cn('w-12 h-12', config.color)} />
      </div>

      <div className="text-center">
        <h2 className="font-bold text-2xl tracking-tight">Calibration Complete</h2>
        <div className="flex justify-center items-center gap-2 mt-3">
          <span className="text-muted-foreground text-sm">Quality:</span>
          <Badge
            variant={
              result.quality === 'good'
                ? 'default'
                : result.quality === 'acceptable'
                  ? 'secondary'
                  : 'destructive'
            }
          >
            {config.label}
          </Badge>
        </div>
        <p className="mt-2 text-muted-foreground text-sm">
          Average error: {(result.averageError * 100).toFixed(1)}% of screen
        </p>
        <p className="mt-1 text-muted-foreground text-xs">Fixation captures: {captureCount}</p>
        <p className="mt-1 text-muted-foreground text-xs">
          Quick validation score:{' '}
          {quickValidationAccuracy == null
            ? 'N/A (insufficient signal)'
            : `${quickValidationAccuracy}%`}
        </p>
      </div>

      {quickValidationAccuracy != null && !quickValidationPassed && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl max-w-md text-amber-700 text-sm leading-relaxed">
          Quick validation score is below 70%. Calibration can still proceed, but retry is
          recommended for better reliability.
        </div>
      )}

      {result.quality === 'poor' && (
        <div className="bg-muted/60 border p-4 rounded-xl max-w-md text-muted-foreground text-sm">
          <p className="font-semibold text-foreground mb-2">Tips for better precision:</p>
          <ul className="space-y-1.5 list-disc list-inside text-[13px]">
            <li>Keep your face centered and stable</li>
            <li>Use even front lighting</li>
            <li>Use only your eyes to track targets</li>
            <li>Avoid sudden head movement during fixation</li>
          </ul>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 w-4 h-4" />
          Retry Calibration
        </Button>
        {canProceed && (
          <Button onClick={onContinue} className="px-6">
            Continue to Test
          </Button>
        )}
      </div>

      {result.quality === 'poor' && blockOnPoor && (
        <p className="text-destructive text-sm">
          Calibration quality is too low to proceed. Please retry.
        </p>
      )}
    </div>
  );
}
