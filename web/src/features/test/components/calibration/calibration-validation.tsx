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
    <div className="z-50 fixed inset-0 bg-[#FDF8F0] cursor-none">
      {/* Bottom HUD — outside calibration area for consistency */}
      <div className="bottom-0 left-0 right-0 absolute flex items-center justify-center h-16 pointer-events-none">
        <div className="bg-white/85 backdrop-blur-md px-5 py-2.5 border border-[#E8E0D4] rounded-xl w-[min(420px,85vw)] shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[#8B857E] text-xs">Checking accuracy</span>
            <span className="font-semibold text-[#2D2A26] text-xs">{currentStep} / {totalSteps}</span>
          </div>
          <div className="bg-[#E8E0D4]/60 rounded-full h-1.5 overflow-hidden">
            <div
              className="rounded-full h-full transition-all duration-150"
              style={{
                width: `${Math.round(holdProgress * 100)}%`,
                backgroundColor: resolvedMode === 'star' ? '#D97706' : '#4A7C59',
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
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(#D4A017 ${holdProgress * 360}deg, rgba(212,160,23,0.15) 0deg)`,
                }}
              />
              <div className="absolute inset-1.5 bg-[#FDF8F0] rounded-full" />
              <svg className="relative z-10 w-8 h-8" viewBox="0 0 24 24" fill="#D4A017">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
          ) : (
            /* Grid/default mode: charcoal dot */
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(#4A7C59 ${holdProgress * 360}deg, rgba(74,124,89,0.15) 0deg)`,
                }}
              />
              <div className="absolute inset-1.5 bg-[#FDF8F0] rounded-full flex items-center justify-center">
                <div className="w-5 h-5 rounded-full bg-[#2D2A26] shadow-md" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gaze cursor */}
      {gazeCursor && (
        <div
          className="absolute bg-[#4A7C59]/50 shadow-[0_0_12px_rgba(74,124,89,0.6)] border border-white/80 rounded-full w-4 h-4 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: gazeCursor.x, top: gazeCursor.y }}
        />
      )}
    </div>
  );
}
