'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CalibrationModeViewProps } from './types';

function NinjaFigure() {
  return (
    <svg width={72} height={72} viewBox="0 0 120 120" fill="none">
      {/* Head with mask */}
      <circle cx="60" cy="24" r="12" stroke="#2D2A26" strokeWidth="4" />
      <rect x="48" y="19" width="24" height="6" rx="2" fill="#2D2A26" />
      <circle cx="54" cy="21" r="1.5" fill="#FDF8F0" />
      <circle cx="66" cy="21" r="1.5" fill="#FDF8F0" />
      {/* Body */}
      <path d="M60 36V68" stroke="#2D2A26" strokeWidth="4" strokeLinecap="round" />
      {/* Arms */}
      <path d="M60 46L36 56" stroke="#2D2A26" strokeWidth="4" strokeLinecap="round" />
      <path d="M60 46L84 56" stroke="#2D2A26" strokeWidth="4" strokeLinecap="round" />
      {/* Legs */}
      <path d="M60 68L42 96" stroke="#2D2A26" strokeWidth="4" strokeLinecap="round" />
      <path d="M60 68L78 96" stroke="#2D2A26" strokeWidth="4" strokeLinecap="round" />
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
 * - No boss point — uniform size for all points
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
    <div className="z-50 fixed inset-0 bg-[#FDF8F0] overflow-hidden">
      {/* Subtle dark accent for ninja theme */}
      <div
        className="absolute inset-0 pointer-events-none"
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
        className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      >
        <div
          className={cn(
            'relative flex justify-center items-center rounded-full transition-all duration-200',
            'h-22 w-22 border-2 border-[#2D2A26]/30 bg-[#2D2A26]/5',
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
              className="absolute inset-0 pointer-events-none"
            >
              <div className="top-[34%] left-[38%] absolute bg-red-500/60 w-[24%] h-0.5 rounded-full" />
              <div className="top-[40%] left-[40%] absolute bg-red-400/50 w-[20%] h-0.5 rounded-full" />
            </motion.div>
          )}

          {/* Progress ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(220,38,38,0.1)" strokeWidth="3" />
            <motion.circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke={isStableFixation ? '#10b981' : '#DC2626'}
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
              className="-top-7 absolute bg-[#2D2A26] px-2.5 py-1 rounded-md font-semibold text-white text-[11px] pointer-events-none shadow-sm"
            >
              💥 Hit!
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Bottom HUD strip — outside calibration area */}
      <div className="bottom-0 left-0 right-0 absolute flex justify-between items-center px-5 h-14 pointer-events-none">
        {/* Mode label */}
        <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-3 py-1.5 border border-[#E8E0D4] rounded-lg text-[#8B857E] text-[11px]">
          <div className="bg-red-500 rounded-full w-1.5 h-1.5" />
          Ninja Mode
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5 items-center">
          {Array.from({ length: collectionTotal }).map((_, idx) => (
            <div
              key={idx}
              className={cn(
                'rounded-full transition-all duration-300',
                idx < collectionStep - 1
                  ? 'w-2 h-2 bg-red-500 shadow-[0_0_5px_rgba(220,38,38,0.4)]'
                  : idx === collectionStep - 1
                    ? 'w-2.5 h-2.5 bg-red-500 shadow-[0_0_6px_rgba(220,38,38,0.5)] animate-pulse'
                    : 'w-1.5 h-1.5 bg-[#D4CBBD]/60',
              )}
            />
          ))}
        </div>

        {/* Counter */}
        <div className="bg-white/60 backdrop-blur-sm px-3 py-1.5 border border-[#E8E0D4] rounded-lg text-[11px]">
          <span className="font-semibold text-red-600">{collectionStep}</span>
          <span className="text-[#C4BDB4]"> / </span>
          <span className="text-[#6B6560]">{collectionTotal}</span>
        </div>
      </div>
    </div>
  );
}
