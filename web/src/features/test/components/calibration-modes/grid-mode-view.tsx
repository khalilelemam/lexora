'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CalibrationModeViewProps } from './types';

/**
 * Grid (Default) calibration mode.
 *
 * Research decisions:
 * - Warm cream background (#e3dcc2) matching test environment (PSA prevention)
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#e3dcc2]">
      {/* Subtle grid pattern for depth — very faint, no distraction */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, #1b2021 0px, #1b2021 1px, transparent 1px, transparent 40px),' +
            'repeating-linear-gradient(90deg, #1b2021 0px, #1b2021 1px, transparent 1px, transparent 40px)',
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
              <div className="h-2 w-2 rounded-full bg-[#a6a867]/50" />
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
              <div className="h-1.5 w-1.5 rounded-full bg-[#51513d]/50" />
            </div>
          );
        })}

      {/* Active target — animates from previousPoint to currentPoint */}
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
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full">
          {/* Breathing glow */}
          <motion.div
            className={cn(
              'absolute inset-0 rounded-full',
              isStableFixation
                ? 'bg-[#a6a867]/15 shadow-[0_0_28px_rgba(166,168,103,0.26)]'
                : 'bg-[#a6a867]/6 shadow-[0_0_18px_rgba(166,168,103,0.22)]',
            )}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Outer ring */}
          <div className="absolute inset-2 rounded-full border-2 border-[#a6a867]/40 transition-colors duration-200" />

          {/* Center dot — charcoal on cream */}
          <div
            className={cn(
              'relative z-10 h-4 w-4 rounded-full transition-all duration-200',
              isStableFixation
                ? 'bg-[#a6a867] shadow-[0_0_10px_rgba(166,168,103,0.5)]'
                : 'bg-[#1b2021] shadow-sm',
            )}
          />

          {/* Progress arc ring */}
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="rgba(166,168,103,0.12)"
              strokeWidth="3"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke={isStableFixation ? '#a6a867' : '#a6a867'}
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
                className="absolute inset-0 rounded-full bg-[#a6a867]/20"
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Bottom HUD strip — outside calibration area */}
      <div className="pointer-events-none absolute right-0 bottom-0 left-0 flex h-14 items-center justify-between px-5">
        {/* Mode label */}
        <div className="flex items-center gap-1.5 rounded-lg border border-[#51513d] bg-[#f3edd7]/72 px-3 py-1.5 text-[11px] text-[#51513d] backdrop-blur-sm">
          <div className="h-1.5 w-1.5 rounded-full bg-[#a6a867]" />
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
                  ? 'h-2 w-2 bg-[#a6a867]/70'
                  : idx === activeIndex
                    ? 'h-2.5 w-2.5 bg-[#a6a867] shadow-[0_0_5px_rgba(166,168,103,0.5)]'
                    : 'h-1.5 w-1.5 bg-[#51513d]/50',
              )}
            />
          ))}
        </div>

        {/* Step counter */}
        <div className="rounded-lg border border-[#51513d] bg-[#f3edd7]/72 px-3 py-1.5 text-[11px] backdrop-blur-sm">
          <span className="font-semibold text-[#a6a867]">{collectionStep}</span>
          <span className="text-[#51513d]"> / </span>
          <span className="text-[#51513d]">{collectionTotal}</span>
        </div>
      </div>
    </div>
  );
}
