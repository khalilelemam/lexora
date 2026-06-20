'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CalibrationModeViewProps } from './types';

function NinjaFigure() {
  return (
    <svg width={72} height={72} viewBox="0 0 120 120" fill="none">
      {/* Head with mask */}
      <circle cx="60" cy="24" r="12" stroke="#1b2021" strokeWidth="4" />
      <rect x="48" y="19" width="24" height="6" rx="2" fill="#1b2021" />
      <circle cx="54" cy="21" r="1.5" fill="#e3dcc2" />
      <circle cx="66" cy="21" r="1.5" fill="#e3dcc2" />
      {/* Body */}
      <path d="M60 36V68" stroke="#1b2021" strokeWidth="4" strokeLinecap="round" />
      {/* Arms */}
      <path d="M60 46L36 56" stroke="#1b2021" strokeWidth="4" strokeLinecap="round" />
      <path d="M60 46L84 56" stroke="#1b2021" strokeWidth="4" strokeLinecap="round" />
      {/* Legs */}
      <path d="M60 68L42 96" stroke="#1b2021" strokeWidth="4" strokeLinecap="round" />
      <path d="M60 68L78 96" stroke="#1b2021" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Stickman (Ninja) calibration mode — simplified mode view.
 *
 * This is the non-canvas fallback view. The canvas version (StickmanCanvas)
 * handles the full ninja animation. This view provides a simpler motion-based
 * stickman that moves between calibration points.
 *
 * Design changes:
 * - Warm cream background matching test environment
 * - Ninja theme (masked stickman, dark charcoal figure)
 * - Red "laser" lines when fixation is stable (gaze damage)
 * - HUD moved to bottom strip to keep calibration area unobstructed
 */
export function StickmanModeView({
  currentPoint,
  previousPoint,
  collectionStep,
  collectionTotal,
  fixationProgress,
  isStableFixation,
  capturePulse,
  motionDurationMs,
}: CalibrationModeViewProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#e3dcc2]">
      {/* Subtle dark accent for ninja theme */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(45,42,38,0.02) 0px, rgba(45,42,38,0.02) 1px, transparent 1px, transparent 28px),' +
            'repeating-linear-gradient(90deg, rgba(45,42,38,0.015) 0px, rgba(45,42,38,0.015) 1px, transparent 1px, transparent 28px)',
        }}
      />

      {/* Ninja target */}
      <motion.div
        key={`ninja-${collectionStep}`}
        initial={{
          left: `${previousPoint.x * 100}%`,
          top: `${previousPoint.y * 100}%`,
          rotate: -14,
          opacity: 0.4,
          scale: 0.7,
        }}
        animate={{
          left: `${currentPoint.x * 100}%`,
          top: `${currentPoint.y * 100}%`,
          rotate: [0, 2, -1, 0],
          opacity: 1,
          scale: 1,
        }}
        transition={{ duration: motionDurationMs / 1000, ease: [0.4, 0, 0.2, 1] }}
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
      >
        <div
          className={cn(
            'relative flex items-center justify-center rounded-full transition-all duration-200',
            'h-22 w-22 border-2 border-[#1b2021]/30 bg-[#1b2021]/5',
            isStableFixation && 'shadow-[0_0_30px_rgba(220,38,38,0.25)]',
            capturePulse && 'scale-110',
          )}
        >
          {/* Ninja figure with idle bounce */}
          <motion.div
            animate={{
              y: isStableFixation ? [0, -1, 0] : [0, -3, 0],
            }}
            transition={{
              duration: isStableFixation ? 0.6 : 0.35,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'easeInOut',
            }}
          >
            <NinjaFigure />
          </motion.div>

          {/* Laser damage lines when fixating */}
          {isStableFixation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pointer-events-none absolute inset-0"
            >
              <div className="absolute top-[34%] left-[38%] h-0.5 w-[24%] rounded-full bg-red-500/60" />
              <div className="absolute top-[40%] left-[40%] h-0.5 w-[20%] rounded-full bg-red-400/50" />
            </motion.div>
          )}

          {/* Progress ring */}
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="rgba(220,38,38,0.1)"
              strokeWidth="3"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={isStableFixation ? '#a6a867' : '#DC2626'}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={264}
              animate={{ strokeDashoffset: 264 * (1 - fixationProgress) }}
              transition={{ duration: 0.1 }}
            />
          </svg>

          {/* Defeat feedback */}
          {capturePulse && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: -16 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute -top-7 rounded-md bg-[#1b2021] px-2.5 py-1 text-[11px] font-semibold text-[#f3edd7] shadow-sm"
            >
              💥 Hit!
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Bottom HUD strip — outside calibration area */}
      <div className="pointer-events-none absolute right-0 bottom-0 left-0 flex h-14 items-center justify-between px-5">
        {/* Mode label */}
        <div className="flex items-center gap-2 rounded-lg border border-[#51513d] bg-[#f3edd7]/75 px-3 py-1.5 text-[11px] text-[#51513d] backdrop-blur-sm">
          <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
          Ninja Mode
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: collectionTotal }).map((_, idx) => (
            <div
              key={idx}
              className={cn(
                'rounded-full transition-all duration-300',
                idx < collectionStep - 1
                  ? 'h-2 w-2 bg-red-500 shadow-[0_0_5px_rgba(220,38,38,0.4)]'
                  : idx === collectionStep - 1
                    ? 'h-2.5 w-2.5 animate-pulse bg-red-500 shadow-[0_0_6px_rgba(220,38,38,0.5)]'
                    : 'h-1.5 w-1.5 bg-[#51513d]/60',
              )}
            />
          ))}
        </div>

        {/* Counter */}
        <div className="rounded-lg border border-[#51513d] bg-[#f3edd7]/75 px-3 py-1.5 text-[11px] backdrop-blur-sm">
          <span className="font-semibold text-red-600">{collectionStep}</span>
          <span className="text-[#51513d]"> / </span>
          <span className="text-[#51513d]">{collectionTotal}</span>
        </div>
      </div>
    </div>
  );
}
