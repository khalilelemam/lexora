'use client';

import { type ReactNode } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CALIBRATION_POINTS } from '../../lib/constants';
import { POINT_SAMPLES_GOAL_WEBCAM, POINT_SAMPLES_GOAL_TOBII } from './calibration-constants';

interface CalibrationCollectingProps {
  tracker: 'tobii' | 'webcam';
  isRecalibrating: boolean;
  recalibrationRound: number;
  fixationProgress: number;
  isStableFixation: boolean;
  captureCount: number;
  currentPointIndex: number;
  pointSampleCounts: number[];
  collectionIssue: 'no-signal' | 'low-samples' | null;
  resolvedMode: string;
  gazeCursor: { x: number; y: number } | null;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  onSkip: () => void;
  modeSurface: ReactNode;
}

export function CalibrationCollecting({
  tracker,
  isRecalibrating,
  recalibrationRound,
  fixationProgress,
  isStableFixation,
  captureCount,
  currentPointIndex,
  pointSampleCounts,
  collectionIssue,
  resolvedMode,
  gazeCursor,
  voiceEnabled,
  onToggleVoice,
  onSkip,
  modeSurface,
}: CalibrationCollectingProps) {
  const pointSamplesGoal =
    tracker === 'webcam' ? POINT_SAMPLES_GOAL_WEBCAM : POINT_SAMPLES_GOAL_TOBII;
  const currentPointSamples = pointSampleCounts[currentPointIndex] ?? 0;
  const coveredPoints = pointSampleCounts.filter((count) => count >= pointSamplesGoal).length;

  return (
    <div className="z-50 fixed inset-0 overflow-hidden cursor-none">
      {modeSurface}

      {/* Top instruction bar */}
      <div className="top-4 left-1/2 absolute bg-card/80 backdrop-blur-md px-5 py-3 border rounded-xl w-[min(640px,90vw)] text-muted-foreground text-sm text-center -translate-x-1/2 pointer-events-none shadow-sm">
        Hold your gaze until the ring fills. Samples are recorded only during stable fixation.
      </div>

      {isRecalibrating && (
        <div className="top-4 left-4 absolute bg-amber-50/90 backdrop-blur-sm px-3 py-2 border border-amber-300/70 rounded-lg text-amber-700 text-xs pointer-events-none">
          Targeted recalibration pass {recalibrationRound}
        </div>
      )}

      {/* Controls */}
      <div className="top-16 right-4 absolute flex gap-2">
        <Button variant="outline" size="sm" onClick={onToggleVoice}>
          {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </Button>
        <Button variant="outline" size="sm" onClick={onSkip}>
          Skip
        </Button>
      </div>

      {/* Bottom fixation HUD */}
      <div className="bottom-4 left-1/2 absolute bg-card/80 backdrop-blur-md px-5 py-3.5 border rounded-xl w-[min(640px,90vw)] text-sm -translate-x-1/2 pointer-events-none shadow-sm">
        <div className="flex justify-between items-center mb-2 text-muted-foreground">
          <span>Fixation lock</span>
          <span>{Math.round(fixationProgress * 100)}%</span>
        </div>
        <div className="bg-muted rounded-full h-2.5 overflow-hidden">
          <div
            className={cn(
              'rounded-full h-full transition-all duration-150',
              isStableFixation ? 'bg-emerald-500' : 'bg-primary',
            )}
            style={{ width: `${Math.round(fixationProgress * 100)}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-2 text-muted-foreground text-xs">
          <span>Samples captured: {captureCount}</span>
          <span>
            {isStableFixation ? '✅ Stable fixation detected' : 'Keep your eyes still for 0.5s'}
          </span>
        </div>
        {tracker === 'webcam' && resolvedMode === 'grid' && (
          <div className="mt-2 text-[11px] text-muted-foreground/90">
            Live cursor preview is hidden during initial webcam capture to avoid misleading drift.
          </div>
        )}
        {tracker === 'webcam' && collectionIssue === 'no-signal' && (
          <div className="mt-2 text-[11px] text-amber-600">
            No face detected. Keep your face visible, centered, and well-lit before calibration
            can continue.
          </div>
        )}
        {tracker === 'webcam' && collectionIssue === 'low-samples' && (
          <div className="mt-2 text-[11px] text-amber-600">
            Signal is unstable. Hold your eyes on target and keep your head still to collect
            enough real samples.
          </div>
        )}
      </div>

      {/* Bottom-right point stats */}
      <div className="right-4 bottom-4 absolute bg-card/80 backdrop-blur-md px-3 py-3 border rounded-xl w-[min(300px,45vw)] text-xs pointer-events-none shadow-sm">
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Current point samples</span>
          <span>
            {currentPointSamples}/{pointSamplesGoal}
          </span>
        </div>
        <div className="bg-muted mt-2 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-primary rounded-full h-full transition-all duration-150"
            style={{
              width: `${Math.min(100, Math.round((currentPointSamples / Math.max(1, pointSamplesGoal)) * 100))}%`,
            }}
          />
        </div>
        <div className="flex justify-between items-center mt-3 text-muted-foreground">
          <span>Grid coverage</span>
          <span>
            {coveredPoints}/{CALIBRATION_POINTS.length} points ready
          </span>
        </div>
        <div className="bg-muted mt-2 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-emerald-500 rounded-full h-full transition-all duration-150"
            style={{ width: `${Math.round((coveredPoints / CALIBRATION_POINTS.length) * 100)}%` }}
          />
        </div>
      </div>

      {/* Gaze cursor for tobii */}
      {tracker === 'tobii' && gazeCursor && (
        <div
          className="absolute bg-cyan-300/70 shadow-[0_0_12px_rgba(34,211,238,0.8)] border border-white/80 rounded-full w-4 h-4 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: gazeCursor.x, top: gazeCursor.y }}
        />
      )}
    </div>
  );
}
