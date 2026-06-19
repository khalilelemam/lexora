'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { CalibrationVisualMode } from '../../lib/calibration-mode';

interface CalibrationPreValidationProps {
  resolvedMode: CalibrationVisualMode;
  onReady: () => void;
}

const MODE_INSTRUCTIONS: Record<
  CalibrationVisualMode,
  {
    title: string;
    description: string;
    steps: string[];
  }
> = {
  grid: {
    title: 'Accuracy Check',
    description: "We'll now check how well the calibration went by showing you a few targets.",
    steps: [
      'A dot will appear at different positions on the screen',
      'Look directly at each dot and hold your gaze steady',
      "The ring around it will fill as we measure - don't look away until it's full",
      'This takes about 10 seconds',
    ],
  },
  star: {
    title: 'Star Accuracy Check',
    description: 'Time to see how well you trained your star-gazing powers!',
    steps: [
      'A golden star will appear at different positions',
      'Look at the star and hold your gaze on it',
      'The ring will fill as we measure your accuracy',
      'Keep looking until each star is complete',
    ],
  },
  stickman: {
    title: 'Ninja Takedown',
    description:
      'The ninjas you captured are trying to escape! Track them down with your laser eyes.',
    steps: [
      'Each ninja will appear at a different position',
      'Lock your eyes on the ninja to take them down',
      'The damage ring fills as your gaze holds steady',
      "Don't let them escape - keep looking!",
    ],
  },
};

/**
 * Pre-validation instruction screen.
 *
 * Shows between calibration collection and validation to:
 * 1. Give the user a mental break (reduces fatigue)
 * 2. Set expectations for the validation phase
 * 3. Provide mode-themed instructions
 *
 * Auto-proceeds after 5 seconds or on click.
 */
export function CalibrationPreValidation({ resolvedMode, onReady }: CalibrationPreValidationProps) {
  const [countdown, setCountdown] = useState(4);
  const instructions = MODE_INSTRUCTIONS[resolvedMode];
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  // Track when countdown expires so we can fire the callback outside the updater
  const expiredRef = useRef(false);

  // Stable callback that won't restart the interval on re-render.
  // IMPORTANT: onReady must NOT be called inside the state updater —
  // it triggers parent setState which violates React's render-phase rules.
  const tick = useCallback(() => {
    setCountdown((prev) => {
      if (prev <= 1) {
        expiredRef.current = true;
        return 0;
      }
      return prev - 1;
    });
  }, []);

  // Fire onReady as a side-effect when countdown reaches 0
  useEffect(() => {
    if (countdown === 0 && expiredRef.current) {
      onReadyRef.current();
    }
  }, [countdown]);

  useEffect(() => {
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [tick]);

  return (
    <div className="fixed inset-0 z-50 flex cursor-none flex-col items-center justify-center bg-[#e3dcc2]">
      <div
        className="flex max-w-lg flex-col items-center gap-5 border border-[#51513d]/18 bg-[#f3edd7]/90 px-10 py-10 shadow-[12px_12px_0_rgba(81,81,61,.1)] backdrop-blur-sm"
        style={{ animation: 'float-up 0.4s ease-out' }}
      >
        <h2 className="text-2xl font-bold tracking-tight text-[#1b2021]">{instructions.title}</h2>
        <p className="max-w-md text-center text-sm leading-relaxed text-[#1b2021]">
          {instructions.description}
        </p>

        <div className="w-full border border-[#51513d]/15 bg-[#e3dcc2]/55 p-4">
          <ul className="space-y-2 text-[13px] text-[#1b2021]">
            {instructions.steps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center bg-[#51513d] text-[10px] font-bold text-[#f3edd7]">
                  {idx + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Auto-proceed countdown */}
        <div className="flex flex-col items-center gap-2 pt-2">
          <div className="relative h-14 w-14">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" fill="none" stroke="#51513d" strokeWidth="3" />
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="#51513d"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${24 * 2 * Math.PI}`}
                strokeDashoffset={`${24 * 2 * Math.PI * (1 - countdown / 4)}`}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-[#51513d]">{countdown}</span>
            </div>
          </div>
          <p className="text-[11px] text-[#1b2021]">Starting automatically...</p>
        </div>
      </div>
    </div>
  );
}
