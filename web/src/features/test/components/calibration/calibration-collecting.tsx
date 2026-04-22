'use client';

import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface CalibrationCollectingProps {
  tracker: 'tobii' | 'webcam';
  collectionIssue: 'no-signal' | 'low-samples' | null;
  gazeCursor: { x: number; y: number } | null;
  onSkip: () => void;
  modeSurface: ReactNode;
}

/**
 * Calibration collection wrapper.
 *
 * Renders the mode surface (canvas or DOM mode view) behind:
 * 1. A "face lost" overlay — shown whenever webcam gaze signal is absent
 *    (canvasRef gaze = null means face is not detected OR iris not visible)
 * 2. Collection issue toasts for grid-mode quality warnings
 * 3. Tobii gaze dot (green) for operator visibility
 * 4. Skip button for emergency advance
 *
 * The face-lost overlay pauses the visual experience for the child by
 * dimming the display slightly and showing a clear "face not detected" UI.
 * The underlying animation still runs so there's no jarring reset needed.
 */
export function CalibrationCollecting({
  tracker,
  collectionIssue,
  gazeCursor,
  onSkip,
  modeSurface,
}: CalibrationCollectingProps) {
  // Show face-lost overlay when webcam has no gaze signal
  const showFaceLost = tracker === 'webcam' && !gazeCursor;

  return (
    <div className="z-50 fixed inset-0 overflow-hidden cursor-none">
      {modeSurface}

      {/* Face-lost overlay — pauses the feeling of progress clearly */}
      {showFaceLost && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#FDF8F0]/80 backdrop-blur-[2px]"
          style={{ animation: 'float-up 0.25s ease-out' }}
        >
          <div className="flex flex-col items-center gap-3 bg-white/90 px-7 py-6 border border-[#E8E0D4] rounded-2xl shadow-lg max-w-xs text-center">
            {/* Animated eye icon */}
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path d="M4 24C4 24 12 10 24 10C36 10 44 24 44 24C44 24 36 38 24 38C12 38 4 24 4 24Z"
                stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="24" cy="24" r="6" stroke="#D97706" strokeWidth="2.5" />
              <line x1="20" y1="20" x2="28" y2="28" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="font-semibold text-[#2D2A26] text-sm">Face not detected</p>
            <p className="text-[#8B857E] text-xs leading-relaxed">
              Make sure your face is visible and well-lit.<br />
              Keep your head inside the camera frame.
            </p>
          </div>
        </div>
      )}

      {/* Skip button — bottom-right, above HUD strip */}
      <div className="bottom-16 right-4 absolute z-30">
        <Button
          variant="outline"
          size="sm"
          onClick={onSkip}
          className="bg-white/70 backdrop-blur-sm border-[#E8E0D4] text-[#8B857E] hover:text-[#2D2A26] text-xs"
        >
          Skip
        </Button>
      </div>

      {/* Webcam collection-quality warnings — subtle top-center toast */}
      {tracker === 'webcam' && collectionIssue && !showFaceLost && (
        <div
          className="top-4 left-1/2 absolute -translate-x-1/2 bg-amber-50/90 backdrop-blur-sm px-4 py-2 border border-amber-300/70 rounded-lg text-amber-700 text-xs pointer-events-none z-20"
          style={{ animation: 'float-up 0.3s ease-out' }}
        >
          {collectionIssue === 'no-signal'
            ? '😶 No face detected — keep your face visible and well-lit'
            : '👀 Signal unstable — hold your eyes steady on the target'}
        </div>
      )}

      {/* Gaze dot for Tobii — shows operator where gaze is landing */}
      {tracker === 'tobii' && gazeCursor && (
        <div
          className="absolute bg-[#4A7C59]/60 shadow-[0_0_12px_rgba(74,124,89,0.6)] border border-white/80 rounded-full w-4 h-4 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
          style={{ left: gazeCursor.x, top: gazeCursor.y }}
        />
      )}
    </div>
  );
}
