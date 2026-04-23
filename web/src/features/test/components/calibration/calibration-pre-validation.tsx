'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { CalibrationVisualMode } from '../../hooks/use-calibration-engine';

interface CalibrationPreValidationProps {
  resolvedMode: CalibrationVisualMode;
  onReady: () => void;
}

const MODE_INSTRUCTIONS: Record<CalibrationVisualMode, {
  title: string;
  description: string;
  steps: string[];
}> = {
  grid: {
    title: 'Accuracy Check',
    description: 'We\'ll now check how well the calibration went by showing you a few targets.',
    steps: [
      'A dot will appear at different positions on the screen',
      'Look directly at each dot and hold your gaze steady',
      'The ring around it will fill as we measure — don\'t look away until it\'s full',
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
    description: 'The ninjas you captured are trying to escape! Track them down with your laser eyes.',
    steps: [
      'Each ninja will appear at a different position',
      'Lock your eyes on the ninja to take them down',
      'The damage ring fills as your gaze holds steady',
      'Don\'t let them escape — keep looking!',
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
export function CalibrationPreValidation({
  resolvedMode,
  onReady,
}: CalibrationPreValidationProps) {
  const [countdown, setCountdown] = useState(4);
  const instructions = MODE_INSTRUCTIONS[resolvedMode];
  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);

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
    <div
      className="z-50 fixed inset-0 flex flex-col justify-center items-center bg-[#FDF8F0] cursor-none"
      onClick={onReady}
    >
      <div
        className="flex flex-col items-center gap-5 bg-white/80 backdrop-blur-sm px-10 py-10 border border-[#E8E0D4] rounded-2xl shadow-lg max-w-lg"
        style={{ animation: 'float-up 0.4s ease-out' }}
      >
        <h2 className="font-bold text-2xl tracking-tight text-[#2D2A26]">
          {instructions.title}
        </h2>
        <p className="text-[#6B6560] text-sm text-center leading-relaxed max-w-md">
          {instructions.description}
        </p>

        <div className="bg-[#4A7C59]/5 border border-[#4A7C59]/15 rounded-xl p-4 w-full">
          <ul className="space-y-2 text-[#6B6560] text-[13px]">
            {instructions.steps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="shrink-0 bg-[#4A7C59] text-white text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center mt-0.5">
                  {idx + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Auto-proceed countdown */}
        <div className="flex flex-col items-center gap-2 pt-2">
          <div className="relative w-14 h-14">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" fill="none" stroke="#E8E0D4" strokeWidth="3" />
              <circle
                cx="28" cy="28" r="24"
                fill="none" stroke="#4A7C59" strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${24 * 2 * Math.PI}`}
                strokeDashoffset={`${24 * 2 * Math.PI * (1 - countdown / 4)}`}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-bold text-[#4A7C59] text-lg">{countdown}</span>
            </div>
          </div>
          <p className="text-[#8B857E] text-[11px]">Starting automatically… or click anywhere</p>
        </div>
      </div>
    </div>
  );
}
