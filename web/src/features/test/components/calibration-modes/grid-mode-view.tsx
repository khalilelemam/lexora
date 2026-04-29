'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CalibrationModeViewProps } from './types';

/**
 * Grid (Default) calibration mode.
 *
 * Research decisions:
 * - Warm cream background (#FDF8F0) matching test environment (PSA prevention)
 * - Sequential point order — builds better regression models than random
 * - Charcoal dot target with sage-green progress ring — clear contrast on cream
 * - Completed points shown as small sage dots (no checkmarks — per UX spec)
 * - NO rendering of past/future dots at the same position as the active target
 *   to avoid visual clutter and distraction (Holmqvist & Andersson 2017)
 */
export function GridModeView({
  points,
  currentPoint,
  previousPoint,
  collectionStep,
  collectionTotal,
  fixationProgress,
  isStableFixation,
  capturePulse,
  motionDurationMs,
}: CalibrationModeViewProps) {
  // Which index is currently active (0-based)
  const activeIndex = collectionStep - 1;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#FDF8F0]">
      {/* Subtle grid pattern for depth — very faint, no distraction */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, #2D2A26 0px, #2D2A26 1px, transparent 1px, transparent 40px),' +
            'repeating-linear-gradient(90deg, #2D2A26 0px, #2D2A26 1px, transparent 1px, transparent 40px)',
        }}
      />

      {/* Completed point markers — only for full calibration runs */}
      {collectionTotal === points.length &&
        points.map((point, index) => {
          if (index >= activeIndex) return null;
          return (
            <div
              key={`grid-done-${index}`}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
            >
              <div className="h-2 w-2 rounded-full bg-[#4A7C59]/50" />
            </div>
          );
        })}

      {/* Upcoming point hints — only for full calibration runs */}
      {collectionTotal === points.length &&
        points.map((point, index) => {
          if (index <= activeIndex) return null;
          return (
            <div
              key={`grid-future-${index}`}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
            >
              <div className="h-1.5 w-1.5 rounded-full bg-[#C4BDB4]/50" />
            </div>
          );
        })}

      <motion.div
        key={`grid-target-${collectionStep}`}
        initial={{
          left: `${previousPoint.x * 100}%`,
          top: `${previousPoint.y * 100}%`,
          opacity: 0.4,
          scale: 0.85,
        }}
        animate={{
          left: `${currentPoint.x * 100}%`,
          top: `${currentPoint.y * 100}%`,
          opacity: 1,
          scale: 1,
        }}
        transition={{ duration: motionDurationMs / 1000, ease: [0.4, 0, 0.2, 1] }}
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
      >
        {/* Shrinking container: starts at 80px, shrinks to 32px as fixation locks */}
        {(() => {
          const maxSize = 80;
          const minSize = 32;
          const currentSize = maxSize - (maxSize - minSize) * fixationProgress;
          const dotMaxSize = 16;
          const dotMinSize = 6;
          const dotSize = dotMaxSize - (dotMaxSize - dotMinSize) * fixationProgress;

          return (
            <div
              className="relative flex items-center justify-center rounded-full transition-[width,height] duration-100"
              style={{ width: currentSize, height: currentSize }}
            >
              {/* Breathing glow */}
              <motion.div
                className={cn(
                  'absolute inset-0 rounded-full',
                  isStableFixation
                    ? 'bg-emerald-400/10 shadow-[0_0_28px_rgba(52,211,153,0.22)]'
                    : 'bg-[#4A7C59]/6 shadow-[0_0_18px_rgba(74,124,89,0.18)]',
                )}
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Outer ring */}
              <div className="absolute inset-[4px] rounded-full border-2 border-[#4A7C59]/40 transition-colors duration-200" />

              {/* Center dot — shrinks with the container */}
              <div
                className={cn(
                  'relative z-10 rounded-full transition-all duration-200',
                  isStableFixation
                    ? 'bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.5)]'
                    : 'bg-[#2D2A26] shadow-sm',
                )}
                style={{ width: dotSize, height: dotSize }}
              />

              {/* Progress arc ring */}
              <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="rgba(74,124,89,0.10)"
                  strokeWidth="3"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke={isStableFixation ? '#10b981' : '#4A7C59'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={276.5}
                  animate={{ strokeDashoffset: 276.5 * (1 - fixationProgress) }}
                  transition={{ duration: 0.09 }}
                />
              </svg>

              {/* Capture ripple */}
              <AnimatePresence>
                {capturePulse && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0.5 }}
                    animate={{ scale: 2.2, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="absolute inset-0 rounded-full bg-emerald-400/15"
                  />
                )}
              </AnimatePresence>
            </div>
          );
        })()}
      </motion.div>

      {/* Bottom HUD strip — outside calibration area */}
      <div className="pointer-events-none absolute right-0 bottom-0 left-0 flex h-14 items-center justify-between px-5">
        {/* Mode label */}
        <div className="flex items-center gap-1.5 rounded-lg border border-[#E8E0D4] bg-white/55 px-3 py-1.5 text-[11px] text-[#8B857E] backdrop-blur-sm">
          <div className="h-1.5 w-1.5 rounded-full bg-[#4A7C59]" />
          Grid Mode
        </div>

        {/* Progress dots — compact, no distraction */}
        <div className="flex items-center gap-1">
          {Array.from({ length: collectionTotal }).map((_, idx) => (
            <div
              key={idx}
              className={cn(
                'rounded-full transition-all duration-300',
                idx < activeIndex
                  ? 'h-2 w-2 bg-[#4A7C59]/70'
                  : idx === activeIndex
                    ? 'h-2.5 w-2.5 bg-[#4A7C59] shadow-[0_0_5px_rgba(74,124,89,0.5)]'
                    : 'h-1.5 w-1.5 bg-[#D4CBBD]/50',
              )}
            />
          ))}
        </div>

        {/* Step counter */}
        <div className="rounded-lg border border-[#E8E0D4] bg-white/55 px-3 py-1.5 text-[11px] backdrop-blur-sm">
          <span className="font-semibold text-[#4A7C59]">{collectionStep}</span>
          <span className="text-[#C4BDB4]"> / </span>
          <span className="text-[#6B6560]">{collectionTotal}</span>
        </div>
      </div>
    </div>
  );
}
