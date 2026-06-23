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
    title: 'Quick accuracy check',
    description: 'Lexora will verify that your gaze lands where the target appears.',
    steps: [
      'Look at each target as soon as it appears',
      'Hold your eyes steady until capture completes',
      'Keep your head relaxed and still',
      'This takes only a few seconds',
    ],
  },
  star: {
    title: 'Star accuracy check',
    description: "One final pass confirms the star targets match the reader's gaze.",
    steps: [
      'Find the star quickly',
      'Hold gaze until it completes',
      'Stay still between targets',
      'Blink normally if needed',
    ],
  },
  stickman: {
    title: 'Ninja accuracy check',
    description: 'A short final check makes sure the tracking is ready for reading.',
    steps: [
      'Find each character quickly',
      'Keep gaze locked until capture completes',
      'Use only your eyes to move',
      'Stay calm and steady',
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
    <div
      className="fixed inset-0 z-50 flex cursor-none flex-col items-center justify-center overflow-hidden bg-[#e3dcc2] px-5"
      onClick={onReady}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(81,81,61,.05) 1px, transparent 1px), linear-gradient(rgba(81,81,61,.05) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(166,168,103,0.13)_0%,_transparent_58%)]" />
      <div
        className="relative flex w-full max-w-2xl flex-col items-center border border-[#51513d]/18 bg-[#f3edd7]/92 px-6 py-8 shadow-[12px_12px_0_rgba(81,81,61,.1)] backdrop-blur-sm sm:px-10"
        style={{ animation: 'float-up 0.4s ease-out' }}
      >
        <p className="text-xs font-black tracking-[0.28em] text-[#51513d] uppercase">
          Calibration checkpoint
        </p>

        <div className="relative my-6 flex h-32 w-32 items-center justify-center">
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r="56" fill="none" stroke="#51513d" strokeOpacity="0.1" />
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke="#a6a867"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${56 * 2 * Math.PI}`}
              strokeDashoffset={`${56 * 2 * Math.PI * (1 - countdown / 4)}`}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute h-px w-28 bg-[#51513d]/25" />
          <div className="absolute h-28 w-px bg-[#51513d]/25" />
          <span className="relative font-mono text-5xl font-black text-[#1b2021]">{countdown}</span>
        </div>

        <h2 className="text-center text-2xl font-black tracking-tight text-[#1b2021] sm:text-3xl">
          {instructions.title}
        </h2>
        <p className="mt-3 max-w-md text-center text-sm leading-relaxed text-[#51513d]">
          {instructions.description}
        </p>

        <div className="mt-6 grid w-full gap-3 sm:grid-cols-2">
          {instructions.steps.map((step, idx) => (
            <div key={step} className="border border-[#51513d]/14 bg-[#e3dcc2]/55 p-3">
              <span className="flex h-6 w-6 items-center justify-center bg-[#51513d] font-mono text-[10px] font-black text-[#f3edd7]">
                {idx + 1}
              </span>
              <p className="mt-2 text-sm font-semibold text-[#1b2021]">{step}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs font-bold tracking-wider text-[#51513d]/75 uppercase">
          Starts automatically. Click anywhere to begin now.
        </p>
      </div>
    </div>
  );
}
