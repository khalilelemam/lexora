'use client';

import { StickmanValidationCanvas } from '../calibration-modes/stickman/stickman-validation-canvas';
import type { CalibrationVisualMode } from '../../hooks/use-calibration-engine';

interface CalibrationValidationProps {
  currentStep: number;
  totalSteps: number;
  holdProgress: number;
  target: { x: number; y: number } | null;
  gazeCursor: { x: number; y: number } | null;
  resolvedMode: CalibrationVisualMode;
}

/**
 * Validation screen — themed to match the calibration mode.
 *
 * Research: validation background must match calibration & test background
 * to avoid pupil size artifacts (PSA). All modes use the warm cream base.
 *
 * Target visuals are mode-themed:
 * - grid: charcoal dot with progress ring
 * - star: golden star with glow
 * - stickman: ninja takedown canvas (interactive canvas-based experience)
 */
export function CalibrationValidation({
  currentStep,
  totalSteps,
  holdProgress,
  target,
  gazeCursor,
  resolvedMode,
}: CalibrationValidationProps) {
  // Stickman mode gets a fully custom canvas-based validation experience
  if (resolvedMode === 'stickman') {
    return (
      <StickmanValidationCanvas
        target={target}
        gazeX={gazeCursor?.x ?? 0}
        gazeY={gazeCursor?.y ?? 0}
        holdProgress={holdProgress}
        currentStep={currentStep}
        totalSteps={totalSteps}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 cursor-none bg-[#e3dcc2]">
      {/* Bottom HUD — outside calibration area for consistency */}
      <div className="pointer-events-none absolute right-0 bottom-0 left-0 flex h-16 items-center justify-center">
        <div className="w-[min(420px,85vw)] rounded-xl border border-[#51513d] bg-[#f3edd7]/90 px-5 py-2.5 shadow-sm backdrop-blur-md">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs text-[#51513d]">Checking accuracy</span>
            <span className="text-xs font-semibold text-[#1b2021]">
              {currentStep} / {totalSteps}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#51513d]/60">
            <div
              className="h-full rounded-full transition-all duration-150"
              style={{
                width: `${Math.round(holdProgress * 100)}%`,
                backgroundColor: resolvedMode === 'star' ? '#8b6f25' : '#a6a867',
              }}
            />
          </div>
        </div>
      </div>

      {/* Target — themed per mode */}
      {target && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${target.x * 100}%`, top: `${target.y * 100}%` }}
        >
          {resolvedMode === 'star' ? (
            /* Star mode: golden star target */
            <div className="relative flex h-20 w-20 items-center justify-center">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(#e3dc95 ${holdProgress * 360}deg, rgba(212,160,23,0.15) 0deg)`,
                }}
              />
              <div className="absolute inset-1.5 rounded-full bg-[#e3dcc2]" />
              <svg className="relative z-10 h-8 w-8" viewBox="0 0 24 24" fill="#e3dc95">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
          ) : (
            /* Grid/default mode: charcoal dot */
            <div className="relative flex h-20 w-20 items-center justify-center">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(#a6a867 ${holdProgress * 360}deg, rgba(166,168,103,0.18) 0deg)`,
                }}
              />
              <div className="absolute inset-1.5 flex items-center justify-center rounded-full bg-[#e3dcc2]">
                <div className="h-5 w-5 rounded-full bg-[#1b2021] shadow-md" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gaze cursor */}
      {gazeCursor && (
        <div
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f3edd7]/80 bg-[#a6a867]/50 shadow-[0_0_12px_rgba(166,168,103,0.55)]"
          style={{ left: gazeCursor.x, top: gazeCursor.y }}
        />
      )}
    </div>
  );
}
