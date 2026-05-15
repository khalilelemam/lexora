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
    <div className="fixed inset-0 z-50 cursor-none overflow-hidden">
      {modeSurface}

      {/* Face-lost overlay — pauses the feeling of progress clearly */}
      {showFaceLost && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#e3dcc2]/80 backdrop-blur-[2px]"
          style={{ animation: 'float-up 0.25s ease-out' }}
        >
          <div className="flex max-w-xs flex-col items-center gap-3 rounded-2xl border border-[#51513d] bg-[#f3edd7]/95 px-7 py-6 text-center shadow-lg">
            {/* Animated eye icon */}
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path
                d="M4 24C4 24 12 10 24 10C36 10 44 24 44 24C44 24 36 38 24 38C12 38 4 24 4 24Z"
                stroke="#8b6f25"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="24" cy="24" r="6" stroke="#8b6f25" strokeWidth="2.5" />
              <line
                x1="20"
                y1="20"
                x2="28"
                y2="28"
                stroke="#8b6f25"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <p className="text-sm font-semibold text-[#1b2021]">Face not detected</p>
            <p className="text-xs leading-relaxed text-[#51513d]">
              Make sure your face is visible and well-lit.
              <br />
              Keep your head inside the camera frame.
            </p>
          </div>
        </div>
      )}

      {/* Skip button — bottom-right, above HUD strip */}
      <div className="absolute right-4 bottom-16 z-30">
        <Button
          variant="outline"
          size="sm"
          onClick={onSkip}
          className="border-[#51513d] bg-[#f3edd7]/80 text-xs text-[#51513d] backdrop-blur-sm hover:text-[#1b2021]"
        >
          Skip
        </Button>
      </div>

      {/* Webcam collection-quality warnings — subtle top-center toast */}
      {tracker === 'webcam' && collectionIssue && !showFaceLost && (
        <div
          className="pointer-events-none absolute top-4 left-1/2 z-20 -translate-x-1/2 border border-[#e3dc95] bg-[#e3dc95]/35 px-4 py-2 text-xs text-[#51513d] backdrop-blur-sm"
          style={{ animation: 'float-up 0.3s ease-out' }}
        >
          {collectionIssue === 'no-signal'
            ? 'No face detected - keep your face visible and well-lit'
            : 'Signal unstable - hold your eyes steady on the target'}
        </div>
      )}

      {/* Gaze dot for Tobii — shows operator where gaze is landing */}
      {tracker === 'tobii' && gazeCursor && (
        <div
          className="pointer-events-none absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f3edd7]/80 bg-[#a6a867]/60 shadow-[0_0_12px_rgba(166,168,103,0.55)]"
          style={{ left: gazeCursor.x, top: gazeCursor.y }}
        />
      )}
    </div>
  );
}
